"use server";

import {
  aiLogRepository,
  AILogQueryOptions,
} from "@/lib/db/repositories/ai-log-repository";
import {
  getUsersCollection,
  getInterviewsCollection,
  getAILogsCollection,
  getSettingsCollection,
} from "@/lib/db/collections";
import {
  setSearchEnabled,
  isSearchEnabled,
} from "@/lib/services/search-service";
import { AILog, AIAction, AIStatus } from "@/lib/db/schemas/ai-log";
import { SETTINGS_KEYS } from "@/lib/db/schemas/settings";
import { clerkClient } from "@clerk/nextjs/server";
import {
  requireAdmin,
  UnauthorizedResponse,
  getAuthUser,
} from "@/lib/auth/get-user";
import { logAdminAction } from "@/lib/services/audit-log";

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
  totalCost: number;
  errorCount: number;
  errorRate: number;
  avgTimeToFirstToken: number;
}

export interface AILogWithDetails extends AILog {
  formattedTimestamp: string;
}

export interface AILogFilters {
  action?: AIAction;
  status?: AIStatus;
  model?: string;
  startDate?: string;
  endDate?: string;
  hasError?: boolean;
  limit?: number;
  skip?: number;
}

/**
 * Get aggregated admin statistics
 * Requirements: 9.1
 */
export async function getAdminStats(): Promise<
  AdminStats | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();
    const interviewsCollection = await getInterviewsCollection();

    // Get total users
    const totalUsers = await usersCollection.countDocuments();

    // Get users active this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const activeThisWeek = await usersCollection.countDocuments({
      updatedAt: { $gte: oneWeekAgo },
    });

    // Get total interviews
    const totalInterviews = await interviewsCollection.countDocuments();

    // Get AI stats with full observability
    const aiStats = await aiLogRepository.getAggregatedStats();

    const errorRate =
      aiStats.totalRequests > 0
        ? Math.round((aiStats.errorCount / aiStats.totalRequests) * 10000) / 100
        : 0;

    return {
      totalUsers,
      activeThisWeek,
      totalInterviews,
      totalAIRequests: aiStats.totalRequests,
      totalInputTokens: aiStats.totalInputTokens,
      totalOutputTokens: aiStats.totalOutputTokens,
      avgLatencyMs: aiStats.avgLatencyMs,
      totalCost: aiStats.totalCost,
      errorCount: aiStats.errorCount,
      errorRate,
      avgTimeToFirstToken: aiStats.avgTimeToFirstToken,
    };
  });
}

/**
 * Get AI logs with pagination and filtering
 * Requirements: 9.4
 */
export async function getAILogs(
  filters: AILogFilters = {}
): Promise<AILogWithDetails[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const queryOptions: AILogQueryOptions = {
      action: filters.action,
      status: filters.status,
      model: filters.model,
      hasError: filters.hasError,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      limit: filters.limit ?? 50,
      skip: filters.skip ?? 0,
    };

    const logs = await aiLogRepository.query(queryOptions);

    return logs.map((log) => ({
      ...log,
      formattedTimestamp: new Date(log.timestamp).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }));
  });
}

/**
 * Get total count of AI logs matching filters
 */
export async function getAILogsCount(
  filters: AILogFilters = {}
): Promise<number | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const queryOptions: AILogQueryOptions = {
      action: filters.action,
      status: filters.status,
      model: filters.model,
      hasError: filters.hasError,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    return aiLogRepository.count(queryOptions);
  });
}

/**
 * Get a single AI log by ID with full trace
 * Requirements: 9.4
 */
export async function getAILogById(
  id: string
): Promise<AILog | null | UnauthorizedResponse> {
  return requireAdmin(async () => {
    return aiLogRepository.findById(id);
  });
}

/**
 * Toggle the search tool globally
 * Requirements: 9.3
 */
