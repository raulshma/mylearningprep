import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import * as journeyRepo from '@/lib/db/repositories/journey-repository';
import { userJourneyProgressRepository as progressRepo } from '@/lib/db/repositories/user-journey-progress-repository';
import type { Journey } from '@/lib/db/schemas/journey';
import type { UserJourneyProgressSummary } from '@/lib/db/schemas/user-journey-progress';
import type { UserGamification } from '@/lib/db/schemas/user';

// Re-export seed data for backwards compatibility
export { allJourneys } from './journeys/index';

/**
 * Cached data fetching functions for journeys
 * Using React cache for request deduplication and unstable_cache for cross-request caching
 */

// Cache all journeys (shared across users)
const getCachedJourneys = unstable_cache(
  async () => journeyRepo.findAllJourneys(),
  ['journeys-all'],
  { revalidate: 3600, tags: ['journeys'] }
);

// Get all journeys - deduplicated per request
export const getJourneys = cache(async (): Promise<Journey[]> => {
  return getCachedJourneys();
});

// Get user progress map - user-specific, shorter cache
export const getUserProgressMap = cache(async (userId: string): Promise<Record<string, UserJourneyProgressSummary>> => {
  const progressSummaries = await progressRepo.findProgressSummariesByUser(userId);
  
  const progressMap: Record<string, UserJourneyProgressSummary> = {};
  for (const summary of progressSummaries) {
    progressMap[summary.journeySlug] = summary;
  }
  
  return progressMap;
});

// Get current user ID - deduplicated per request
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const { userId } = await auth();
  return userId;
});

// Get user gamification data (userId used for cache key differentiation)
export const getUserGamification = cache(async (_userId: string): Promise<UserGamification | null> => {
  const { getUserGamificationAction } = await import('@/lib/actions/gamification');
  return getUserGamificationAction();
});
