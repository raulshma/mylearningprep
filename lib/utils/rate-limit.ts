import { getRedisClient } from "@/lib/db/redis";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  maxRequests: 30,
  windowSeconds: 60,
};

/**
 * Rate limit a request using Redis sliding window algorithm
 *
 * @param key - Unique identifier for the rate limit (e.g., `api:models:${ip}`)
 * @param options - Rate limit configuration
 * @returns Result with success status, remaining requests, and reset time
 *
 * @example
 * ```typescript
 * const result = await rateLimit(`api:models:${ip}`);
 * if (!result.success) {
 *   return new Response('Too Many Requests', {
 *     status: 429,
 *     headers: { 'Retry-After': String(result.resetInSeconds) }
 *   });
 * }
 * ```
 */
export async function rateLimit(
  key: string,
  options: Partial<RateLimitOptions> = {}
): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds } = { ...DEFAULT_OPTIONS, ...options };
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `ratelimit:${key}`;

  try {
    // Use a Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(redisKey);

    // Add current request with timestamp as score
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

    // Set expiry on the key
    pipeline.expire(redisKey, windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      // Redis pipeline failed, allow request but log warning
      console.warn("Rate limit pipeline returned null");
      return {
        success: true,
        remaining: maxRequests - 1,
        resetInSeconds: windowSeconds,
      };
    }

    // Get the count from the zcard result (index 1)
    const [, zcardResult] = results;
    const currentCount = (zcardResult?.[1] as number) ?? 0;

    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const success = currentCount < maxRequests;

    return {
      success,
      remaining,
      resetInSeconds: windowSeconds,
    };
  } catch (error) {
    // On Redis error, log and allow the request (fail open)
    console.error("Rate limit error:", error);
    return {
      success: true,
      remaining: maxRequests - 1,
      resetInSeconds: windowSeconds,
    };
  }
}

/**
 * Get the client IP address from request headers
 * Handles common proxy headers like x-forwarded-for
 */
export function getClientIp(request: Request): string {
  // Try x-forwarded-for first (set by proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Try x-real-ip (used by some proxies)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Try cf-connecting-ip (Cloudflare)
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Fallback to a generic key
  return "unknown";
}
