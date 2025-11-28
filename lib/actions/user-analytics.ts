"use server";

import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { getInterviewsCollection, getAILogsCollection } from "@/lib/db/collections";

export interface UserAnalyticsStats {
  totalInterviews: number;
  totalTopics: number;
  totalMcqs: number;
  totalRapidFire: number;
  completedTopics: number;
  topicCompletionRate: number;
}

export interface UserInterviewTrend {
  date: string;
  interviews: number;
}

export interface UserTopicProgress {
  status: string;
  count: number;
  percentage: number;
}

export interface UserCompanyData {
  company: string;
  count: number;
  percentage: number;
}

export interface UserSkillData {
  skill: string;
  count: number;
  percentage: number;
}

export interface UserConfidenceData {
  confidence: string;
  count: number;
  percentage: number;
}

export interface UserAnalyticsDashboardData {
  stats: UserAnalyticsStats;
  interviewTrends: UserInterviewTrend[];
  topicProgress: UserTopicProgress[];
  topCompanies: UserCompanyData[];
  topSkills: UserSkillData[];
  confidenceDistribution: UserConfidenceData[];
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
 * Get user analytics stats
 */
export async function getUserAnalyticsStats(): Promise<UserAnalyticsStats | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const interviewsCollection = await getInterviewsCollection();
  
  const pipeline = [
    { $match: { userId: auth.userId } },
    {
      $group: {
        _id: null,
        totalInterviews: { $sum: 1 },
        totalTopics: { $sum: { $size: { $ifNull: ["$modules.revisionTopics", []] } } },
        totalMcqs: { $sum: { $size: { $ifNull: ["$modules.mcqs", []] } } },
        totalRapidFire: { $sum: { $size: { $ifNull: ["$modules.rapidFire", []] } } },
      },
    },
  ];

  const results = await interviewsCollection.aggregate(pipeline).toArray();
  
  if (results.length === 0) {
    return {
      totalInterviews: 0,
      totalTopics: 0,
      totalMcqs: 0,
      totalRapidFire: 0,
      completedTopics: 0,
      topicCompletionRate: 0,
    };
  }

  // Get completed topics count
  const completedPipeline = [
    { $match: { userId: auth.userId } },
    { $unwind: { path: "$modules.revisionTopics", preserveNullAndEmptyArrays: false } },
    { $match: { "modules.revisionTopics.status": "completed" } },
    { $count: "completed" },
  ];

  const completedResults = await interviewsCollection.aggregate(completedPipeline).toArray();
  const completedTopics = completedResults[0]?.completed ?? 0;
  const totalTopics = results[0].totalTopics as number;

  return {
    totalInterviews: results[0].totalInterviews as number,
    totalTopics,
    totalMcqs: results[0].totalMcqs as number,
    totalRapidFire: results[0].totalRapidFire as number,
    completedTopics,
    topicCompletionRate: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
  };
}

/**
 * Get user interview trends over the last 30 days
 */
export async function getUserInterviewTrends(days: number = 30): Promise<UserInterviewTrend[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const interviewsCollection = await getInterviewsCollection();
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  startDate.setUTCHours(0, 0, 0, 0);

  const pipeline = [
    { $match: { userId: auth.userId, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await interviewsCollection.aggregate(pipeline).toArray();
  const dataMap = new Map(results.map((d) => [String(d._id), (d.count as number) || 0]));

  const trends: UserInterviewTrend[] = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    trends.push({
      date: dateStr,
      interviews: dataMap.get(dateStr) ?? 0,
    });
  }

  return trends;
}

/**
 * Get topic progress distribution
 */
export async function getUserTopicProgress(): Promise<UserTopicProgress[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const interviewsCollection = await getInterviewsCollection();

  const pipeline = [
    { $match: { userId: auth.userId } },
    { $unwind: { path: "$modules.revisionTopics", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: { $ifNull: ["$modules.revisionTopics.status", "not_started"] },
        count: { $sum: 1 },
      },
    },
  ];

  const results = await interviewsCollection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  const statusLabels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return results.map((r) => ({
    status: statusLabels[r._id as string] || (r._id as string),
    count: r.count as number,
    percentage: total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
  }));
}

/**
 * Get top companies user is preparing for
 */
export async function getUserTopCompanies(limit: number = 5): Promise<UserCompanyData[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const interviewsCollection = await getInterviewsCollection();

  const pipeline = [
    { $match: { userId: auth.userId, "jobDetails.company": { $ne: "", $exists: true } } },
    { $group: { _id: "$jobDetails.company", count: { $sum: 1 } } },
    { $sort: { count: -1 as const } },
    { $limit: limit },
  ];

  const results = await interviewsCollection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  return results.map((r) => ({
    company: r._id as string,
    count: r.count as number,
    percentage: total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
  }));
}

/**
 * Get top skills from opening briefs
 */
export async function getUserTopSkills(limit: number = 8): Promise<UserSkillData[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const interviewsCollection = await getInterviewsCollection();

  const pipeline = [
    { $match: { userId: auth.userId, "modules.openingBrief.keySkills": { $exists: true } } },
    { $unwind: "$modules.openingBrief.keySkills" },
    { $group: { _id: "$modules.openingBrief.keySkills", count: { $sum: 1 } } },
    { $sort: { count: -1 as const } },
    { $limit: limit },
  ];

  const results = await interviewsCollection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  return results.map((r) => ({
    skill: r._id as string,
    count: r.count as number,
    percentage: total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
  }));
}

/**
 * Get confidence distribution from revision topics
 */
export async function getUserConfidenceDistribution(): Promise<UserConfidenceData[] | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const interviewsCollection = await getInterviewsCollection();

  const pipeline = [
    { $match: { userId: auth.userId } },
    { $unwind: { path: "$modules.revisionTopics", preserveNullAndEmptyArrays: false } },
    { $group: { _id: "$modules.revisionTopics.confidence", count: { $sum: 1 } } },
    { $sort: { _id: 1 as const } },
  ];

  const results = await interviewsCollection.aggregate(pipeline).toArray();
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);

  const confidenceLabels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return results.map((r) => ({
    confidence: confidenceLabels[r._id as string] || (r._id as string),
    count: r.count as number,
    percentage: total > 0 ? Math.round(((r.count as number) / total) * 100) : 0,
  }));
}


/**
 * Get all user analytics data in a single call
 */
export async function getUserAnalyticsDashboardData(): Promise<UserAnalyticsDashboardData | null> {
  const auth = await requireMaxPlan();
  if (!auth) return null;

  const [stats, interviewTrends, topicProgress, topCompanies, topSkills, confidenceDistribution] =
    await Promise.all([
      getUserAnalyticsStats(),
      getUserInterviewTrends(30),
      getUserTopicProgress(),
      getUserTopCompanies(5),
      getUserTopSkills(8),
      getUserConfidenceDistribution(),
    ]);

  return {
    stats: stats ?? {
      totalInterviews: 0,
      totalTopics: 0,
      totalMcqs: 0,
      totalRapidFire: 0,
      completedTopics: 0,
      topicCompletionRate: 0,
    },
    interviewTrends: interviewTrends ?? [],
    topicProgress: topicProgress ?? [],
    topCompanies: topCompanies ?? [],
    topSkills: topSkills ?? [],
    confidenceDistribution: confidenceDistribution ?? [],
  };
}
