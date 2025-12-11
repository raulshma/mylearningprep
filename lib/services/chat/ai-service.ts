/**
 * AI Service Facade
 *
 * Provides a unified interface for AI chat operations.
 * Wraps the existing API routes and handles streaming.
 *
 * Requirements: 3.1, 3.3, 5.2, 8.4
 */

import type { AIProviderType } from '@/lib/ai/types';
import type { EncodedFile, MessageMetadata, StreamError, ModelInfo } from '@/lib/store/chat/types';
import { streamService, type StreamConnection, type StreamPart } from './stream-service';

// =============================================================================
// Types
// =============================================================================

export interface SendMessageParams {
  content: string;
  conversationId?: string;
  interviewId?: string;
  learningPathId?: string;
  selectedModelId?: string;
  providerTools?: string[];
  files?: EncodedFile[];
}

export interface MultiModelParams {
  content: string;
  models: ModelInfo[];
  conversationId?: string;
}

export interface StreamHandle {
  /**
   * Abort the stream
   * Requirements: 8.4 - Terminate connection and preserve partial content
   */
  abort(): void;

  /**
   * Check if stream is still active
   */
  isActive(): boolean;

  /**
   * Get the conversation ID (may be set after first response)
   */
  getConversationId(): string | undefined;

  /**
   * Get the model ID used for this request
   */
  getModelId(): string | undefined;
}

export interface MultiStreamHandle {
  /**
   * Abort all streams
   */
  abortAll(): void;

  /**
   * Abort a specific model's stream
   */
  abort(modelId: string): void;

  /**
   * Check if any streams are still active
   */
  hasActiveStreams(): boolean;

  /**
   * Get handles for each model
   */
  getHandles(): Map<string, StreamHandle>;
}

export interface StreamCallbacks {
  onPart?: (part: StreamPart) => void;
  onError?: (error: StreamError) => void;
  onComplete?: (metadata: MessageMetadata | null) => void;
  onConversationCreated?: (conversationId: string) => void;
}

export interface MultiStreamCallbacks {
  onPart?: (modelId: string, part: StreamPart) => void;
  onError?: (modelId: string, error: StreamError) => void;
  onComplete?: (modelId: string, metadata: MessageMetadata | null) => void;
  onAllComplete?: () => void;
}


// =============================================================================
// AI Service Interface
// =============================================================================

export interface AIService {
  /**
   * Send a message and get a streaming response
   * Requirements: 3.1 - Optimistically display while awaiting confirmation
   */
  sendMessage(params: SendMessageParams, callbacks?: StreamCallbacks): StreamHandle;

  /**
   * Send a message to multiple models for comparison
   * Requirements: 5.2 - Dispatch requests to all selected models concurrently
   */
  sendMultiModelMessage(params: MultiModelParams, callbacks?: MultiStreamCallbacks): MultiStreamHandle;

  /**
   * Stop an active stream
   * Requirements: 8.4 - Terminate connection and preserve partial content
   */
  stopStream(handle: StreamHandle): void;

  /**
   * Regenerate the last response in a conversation
   * Requirements: 3.3 - Provide retry capability
   */
  regenerateResponse(conversationId: string, callbacks?: StreamCallbacks): StreamHandle;
}

// =============================================================================
// Internal State
// =============================================================================

// Track active streams for cleanup
const activeStreams = new Map<string, StreamConnection>();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build the request body for the AI assistant API
 */
function buildRequestBody(params: SendMessageParams): Record<string, unknown> {
  const { content, conversationId, interviewId, learningPathId, selectedModelId, providerTools, files } = params;

  // Build message parts
  const parts: Array<{ type: string; text?: string; mediaType?: string; url?: string; filename?: string }> = [];
  
  // Add text content
  parts.push({ type: 'text', text: content });

  // Add file parts if present
  if (files && files.length > 0) {
    for (const file of files) {
      parts.push({
        type: 'file',
        mediaType: file.type,
        url: file.dataUrl,
        filename: file.name,
      });
    }
  }

  // Build messages array in UIMessage format
  const messages = [{
    id: `user_${Date.now()}`,
    role: 'user',
    content,
    parts,
    createdAt: new Date(),
  }];

  return {
    messages,
    conversationId,
    interviewId,
    learningPathId,
    selectedModelId,
    providerTools,
  };
}

