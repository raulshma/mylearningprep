/**
 * Chat Services Module
 *
 * Exports all chat-related services for the AI Chat feature.
 * These services encapsulate business logic and side effects,
 * keeping components focused on presentation.
 *
 * ## Architecture
 *
 * The service layer provides:
 * - **PersistenceService**: CRUD operations for conversations and messages
 * - **StreamService**: Stream parsing and connection handling
 * - **FileService**: File attachment validation, preview, and encoding
 * - **AIService**: AI request orchestration and streaming
 * - **ErrorHandler**: Error categorization, retry strategies, and user messages
 * - **OfflineQueueService**: Action queueing for offline support
 * - **ConversationCacheService**: LRU cache for fast conversation switching
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   persistenceService,
 *   aiService,
 *   fileService,
 *   errorHandler,
 * } from '@/lib/services/chat';
 *
 * // Load conversations
 * const conversations = await persistenceService.loadConversations();
 *
 * // Send a message with streaming
 * const handle = await aiService.sendMessage({
 *   conversationId,
 *   content: 'Hello',
 *   onChunk: (chunk) => console.log(chunk),
 * });
 *
 * // Validate and encode a file
 * const validation = fileService.validateFile(file, DEFAULT_FILE_CONSTRAINTS);
 * if (validation.valid) {
 *   const encoded = await fileService.encodeForUpload(file);
 * }
 *
 * // Handle errors
 * const result = errorHandler.handle(createChatError(error));
 * console.log(result.userMessage);
 * ```
 *
 * @module lib/services/chat
 */

// =============================================================================
// Persistence Service
// =============================================================================

/**
 * Persistence Service
 *
 * Handles all CRUD operations for conversations and messages.
 * Uses the repository pattern for data access.
 *
 * @see {@link ./persistence-service.ts}
 */
export {
  /** Singleton persistence service instance */
  persistenceService,
  /** PersistenceService interface type */
  type PersistenceService,
  /** Options for loading conversations */
  type LoadConversationsOptions,
  /** Parameters for creating a conversation */
  type CreateConversationParams,
  /** Convert DB conversation to store format */
  toStoreConversation,
  /** Convert DB message to store format */
  toStoreMessage,
  /** Convert store message to DB format */
  toDbMessage,
  /** Validate conversation data against schema */
  validateConversationData,
} from './persistence-service';

// =============================================================================
// Stream Service
// =============================================================================

/**
 * Stream Service
 *
 * Handles streaming response parsing and connection management.
 * Supports text, reasoning, tool calls, and metadata chunks.
 *
 * @see {@link ./stream-service.ts}
 */
export {
  /** Singleton stream service instance */
  streamService,
  /** Accumulator class for building streaming content */
  StreamAccumulator,
  /** Parse a single stream chunk */
  parseStreamChunk,
  /** StreamService interface type */
  type StreamService,
  /** Union type for all stream part types */
  type StreamPart,
  /** Stream part type discriminator */
  type StreamPartType,
  /** Text content stream part */
  type TextStreamPart,
  /** Reasoning content stream part */
  type ReasoningStreamPart,
  /** Tool call stream part */
  type ToolCallStreamPart,
  /** Tool result stream part */
  type ToolResultStreamPart,
  /** Metadata stream part */
  type MetadataStreamPart,
  /** Error stream part */
  type ErrorStreamPart,
  /** Done signal stream part */
  type DoneStreamPart,
  /** Options for stream connection */
  type StreamOptions,
  /** Stream connection handle */
  type StreamConnection,
} from './stream-service';

// =============================================================================
// File Service
// =============================================================================

/**
 * File Service
 *
 * Handles file attachment validation, preview generation, and encoding.
 * Supports image files with configurable constraints.
 *
 * @see {@link ./file-service.ts}
 */
export {
  /** Singleton file service instance */
  fileService,
  /** Default file constraints for image attachments */
  DEFAULT_FILE_CONSTRAINTS,
  /** Create constraints for image files */
  createImageConstraints,
  /** Create constraints that reject all files */
  createNoFileConstraints,
  /** Revoke all preview URLs (cleanup utility) */
  revokeAllPreviews,
  /** Revoke all encoded file URLs (cleanup utility) */
  revokeAllEncodedFiles,
  /** FileService interface type */
  type FileService,
  /** File preview with URL and metadata */
  type FilePreview,
  /** File validation constraints */
  type FileConstraints,
  /** File validation result */
  type ValidationResult,
} from './file-service';

