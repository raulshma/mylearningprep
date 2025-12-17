'use server';

/**
 * Optimized Dashboard Data Fetching
 * Split into granular cached functions for parallel streaming
 */

import { cache } from 'react';
import { getAuthUser, hasByokApiKey } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { interviewRepository, type InterviewSummary } from '@/lib/db/repositories/interview-repository';
import { learningPathRepository } from '@/lib/db/repositories/learning-path-repository';
import { userJourneyProgressRepository } from '@/lib/db/repositories/user-journey-progress-repository';
import type { UserJourneyProgressSummary } from '@/lib/db/schemas/user-journey-progress';

export interface DashboardInterviewData {
  _id: string;
  jobDetails: {
    title: string;
    company: string;
    description: string;
    programmingLanguage?: string;
  };
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: 'upcoming' | 'active' | 'completed';
  progress: number;
  topics: string[];
}

export interface DashboardStats {
  total: number;
  active: number;
  completed: number;
}

export interface DashboardSidebar {
  isAdmin: boolean;
  usage: {
    iterations: { count: number; limit: number };
    interviews: { count: number; limit: number };
    plan: string;
    isByok: boolean;
  };
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

export interface LearningPathSummary {
  _id: string;
  goal: string;
  overallElo: number;
  skillScores: Record<string, number>;
  timeline: { success: boolean }[];
}

// Re-export for backward compatibility
export type { UserJourneyProgressSummary };


// ============================================================================
// Helper Functions
// ============================================================================

function computeStatus(summary: InterviewSummary): 'upcoming' | 'active' | 'completed' {
  const moduleCount = [
    summary.hasOpeningBrief,
    summary.topicCount > 0,
    summary.mcqCount > 0,
    summary.rapidFireCount > 0,
  ].filter(Boolean).length;

  if (moduleCount === 4) return 'completed';
  if (moduleCount > 0) return 'active';
  return 'upcoming';
}

function computeProgress(summary: InterviewSummary): number {
  const moduleCount = [
    summary.hasOpeningBrief,
    summary.topicCount > 0,
    summary.mcqCount > 0,
    summary.rapidFireCount > 0,
  ].filter(Boolean).length;
  return Math.round((moduleCount / 4) * 100);
}

function extractTopics(summary: InterviewSummary): string[] {
  if (summary.topicTitles.length > 0) {
    return summary.topicTitles;
  }
  return summary.keySkills;
}

// ============================================================================
// Cached Auth - Shared across all dashboard fetches (deduped by React)
// ============================================================================

export const getAuthenticatedUser = cache(async () => {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('Unauthorized');
  }
  
  const dbUser = await userRepository.findByClerkId(authUser.clerkId);
  if (!dbUser) {
    throw new Error('User not found');
  }
  
  return { authUser, dbUser };
});

// ============================================================================
// Granular Data Fetchers - Each can be streamed independently
// ============================================================================

/**
 * Fetch dashboard stats (lightweight)
 */
export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  const { dbUser } = await getAuthenticatedUser();
  
  // Use the user's stored interview count for total
  const total = dbUser.interviews?.count ?? 0;
  
  // For active/completed, we need a lightweight aggregation
  // This could be optimized further with stored counters on user doc
  const summaries = await interviewRepository.findSummariesByUserId(dbUser._id, 1, 100);
  
  let active = 0;
  let completed = 0;
  
  for (const summary of summaries.interviews) {
    const status = computeStatus(summary);
    if (status === 'completed') completed++;
    else if (status === 'active' || status === 'upcoming') active++;
  }
  
  return { total, active, completed };
});

/**
 * Fetch active learning path summary
 */
export const getActiveLearningPath = cache(async (): Promise<LearningPathSummary | null> => {
  const { dbUser } = await getAuthenticatedUser();
  const learningPath = await learningPathRepository.findActiveSummaryByUserId(dbUser._id);
  return learningPath as LearningPathSummary | null;
});

/**
 * Fetch journey progress summaries
 */
export const getJourneyProgress = cache(async (): Promise<UserJourneyProgressSummary[]> => {
  const { dbUser } = await getAuthenticatedUser();
  return userJourneyProgressRepository.findProgressSummariesByUser(dbUser._id);
});

/**
 * Fetch paginated interviews
 */
export const getDashboardInterviews = cache(async (
  page: number = 1,
  search?: string,
  status?: 'active' | 'completed' | 'all'
): Promise<{ interviews: DashboardInterviewData[]; total: number }> => {
  const { dbUser } = await getAuthenticatedUser();
  
  const { interviews: summaries, total } = await interviewRepository.findSummariesByUserId(
    dbUser._id, 
    page, 
    9, 
    search, 
    status
  );

  const interviews: DashboardInterviewData[] = summaries.map((summary) => ({
    _id: summary._id,
    jobDetails: summary.jobDetails,
    isPublic: summary.isPublic,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    status: computeStatus(summary),
    progress: computeProgress(summary),
    topics: extractTopics(summary),
  }));

  return { interviews, total };
});

/**
 * Fetch sidebar data (user info + usage)
 */
export const getSidebarData = cache(async (): Promise<DashboardSidebar> => {
  const { authUser, dbUser } = await getAuthenticatedUser();
  const isByok = await hasByokApiKey();

  return {
    isAdmin: authUser.isAdmin,
    usage: {
      iterations: { count: dbUser.iterations.count, limit: dbUser.iterations.limit },
      interviews: {
        count: dbUser.interviews?.count ?? 0,
        limit: dbUser.interviews?.limit ?? 3,
      },
      plan: dbUser.plan,
      isByok,
    },
    user: {
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      email: authUser.email,
      imageUrl: authUser.imageUrl,
    },
  };
});

// ============================================================================
// Legacy Combined Fetch - For backward compatibility
// ============================================================================

export interface DashboardData {
  interviews: DashboardInterviewData[];
  totalInterviews: number;
  journeyProgress: UserJourneyProgressSummary[];
  learningPath: LearningPathSummary | null;
  stats: DashboardStats;
  sidebar: DashboardSidebar;
}

export const getDashboardData = cache(async (
  page: number = 1,
  search?: string,
  status?: 'active' | 'completed' | 'all'
): Promise<DashboardData> => {
  // Parallel fetch all data
  const [
    { interviews, total: totalInterviews },
    learningPath,
    journeyProgress,
    sidebar,
  ] = await Promise.all([
    getDashboardInterviews(page, search, status),
    getActiveLearningPath(),
    getJourneyProgress(),
    getSidebarData(),
  ]);

  // Compute stats from interviews
  const stats: DashboardStats = {
    total: totalInterviews,
    active: interviews.filter((i) => i.status === 'active' || i.status === 'upcoming').length,
    completed: interviews.filter((i) => i.status === 'completed').length,
  };

  return { 
    interviews, 
    totalInterviews,
    stats,
    sidebar,
    learningPath,
    journeyProgress
  };
});
