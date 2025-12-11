'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import * as roadmapRepo from '@/lib/db/repositories/roadmap-repository';
import * as progressRepo from '@/lib/db/repositories/user-roadmap-progress-repository';
import type { Roadmap, RoadmapNode } from '@/lib/db/schemas/roadmap';
import type { UserRoadmapProgress, NodeProgressStatus } from '@/lib/db/schemas/user-roadmap-progress';

/**
 * Roadmap Server Actions
 */

// Get all available roadmaps with user progress
export async function getRoadmaps(): Promise<{
  roadmaps: Roadmap[];
  progressMap: Record<string, UserRoadmapProgress>;
}> {
  const { userId } = await auth();
  if (!userId) {
    return { roadmaps: [], progressMap: {} };
  }

  const roadmaps = await roadmapRepo.findAllRoadmaps();
  const allProgress = await progressRepo.findAllByUser(userId);

  const progressMap: Record<string, UserRoadmapProgress> = {};
  for (const progress of allProgress) {
    progressMap[progress.roadmapSlug] = progress;
  }

  return { roadmaps, progressMap };
}

// Get single roadmap with user progress
export async function getRoadmapWithProgress(slug: string): Promise<{
  roadmap: Roadmap | null;
  progress: UserRoadmapProgress | null;
  subRoadmaps: Roadmap[];
  lessonAvailability: Record<string, import('@/lib/actions/lessons').ObjectiveLessonInfo[]>;
}> {
  const { userId } = await auth();

  const roadmap = await roadmapRepo.findRoadmapBySlug(slug);
  if (!roadmap) {
    return { roadmap: null, progress: null, subRoadmaps: [], lessonAvailability: {} };
  }

  let progress: UserRoadmapProgress | null = null;
  if (userId) {
    progress = await progressRepo.findByUserAndSlug(userId, slug);
  }

  // Get sub-roadmaps for nodes that have them
  const subRoadmaps = await roadmapRepo.findSubRoadmaps(slug);

  // Get lesson availability map
  // We import dynamically to avoid circular dependencies if any (though lessons.ts is generic)
  const { getRoadmapLessonAvailability } = await import('@/lib/actions/lessons');
  const lessonAvailability = await getRoadmapLessonAvailability(roadmap);

  return { roadmap, progress, subRoadmaps, lessonAvailability };
}

// Start learning a roadmap (creates progress record)
export async function startRoadmap(roadmapSlug: string): Promise<UserRoadmapProgress | null> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
  if (!roadmap) {
    throw new Error('Roadmap not found');
  }

  // Check if already started
  const existing = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (existing) {
    return existing;
  }

  // Create initial progress with first node available
  const firstNodes = findFirstNodes(roadmap);
  const initialNodeProgress = roadmap.nodes.map(node => ({
    nodeId: node.id,
    status: firstNodes.includes(node.id) ? ('available' as NodeProgressStatus) : ('locked' as NodeProgressStatus),
    activitiesCompleted: 0,
    timeSpentMinutes: 0,
    correctAnswers: 0,
    totalQuestions: 0,
  }));

  const progress = await progressRepo.createProgress({
    userId,
    roadmapId: roadmap._id,
    roadmapSlug: roadmap.slug,
    nodeProgress: initialNodeProgress,
    totalNodes: roadmap.nodes.length,
    streak: 0,
    startedAt: new Date(),
  });

  revalidatePath('/roadmaps');
  revalidatePath(`/roadmaps/${roadmapSlug}`);

  return progress;
}

// Start learning a specific node
export async function startNode(roadmapSlug: string, nodeId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  const progress = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (!progress) {
    throw new Error('Please start the roadmap first');
  }

  await progressRepo.startNode(userId, progress.roadmapId, nodeId);
  revalidatePath(`/roadmaps/${roadmapSlug}`);
}

// Mark node as completed
export async function completeNode(roadmapSlug: string, nodeId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  const progress = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (!progress) {
    throw new Error('Progress not found');
  }

  await progressRepo.markNodeCompleted(userId, progress.roadmapId, nodeId);

  // Unlock dependent nodes
  const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
  if (roadmap) {
    const dependentNodes = findDependentNodes(roadmap, nodeId, progress);
    for (const depNodeId of dependentNodes) {
      await progressRepo.updateNodeProgress(userId, progress.roadmapId, depNodeId, {
        nodeId: depNodeId,
        status: 'available',
      });
    }
  }

  revalidatePath(`/roadmaps/${roadmapSlug}`);
}

// Get node details for learning
export async function getNodeDetails(
  roadmapSlug: string,
  nodeId: string
): Promise<RoadmapNode | null> {
  const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
  if (!roadmap) return null;

  return roadmap.nodes.find(n => n.id === nodeId) || null;
}

// Update node activity stats (after completing a learning activity)
export async function updateNodeActivity(
  roadmapSlug: string,
  nodeId: string,
  timeSpentMinutes: number,
  correctAnswers: number,
  totalQuestions: number
): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const progress = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (!progress) return;

  await progressRepo.incrementNodeActivity(
    userId,
    progress.roadmapId,
    nodeId,
    timeSpentMinutes,
    correctAnswers,
    totalQuestions
  );
}

// Helper: Find nodes with no incoming edges (starting points)
function findFirstNodes(roadmap: Roadmap): string[] {
  const targetNodes = new Set(roadmap.edges.map(e => e.target));
  return roadmap.nodes
    .filter(n => !targetNodes.has(n.id))
    .map(n => n.id);
}

// Helper: Find nodes that should be unlocked after completing a node
function findDependentNodes(
  roadmap: Roadmap,
  completedNodeId: string,
  progress: UserRoadmapProgress
): string[] {
  const unlockable: string[] = [];
  
  // Find nodes that have this node as a prerequisite
  const dependentEdges = roadmap.edges.filter(e => e.source === completedNodeId);
  
  for (const edge of dependentEdges) {
    const targetNodeId = edge.target;
    
    // Check if all prerequisites for this target are completed
    const allPrereqs = roadmap.edges
      .filter(e => e.target === targetNodeId && e.type === 'sequential')
      .map(e => e.source);
    
    const allCompleted = allPrereqs.every(prereqId => {
      const prereqProgress = progress.nodeProgress.find(np => np.nodeId === prereqId);
      return prereqProgress?.status === 'completed';
    });
    
    if (allCompleted) {
      unlockable.push(targetNodeId);
    }
  }
  
  return unlockable;
}