// =============================================================================
// AI Service
// =============================================================================

/**
 * AI Service
 *
 * Orchestrates AI requests including single-model and multi-model modes.
 * Handles streaming, cancellation, and regeneration.
 *
 * @see {@link ./ai-service.ts}
 */
export {
  /** Singleton AI service instance */
  aiService,
  /** Abort all active streams (cleanup utility) */
  abortAllStreams,
  /** Get count of active streams */
  getActiveStreamCount,
  /** AIService interface type */
  type AIService,
  /** Parameters for sending a message */
  type SendMessageParams,
  /** Parameters for multi-model requests */
  type MultiModelParams,
  /** Handle for controlling a stream */
  type StreamHandle,
  /** Handle for controlling multiple streams */
  type MultiStreamHandle,
  /** Callbacks for stream events */
  type StreamCallbacks,
  /** Callbacks for multi-stream events */
  type MultiStreamCallbacks,
} from './ai-service';

// =============================================================================
// Error Handler Service
// =============================================================================

/**
 * Error Handler Service
 *
 * Provides error categorization, retry strategies with exponential backoff,
 * and user-friendly message generation.
 *
 * @see {@link ./error-handler.ts}
 */
export {
  /** Singleton error handler instance */
  errorHandler,
  /** Categorize an error by type */
  categorizeError,
  /** Create a ChatError from any error type */
  createChatError,
  /** Convert ChatError to StreamError */
  toStreamError,
  /** Convert StreamError to ChatError */
  fromStreamError,
  /** Execute a function with automatic retry */
  withRetry,
  /** ErrorHandler interface type */
  type ErrorHandler,
  /** Structured chat error */
  type ChatError,
  /** Error category discriminator */
  type ErrorCategory,
  /** Error handling result */
  type ErrorResult,
  /** Logging context for errors */
  type LogContext,
  /** Retry strategy configuration */
  type RetryStrategy,
  /** Options for withRetry function */
  type RetryOptions,
} from './error-handler';

// =============================================================================
// Offline Queue Service
// =============================================================================

/**
 * Offline Queue Service
 *
 * Handles action queueing when offline and automatic retry
 * when connectivity is restored.
 *
 * @see {@link ./offline-queue.ts}
 */
export {
  /** Singleton offline queue service instance */
  offlineQueueService,
  /** Queue a message to be sent when online */
  queueMessage,
  /** Queue a conversation creation */
  queueCreateConversation,
  /** Queue a conversation update */
  queueUpdateConversation,
  /** Queue a conversation deletion */
  queueDeleteConversation,
  /** OfflineQueueService interface type */
  type OfflineQueueService,
  /** A queued action */
  type QueuedAction,
  /** Queued action type discriminator */
  type QueuedActionType,
  /** Current queue state */
  type QueueState,
  /** Callbacks for queue events */
  type QueueCallbacks,
  /** Payload for send message action */
  type SendMessagePayload,
  /** Payload for create conversation action */
  type CreateConversationPayload,
  /** Payload for update conversation action */
  type UpdateConversationPayload,
  /** Payload for delete conversation action */
  type DeleteConversationPayload,
  /** Union of all action payloads */
  type ActionPayload,
  /** Function type for executing actions */
  type ActionExecutor,
} from './offline-queue';

// =============================================================================
// Conversation Cache Service
// =============================================================================

/**
 * Conversation Cache Service
 *
 * LRU cache for recently viewed conversations to enable
 * fast conversation switching (< 200ms target).
 *
 * @see {@link ./conversation-cache.ts}
 */
export {
  /** Singleton conversation cache service instance */
  conversationCacheService,
  /** Direct cache instance (for advanced usage) */
  conversationCache,
  /** LRU cache implementation class */
  ConversationLRUCache,
  /** ConversationCacheService interface type */
  type ConversationCacheService,
} from './conversation-cache';
