"use server";

import {
  getUsersCollection,
  getInterviewsCollection,
  getAILogsCollection,
  getSettingsCollection,
} from "@/lib/db/collections";
import { isSearchEnabled } from "@/lib/services/search-service";
import { SETTINGS_KEYS, DEFAULT_AI_TOOLS, type AIToolConfig, type AIToolId } from "@/lib/db/schemas/settings";
import { parseTierConfig } from "@/lib/db/tier-config";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin, UnauthorizedResponse } from "@/lib/auth/get-user";
import type {
  AdminStats,
  AdminUser,
  AILogWithDetails,
  UsageTrendData,
  PopularTopicData,
  PlanDistribution,
  TokenUsageTrend,
  FullTieredModelConfig,
} from "./admin";

// Cache for expensive computations (in-memory, resets on server restart)
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl = CACHE_TTL): void {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

/**
 * Batch fetch all admin dashboard data in a single optimized call.
 * This reduces the number of DB connections and auth checks from 14 to 1.
 */
export async function getAdminDashboardData(): Promise<
  | {
      stats: AdminStats;
      aiLogs: AILogWithDetails[];
      aiLogsCount: number;
      searchStatus: { enabled: boolean };
      usageByAction: Array<{ action: string; count: number; avgLatency: number }>;
      users: AdminUser[];
      usageTrends: UsageTrendData[];
      popularTopics: PopularTopicData[];
      planDistribution: PlanDistribution[];
      tokenUsageTrends: TokenUsageTrend[];
      topCompanies: PopularTopicData[];
      modelUsage: Array<{ model: string; count: number; percentage: number }>;
      concurrencyLimit: number;
      tieredModelConfig: FullTieredModelConfig;
      aiToolsConfig: AIToolConfig[];
    }
  | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    // Check cache first
    const cacheKey = "admin-dashboard";
    const cached = getCached<Awaited<ReturnType<typeof fetchAllAdminData>>>(cacheKey);
    if (cached) return cached;

    const data = await fetchAllAdminData();
    setCache(cacheKey, data);
    return data;
  });
}

