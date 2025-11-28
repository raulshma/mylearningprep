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
}

export interface AIStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
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
  actionBreakdown: AIActionBreakdown[];
  modelUsage: AIModelUsage[];
  statusBreakdown: AIStatusBreakdown[];
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
 * Get all AI usage data in a single call
 */
export async function getAIUsageDashboardData(): Promise<AIUsageDashboardData | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const [stats, trends, actionBreakdown, modelUsage, statusBreakdown, recentLogs] = await Promise.all([
    getAIUsageStats(),
    getAIUsageTrends(30),
    getAIActionBreakdown(),
    getAIModelUsage(),
    getAIStatusBreakdown(),
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
    actionBreakdown: actionBreakdown ?? [],
    modelUsage: modelUsage ?? [],
    statusBreakdown: statusBreakdown ?? [],
    recentLogs: recentLogs ?? [],
  };
}
