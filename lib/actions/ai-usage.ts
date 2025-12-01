"use server";

import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { aiLogRepository } from "@/lib/db/repositories/ai-log-repository";
import { getAILogsCollection } from "@/lib/db/collections";
import type { AIAction, AIStatus, AILog } from "@/lib/db/schemas/ai-log";

// Types
export interface AIUsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatencyMs: number;
  totalCost: number;
  errorCount: number;
  successRate: number;
}

export interface AIUsageTrend {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface AIActionBreakdown {
  action: string;
  count: number;
  percentage: number;
  avgLatency: number;
}

export interface AIModelUsage {
  model: string;
  count: number;
  percentage: number;
  totalTokens: number;
  totalCost: number;
  avgCostPerToken: number;
  avgLatency: number;
  successRate: number;
}

export interface AIStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface AITokenTrend {
  date: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIHourlyPattern {
  hour: number;
  requestCount: number;
  avgLatency: number;
}

export interface AILatencyBucket {
  label: string;
  min: number;
  max: number | null;
  count: number;
  percentage: number;
}

export interface AIComparisonMetrics {
  current: {
    requests: number;
    tokens: number;
    cost: number;
  };
  previous: {
    requests: number;
    tokens: number;
    cost: number;
  };
  change: {
    requests: number; // percentage
    tokens: number;   // percentage
    cost: number;     // percentage
  };
}

export interface AILogEntry {
  _id: string;
  action: AIAction;
  status: AIStatus;
  model: string;
  tokenUsage: { input: number; output: number };
  estimatedCost?: number;
  latencyMs: number;
  timestamp: Date;
  errorMessage?: string;
}

export interface AIUsageDashboardData {
  stats: AIUsageStats;
  trends: AIUsageTrend[];
  tokenTrends: AITokenTrend[];
  actionBreakdown: AIActionBreakdown[];
  modelUsage: AIModelUsage[];
  statusBreakdown: AIStatusBreakdown[];
  hourlyPatterns: AIHourlyPattern[];
  latencyDistribution: AILatencyBucket[];
  comparisonMetrics: AIComparisonMetrics;
  recentLogs: AILogEntry[];
}

/**
 * Check if user has MAX plan
 */
async function requireMaxPlan(): Promise<{ userId: string } | null> {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);

  if (!user || user.plan !== "MAX") {
    return null;
  }

  return { userId: user._id };
}

/**
 * Get AI usage stats for the user
 */
export async function getAIUsageStats(): Promise<AIUsageStats | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const stats = await aiLogRepository.getAggregatedStats(auth.userId);

  return {
    ...stats,
    successRate: stats.totalRequests > 0
      ? Math.round(((stats.totalRequests - stats.errorCount) / stats.totalRequests) * 100)
      : 100,
  };
}

/**
 * Get AI usage trends over time
 */
export async function getAIUsageTrends(days: number = 30): Promise<AIUsageTrend[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  startDate.setUTCHours(0, 0, 0, 0);

  const pipeline = [
    { $match: { userId: auth.userId, timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } },
        requests: { $sum: 1 },
        tokens: { $sum: { $add: [{ $ifNull: ["$tokenUsage.input", 0] }, { $ifNull: ["$tokenUsage.output", 0] }] } },
        cost: { $sum: { $ifNull: ["$estimatedCost", 0] } },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const dataMap = new Map(results.map((d) => [String(d._id), d]));

  const trends: AIUsageTrend[] = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const data = dataMap.get(dateStr);
    trends.push({
      date: dateStr,
      requests: (data?.requests as number) ?? 0,
      tokens: (data?.tokens as number) ?? 0,
      cost: Math.round(((data?.cost as number) ?? 0) * 1000000) / 1000000,
    });
  }

  return trends;
}


/**
 * Get breakdown by action type
 */