async function fetchAllAdminData() {
  const [usersCollection, interviewsCollection, aiLogsCollection, settingsCollection] =
    await Promise.all([
      getUsersCollection(),
      getInterviewsCollection(),
      getAILogsCollection(),
      getSettingsCollection(),
    ]);

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  // Run all aggregations in parallel
  const [
    // Basic counts
    totalUsers,
    activeThisWeek,
    totalInterviews,
    // AI stats aggregation
    aiStatsResult,
    // Recent AI logs
    recentLogs,
    aiLogsCount,
    // Usage by action
    usageByActionResult,
    // Users with interview counts
    usersWithCounts,
    // Plan distribution
    planDistResult,
    // Popular topics
    popularTopicsResult,
    // Top companies
    topCompaniesResult,
    // Model usage
    modelUsageResult,
    // Usage trends (combined pipeline)
    usageTrendsData,
    // Token usage trends
    tokenTrendsResult,
    // Settings
    concurrencyDoc,
    tierHighDoc,
    tierMediumDoc,
    tierLowDoc,
    aiToolsConfigDoc,
  ] = await Promise.all([
    // Basic counts
    usersCollection.countDocuments(),
    usersCollection.countDocuments({ updatedAt: { $gte: oneWeekAgo } }),
    interviewsCollection.countDocuments(),

    // AI stats - single aggregation
    aiLogsCollection
      .aggregate([
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            totalInputTokens: { $sum: { $ifNull: ["$tokenUsage.input", 0] } },
            totalOutputTokens: { $sum: { $ifNull: ["$tokenUsage.output", 0] } },
            avgLatencyMs: { $avg: { $ifNull: ["$latencyMs", 0] } },
            totalCost: { $sum: { $ifNull: ["$estimatedCost", 0] } },
            errorCount: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
            avgTimeToFirstToken: { $avg: { $ifNull: ["$timeToFirstToken", 0] } },
          },
        },
      ])
      .toArray(),

    // Recent logs (limited)
    aiLogsCollection.find({}).sort({ timestamp: -1 }).limit(10).toArray(),

    // Total logs count
    aiLogsCollection.countDocuments({}),

    // Usage by action
    aiLogsCollection
      .aggregate([
        { $group: { _id: "$action", count: { $sum: 1 }, avgLatency: { $avg: "$latencyMs" } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),

    // Users with interview counts - use $lookup instead of separate query
    usersCollection
      .aggregate([
        { $sort: { updatedAt: -1 } },
        { $limit: 100 }, // Limit users for performance
        {
          $lookup: {
            from: "interviews",
            localField: "_id",
            foreignField: "userId",
            as: "interviews",
          },
        },
        {
          $project: {
            _id: 1,
            clerkId: 1,
            plan: 1,
            suspended: 1,
            createdAt: 1,
            updatedAt: 1,
            iterations: 1,
            interviews: 1,
            interviewCount: { $size: "$interviews" },
          },
        },
      ])
      .toArray(),

    // Plan distribution
    usersCollection
      .aggregate([
        { $group: { _id: "$plan", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),

    // Popular topics
    interviewsCollection
      .aggregate([
        { $group: { _id: "$jobDetails.title", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),

    // Top companies
    interviewsCollection
      .aggregate([
        { $match: { "jobDetails.company": { $ne: "", $exists: true } } },
        { $group: { _id: "$jobDetails.company", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),

    // Model usage
    aiLogsCollection
      .aggregate([
        { $group: { _id: "$model", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),

    // Combined usage trends - interviews, AI requests, users per day
    Promise.all([
      interviewsCollection
        .aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      aiLogsCollection
        .aggregate([
          { $match: { timestamp: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      usersCollection
        .aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]),

    // Token usage trends
    aiLogsCollection
      .aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } },
            inputTokens: { $sum: "$tokenUsage.input" },
            outputTokens: { $sum: "$tokenUsage.output" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),

    // Settings
    settingsCollection.findOne({ key: SETTINGS_KEYS.AI_CONCURRENCY_LIMIT }),
    settingsCollection.findOne({ key: SETTINGS_KEYS.MODEL_TIER_HIGH }),
    settingsCollection.findOne({ key: SETTINGS_KEYS.MODEL_TIER_MEDIUM }),
    settingsCollection.findOne({ key: SETTINGS_KEYS.MODEL_TIER_LOW }),
    settingsCollection.findOne({ key: SETTINGS_KEYS.AI_TOOLS_CONFIG }),
  ]);

  // Process AI stats
  const aiStats = aiStatsResult[0] || {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    avgLatencyMs: 0,
    totalCost: 0,
    errorCount: 0,
    avgTimeToFirstToken: 0,
  };

  const errorRate =
    aiStats.totalRequests > 0
      ? Math.round((aiStats.errorCount / aiStats.totalRequests) * 10000) / 100
      : 0;

  // Process users with Clerk data (batch fetch)
  const clerkUserIds = usersWithCounts.map((u) => u.clerkId as string);
  let clerkUserMap = new Map<string, { firstName?: string | null; lastName?: string | null; emailAddresses: Array<{ emailAddress: string }> }>();
  
  if (clerkUserIds.length > 0) {
    try {
      const client = await clerkClient();
      const clerkUsersResponse = await client.users.getUserList({
        userId: clerkUserIds,
        limit: 100,
      });
      clerkUserMap = new Map(clerkUsersResponse.data.map((u) => [u.id, u]));
    } catch {
      // Continue without Clerk data if it fails
    }
  }

  const users: AdminUser[] = usersWithCounts.map((dbUser) => {
    const clerkUser = clerkUserMap.get(dbUser.clerkId as string);
    const firstName = clerkUser?.firstName ?? "";
    const lastName = clerkUser?.lastName ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "No email";
    const lastActiveDate = dbUser.updatedAt as Date;

    return {
      id: dbUser._id as string,
      clerkId: dbUser.clerkId as string,
      name,
      email,
      plan: dbUser.plan as string,
      interviewCount: dbUser.interviewCount as number,
      lastActive: formatRelativeTime(lastActiveDate),
      suspended: (dbUser.suspended as boolean) ?? false,
      createdAt: (dbUser.createdAt as Date).toISOString(),
      iterationCount: (dbUser.iterations as { count: number }).count,
      iterationLimit: (dbUser.iterations as { limit: number }).limit,
      interviewLimit: (dbUser.interviews as { limit?: number })?.limit ?? 3,
    };
  });

  // Process token trends first (needed for both usageTrends and tokenUsageTrends)
  const tokenTrendsMap = new Map(
    tokenTrendsResult.map((d) => [
      String(d._id),
      { input: (d.inputTokens as number) || 0, output: (d.outputTokens as number) || 0 },
    ])
  );

  // Process usage trends
  const [interviewsData, aiRequestsData, newUsersData] = usageTrendsData;
  const interviewsMap = new Map(interviewsData.map((d) => [String(d._id), d.count as number]));
  const aiRequestsMap = new Map(aiRequestsData.map((d) => [String(d._id), d.count as number]));
  const usersMap = new Map(newUsersData.map((d) => [String(d._id), d.count as number]));

  const usageTrends: UsageTrendData[] = [];
  for (let i = 0; i <= 30; i++) {
    const date = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const tokenData = tokenTrendsMap.get(dateStr);
    usageTrends.push({
      date: dateStr,
      interviews: interviewsMap.get(dateStr) ?? 0,
      aiRequests: aiRequestsMap.get(dateStr) ?? 0,
      users: usersMap.get(dateStr) ?? 0,
      tokens: (tokenData?.input ?? 0) + (tokenData?.output ?? 0),
    });
  }

  const tokenUsageTrends: TokenUsageTrend[] = [];
  for (let i = 0; i <= 30; i++) {
    const date = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const data = tokenTrendsMap.get(dateStr);
    tokenUsageTrends.push({
      date: dateStr,
      inputTokens: data?.input ?? 0,
      outputTokens: data?.output ?? 0,
    });
  }

  // Process plan distribution
  const planTotal = planDistResult.reduce((sum, r) => sum + (r.count as number), 0);
  const planDistribution: PlanDistribution[] = planDistResult.map((r) => ({
    plan: r._id as string,
    count: r.count as number,
    percentage: planTotal > 0 ? Math.round(((r.count as number) / planTotal) * 100) : 0,
  }));

  // Process popular topics
  const topicsTotal = popularTopicsResult.reduce((sum, r) => sum + (r.count as number), 0);
  const popularTopics: PopularTopicData[] = popularTopicsResult.map((r) => ({
    topic: r._id as string,
    count: r.count as number,
    percentage: topicsTotal > 0 ? Math.round(((r.count as number) / topicsTotal) * 100) : 0,
  }));

  // Process top companies
  const companiesTotal = topCompaniesResult.reduce((sum, r) => sum + (r.count as number), 0);
  const topCompanies: PopularTopicData[] = topCompaniesResult.map((r) => ({
    topic: r._id as string,
    count: r.count as number,
    percentage: companiesTotal > 0 ? Math.round(((r.count as number) / companiesTotal) * 100) : 0,
  }));

  // Process model usage
  const modelTotal = modelUsageResult.reduce((sum, r) => sum + (r.count as number), 0);
  const modelUsage = modelUsageResult.map((r) => ({
    model: r._id as string,
    count: r.count as number,
    percentage: modelTotal > 0 ? Math.round(((r.count as number) / modelTotal) * 100) : 0,
  }));

  // Format AI logs
  const aiLogs: AILogWithDetails[] = recentLogs.map((log) => ({
    _id: log._id as string,
    interviewId: log.interviewId as string,
    userId: log.userId as string,
    action: log.action as AILogWithDetails["action"],
    status: log.status as AILogWithDetails["status"],
    model: log.model as string,
    prompt: log.prompt as string,
    systemPrompt: log.systemPrompt as string | undefined,
    response: log.response as string,
    errorMessage: log.errorMessage as string | undefined,
    errorCode: log.errorCode as string | undefined,
    toolsUsed: (log.toolsUsed as string[]) ?? [],
    searchQueries: (log.searchQueries as string[]) ?? [],
    searchResults: (log.searchResults as Array<{ query: string; resultCount: number; sources: string[] }>) ?? [],
    tokenUsage: log.tokenUsage as { input: number; output: number },
    estimatedCost: log.estimatedCost as number | undefined,
    latencyMs: log.latencyMs as number,
    timeToFirstToken: log.timeToFirstToken as number | undefined,
    metadata: log.metadata as AILogWithDetails["metadata"],
    timestamp: log.timestamp as Date,
    formattedTimestamp: new Date(log.timestamp as Date).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }));

  // Parse tiered model config from individual tier documents
  const tieredModelConfig: FullTieredModelConfig = {
    high: parseTierConfig(tierHighDoc?.value),
    medium: parseTierConfig(tierMediumDoc?.value),
    low: parseTierConfig(tierLowDoc?.value),
  };

  // Parse AI tools config
  const savedToolsConfig = aiToolsConfigDoc?.value as Record<AIToolId, boolean> | undefined;
  const aiToolsConfig: AIToolConfig[] = DEFAULT_AI_TOOLS.map((tool) => ({
    ...tool,
    enabled: savedToolsConfig?.[tool.id] ?? tool.enabled,
  }));

  return {
    stats: {
      totalUsers,
      activeThisWeek,
      totalInterviews,
      totalAIRequests: aiStats.totalRequests as number,
      totalInputTokens: aiStats.totalInputTokens as number,
      totalOutputTokens: aiStats.totalOutputTokens as number,
      avgLatencyMs: Math.round(aiStats.avgLatencyMs as number),
      totalCost: Math.round((aiStats.totalCost as number) * 1000000) / 1000000,
      errorCount: aiStats.errorCount as number,
      errorRate,
      avgTimeToFirstToken: Math.round(aiStats.avgTimeToFirstToken as number),
    },
    aiLogs,
    aiLogsCount,
    searchStatus: { enabled: isSearchEnabled() },
    usageByAction: usageByActionResult.map((r) => ({
      action: r._id as string,
      count: r.count as number,
      avgLatency: Math.round(r.avgLatency as number),
    })),
    users,
    usageTrends,
    popularTopics,
    planDistribution,
    tokenUsageTrends,
    topCompanies,
    modelUsage,
    concurrencyLimit: (concurrencyDoc?.value as number) ?? 3,
    tieredModelConfig,
    aiToolsConfig,
  };
}

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
 * Clear the admin dashboard cache (call after mutations)
 */
export async function clearAdminCache(): Promise<void> {
  cache.delete("admin-dashboard");
}