export async function toggleSearchTool(
  enabled: boolean
): Promise<{ success: boolean; enabled: boolean } | UnauthorizedResponse> {
  return requireAdmin(async () => {
    setSearchEnabled(enabled);
    return {
      success: true,
      enabled: isSearchEnabled(),
    };
  });
}

/**
 * Get current search tool status
 * Requirements: 9.3
 */
export async function getSearchToolStatus(): Promise<
  { enabled: boolean } | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    return {
      enabled: isSearchEnabled(),
    };
  });
}

/**
 * Get AI usage statistics by action type
 * Requirements: 9.1
 */
export async function getAIUsageByAction(): Promise<
  | Array<{ action: string; count: number; avgLatency: number }>
  | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const collection = await getAILogsCollection();

    const pipeline = [
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
          avgLatency: { $avg: "$latencyMs" },
          totalTokens: {
            $sum: { $add: ["$tokenUsage.input", "$tokenUsage.output"] },
          },
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
  });
}

/**
 * Get recent AI activity for the dashboard
 * Requirements: 9.1
 */
export async function getRecentAIActivity(
  limit: number = 10
): Promise<AILogWithDetails[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const logs = await aiLogRepository.query({ limit });

    return logs.map((log) => ({
      ...log,
      formattedTimestamp: new Date(log.timestamp).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }));
  });
}

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
 * Get all users for admin management
 * Fetches users from MongoDB and enriches with Clerk data
 */
export async function getAdminUsers(): Promise<
  AdminUser[] | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();
    const interviewsCollection = await getInterviewsCollection();

    // Get all users from MongoDB, sorted by most recently active
    const dbUsers = await usersCollection
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();

    if (dbUsers.length === 0) {
      return [];
    }

    // Get interview counts per user
    const interviewCounts = await interviewsCollection
      .aggregate([{ $group: { _id: "$userId", count: { $sum: 1 } } }])
      .toArray();

    const interviewCountMap = new Map(
      interviewCounts.map((item) => [item._id as string, item.count as number])
    );

    // Fetch Clerk user data for all users
    const client = await clerkClient();
    const clerkUserIds = dbUsers.map((u) => u.clerkId);

    // Clerk getUserList supports filtering by userId array
    const clerkUsersResponse = await client.users.getUserList({
      userId: clerkUserIds,
      limit: 100,
    });

    const clerkUserMap = new Map(clerkUsersResponse.data.map((u) => [u.id, u]));

    // Combine data (preserving the sort order from MongoDB)
    return dbUsers.map((dbUser) => {
      const clerkUser = clerkUserMap.get(dbUser.clerkId);
      const interviewCount = interviewCountMap.get(dbUser._id) ?? 0;

      // Calculate last active time
      const lastActiveDate = dbUser.updatedAt;
      const lastActive = formatRelativeTime(lastActiveDate);

      // Build name from Clerk data
      const firstName = clerkUser?.firstName ?? "";
      const lastName = clerkUser?.lastName ?? "";
      const name =
        [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";
      const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "No email";

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

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Get detailed user information for admin view
 */
export async function getAdminUserDetails(
  userId: string
): Promise<AdminUserDetails | null | UnauthorizedResponse> {
  return requireAdmin(async () => {
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

    const firstName = clerkUser?.firstName ?? "";
    const lastName = clerkUser?.lastName ?? "";
    const name =
      [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "No email";

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
      interviews: interviews.map((i) => ({
        id: i._id,
        jobTitle: i.jobDetails.title,
        company: i.jobDetails.company,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  });
}

/**
 * Update user plan (admin only)
 */
export async function updateUserPlan(
  userId: string,
  plan: "FREE" | "PRO" | "MAX"
): Promise<{ success: boolean; error?: string } | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();

    // Get current user data for audit log
    const currentUser = await usersCollection.findOne({ _id: userId });
    const oldPlan = currentUser?.plan;

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
          "iterations.limit": iterationLimits[plan],
          "interviews.limit": interviewLimits[plan],
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "User not found" };
    }

    // Audit log
    const adminUser = await getAuthUser();
    if (adminUser) {
      await logAdminAction("updateUserPlan", adminUser.clerkId, userId, {
        oldPlan,
        newPlan: plan,
      });
    }

    return { success: true };
  });
}

/**
 * Suspend or unsuspend a user (admin only)
 */
export async function toggleUserSuspension(
  userId: string,
  suspended: boolean
): Promise<{ success: boolean; error?: string } | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();

    const result = await usersCollection.updateOne(
      { _id: userId },
      {
        $set: {
          suspended,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "User not found" };
    }

    // Audit log
    const adminUser = await getAuthUser();
    if (adminUser) {
      await logAdminAction("toggleUserSuspension", adminUser.clerkId, userId, {
        suspended,
      });
    }

    return { success: true };
  });
}

