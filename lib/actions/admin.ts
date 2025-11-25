'use server';

import { aiLogRepository, AILogQueryOptions } from '@/lib/db/repositories/ai-log-repository';
import { getUsersCollection, getInterviewsCollection, getAILogsCollection, getSettingsCollection } from '@/lib/db/collections';
import { setSearchEnabled, isSearchEnabled } from '@/lib/services/search-service';
import { AILog, AIAction } from '@/lib/db/schemas/ai-log';
import { SETTINGS_KEYS } from '@/lib/db/schemas/settings';
import { clerkClient } from '@clerk/nextjs/server';

export interface AdminUser {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  plan: string;
  interviewCount: number;
  lastActive: string;
  suspended: boolean;
  createdAt: string;
  iterationCount: number;
  iterationLimit: number;
  interviewLimit: number;
}

export interface AdminUserDetails extends AdminUser {
  stripeCustomerId?: string;
  interviews: Array<{
    id: string;
    jobTitle: string;
    company: string;
    createdAt: string;
  }>;
}

export interface AdminStats {
  totalUsers: number;
  activeThisWeek: number;
  totalInterviews: number;
  totalAIRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatencyMs: number;
}

export interface AILogWithDetails extends AILog {
  formattedTimestamp: string;
}

/**
 * Get aggregated admin statistics
 * Requirements: 9.1
 */
export async function getAdminStats(): Promise<AdminStats> {
  const usersCollection = await getUsersCollection();
  const interviewsCollection = await getInterviewsCollection();
  
  // Get total users
  const totalUsers = await usersCollection.countDocuments();
  
  // Get users active this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const activeThisWeek = await usersCollection.countDocuments({
    updatedAt: { $gte: oneWeekAgo }
  });
  
  // Get total interviews
  const totalInterviews = await interviewsCollection.countDocuments();
  
  // Get AI stats
  const aiStats = await aiLogRepository.getAggregatedStats();
  
  return {
    totalUsers,
    activeThisWeek,
    totalInterviews,
    totalAIRequests: aiStats.totalRequests,
    totalInputTokens: aiStats.totalInputTokens,
    totalOutputTokens: aiStats.totalOutputTokens,
    avgLatencyMs: aiStats.avgLatencyMs,
  };
}


/**
 * Get AI logs with pagination and filtering
 * Requirements: 9.4
 */
export async function getAILogs(options: {
  action?: AIAction;
  limit?: number;
  skip?: number;
}): Promise<AILogWithDetails[]> {
  const queryOptions: AILogQueryOptions = {
    action: options.action,
    limit: options.limit ?? 50,
    skip: options.skip ?? 0,
  };
  
  const logs = await aiLogRepository.query(queryOptions);
  
  return logs.map((log) => ({
    ...log,
    formattedTimestamp: new Date(log.timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }));
}

/**
 * Get a single AI log by ID with full trace
 * Requirements: 9.4
 */
export async function getAILogById(id: string): Promise<AILog | null> {
  return aiLogRepository.findById(id);
}

/**
 * Toggle the search tool globally
 * Requirements: 9.3
 */
export async function toggleSearchTool(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
  setSearchEnabled(enabled);
  return {
    success: true,
    enabled: isSearchEnabled(),
  };
}

/**
 * Get current search tool status
 * Requirements: 9.3
 */
export async function getSearchToolStatus(): Promise<{ enabled: boolean }> {
  return {
    enabled: isSearchEnabled(),
  };
}

/**
 * Get AI usage statistics by action type
 * Requirements: 9.1
 */
export async function getAIUsageByAction(): Promise<Array<{ action: string; count: number; avgLatency: number }>> {
  const collection = await getAILogsCollection();
  
  const pipeline = [
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        avgLatency: { $avg: '$latencyMs' },
        totalTokens: { $sum: { $add: ['$tokenUsage.input', '$tokenUsage.output'] } },
      },
    },
    {
      $sort: { count: -1 as const },
    },
  ];
  
  const results = await collection.aggregate(pipeline).toArray();
  
  return results.map((r) => ({
    action: r._id as string,
    count: r.count as number,
    avgLatency: Math.round(r.avgLatency as number),
  }));
}

/**
 * Get recent AI activity for the dashboard
 * Requirements: 9.1
 */
export async function getRecentAIActivity(limit: number = 10): Promise<AILogWithDetails[]> {
  const logs = await aiLogRepository.query({ limit });
  
  return logs.map((log) => ({
    ...log,
    formattedTimestamp: new Date(log.timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }));
}

/**
 * Model Configuration Interface
 */
export interface ModelConfig {
  defaultModel: string;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  fallbackTemperature: number;
  fallbackMaxTokens: number;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  defaultModel: 'anthropic/claude-sonnet-4',
  fallbackModel: 'openai/gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2048,
  fallbackTemperature: 0.7,
  fallbackMaxTokens: 2048,
};

/**
 * Get a setting value from the database
 */
async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const collection = await getSettingsCollection();
  const doc = await collection.findOne({ key });
  return doc ? (doc.value as T) : defaultValue;
}

