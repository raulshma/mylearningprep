/**
 * Chat Error Handler Service
 *
 * Provides error categorization, retry strategies with exponential backoff,
 * and user-friendly message generation for the AI Chat feature.
 *
 * Requirements: 11.1, 11.3, 11.4, 11.5
 */

import type { StreamError } from '@/lib/store/chat/types';

// =============================================================================
// Error Categories
// =============================================================================

export type ErrorCategory = 'network' | 'api' | 'stream' | 'validation' | 'rateLimit' | 'unknown';

export interface ChatError {
  message: string;
  code?: string;
  category: ErrorCategory;
  originalError?: unknown;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface ErrorResult {
  userMessage: string;
  action?: 'retry' | 'dismiss' | 'redirect' | 'switch-model';
  retryDelay?: number;
  shouldLog: boolean;
}

export interface LogContext {
  errorType: string;
  category: ErrorCategory;
  code?: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}

// =============================================================================
// Retry Strategy Configuration
// =============================================================================

export interface RetryStrategy {
  isRetryable: boolean;
  maxRetries: number;
  backoffMs: number[];
  fallback: 'queue' | 'show-error' | 'suggest-model-switch' | 'preserve-partial';
}

const errorStrategies: Record<ErrorCategory, RetryStrategy> = {
  network: {
    isRetryable: true,
    maxRetries: 3,
    backoffMs: [1000, 2000, 4000],
    fallback: 'queue',
  },
  rateLimit: {
    isRetryable: true,
    maxRetries: 1,
    backoffMs: [60000],
    fallback: 'suggest-model-switch',
  },
  api: {
    isRetryable: true,
    maxRetries: 2,
    backoffMs: [1000, 2000],
    fallback: 'show-error',
  },
  stream: {
    isRetryable: true,
    maxRetries: 2,
    backoffMs: [500, 1000],
    fallback: 'preserve-partial',
  },
  validation: {
    isRetryable: false,
    maxRetries: 0,
    backoffMs: [],
    fallback: 'show-error',
  },
  unknown: {
    isRetryable: false,
    maxRetries: 0,
    backoffMs: [],
    fallback: 'show-error',
  },
};

// =============================================================================
// User-Friendly Messages
// =============================================================================

const userMessages: Record<ErrorCategory, Record<string, string>> = {
  network: {
    default: 'Unable to connect. Please check your internet connection and try again.',
    timeout: 'The request timed out. Please try again.',
    offline: 'You appear to be offline. Your message will be sent when you reconnect.',
  },
  rateLimit: {
    default: 'Too many requests. Please wait a moment before trying again.',
    quota: 'You have reached your usage limit. Consider upgrading your plan or waiting.',
  },
  api: {
    default: 'Something went wrong on our end. Please try again.',
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'You do not have permission to perform this action.',
    notFound: 'The requested resource was not found.',
    serverError: 'Our servers are experiencing issues. Please try again later.',
  },
  stream: {
    default: 'The response was interrupted. Your partial content has been saved.',
    connectionLost: 'Connection lost during response. Please try again.',
  },
  validation: {
    default: 'Invalid input. Please check your message and try again.',
    emptyMessage: 'Please enter a message before sending.',
    fileTooLarge: 'The attached file is too large. Please use a smaller file.',
    invalidFileType: 'This file type is not supported.',
  },
  unknown: {
    default: 'An unexpected error occurred. Please try again.',
  },
};

// =============================================================================
// Error Categorization
// =============================================================================

/**
 * Categorize an error based on its properties
 * Requirements: 11.1 - Display user-friendly error message with failure reason
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (
      name === 'typeerror' && message.includes('fetch') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('offline') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return 'network';
    }

    // Rate limit errors
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429') ||
      message.includes('quota')
    ) {
      return 'rateLimit';
    }

    // Stream errors
    if (
      message.includes('stream') ||
      message.includes('aborted') ||
      message.includes('chunk')
    ) {
      return 'stream';
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('schema')
    ) {
      return 'validation';
    }

    // API errors (check HTTP status codes in message)
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return 'api';
    }
  }

  // Check for StreamError type
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const streamError = error as StreamError;
    if (streamError.code) {
      const code = streamError.code.toLowerCase();
      if (code.includes('network') || code.includes('timeout')) return 'network';
      if (code.includes('rate') || code === 'http_429') return 'rateLimit';
      if (code.includes('stream')) return 'stream';
      if (code.startsWith('http_4')) return 'api';
      if (code.startsWith('http_5')) return 'api';
    }
  }

  return 'unknown';
}

/**
 * Create a ChatError from any error type
 */
export function createChatError(
  error: unknown,
  context?: Record<string, unknown>
): ChatError {
  const category = categorizeError(error);
  let message = 'An unknown error occurred';
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    if ('message' in error) {
      message = String((error as { message: unknown }).message);
    }
    if ('code' in error) {
      code = String((error as { code: unknown }).code);
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    message,
    code,
    category,
    originalError: error,
    context,
    timestamp: new Date(),
  };
}

// =============================================================================
// Error Handler Interface
// =============================================================================

export interface ErrorHandler {
  /**
   * Handle an error and return appropriate result
   * Requirements: 11.1 - Display user-friendly error message
   */
  handle(error: ChatError): ErrorResult;

