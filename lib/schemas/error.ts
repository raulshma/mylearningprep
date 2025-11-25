import { z } from 'zod';

/**
 * API Error codes for consistent error handling
 */
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'AUTH_ERROR',
  'RATE_LIMIT',
  'AI_ERROR',
  'DATABASE_ERROR',
  'NOT_FOUND',
  'PARSE_ERROR',
]);

/**
 * Schema for API error responses
 * Provides consistent error structure across the application
 */
export const APIErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string()).optional(),
  retryAfter: z.number().optional(),
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;

/**
 * Helper function to create a typed API error
 */
export function createAPIError(
  code: ErrorCode,
  message: string,
  details?: Record<string, string>,
  retryAfter?: number
): APIError {
  return {
    code,
    message,
    ...(details && { details }),
    ...(retryAfter && { retryAfter }),
  };
}