/**
 * Reset user iteration count (admin only)
 */
export async function resetUserIterations(
  userId: string
): Promise<{ success: boolean; error?: string } | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();

    // Get current iteration count for audit log
    const currentUser = await usersCollection.findOne({ _id: userId });
    const oldIterationCount = currentUser?.iterations?.count;

    const result = await usersCollection.updateOne(
      { _id: userId },
      {
        $set: {
          "iterations.count": 0,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "User not found" };
    }

    // Audit log
    const adminUser = await getAuthUser();
    if (adminUser) {
      await logAdminAction("resetUserIterations", adminUser.clerkId, userId, {
        oldIterationCount,
        newIterationCount: 0,
      });
    }

    return { success: true };
  });
}

/**
 * Generate impersonation token for a user (admin only)
 * This creates a signed token that allows admin to view as user
 */
export async function generateImpersonationToken(
  userId: string
): Promise<
  { success: boolean; clerkId?: string; error?: string } | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();

    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Audit log
    const adminUser = await getAuthUser();
    if (adminUser) {
      await logAdminAction(
        "generateImpersonationToken",
        adminUser.clerkId,
        userId,
        {
          targetClerkId: user.clerkId,
        }
      );
    }

    // Return the clerkId for Clerk's impersonation feature
    return { success: true, clerkId: user.clerkId };
  });
}

// ============================================
// Analytics Functions
// ============================================

export interface UsageTrendData {
  date: string;
  interviews: number;
  aiRequests: number;
  users: number;
  tokens: number;
}

export interface PopularTopicData {
  topic: string;
  count: number;
  percentage: number;
}

export interface PlanDistribution {
  plan: string;
  count: number;
  percentage: number;
}

export interface DailyActiveUsers {
  date: string;
  count: number;
}

export interface TokenUsageTrend {
  date: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Get usage trends over the last N days
 */
export async function getUsageTrends(
  days: number = 30
): Promise<UsageTrendData[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const interviewsCollection = await getInterviewsCollection();
    const aiLogsCollection = await getAILogsCollection();
    const usersCollection = await getUsersCollection();

    // Calculate start date
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);

    // Get interviews per day
    const interviewsPipeline = [
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    // Get AI requests per day with token counts
    const aiRequestsPipeline = [
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" },
          },
          count: { $sum: 1 },
          tokens: { $sum: { $add: [{ $ifNull: ["$tokenUsage.input", 0] }, { $ifNull: ["$tokenUsage.output", 0] }] } },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    // Get new users per day
    const usersPipeline = [
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const [interviewsData, aiRequestsData, usersData] = await Promise.all([
      interviewsCollection.aggregate(interviewsPipeline).toArray(),
      aiLogsCollection.aggregate(aiRequestsPipeline).toArray(),
      usersCollection.aggregate(usersPipeline).toArray(),
    ]);

    // Create a map for each data type
    const interviewsMap = new Map(
      interviewsData.map((d) => [String(d._id), (d.count as number) || 0])
    );
    const aiRequestsMap = new Map(
      aiRequestsData.map((d) => [String(d._id), { count: (d.count as number) || 0, tokens: (d.tokens as number) || 0 }])
    );
    const usersMap = new Map(
      usersData.map((d) => [String(d._id), (d.count as number) || 0])
    );

    // Generate all dates in range
    const result: UsageTrendData[] = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const aiData = aiRequestsMap.get(dateStr);
      result.push({
        date: dateStr,
        interviews: interviewsMap.get(dateStr) ?? 0,
        aiRequests: aiData?.count ?? 0,
        users: usersMap.get(dateStr) ?? 0,
        tokens: aiData?.tokens ?? 0,
      });
    }

    return result;
  });
}