  /**
   * Check if an error is retryable
   * Requirements: 11.5 - Provide retry action for retryable errors
   */
  isRetryable(error: ChatError): boolean;

  /**
   * Get user-friendly message for an error
   * Requirements: 11.1 - User-friendly error message with failure reason
   */
  getUserMessage(error: ChatError): string;

  /**
   * Get logging context for an error
   * Requirements: 11.4 - Log diagnostic information for debugging
   */
  getLogContext(error: ChatError): LogContext;

  /**
   * Get retry strategy for an error category
   */
  getRetryStrategy(category: ErrorCategory): RetryStrategy;

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(category: ErrorCategory, attemptNumber: number): number;
}

// =============================================================================
// Error Handler Implementation
// =============================================================================

export const errorHandler: ErrorHandler = {
  handle(error: ChatError): ErrorResult {
    const strategy = this.getRetryStrategy(error.category);
    const userMessage = this.getUserMessage(error);
    const shouldLog = error.category !== 'validation'; // Don't log validation errors

    // Requirements: 11.4 - Log diagnostic information
    if (shouldLog) {
      const logContext = this.getLogContext(error);
      console.error('[ChatError]', logContext);
    }

    // Determine action based on strategy
    let action: ErrorResult['action'];
    if (strategy.isRetryable) {
      // Requirements: 11.5 - Provide retry action
      action = 'retry';
    } else if (strategy.fallback === 'suggest-model-switch') {
      action = 'switch-model';
    } else {
      action = 'dismiss';
    }

    // Calculate retry delay for first attempt
    const retryDelay = strategy.isRetryable ? strategy.backoffMs[0] : undefined;

    return {
      userMessage,
      action,
      retryDelay,
      shouldLog,
    };
  },

  isRetryable(error: ChatError): boolean {
    const strategy = this.getRetryStrategy(error.category);
    return strategy.isRetryable;
  },

  getUserMessage(error: ChatError): string {
    const categoryMessages = userMessages[error.category];
    
    // Try to find a specific message based on error code or content
    if (error.code) {
      const code = error.code.toLowerCase();
      
      // Check for specific HTTP status codes
      if (code.includes('401') || code === 'http_401') {
        return categoryMessages.unauthorized || userMessages.api.unauthorized;
      }
      if (code.includes('403') || code === 'http_403') {
        return categoryMessages.forbidden || userMessages.api.forbidden;
      }
      if (code.includes('404') || code === 'http_404') {
        return categoryMessages.notFound || userMessages.api.notFound;
      }
      if (code.includes('429') || code === 'http_429') {
        return userMessages.rateLimit.default;
      }
      if (code.includes('5') && code.startsWith('http_')) {
        return userMessages.api.serverError;
      }
      if (code.includes('timeout')) {
        return userMessages.network.timeout;
      }
      if (code.includes('offline')) {
        return userMessages.network.offline;
      }
    }

    // Check error message for specific conditions
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) {
      return userMessages.network.timeout;
    }
    if (message.includes('offline')) {
      return userMessages.network.offline;
    }
    if (message.includes('quota')) {
      return userMessages.rateLimit.quota;
    }
    if (message.includes('empty')) {
      return userMessages.validation.emptyMessage;
    }
    if (message.includes('too large') || message.includes('size')) {
      return userMessages.validation.fileTooLarge;
    }
    if (message.includes('file type') || message.includes('unsupported')) {
      return userMessages.validation.invalidFileType;
    }

    // Return default message for category
    return categoryMessages.default;
  },

