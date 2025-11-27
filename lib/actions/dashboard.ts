'use server';

/**
 * Optimized Dashboard Data Fetching
 * Combines user and interview data fetching with parallel queries
 */

import { cache } from 'react';
import { getAuthUser, hasByokApiKey } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { interviewRepository, type InterviewSummary } from '@/lib/db/repositories/interview-repository';

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

export interface DashboardData {
  interviews: DashboardInterviewData[];
  stats: {
    total: number;
    active: number;
    completed: number;
  };
  sidebar: {
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
  };
}

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

/**
 * Fetch all dashboard data in a single optimized call
 * Uses parallel queries and lightweight projections
 */
export const getDashboardData = cache(async (): Promise<DashboardData> => {
  // Get auth user first (cached, so subsequent calls are free)
  const authUser = await getAuthUser();
  
  if (!authUser) {
    throw new Error('Unauthorized');
  }

  // Parallel fetch: DB user + BYOK status
  const [dbUser, isByok] = await Promise.all([
    userRepository.findByClerkId(authUser.clerkId),
    hasByokApiKey(),
  ]);

  if (!dbUser) {
    throw new Error('User not found');
  }

  // Fetch interview summaries (optimized query with projection)
  const summaries = await interviewRepository.findSummariesByUserId(dbUser._id);

  // Transform summaries to dashboard format
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

  // Compute stats
  const stats = {
    total: interviews.length,
    active: interviews.filter((i) => i.status === 'active' || i.status === 'upcoming').length,
    completed: interviews.filter((i) => i.status === 'completed').length,
  };

  // Build sidebar data (reusing already-fetched data)
  const sidebar = {
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

  return { interviews, stats, sidebar };
});