export async function getAIActionBreakdown(): Promise<AIActionBreakdown[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();

  const pipeline = [
    { $match: { userId: auth.userId } },
    {
      $group: {
        _id: "$action",
        count: { $sum: 1 },
        avgLatency: { $avg: { $ifNull: ["$latencyMs", 0] } },
      },
    },
    { $sort: { count: -1 as const } },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  const actionLabels: Record<string, string> = {
    GENERATE_BRIEF: "Opening Brief",
    GENERATE_TOPICS: "Revision Topics",
    GENERATE_MCQ: "MCQs",
    GENERATE_RAPID_FIRE: "Rapid Fire",
    REGENERATE_ANALOGY: "Analogies",
    PARSE_PROMPT: "Parse Prompt",
    TOPIC_CHAT: "Topic Chat",
    GENERATE_ACTIVITY_MCQ: "Activity MCQ",
    GENERATE_ACTIVITY_CODING_CHALLENGE: "Coding Challenge",
    GENERATE_ACTIVITY_DEBUGGING_TASK: "Debugging Task",
    GENERATE_ACTIVITY_CONCEPT_EXPLANATION: "Concept Explanation",
    GENERATE_ACTIVITY_REAL_WORLD_ASSIGNMENT: "Real World Assignment",
    GENERATE_ACTIVITY_MINI_CASE_STUDY: "Case Study",
    ANALYZE_FEEDBACK: "Analyze Feedback",
    AGGREGATE_ANALYSIS: "Aggregate Analysis",
    GENERATE_IMPROVEMENT_PLAN: "Improvement Plan",
    STREAM_IMPROVEMENT_ACTIVITY: "Improvement Activity",
  };

  return results.map((r) => ({
    action: actionLabels[r._id as string] || (r._id as string),
    count: r.count as number,
    percentage: total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
    avgLatency: Math.round(r.avgLatency as number),
  }));
}

/**
 * Get model usage breakdown
 */
export async function getAIModelUsage(): Promise<AIModelUsage[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();

  const pipeline = [
    { $match: { userId: auth.userId } },
    {
      $group: {
        _id: "$model",
        count: { $sum: 1 },
        totalTokens: { $sum: { $add: [{ $ifNull: ["$tokenUsage.input", 0] }, { $ifNull: ["$tokenUsage.output", 0] }] } },
        totalCost: { $sum: { $ifNull: ["$estimatedCost", 0] } },
        avgLatency: { $avg: { $ifNull: ["$latencyMs", 0] } },
        successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 as const } },
    { $limit: 10 },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  return results.map((r) => ({
    model: (r._id as string) || "Unknown",
    count: r.count as number,
    percentage: total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
    totalTokens: r.totalTokens as number,
    totalCost: Math.round((r.totalCost as number) * 1000000) / 1000000,
    avgCostPerToken: (r.totalTokens as number) > 0
      ? Math.round(((r.totalCost as number) / (r.totalTokens as number)) * 1000000000) / 1000000000
      : 0,
    avgLatency: Math.round(r.avgLatency as number),
    successRate: (r.count as number) > 0
      ? Math.round(((r.successCount as number) / (r.count as number)) * 100)
      : 100,
  }));
}

/**
 * Get status breakdown
 */
export async function getAIStatusBreakdown(): Promise<AIStatusBreakdown[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();

  const pipeline = [
    { $match: { userId: auth.userId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 as const } },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  const statusLabels: Record<string, string> = {
    success: "Success",
    error: "Error",
    timeout: "Timeout",
    rate_limited: "Rate Limited",
    cancelled: "Cancelled",
  };

  return results.map((r) => ({
    status: statusLabels[r._id as string] || (r._id as string),
    count: r.count as number,
    percentage: total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
  }));
}

/**
 * Get recent AI logs
 */
export async function getRecentAILogs(limit: number = 20): Promise<AILogEntry[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const logs = await aiLogRepository.findByUserId(auth.userId, { limit });

  return logs.map((log) => ({
    _id: log._id,
    action: log.action,
    status: log.status,
    model: log.model,
    tokenUsage: log.tokenUsage,
    estimatedCost: log.estimatedCost,
    latencyMs: log.latencyMs,
    timestamp: log.timestamp,
    errorMessage: log.errorMessage,
  }));
}

/**
 * Get token usage trends (input vs output) over time
 */
export async function getAITokenTrends(days: number = 30): Promise<AITokenTrend[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  startDate.setUTCHours(0, 0, 0, 0);

  const pipeline = [
    { $match: { userId: auth.userId, timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" } },
        inputTokens: { $sum: { $ifNull: ["$tokenUsage.input", 0] } },
        outputTokens: { $sum: { $ifNull: ["$tokenUsage.output", 0] } },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const dataMap = new Map(results.map((d) => [String(d._id), d]));

  const trends: AITokenTrend[] = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const data = dataMap.get(dateStr);
    trends.push({
      date: dateStr,
      inputTokens: (data?.inputTokens as number) ?? 0,
      outputTokens: (data?.outputTokens as number) ?? 0,
    });
  }

  return trends;
}

/**
 * Get hourly usage patterns
 */
export async function getAIHourlyPatterns(): Promise<AIHourlyPattern[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();

  const pipeline = [
    { $match: { userId: auth.userId } },
    {
      $group: {
        _id: { $hour: "$timestamp" },
        requestCount: { $sum: 1 },
        avgLatency: { $avg: { $ifNull: ["$latencyMs", 0] } },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const dataMap = new Map(results.map((d) => [d._id as number, d]));

  // Fill all 24 hours
  const patterns: AIHourlyPattern[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const data = dataMap.get(hour);
    patterns.push({
      hour,
      requestCount: (data?.requestCount as number) ?? 0,
      avgLatency: Math.round((data?.avgLatency as number) ?? 0),
    });
  }

  return patterns;
}

/**
 * Get latency distribution
 */
export async function getAILatencyDistribution(): Promise<AILatencyBucket[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();

  const pipeline = [
    { $match: { userId: auth.userId } },
    {
      $bucket: {
        groupBy: "$latencyMs",
        boundaries: [0, 100, 500, 1000, 3000, Number.MAX_VALUE],
        default: "other",
        output: {
          count: { $sum: 1 },
        },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  const buckets: AILatencyBucket[] = [
    { label: "< 100ms", min: 0, max: 100, count: 0, percentage: 0 },
    { label: "100-500ms", min: 100, max: 500, count: 0, percentage: 0 },
    { label: "500ms-1s", min: 500, max: 1000, count: 0, percentage: 0 },
    { label: "1s-3s", min: 1000, max: 3000, count: 0, percentage: 0 },
    { label: "> 3s", min: 3000, max: null, count: 0, percentage: 0 },
  ];

  for (const result of results) {
    const boundary = result._id as number;
    let bucketIndex = -1;

    if (boundary === 0) bucketIndex = 0;
    else if (boundary === 100) bucketIndex = 1;
    else if (boundary === 500) bucketIndex = 2;
    else if (boundary === 1000) bucketIndex = 3;
    else if (boundary === 3000 || boundary === Number.MAX_VALUE) bucketIndex = 4;

    if (bucketIndex >= 0) {
      buckets[bucketIndex].count = result.count as number;
      buckets[bucketIndex].percentage = total > 0
        ? Math.round(((result.count as number) / total) * 100)
        : 0;
    }
  }

  return buckets;
}

/**
 * Get comparison metrics (current vs previous period)
 */
export async function getAIComparisonMetrics(days: number = 30): Promise<AIComparisonMetrics | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const collection = await getAILogsCollection();
  const now = new Date();

  // Current period
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  currentStart.setUTCHours(0, 0, 0, 0);

  // Previous period
  const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
  previousStart.setUTCHours(0, 0, 0, 0);
  const previousEnd = currentStart;

  const [currentData, previousData] = await Promise.all([
    collection.aggregate([
      { $match: { userId: auth.userId, timestamp: { $gte: currentStart } } },
      {
        $group: {
          _id: null,
          requests: { $sum: 1 },
          tokens: { $sum: { $add: [{ $ifNull: ["$tokenUsage.input", 0] }, { $ifNull: ["$tokenUsage.output", 0] }] } },
          cost: { $sum: { $ifNull: ["$estimatedCost", 0] } },
        },
      },
    ]).toArray(),
    collection.aggregate([
      { $match: { userId: auth.userId, timestamp: { $gte: previousStart, $lt: previousEnd } } },
      {
        $group: {
          _id: null,
          requests: { $sum: 1 },
          tokens: { $sum: { $add: [{ $ifNull: ["$tokenUsage.input", 0] }, { $ifNull: ["$tokenUsage.output", 0] }] } },
          cost: { $sum: { $ifNull: ["$estimatedCost", 0] } },
        },
      },
    ]).toArray(),
  ]);

  const current = currentData[0] || { requests: 0, tokens: 0, cost: 0 };
  const previous = previousData[0] || { requests: 0, tokens: 0, cost: 0 };

  const calculateChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    current: {
      requests: current.requests as number,
      tokens: current.tokens as number,
      cost: Math.round((current.cost as number) * 1000000) / 1000000,
    },
    previous: {
      requests: previous.requests as number,
      tokens: previous.tokens as number,
      cost: Math.round((previous.cost as number) * 1000000) / 1000000,
    },
    change: {
      requests: calculateChange(current.requests as number, previous.requests as number),
      tokens: calculateChange(current.tokens as number, previous.tokens as number),
      cost: calculateChange(current.cost as number, previous.cost as number),
    },
  };
}

/**
 * Get all AI usage data in a single call
 */
export async function getAIUsageDashboardData(days: number = 30): Promise<AIUsageDashboardData | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const [
    stats,
    trends,
    tokenTrends,
    actionBreakdown,
    modelUsage,
    statusBreakdown,
    hourlyPatterns,
    latencyDistribution,
    comparisonMetrics,
    recentLogs
  ] = await Promise.all([
    getAIUsageStats(),
    getAIUsageTrends(days),
    getAITokenTrends(days),
    getAIActionBreakdown(),
    getAIModelUsage(),
    getAIStatusBreakdown(),
    getAIHourlyPatterns(),
    getAILatencyDistribution(),
    getAIComparisonMetrics(days),
    getRecentAILogs(20),
  ]);

  return {
    stats: stats ?? {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      avgLatencyMs: 0,
      totalCost: 0,
      errorCount: 0,
      successRate: 100,
    },
    trends: trends ?? [],
    tokenTrends: tokenTrends ?? [],
    actionBreakdown: actionBreakdown ?? [],
    modelUsage: modelUsage ?? [],
    statusBreakdown: statusBreakdown ?? [],
    hourlyPatterns: hourlyPatterns ?? [],
    latencyDistribution: latencyDistribution ?? [],
    comparisonMetrics: comparisonMetrics ?? {
      current: { requests: 0, tokens: 0, cost: 0 },
      previous: { requests: 0, tokens: 0, cost: 0 },
      change: { requests: 0, tokens: 0, cost: 0 },
    },
    recentLogs: recentLogs ?? [],
  };
}
