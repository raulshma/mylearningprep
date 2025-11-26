/**
 * Stream Store Service
 * Manages active stream tracking for resumable streaming
 * Uses Redis for stream ID persistence and tracking
 */

import { getRedisClient } from "@/lib/db/redis";

const STREAM_PREFIX = "stream:";
const STREAM_CONTENT_PREFIX = "stream-content:";
const STREAM_TTL = 60 * 5; // 5 minutes - streams expire after this time

export interface StreamRecord {
  streamId: string;
  interviewId: string;
  module: string;
  userId: string;
  createdAt: number;
  status: "active" | "completed" | "error";
}

/**
 * Save an active stream record
 */
export async function saveActiveStream(record: Omit<StreamRecord, "status">): Promise<void> {
  const redis = getRedisClient();
  const key = `${STREAM_PREFIX}${record.interviewId}:${record.module}`;
  await redis.setex(key, STREAM_TTL, JSON.stringify({ ...record, status: "active" }));
}

/**
 * Update stream status
 */
export async function updateStreamStatus(
  interviewId: string,
  module: string,
  status: "completed" | "error"
): Promise<void> {
  const redis = getRedisClient();
  const key = `${STREAM_PREFIX}${interviewId}:${module}`;
  const data = await redis.get(key);
  if (data) {
    const record = JSON.parse(data) as StreamRecord;
    record.status = status;
    // Keep for a short time after completion so client can detect it finished
    await redis.setex(key, 30, JSON.stringify(record));
  }
}

/**
 * Append content to stream buffer (for resumption)
 */
export async function appendStreamContent(
  interviewId: string,
  module: string,
  content: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${STREAM_CONTENT_PREFIX}${interviewId}:${module}`;
  await redis.append(key, content);
  await redis.expire(key, STREAM_TTL);
}

/**
 * Get buffered stream content
 */
export async function getStreamContent(
  interviewId: string,
  module: string
): Promise<string | null> {
  const redis = getRedisClient();
  const key = `${STREAM_CONTENT_PREFIX}${interviewId}:${module}`;
  return redis.get(key);
}

/**
 * Clear stream content buffer
 */
export async function clearStreamContent(
  interviewId: string,
  module: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${STREAM_CONTENT_PREFIX}${interviewId}:${module}`;
  await redis.del(key);
}

/**
 * Get an active stream record for an interview module
 */
export async function getActiveStream(
  interviewId: string,
  module: string
): Promise<StreamRecord | null> {
  const redis = getRedisClient();
  const key = `${STREAM_PREFIX}${interviewId}:${module}`;
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as StreamRecord;
  } catch {
    return null;
  }
}

/**
 * Clear an active stream record
 */
export async function clearActiveStream(
  interviewId: string,
  module: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${STREAM_PREFIX}${interviewId}:${module}`;
  await redis.del(key);
  // Also clear content buffer
  await clearStreamContent(interviewId, module);
}

/**
 * Get all active streams for an interview
 */
export async function getActiveStreamsForInterview(
  interviewId: string
): Promise<StreamRecord[]> {
  const redis = getRedisClient();
  const pattern = `${STREAM_PREFIX}${interviewId}:*`;
  const keys = await redis.keys(pattern);
  
  if (keys.length === 0) return [];
  
  const records: StreamRecord[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      try {
        records.push(JSON.parse(data) as StreamRecord);
      } catch {
        // Skip invalid records
      }
    }
  }
  
  return records;
}

/**
 * Check if there's an active stream for a module
 */
export async function hasActiveStream(
  interviewId: string,
  module: string
): Promise<boolean> {
  const stream = await getActiveStream(interviewId, module);
  return stream !== null && stream.status === "active";
}
