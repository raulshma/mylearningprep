/**
 * Chat Stream Service
 *
 * Handles streaming response processing for the AI Chat feature.
 * Parses stream chunks for text, reasoning, and tool calls.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import type { ToolCall, StreamingMessage, StreamError, MessageMetadata } from '@/lib/store/chat/types';

// =============================================================================
// Stream Part Types
// =============================================================================

export type StreamPartType = 
  | 'text'
  | 'reasoning'
  | 'tool-call'
  | 'tool-result'
  | 'metadata'
  | 'error'
  | 'done';

export interface TextStreamPart {
  type: 'text';
  content: string;
}

export interface ReasoningStreamPart {
  type: 'reasoning';
  content: string;
}

export interface ToolCallStreamPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  input?: unknown;
  state: ToolCall['state'];
}

export interface ToolResultStreamPart {
  type: 'tool-result';
  toolCallId: string;
  output?: unknown;
  error?: string;
}

export interface MetadataStreamPart {
  type: 'metadata';
  metadata: Partial<MessageMetadata>;
}

export interface ErrorStreamPart {
  type: 'error';
  error: string;
  code?: string;
  isRetryable?: boolean;
}

export interface DoneStreamPart {
  type: 'done';
}

export type StreamPart =
  | TextStreamPart
  | ReasoningStreamPart
  | ToolCallStreamPart
  | ToolResultStreamPart
  | MetadataStreamPart
  | ErrorStreamPart
  | DoneStreamPart;


// =============================================================================
// Stream Connection Types
// =============================================================================

export interface StreamOptions {
  signal?: AbortSignal;
  onPart?: (part: StreamPart) => void;
  onError?: (error: StreamError) => void;
  onComplete?: (metadata: MessageMetadata | null) => void;
}

export interface StreamConnection {
  /**
   * Abort the stream connection
   * Requirements: 8.4 - Terminate connection and preserve partial content
   */
  abort(): void;

  /**
   * Check if the stream is still active
   */
  isActive(): boolean;

  /**
   * Get accumulated content so far
   * Requirements: 8.5 - Preserve partial content on error
   */
  getAccumulatedContent(): StreamingMessage;
}

// =============================================================================
// Stream Accumulator
// =============================================================================

/**
 * Accumulates stream parts into a complete message
 * Requirements: 8.1 - Accumulates content as chunks arrive
 */
export class StreamAccumulator {
  private content = '';
  private reasoning = '';
  private toolCalls: Map<string, ToolCall> = new Map();
  private metadata: Partial<MessageMetadata> = {};
  private error: StreamError | null = null;
  private isComplete = false;

  /**
   * Process a stream part and accumulate content
   */
  process(part: StreamPart): void {
    switch (part.type) {
      case 'text':
        // Requirements: 8.1 - Accumulate text content in order
        this.content += part.content;
        break;

      case 'reasoning':
        // Requirements: 8.2 - Accumulate reasoning content
        this.reasoning += part.content;
        break;

      case 'tool-call':
        // Requirements: 8.3 - Track tool invocations
        this.toolCalls.set(part.toolCallId, {
          id: part.toolCallId,
          name: part.toolName,
          input: part.input,
          state: part.state,
        });
        break;

      case 'tool-result':
        // Update tool call with result
        const existingTool = this.toolCalls.get(part.toolCallId);
        if (existingTool) {
          existingTool.output = part.output;
          existingTool.state = part.error ? 'output-error' : 'output-available';
          existingTool.errorText = part.error;
        }
        break;

      case 'metadata':
        // Requirements: 8.6 - Update metadata
        this.metadata = { ...this.metadata, ...part.metadata };
        break;

      case 'error':
        // Requirements: 8.5 - Preserve error while keeping partial content
        this.error = {
          message: part.error,
          code: part.code,
          isRetryable: part.isRetryable,
        };
        break;

      case 'done':
        this.isComplete = true;
        break;
    }
  }

  /**
   * Get the current accumulated state as a StreamingMessage
   */
  getState(id: string, conversationId: string): StreamingMessage {
    return {
      id,
      conversationId,
      content: this.content,
      reasoning: this.reasoning,
      toolCalls: Array.from(this.toolCalls.values()),
      isComplete: this.isComplete,
      error: this.error ?? undefined,
    };
  }

  /**
   * Get accumulated metadata
   */
  getMetadata(): MessageMetadata | null {
    if (Object.keys(this.metadata).length === 0) {
      return null;
    }
    return this.metadata as MessageMetadata;
  }

  /**
   * Check if there's an error
   */
  hasError(): boolean {
    return this.error !== null;
  }

  /**
   * Get the error if any
   */
  getError(): StreamError | null {
    return this.error;
  }

  /**
   * Reset the accumulator
   */
  reset(): void {
    this.content = '';
    this.reasoning = '';
    this.toolCalls.clear();
    this.metadata = {};
    this.error = null;
    this.isComplete = false;
  }
}


// =============================================================================
// Stream Parser
// =============================================================================

/**
 * Parse a raw SSE chunk into a StreamPart
 * Handles the data format from the AI assistant API
 */
export function parseStreamChunk(chunk: string): StreamPart | null {
  // Skip empty lines and comments
  if (!chunk || chunk.startsWith(':')) {
    return null;
  }

  // Handle SSE data format
  if (chunk.startsWith('data: ')) {
    const data = chunk.slice(6).trim();
    
    // Handle [DONE] marker
    if (data === '[DONE]') {
      return { type: 'done' };
    }

    try {
      const parsed = JSON.parse(data);
      return parseJsonPart(parsed);
    } catch {
      // If not valid JSON, treat as text content
      return { type: 'text', content: data };
    }
  }

  return null;
}