/**
 * Set a setting value in the database
 */
async function setSetting<T>(key: string, value: T): Promise<void> {
  const collection = await getSettingsCollection();
  await collection.updateOne(
    { key },
    { $set: { key, value, updatedAt: new Date() } },
    { upsert: true }
  );
}

/**
 * Get the current model configuration
 */
export async function getModelConfig(): Promise<ModelConfig> {
  const [defaultModel, fallbackModel, temperature, maxTokens, fallbackTemperature, fallbackMaxTokens] = await Promise.all([
    getSetting(SETTINGS_KEYS.DEFAULT_MODEL, DEFAULT_MODEL_CONFIG.defaultModel),
    getSetting(SETTINGS_KEYS.FALLBACK_MODEL, DEFAULT_MODEL_CONFIG.fallbackModel),
    getSetting(SETTINGS_KEYS.TEMPERATURE, DEFAULT_MODEL_CONFIG.temperature),
    getSetting(SETTINGS_KEYS.MAX_TOKENS, DEFAULT_MODEL_CONFIG.maxTokens),
    getSetting(SETTINGS_KEYS.FALLBACK_TEMPERATURE, DEFAULT_MODEL_CONFIG.fallbackTemperature),
    getSetting(SETTINGS_KEYS.FALLBACK_MAX_TOKENS, DEFAULT_MODEL_CONFIG.fallbackMaxTokens),
  ]);

  return { defaultModel, fallbackModel, temperature, maxTokens, fallbackTemperature, fallbackMaxTokens };
}

/**
 * Update the default AI model
 */
export async function setDefaultModel(modelId: string): Promise<{ success: boolean; model: string }> {
  await setSetting(SETTINGS_KEYS.DEFAULT_MODEL, modelId);
  return { success: true, model: modelId };
}

/**
 * Update the fallback AI model
 */
export async function setFallbackModel(modelId: string): Promise<{ success: boolean; model: string }> {
  await setSetting(SETTINGS_KEYS.FALLBACK_MODEL, modelId);
  return { success: true, model: modelId };
}

/**
 * Update model configuration (temperature, max tokens)
 */
export async function updateModelConfig(config: Partial<ModelConfig>): Promise<{ success: boolean }> {
  const updates: Promise<void>[] = [];
  
  if (config.defaultModel !== undefined) {
    updates.push(setSetting(SETTINGS_KEYS.DEFAULT_MODEL, config.defaultModel));
  }
  if (config.fallbackModel !== undefined) {
    updates.push(setSetting(SETTINGS_KEYS.FALLBACK_MODEL, config.fallbackModel));
  }
  if (config.temperature !== undefined) {
    updates.push(setSetting(SETTINGS_KEYS.TEMPERATURE, config.temperature));
  }
  if (config.maxTokens !== undefined) {
    updates.push(setSetting(SETTINGS_KEYS.MAX_TOKENS, config.maxTokens));
  }
  if (config.fallbackTemperature !== undefined) {
    updates.push(setSetting(SETTINGS_KEYS.FALLBACK_TEMPERATURE, config.fallbackTemperature));
  }
  if (config.fallbackMaxTokens !== undefined) {
    updates.push(setSetting(SETTINGS_KEYS.FALLBACK_MAX_TOKENS, config.fallbackMaxTokens));
  }
  
  await Promise.all(updates);
  return { success: true };
}


/**
 * Get all users for admin management
 * Fetches users from MongoDB and enriches with Clerk data
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const usersCollection = await getUsersCollection();
  const interviewsCollection = await getInterviewsCollection();
  
  // Get all users from MongoDB, sorted by most recently active
  const dbUsers = await usersCollection.find({}).sort({ updatedAt: -1 }).toArray();
  
  if (dbUsers.length === 0) {
    return [];
  }
  
  // Get interview counts per user
  const interviewCounts = await interviewsCollection.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]).toArray();
  
  const interviewCountMap = new Map(
    interviewCounts.map(item => [item._id as string, item.count as number])
  );
  
  // Fetch Clerk user data for all users
  const client = await clerkClient();
  const clerkUserIds = dbUsers.map(u => u.clerkId);
  
  // Clerk getUserList supports filtering by userId array
  const clerkUsersResponse = await client.users.getUserList({
    userId: clerkUserIds,
    limit: 100,
  });
  
  const clerkUserMap = new Map(
    clerkUsersResponse.data.map(u => [u.id, u])
  );
  
  // Combine data (preserving the sort order from MongoDB)
  return dbUsers.map(dbUser => {
    const clerkUser = clerkUserMap.get(dbUser.clerkId);
    const interviewCount = interviewCountMap.get(dbUser._id) ?? 0;
    
    // Calculate last active time
    const lastActiveDate = dbUser.updatedAt;
    const lastActive = formatRelativeTime(lastActiveDate);
    
    // Build name from Clerk data
    const firstName = clerkUser?.firstName ?? '';
    const lastName = clerkUser?.lastName ?? '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown User';
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? 'No email';
    
    return {
      id: dbUser._id,
      clerkId: dbUser.clerkId,
      name,
      email,
      plan: dbUser.plan,
      interviewCount,
      lastActive,
      suspended: dbUser.suspended ?? false,
      createdAt: dbUser.createdAt.toISOString(),
      iterationCount: dbUser.iterations.count,
      iterationLimit: dbUser.iterations.limit,
      interviewLimit: dbUser.interviews?.limit ?? 3,
    };
  });
}

/**
 * Format a date as relative time (e.g., "2h ago", "1d ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}


/**
 * Get detailed user information for admin view
 */