/**
 * Get popular job titles/topics from interviews
 */
export async function getPopularTopics(
  limit: number = 10
): Promise<PopularTopicData[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const interviewsCollection = await getInterviewsCollection();

    const pipeline = [
      {
        $group: {
          _id: "$jobDetails.title",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
      { $limit: limit },
    ];

    const results = await interviewsCollection.aggregate(pipeline).toArray();
    const total = results.reduce((sum, r) => sum + (r.count as number), 0);

    return results.map((r) => ({
      topic: r._id as string,
      count: r.count as number,
      percentage:
        total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
    }));
  });
}

/**
 * Get user plan distribution
 */
export async function getPlanDistribution(): Promise<
  PlanDistribution[] | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();

    const pipeline = [
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
    ];

    const results = await usersCollection.aggregate(pipeline).toArray();
    const total = results.reduce((sum, r) => sum + (r.count as number), 0);

    return results.map((r) => ({
      plan: r._id as string,
      count: r.count as number,
      percentage:
        total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
    }));
  });
}

/**
 * Get daily active users over the last N days
 */
export async function getDailyActiveUsers(
  days: number = 30
): Promise<DailyActiveUsers[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const usersCollection = await getUsersCollection();

    // Calculate start date
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);

    const pipeline = [
      { $match: { updatedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone: "UTC" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const results = await usersCollection.aggregate(pipeline).toArray();
    const dataMap = new Map(
      results.map((d) => [String(d._id), (d.count as number) || 0])
    );

    // Generate all dates in range
    const result: DailyActiveUsers[] = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        count: dataMap.get(dateStr) ?? 0,
      });
    }

    return result;
  });
}

/**
 * Get token usage trends over the last N days
 */
export async function getTokenUsageTrends(
  days: number = 30
): Promise<TokenUsageTrend[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const aiLogsCollection = await getAILogsCollection();

    // Calculate start date (days ago from now)
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);

    const pipeline = [
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" },
          },
          inputTokens: {
            $sum: "$tokenUsage.input",
          },
          outputTokens: {
            $sum: "$tokenUsage.output",
          },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const results = await aiLogsCollection.aggregate(pipeline).toArray();
    const dataMap = new Map(
      results.map((d) => [
        String(d._id),
        {
          input: (d.inputTokens as number) || 0,
          output: (d.outputTokens as number) || 0,
        },
      ])
    );

    // Generate all dates in range
    const result: TokenUsageTrend[] = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const data = dataMap.get(dateStr);
      result.push({
        date: dateStr,
        inputTokens: data?.input ?? 0,
        outputTokens: data?.output ?? 0,
      });
    }

    return result;
  });
}

/**
 * Get top companies from interviews
 */
export async function getTopCompanies(
  limit: number = 10
): Promise<PopularTopicData[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const interviewsCollection = await getInterviewsCollection();

    const pipeline = [
      { $match: { "jobDetails.company": { $ne: "", $exists: true } } },
      {
        $group: {
          _id: "$jobDetails.company",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
      { $limit: limit },
    ];

    const results = await interviewsCollection.aggregate(pipeline).toArray();
    const total = results.reduce((sum, r) => sum + (r.count as number), 0);

    return results.map((r) => ({
      topic: r._id as string,
      count: r.count as number,
      percentage:
        total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
    }));
  });
}

/**
 * Get model usage distribution
 */