/**
 * Parse a JSON object into a StreamPart
 */
function parseJsonPart(data: Record<string, unknown>): StreamPart | null {
  const type = data.type as string;

  switch (type) {
    case 'text':
      return {
        type: 'text',
        content: String(data.content ?? ''),
      };

    case 'reasoning':
      return {
        type: 'reasoning',
        content: String(data.content ?? ''),
      };

    case 'tool-call':
    case 'tool-invocation':
      return {
        type: 'tool-call',
        toolCallId: String(data.toolCallId ?? data.id ?? ''),
        toolName: String(data.toolName ?? data.name ?? ''),
        input: data.input,
        state: (data.state as ToolCall['state']) ?? 'input-streaming',
      };

    case 'tool-result':
      return {
        type: 'tool-result',
        toolCallId: String(data.toolCallId ?? ''),
        output: data.output,
        error: data.error ? String(data.error) : undefined,
      };

    case 'metadata':
      return {
        type: 'metadata',
        metadata: data.metadata as Partial<MessageMetadata>,
      };

    case 'error':
      return {
        type: 'error',
        error: String(data.error ?? 'Unknown error'),
        code: data.code ? String(data.code) : undefined,
        isRetryable: typeof data.isRetryable === 'boolean' ? data.isRetryable : undefined,
      };

    default:
      // Unknown type, ignore
      return null;
  }
}

// =============================================================================
// Stream Service Interface
// =============================================================================

export interface StreamService {
  /**
   * Connect to a stream endpoint
   */
  connect(url: string, options: StreamOptions & { body?: unknown }): StreamConnection;

  /**
   * Parse a raw chunk string into a StreamPart
   */
  parseChunk(chunk: string): StreamPart | null;

  /**
   * Handle a stream error and return appropriate error result
   */
  handleError(error: unknown): StreamError;

  /**
   * Create a new stream accumulator
   */
  createAccumulator(): StreamAccumulator;
}


// =============================================================================
// Stream Service Implementation
// =============================================================================

export const streamService: StreamService = {
  connect(url, options) {
    const { signal, onPart, onError, onComplete, body } = options;
    const abortController = new AbortController();
    const accumulator = new StreamAccumulator();
    let isActive = true;
    const messageId = `stream_${Date.now()}`;
    const conversationId = '';

    // Combine signals if provided
    const combinedSignal = signal
      ? AbortSignal.any([signal, abortController.signal])
      : abortController.signal;

    // Start the fetch in the background
    (async () => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: combinedSignal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error: StreamError = {
            message: errorText || `HTTP ${response.status}`,
            code: `HTTP_${response.status}`,
            isRetryable: response.status >= 500 || response.status === 429,
          };
          accumulator.process({ type: 'error', error: error.message, code: error.code, isRetryable: error.isRetryable });
          onError?.(error);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          const error: StreamError = {
            message: 'No response body',
            code: 'NO_BODY',
            isRetryable: false,
          };
          accumulator.process({ type: 'error', error: error.message, code: error.code, isRetryable: error.isRetryable });
          onError?.(error);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (isActive) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              const part = parseStreamChunk(buffer);
              if (part) {
                accumulator.process(part);
                onPart?.(part);
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const part = parseStreamChunk(trimmed);
            if (part) {
              accumulator.process(part);
              onPart?.(part);

              if (part.type === 'done') {
                isActive = false;
                break;
              }
            }
          }
        }

        // Call completion callback
        onComplete?.(accumulator.getMetadata());
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Requirements: 8.4 - Stream was stopped, preserve partial content
          isActive = false;
          onComplete?.(accumulator.getMetadata());
          return;
        }

        // Requirements: 8.5 - Handle error while preserving partial content
        const error = streamService.handleError(err);
        accumulator.process({ type: 'error', error: error.message, code: error.code, isRetryable: error.isRetryable });
        onError?.(error);
      } finally {
        isActive = false;
      }
    })();

    return {
      abort() {
        isActive = false;
        abortController.abort();
      },

      isActive() {
        return isActive;
      },

      getAccumulatedContent() {
        return accumulator.getState(messageId, conversationId);
      },
    };
  },

  parseChunk(chunk) {
    return parseStreamChunk(chunk);
  },

  handleError(error) {
    if (error instanceof Error) {
      // Check for specific error types
      const message = error.message.toLowerCase();
      
      if (message.includes('rate limit') || message.includes('429')) {
        return {
          message: 'Rate limit exceeded. Please try again in a moment.',
          code: 'RATE_LIMIT',
          isRetryable: true,
        };
      }

      if (message.includes('network') || message.includes('fetch')) {
        return {
          message: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR',
          isRetryable: true,
        };
      }

      if (message.includes('timeout')) {
        return {
          message: 'Request timed out. Please try again.',
          code: 'TIMEOUT',
          isRetryable: true,
        };
      }

      return {
        message: error.message,
        code: 'STREAM_ERROR',
        isRetryable: true,
      };
    }

    return {
      message: String(error),
      code: 'UNKNOWN_ERROR',
      isRetryable: false,
    };
  },

  createAccumulator() {
    return new StreamAccumulator();
  },
};

// Export parseJsonPart for testing (parseStreamChunk already exported via function declaration)
