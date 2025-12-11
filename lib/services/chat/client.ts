/**
 * Client-safe Chat Services
 *
 * This module exports only the services that are safe to use in client components.
 * It excludes persistence-service and other server-only code that imports MongoDB.
 *
 * Use this import in client components:
 * ```typescript
 * import { fileService } from '@/lib/services/chat/client';
 * ```
 *
 * For server components or API routes, use the full module:
 * ```typescript
 * import { persistenceService, fileService } from '@/lib/services/chat';
 * ```
 */

// =============================================================================
// File Service (Client-safe)
// =============================================================================

export {
  fileService,
  DEFAULT_FILE_CONSTRAINTS,
  createImageConstraints,
  createNoFileConstraints,
  revokeAllPreviews,
  revokeAllEncodedFiles,
  type FileService,
  type FilePreview,
  type FileConstraints,
  type ValidationResult,
} from './file-service';

// =============================================================================
// Stream Service (Client-safe)
// =============================================================================

export {
  streamService,
  StreamAccumulator,
  parseStreamChunk,
  type StreamService,
  type StreamPart,
  type StreamPartType,
  type TextStreamPart,
  type ReasoningStreamPart,
  type ToolCallStreamPart,
  type ToolResultStreamPart,
  type MetadataStreamPart,
  type ErrorStreamPart,
  type DoneStreamPart,
  type StreamOptions,
  type StreamConnection,
} from './stream-service';

// =============================================================================
// Error Handler (Client-safe)
// =============================================================================

export {
  errorHandler,
  categorizeError,
  createChatError,
  toStreamError,
  fromStreamError,
  withRetry,
  type ErrorHandler,
  type ChatError,
  type ErrorCategory,
  type ErrorResult,
  type LogContext,
  type RetryStrategy,
  type RetryOptions,
} from './error-handler';