export async function getModelUsageDistribution(): Promise<
  | Array<{ model: string; count: number; percentage: number }>
  | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const aiLogsCollection = await getAILogsCollection();

    const pipeline = [
      {
        $group: {
          _id: "$model",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
    ];

    const results = await aiLogsCollection.aggregate(pipeline).toArray();
    const total = results.reduce((sum, r) => sum + (r.count as number), 0);

    return results.map((r) => ({
      model: r._id as string,
      count: r.count as number,
      percentage:
        total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
    }));
  });
}

// ============================================
// AI Observability Functions
// ============================================

export interface ErrorStatsData {
  errorCode: string;
  count: number;
  lastOccurred: string;
}

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface HourlyUsageData {
  hour: number;
  requests: number;
  avgLatency: number;
}

export interface CostBreakdown {
  model: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
}

/**
 * Get error statistics for the last N days
 */
export async function getErrorStats(
  days: number = 7
): Promise<ErrorStatsData[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const stats = await aiLogRepository.getErrorStats(days);
    return stats.map((s) => ({
      errorCode: s.errorCode,
      count: s.count,
      lastOccurred: s.lastOccurred.toISOString(),
    }));
  });
}

/**
 * Get latency percentiles for performance monitoring
 */
export async function getLatencyPercentiles(): Promise<
  LatencyPercentiles | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    return aiLogRepository.getLatencyPercentiles();
  });
}

/**
 * Get hourly usage distribution (for identifying peak hours)
 */
export async function getHourlyUsage(): Promise<
  HourlyUsageData[] | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const aiLogsCollection = await getAILogsCollection();

    const pipeline = [
      {
        $group: {
          _id: { $hour: "$timestamp" },
          requests: { $sum: 1 },
          avgLatency: { $avg: "$latencyMs" },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const results = await aiLogsCollection.aggregate(pipeline).toArray();

    // Fill in missing hours with zeros
    const hourlyData: HourlyUsageData[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const found = results.find((r) => r._id === hour);
      hourlyData.push({
        hour,
        requests: found ? (found.requests as number) : 0,
        avgLatency: found ? Math.round(found.avgLatency as number) : 0,
      });
    }

    return hourlyData;
  });
}

/**
 * Get cost breakdown by model
 */
export async function getCostBreakdown(): Promise<
  CostBreakdown[] | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const aiLogsCollection = await getAILogsCollection();

    const pipeline = [
      {
        $group: {
          _id: "$model",
          totalCost: { $sum: { $ifNull: ["$estimatedCost", 0] } },
          requestCount: { $sum: 1 },
        },
      },
      { $sort: { totalCost: -1 as const } },
    ];

    const results = await aiLogsCollection.aggregate(pipeline).toArray();

    return results.map((r) => ({
      model: r._id as string,
      totalCost: Math.round((r.totalCost as number) * 1000000) / 1000000,
      requestCount: r.requestCount as number,
      avgCostPerRequest:
        r.requestCount > 0
          ? Math.round(
              ((r.totalCost as number) / (r.requestCount as number)) * 1000000
            ) / 1000000
          : 0,
    }));
  });
}

/**
 * Get recent errors for quick debugging
 */
export async function getRecentErrors(
  limit: number = 10
): Promise<AILogWithDetails[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const logs = await aiLogRepository.query({
      hasError: true,
      limit,
    });

    return logs.map((log) => ({
      ...log,
      formattedTimestamp: new Date(log.timestamp).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }));
  });
}

/**
 * Get slow requests (above threshold)
 */
export async function getSlowRequests(
  thresholdMs: number = 5000,
  limit: number = 10
): Promise<AILogWithDetails[] | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const aiLogsCollection = await getAILogsCollection();

    const logs = await aiLogsCollection
      .find({ latencyMs: { $gte: thresholdMs }, status: "success" })
      .sort({ latencyMs: -1 })
      .limit(limit)
      .toArray();

    return (logs as AILog[]).map((log) => ({
      ...log,
      formattedTimestamp: new Date(log.timestamp).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }));
  });
}

/**
 * Get unique models used in logs
 */
