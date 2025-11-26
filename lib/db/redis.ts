import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error("Please define the REDIS_URL environment variable");
}

interface RedisClientCache {
  client: Redis | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: RedisClientCache | undefined;
}

const cached: RedisClientCache = global._redisClient ?? {
  client: null,
};

if (!global._redisClient) {
  global._redisClient = cached;
}

/**
 * Get the singleton Redis client instance
 * Uses connection pooling and caches the client globally
 */
export function getRedisClient(): Redis {
  if (cached.client) {
    return cached.client;
  }

  const client = new Redis(REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        // Only reconnect when the error contains "READONLY"
        return true;
      }
      return false;
    },
  });

  client.on("error", (err: Error) => {
    console.error("Redis Client Error:", err);
  });

  client.on("connect", () => {
    console.log("Redis Client Connected");
  });

  cached.client = client;
  return client;
}

/**
 * Close the Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (cached.client) {
    await cached.client.quit();
    cached.client = null;
  }
}
