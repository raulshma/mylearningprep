import { getDb } from './client';
import { COLLECTIONS } from './collections';

/**
 * Ensure all required indexes exist for optimal query performance.
 * Call this once during app initialization.
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  // Users collection indexes
  const users = db.collection(COLLECTIONS.USERS);
  await Promise.all([
    users.createIndex({ clerkId: 1 }, { unique: true }),
    users.createIndex({ updatedAt: -1 }),
    users.createIndex({ plan: 1 }),
    users.createIndex({ createdAt: -1 }),
  ]);

  // Interviews collection indexes
  const interviews = db.collection(COLLECTIONS.INTERVIEWS);
  await Promise.all([
    interviews.createIndex({ userId: 1 }),
    interviews.createIndex({ createdAt: -1 }),
    interviews.createIndex({ 'jobDetails.title': 1 }),
    interviews.createIndex({ 'jobDetails.company': 1 }),
    interviews.createIndex({ userId: 1, createdAt: -1 }),
  ]);

  // AI Logs collection indexes (most critical for admin dashboard)
  const aiLogs = db.collection(COLLECTIONS.AI_LOGS);
  await Promise.all([
    aiLogs.createIndex({ timestamp: -1 }),
    aiLogs.createIndex({ userId: 1 }),
    aiLogs.createIndex({ interviewId: 1 }),
    aiLogs.createIndex({ action: 1 }),
    aiLogs.createIndex({ status: 1 }),
    aiLogs.createIndex({ model: 1 }),
    aiLogs.createIndex({ timestamp: -1, status: 1 }),
    aiLogs.createIndex({ timestamp: -1, action: 1 }),
    // Compound index for common admin queries
    aiLogs.createIndex({ status: 1, timestamp: -1 }),
  ]);

  // Settings collection indexes
  const settings = db.collection(COLLECTIONS.SETTINGS);
  await settings.createIndex({ key: 1 }, { unique: true });

  // Topic chats collection indexes
  const topicChats = db.collection(COLLECTIONS.TOPIC_CHATS);
  await Promise.all([
    topicChats.createIndex({ interviewId: 1, topicId: 1 }),
    topicChats.createIndex({ userId: 1 }),
  ]);
}