export async function getUniqueModels(): Promise<
  string[] | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const aiLogsCollection = await getAILogsCollection();
    const models = await aiLogsCollection.distinct("model");
    return models as string[];
  });
}

// ============================================
// OpenRouter Pricing Functions
// ============================================

import {
  getCacheInfo as getPricingCacheInfo,
  refreshPricingCache,
  getAllModelPricing,
} from "@/lib/services/openrouter-pricing";
import { DEFAULT_AI_CONCURRENCY_LIMIT } from "../constants";

export interface PricingCacheStatus {
  isCached: boolean;
  ageMs: number;
  modelCount: number;
  expiresInMs: number;
  ageFormatted: string;
  expiresFormatted: string;
}

/**
 * Get OpenRouter pricing cache status
 */
export async function getPricingCacheStatus(): Promise<
  PricingCacheStatus | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const info = getPricingCacheInfo();

    const formatMs = (ms: number): string => {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${Math.round(ms / 1000)}s`;
      return `${Math.round(ms / 60000)}m`;
    };

    return {
      ...info,
      ageFormatted: formatMs(info.ageMs),
      expiresFormatted: formatMs(info.expiresInMs),
    };
  });
}

/**
 * Force refresh the OpenRouter pricing cache
 */
export async function forceRefreshPricingCache(): Promise<
  | {
      success: boolean;
      modelCount: number;
    }
  | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    await refreshPricingCache();
    const info = getPricingCacheInfo();
    return { success: true, modelCount: info.modelCount };
  });
}

/**
 * Get all model pricing data
 */
export async function getModelPricingList(): Promise<
  | Array<{ model: string; inputPrice: number; outputPrice: number }>
  | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const pricing = await getAllModelPricing();
    return Array.from(pricing.entries()).map(([model, prices]) => ({
      model,
      inputPrice: prices.input,
      outputPrice: prices.output,
    }));
  });
}

// ============================================
// AI Concurrency Configuration
// ============================================

/**
 * Get the current AI concurrency limit
 */
export async function getAIConcurrencyLimit(): Promise<
  number | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    return getSetting(
      SETTINGS_KEYS.AI_CONCURRENCY_LIMIT,
      DEFAULT_AI_CONCURRENCY_LIMIT
    );
  });
}

/**
 * Set the AI concurrency limit (admin only)
 */
export async function setAIConcurrencyLimit(
  limit: number
): Promise<{ success: boolean; limit: number } | UnauthorizedResponse> {
  return requireAdmin(async () => {
    // Validate limit is between 1 and 10
    const validLimit = Math.max(1, Math.min(10, Math.floor(limit)));
    await setSetting(SETTINGS_KEYS.AI_CONCURRENCY_LIMIT, validLimit);
    return { success: true, limit: validLimit };
  });
}

// ============================================
// Tiered Model Configuration
// ============================================

import {
  TASK_TIER_MAPPING,
  TASK_DESCRIPTIONS,
  DEFAULT_TIER_CONFIG,
  type ModelTier,
  type AITask,
  type TierModelConfig,
  type FullTieredModelConfig,
} from "@/lib/db/schemas/settings";

/**
 * Task tier information for display
 */
export interface TaskTierInfo {
  task: AITask;
  tier: ModelTier;
  description: string;
}

/**
 * Get all task-to-tier mappings with descriptions
 * Made async to comply with Server Actions requirement
 */
export async function getTaskTierMappings(): Promise<
  TaskTierInfo[] | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    return Object.entries(TASK_TIER_MAPPING).map(([task, tier]) => ({
      task: task as AITask,
      tier,
      description: TASK_DESCRIPTIONS[task] || task,
    }));
  });
}

/**
 * Get tier setting key
 */
function getTierKey(tier: ModelTier): string {
  return {
    high: SETTINGS_KEYS.MODEL_TIER_HIGH,
    medium: SETTINGS_KEYS.MODEL_TIER_MEDIUM,
    low: SETTINGS_KEYS.MODEL_TIER_LOW,
  }[tier];
}

/**
 * Get a single tier's configuration from single document
 */
async function getTierConfig(tier: ModelTier): Promise<TierModelConfig> {
  const collection = await getSettingsCollection();
  const doc = await collection.findOne({ key: getTierKey(tier) });

  if (!doc?.value) {
    return { ...DEFAULT_TIER_CONFIG };
  }

  const value = doc.value as Partial<TierModelConfig>;
  return {
    primaryModel: value.primaryModel ?? null,
    fallbackModel: value.fallbackModel ?? null,
    temperature: value.temperature ?? 0.7,
    maxTokens: value.maxTokens ?? 4096,
  };
}

/**
 * Get the full tiered model configuration
 * Returns null for models that haven't been configured
 */
export async function getTieredModelConfig(): Promise<
  FullTieredModelConfig | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const [high, medium, low] = await Promise.all([
      getTierConfig("high"),
      getTierConfig("medium"),
      getTierConfig("low"),
    ]);

    return { high, medium, low };
  });
}

/**
 * Check if all tiers are properly configured (have at least primary model set)
 */
export async function areTieredModelsConfigured(): Promise<
  | {
      configured: boolean;
      missingTiers: ModelTier[];
    }
  | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const [high, medium, low] = await Promise.all([
      getTierConfig("high"),
      getTierConfig("medium"),
      getTierConfig("low"),
    ]);
    const config = { high, medium, low };
    const missingTiers: ModelTier[] = [];

    if (!config.high.primaryModel) missingTiers.push("high");
    if (!config.medium.primaryModel) missingTiers.push("medium");
    if (!config.low.primaryModel) missingTiers.push("low");

    return {
      configured: missingTiers.length === 0,
      missingTiers,
    };
  });
}

/**
 * Update a specific tier's full configuration (single document)
 */
export async function updateTierConfig(
  tier: ModelTier,
  config: Partial<TierModelConfig>
): Promise<{ success: boolean } | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const collection = await getSettingsCollection();
    const key = getTierKey(tier);

    // Get existing config
    const existing = await getTierConfig(tier);

    // Merge with new values
    const newConfig: TierModelConfig = {
      primaryModel:
        config.primaryModel !== undefined
          ? config.primaryModel
          : existing.primaryModel,
      fallbackModel:
        config.fallbackModel !== undefined
          ? config.fallbackModel
          : existing.fallbackModel,
      temperature:
        config.temperature !== undefined
          ? config.temperature
          : existing.temperature,
      maxTokens:
        config.maxTokens !== undefined ? config.maxTokens : existing.maxTokens,
    };

    await collection.updateOne(
      { key },
      { $set: { key, value: newConfig, updatedAt: new Date() } },
      { upsert: true }
    );

    return { success: true };
  });
}

/**
 * Update all tiered models at once
 */
export async function updateFullTieredModelConfig(
  config: Partial<FullTieredModelConfig>
): Promise<{ success: boolean } | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const updates: Promise<{ success: boolean } | UnauthorizedResponse>[] = [];

    if (config.high) {
      updates.push(updateTierConfig("high", config.high));
    }
    if (config.medium) {
      updates.push(updateTierConfig("medium", config.medium));
    }
    if (config.low) {
      updates.push(updateTierConfig("low", config.low));
    }

    await Promise.all(updates);
    return { success: true };
  });
}

/**
 * Clear all tier configurations (for reset)
 */
export async function clearTieredModelConfig(): Promise<
  { success: boolean } | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    const collection = await getSettingsCollection();

    await collection.deleteMany({
      key: {
        $in: [
          SETTINGS_KEYS.MODEL_TIER_HIGH,
          SETTINGS_KEYS.MODEL_TIER_MEDIUM,
          SETTINGS_KEYS.MODEL_TIER_LOW,
        ],
      },
    });

    return { success: true };
  });
}

// Re-export types for external use
export type { TierModelConfig, FullTieredModelConfig };
