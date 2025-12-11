'use server';

import { allRoadmaps } from '@/lib/data/roadmaps';
import { upsertRoadmapBySlug } from '@/lib/db/repositories/roadmap-repository';

/**
 * Seed all predefined roadmaps into the database.
 * Uses upsert to avoid duplicates - safe to run multiple times.
 */
export async function seedRoadmaps(): Promise<{ seeded: number; slugs: string[] }> {
  const slugs: string[] = [];
  
  for (const roadmap of allRoadmaps) {
    await upsertRoadmapBySlug(roadmap);
    slugs.push(roadmap.slug);
    console.log(`[Seed] Upserted roadmap: ${roadmap.slug}`);
  }
  
  return { seeded: slugs.length, slugs };
}

/**
 * Check if roadmaps need seeding (for auto-seed on first run)
 */
export async function checkAndSeedRoadmaps(): Promise<boolean> {
  const { findAllRoadmaps } = await import('@/lib/db/repositories/roadmap-repository');
  const existing = await findAllRoadmaps();
  
  if (existing.length === 0) {
    console.log('[Seed] No roadmaps found, seeding...');
    await seedRoadmaps();
    return true;
  }
  
  return false;
}
