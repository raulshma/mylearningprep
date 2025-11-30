/**
 * Stream Store Service
 * Manages active stream tracking for resumable streaming using Vercel AI SDK's resumable-stream
 * Uses Redis for stream ID persistence and tracking
 */

import { getRedisClient } from "@/lib/db/redis";

const STREAM_PREFIX = "stream:";
const STREAM_CONTENT_PREFIX = "stream-content:";
const LP_STREAM_PREFIX = "lp-stream:";
const LP_STREAM_CONTENT_PREFIX = "lp-stream-content:";
const STREAM_TTL = 60 * 5; // 5 minutes - streams expire after this time

export interface StreamRecord {
  streamId: string;
  interviewId: string;
  module: string;
  userId: string;
  createdAt: number;
  status: "active" | "completed" | "error";
  // The actual resumable stream ID from resumable-stream package
  resumableStreamId?: string;
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
 * Update stream with the resumable stream ID from resumable-stream package
 */
export async function updateResumableStreamId(
  interviewId: string,
  module: string,
  resumableStreamId: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${STREAM_PREFIX}${interviewId}:${module}`;
  const data = await redis.get(key);
  if (data) {
    const record = JSON.parse(data) as StreamRecord;
    record.resumableStreamId = resumableStreamId;
    await redis.setex(key, STREAM_TTL, JSON.stringify(record));
  }
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
  const contentKey = `${STREAM_CONTENT_PREFIX}${interviewId}:${module}`;
  const data = await redis.get(key);
  if (data) {
    const record = JSON.parse(data) as StreamRecord;
    record.status = status;
    // Keep for 2 minutes after completion so client can detect it finished and retrieve content
    await redis.setex(key, 120, JSON.stringify(record));
    // Also extend content TTL so it's available for resumption
    await redis.expire(contentKey, 120);
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


// ============================================
// Learning Path Stream Functions
// ============================================

export interface LearningPathStreamRecord {
  streamId: string;
  learningPathId: string;
  activityType: string;
  userId: string;
  createdAt: number;
  status: "active" | "completed" | "error";
}

/**
 * Save a learning path stream record
 */
export async function saveLearningPathStream(
  record: Omit<LearningPathStreamRecord, "status">
): Promise<void> {
  const redis = getRedisClient();
  const key = `${LP_STREAM_PREFIX}${record.learningPathId}`;
  await redis.setex(key, STREAM_TTL, JSON.stringify({ ...record, status: "active" }));
}

/**
 * Get a learning path stream record
 */
export async function getLearningPathStream(
  learningPathId: string
): Promise<LearningPathStreamRecord | null> {
  const redis = getRedisClient();
  const key = `${LP_STREAM_PREFIX}${learningPathId}`;
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as LearningPathStreamRecord;
  } catch {
    return null;
  }
}

/**
 * Update learning path stream status
 */
export async function updateLearningPathStreamStatus(
  learningPathId: string,
  status: "completed" | "error"
): Promise<void> {
  const redis = getRedisClient();
  const key = `${LP_STREAM_PREFIX}${learningPathId}`;
  const data = await redis.get(key);
  if (data) {
    const record = JSON.parse(data) as LearningPathStreamRecord;
    record.status = status;
    // Keep for a short time after completion so client can detect it finished
    await redis.setex(key, 30, JSON.stringify(record));
  }
}

/**
 * Clear a learning path stream record
 */
export async function clearLearningPathStream(
  learningPathId: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${LP_STREAM_PREFIX}${learningPathId}`;
  await redis.del(key);
  // Also clear content buffer
  await clearLearningPathStreamContent(learningPathId);
}

/**
 * Check if there's an active learning path stream
 */
export async function hasActiveLearningPathStream(
  learningPathId: string
): Promise<boolean> {
  const stream = await getLearningPathStream(learningPathId);
  return stream !== null && stream.status === "active";
}

/**
 * Append content to learning path stream buffer (for resumption)
 */
export async function appendLearningPathStreamContent(
  learningPathId: string,
  content: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${LP_STREAM_CONTENT_PREFIX}${learningPathId}`;
  await redis.append(key, content);
  await redis.expire(key, STREAM_TTL);
}

/**
 * Get buffered learning path stream content
 */
export async function getLearningPathStreamContent(
  learningPathId: string
): Promise<string | null> {
  const redis = getRedisClient();
  const key = `${LP_STREAM_CONTENT_PREFIX}${learningPathId}`;
  return redis.get(key);
}

/**
 * Clear learning path stream content buffer
 */
export async function clearLearningPathStreamContent(
  learningPathId: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${LP_STREAM_CONTENT_PREFIX}${learningPathId}`;
  await redis.del(key);
}