/**
 * Create a stream handle from a connection
 */
function createStreamHandle(
  connection: StreamConnection,
  streamId: string,
  conversationIdRef: { value?: string },
  modelIdRef: { value?: string }
): StreamHandle {
  return {
    abort() {
      connection.abort();
      activeStreams.delete(streamId);
    },

    isActive() {
      return connection.isActive();
    },

    getConversationId() {
      return conversationIdRef.value;
    },

    getModelId() {
      return modelIdRef.value;
    },
  };
}


// =============================================================================
// AI Service Implementation
// =============================================================================

export const aiService: AIService = {
  sendMessage(params, callbacks = {}) {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const conversationIdRef: { value?: string } = { value: params.conversationId };
    const modelIdRef: { value?: string } = {};

    const body = buildRequestBody(params);

    // Create a custom fetch to capture headers
    const connection = streamService.connect('/api/ai-assistant', {
      body,
      onPart: (part) => {
        // Check for metadata that might contain model info
        if (part.type === 'metadata' && part.metadata.model) {
          modelIdRef.value = part.metadata.model;
        }
        callbacks.onPart?.(part);
      },
      onError: callbacks.onError,
      onComplete: callbacks.onComplete,
    });

    activeStreams.set(streamId, connection);

    // We need to handle the conversation ID from response headers
    // This is done through a wrapper that intercepts the fetch
    // For now, the conversation ID should be passed back through the stream

    return createStreamHandle(connection, streamId, conversationIdRef, modelIdRef);
  },

  sendMultiModelMessage(params, callbacks = {}) {
    const { content, models, conversationId } = params;
    const handles = new Map<string, StreamHandle>();
    let completedCount = 0;
    const totalModels = models.length;

    // Requirements: 5.2 - Dispatch requests to all selected models concurrently
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const streamId = `multi_${Date.now()}_${model.id}`;
      const modelIdRef: { value?: string } = { value: model.id };
      const conversationIdRef: { value?: string } = { value: conversationId };

      const body = {
        message: content,
        modelId: model.id,
        provider: model.provider,
        conversationId,
        // Only increment count for the first model to avoid counting multiple times
        shouldIncrementCount: i === 0,
      };

      const connection = streamService.connect('/api/ai-assistant/multi', {
        body,
        onPart: (part) => {
          callbacks.onPart?.(model.id, part);
        },
        onError: (error) => {
          callbacks.onError?.(model.id, error);
        },
        onComplete: (metadata) => {
          callbacks.onComplete?.(model.id, metadata);
          completedCount++;
          
          if (completedCount >= totalModels) {
            callbacks.onAllComplete?.();
          }
        },
      });

      activeStreams.set(streamId, connection);

      const handle = createStreamHandle(connection, streamId, conversationIdRef, modelIdRef);
      handles.set(model.id, handle);
    }

    return {
      abortAll() {
        for (const handle of handles.values()) {
          handle.abort();
        }
      },

      abort(modelId: string) {
        const handle = handles.get(modelId);
        if (handle) {
          handle.abort();
        }
      },

      hasActiveStreams() {
        for (const handle of handles.values()) {
          if (handle.isActive()) {
            return true;
          }
        }
        return false;
      },

      getHandles() {
        return handles;
      },
    };
  },

  stopStream(handle) {
    // Requirements: 8.4 - Terminate connection and preserve partial content
    handle.abort();
  },

  regenerateResponse(conversationId, callbacks = {}) {
    // For regeneration, we send an empty message to the same conversation
    // The API will handle regenerating the last response
    return this.sendMessage(
      {
        content: '', // Empty content signals regeneration
        conversationId,
      },
      callbacks
    );
  },
};

// =============================================================================
// Cleanup Utilities
// =============================================================================

/**
 * Abort all active streams
 * Useful for cleanup on unmount
 */
export function abortAllStreams(): void {
  for (const connection of activeStreams.values()) {
    connection.abort();
  }
  activeStreams.clear();
}

/**
 * Get count of active streams
 */
export function getActiveStreamCount(): number {
  return activeStreams.size;
}

// Export for testing
export { buildRequestBody, createStreamHandle };
