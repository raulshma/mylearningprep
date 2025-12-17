"use server";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import {
  getUserAnalyticsStats,
  getUserInterviewTrends,
  getUserTopicProgress,
  getUserTopCompanies,
  getUserTopSkills,
  getUserConfidenceDistribution,
  getUserjourneyAnalytics,
  type UserAnalyticsStats,
  type UserInterviewTrend,
  type UserTopicProgress,
  type UserCompanyData,
  type UserSkillData,
  type UserConfidenceData,
  type UserjourneyStats,
  type UserjourneyTrend,
  type UserTopjourney,
  type UserjourneyProgressBucket,
} from "./user-analytics";

const CACHE_REVALIDATE_SECONDS = 60;

/**
 * Get authenticated user ID - memoized per request with React cache
 */
const getAuthUserIdForCache = cache(async (): Promise<string> => {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);
  if (!user || user.plan === "FREE") {
    throw new Error("Unauthorized");
  }
  return user._id;
});

/**
 * Cached analytics stats
 */
export async function getCachedAnalyticsStats(): Promise<UserAnalyticsStats | null> {
  const userId = await getAuthUserIdForCache();
  
  const getCached = unstable_cache(
    async () => getUserAnalyticsStats(),
    [`analytics-stats-${userId}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [`user-analytics-${userId}`] }
  );
  
  return getCached();
}

/**
 * Cached interview trends
 */
export async function getCachedInterviewTrends(): Promise<UserInterviewTrend[] | null> {
  const userId = await getAuthUserIdForCache();
  
  const getCached = unstable_cache(
    async () => getUserInterviewTrends(30),
    [`analytics-trends-${userId}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [`user-analytics-${userId}`] }
  );
  
  return getCached();
}

/**
 * Cached topic progress
 */
export async function getCachedTopicProgress(): Promise<UserTopicProgress[] | null> {
  const userId = await getAuthUserIdForCache();
  
  const getCached = unstable_cache(
    async () => getUserTopicProgress(),
    [`analytics-topic-progress-${userId}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [`user-analytics-${userId}`] }
  );
  
  return getCached();
}

/**
 * Cached confidence distribution
 */
export async function getCachedConfidenceDistribution(): Promise<UserConfidenceData[] | null> {
  const userId = await getAuthUserIdForCache();
  
  const getCached = unstable_cache(
    async () => getUserConfidenceDistribution(),
    [`analytics-confidence-${userId}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [`user-analytics-${userId}`] }
  );
  
  return getCached();
}

/**
 * Cached top companies
 */
export async function getCachedTopCompanies(): Promise<UserCompanyData[] | null> {
  const userId = await getAuthUserIdForCache();
  
  const getCached = unstable_cache(
    async () => getUserTopCompanies(5),
    [`analytics-companies-${userId}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [`user-analytics-${userId}`] }
  );
  
  return getCached();
}

/**
 * Cached top skills
 */
export async function getCachedTopSkills(): Promise<UserSkillData[] | null> {
  const userId = await getAuthUserIdForCache();
  
  const getCached = unstable_cache(
    async () => getUserTopSkills(8),
    [`analytics-skills-${userId}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [`user-analytics-${userId}`] }
  );
  
  return getCached();
}

/**
 * Cached journey analytics
 */
export async function getCachedJourneyAnalytics(): Promise<{
  stats: UserjourneyStats;
  nodeCompletionTrends: UserjourneyTrend[];
  topjourneys: UserTopjourney[];
  progressBuckets: UserjourneyProgressBucket[];
} | null> {
  const userId = await getAuthUserIdForCache();
  
  const getCached = unstable_cache(
    async () => getUserjourneyAnalytics(30),
    [`analytics-journey-${userId}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [`user-analytics-${userId}`] }
  );
  
  return getCached();
}

// Re-export types
export type {
  UserAnalyticsStats,
  UserInterviewTrend,
  UserTopicProgress,
  UserCompanyData,
  UserSkillData,
  UserConfidenceData,
  UserjourneyStats,
  UserjourneyTrend,
  UserTopjourney,
  UserjourneyProgressBucket,
};