  getLogContext(error: ChatError): LogContext {
    const context: LogContext = {
      errorType: error.originalError instanceof Error 
        ? error.originalError.name 
        : typeof error.originalError,
      category: error.category,
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp.toISOString(),
    };

    // Include stack trace if available
    if (error.originalError instanceof Error && error.originalError.stack) {
      context.stack = error.originalError.stack;
    }

    return context;
  },

  getRetryStrategy(category: ErrorCategory): RetryStrategy {
    return errorStrategies[category];
  },

  calculateRetryDelay(category: ErrorCategory, attemptNumber: number): number {
    const strategy = this.getRetryStrategy(category);
    
    if (!strategy.isRetryable || attemptNumber >= strategy.maxRetries) {
      return -1; // No more retries
    }

    // Use configured backoff or calculate exponential
    if (attemptNumber < strategy.backoffMs.length) {
      return strategy.backoffMs[attemptNumber];
    }

    // Fallback to exponential backoff with last configured value as base
    const lastBackoff = strategy.backoffMs[strategy.backoffMs.length - 1] || 1000;
    return lastBackoff * Math.pow(2, attemptNumber - strategy.backoffMs.length + 1);
  },
};

// =============================================================================
// Retry Utilities
// =============================================================================

export interface RetryOptions {
  maxRetries?: number;
  onRetry?: (attemptNumber: number, delay: number, error: ChatError) => void;
  shouldRetry?: (error: ChatError, attemptNumber: number) => boolean;
}

/**
 * Execute a function with automatic retry on failure
 * Requirements: 11.5 - Provide retry capability
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  category: ErrorCategory,
  options: RetryOptions = {}
): Promise<T> {
  const strategy = errorHandler.getRetryStrategy(category);
  const maxRetries = options.maxRetries ?? strategy.maxRetries;
  
  let lastError: ChatError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = createChatError(error);
      
      // Check if we should retry
      const shouldRetry = options.shouldRetry 
        ? options.shouldRetry(lastError, attempt)
        : errorHandler.isRetryable(lastError) && attempt < maxRetries;
      
      if (!shouldRetry) {
        throw lastError;
      }
      
      // Calculate delay and wait
      const delay = errorHandler.calculateRetryDelay(category, attempt);
      if (delay > 0) {
        options.onRetry?.(attempt, delay, lastError);
        await sleep(delay);
      }
    }
  }
  
  // Should not reach here, but throw last error if we do
  throw lastError ?? createChatError(new Error('Retry failed'));
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Error Conversion Utilities
// =============================================================================

/**
 * Convert a ChatError to a StreamError for use in stream handling
 */
export function toStreamError(error: ChatError): StreamError {
  return {
    message: errorHandler.getUserMessage(error),
    code: error.code,
    isRetryable: errorHandler.isRetryable(error),
  };
}

/**
 * Convert a StreamError to a ChatError
 */
export function fromStreamError(error: StreamError, context?: Record<string, unknown>): ChatError {
  return {
    message: error.message,
    code: error.code,
    category: categorizeError(error),
    originalError: error,
    context,
    timestamp: new Date(),
  };
}

// =============================================================================
// Export for testing
// =============================================================================

export { errorStrategies, userMessages };