export async function getAdminUserDetails(userId: string): Promise<AdminUserDetails | null> {
  const usersCollection = await getUsersCollection();
  const interviewsCollection = await getInterviewsCollection();
  
  const dbUser = await usersCollection.findOne({ _id: userId });
  if (!dbUser) return null;
  
  // Get user's interviews
  const interviews = await interviewsCollection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  
  // Get Clerk user data
  const client = await clerkClient();
  let clerkUser;
  try {
    clerkUser = await client.users.getUser(dbUser.clerkId);
  } catch {
    clerkUser = null;
  }
  
  const firstName = clerkUser?.firstName ?? '';
  const lastName = clerkUser?.lastName ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown User';
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? 'No email';
  
  return {
    id: dbUser._id,
    clerkId: dbUser.clerkId,
    name,
    email,
    plan: dbUser.plan,
    interviewCount: interviews.length,
    lastActive: formatRelativeTime(dbUser.updatedAt),
    suspended: dbUser.suspended ?? false,
    createdAt: dbUser.createdAt.toISOString(),
    iterationCount: dbUser.iterations.count,
    iterationLimit: dbUser.iterations.limit,
    interviewLimit: dbUser.interviews?.limit ?? 3,
    stripeCustomerId: dbUser.stripeCustomerId,
    interviews: interviews.map(i => ({
      id: i._id,
      jobTitle: i.jobDetails.title,
      company: i.jobDetails.company,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

/**
 * Update user plan (admin only)
 */
export async function updateUserPlan(
  userId: string, 
  plan: 'FREE' | 'PRO' | 'MAX'
): Promise<{ success: boolean; error?: string }> {
  const usersCollection = await getUsersCollection();
  
  // Set iteration limits based on plan
  const iterationLimits: Record<string, number> = {
    FREE: 5,
    PRO: 50,
    MAX: 999999, // Unlimited
  };
  
  // Set interview limits based on plan
  const interviewLimits: Record<string, number> = {
    FREE: 3,
    PRO: 25,
    MAX: 100,
  };
  
  const result = await usersCollection.updateOne(
    { _id: userId },
    { 
      $set: { 
        plan,
        'iterations.limit': iterationLimits[plan],
        'interviews.limit': interviewLimits[plan],
        updatedAt: new Date(),
      } 
    }
  );
  
  if (result.matchedCount === 0) {
    return { success: false, error: 'User not found' };
  }
  
  return { success: true };
}

/**
 * Suspend or unsuspend a user (admin only)
 */
export async function toggleUserSuspension(
  userId: string,
  suspended: boolean
): Promise<{ success: boolean; error?: string }> {
  const usersCollection = await getUsersCollection();
  
  const result = await usersCollection.updateOne(
    { _id: userId },
    { 
      $set: { 
        suspended,
        updatedAt: new Date(),
      } 
    }
  );
  
  if (result.matchedCount === 0) {
    return { success: false, error: 'User not found' };
  }
  
  return { success: true };
}

/**
 * Reset user iteration count (admin only)
 */
export async function resetUserIterations(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const usersCollection = await getUsersCollection();
  
  const result = await usersCollection.updateOne(
    { _id: userId },
    { 
      $set: { 
        'iterations.count': 0,
        updatedAt: new Date(),
      } 
    }
  );
  
  if (result.matchedCount === 0) {
    return { success: false, error: 'User not found' };
  }
  
  return { success: true };
}

/**
 * Generate impersonation token for a user (admin only)
 * This creates a signed token that allows admin to view as user
 */
export async function generateImpersonationToken(
  userId: string
): Promise<{ success: boolean; clerkId?: string; error?: string }> {
  const usersCollection = await getUsersCollection();
  
  const user = await usersCollection.findOne({ _id: userId });
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  // Return the clerkId for Clerk's impersonation feature
  return { success: true, clerkId: user.clerkId };
}
