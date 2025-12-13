"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import * as roadmapRepo from "@/lib/db/repositories/roadmap-repository";
import * as progressRepo from "@/lib/db/repositories/user-roadmap-progress-repository";
import type { Roadmap, RoadmapNode } from "@/lib/db/schemas/roadmap";
import type {
  UserRoadmapProgress,
  NodeProgressStatus,
} from "@/lib/db/schemas/user-roadmap-progress";

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
  lessonAvailability: Record<
    string,
    import("@/lib/actions/lessons").ObjectiveLessonInfo[]
  >;
  parentRoadmap: Roadmap | null;
  subRoadmapProgressMap: Record<string, SubRoadmapProgressInfo>;
}> {
  const { userId } = await auth();

  const roadmap = await roadmapRepo.findRoadmapBySlug(slug);
  if (!roadmap) {
    return {
      roadmap: null,
      progress: null,
      subRoadmaps: [],
      lessonAvailability: {},
      parentRoadmap: null,
      subRoadmapProgressMap: {},
    };
  }

  let progress: UserRoadmapProgress | null = null;
  if (userId) {
    progress = await progressRepo.findByUserAndSlug(userId, slug);
  }

  // Get sub-roadmaps for nodes that have them
  const subRoadmaps = await roadmapRepo.findSubRoadmaps(slug);

  // Get lesson availability map
  // We import dynamically to avoid circular dependencies if any (though lessons.ts is generic)
  const { getRoadmapLessonAvailability } = await import(
    "@/lib/actions/lessons"
  );
  const lessonAvailability = await getRoadmapLessonAvailability(roadmap);

  // Fetch parent roadmap if this is a sub-roadmap (Requirements: 2.1)
  let parentRoadmap: Roadmap | null = null;
  if (roadmap.parentRoadmapSlug) {
    parentRoadmap = await roadmapRepo.findRoadmapBySlug(
      roadmap.parentRoadmapSlug
    );
  }

  // Get sub-roadmap progress for milestones that have sub-roadmaps (Requirements: 4.2, 4.3)
  const subRoadmapSlugs = roadmap.nodes
    .filter((node) => node.subRoadmapSlug)
    .map((node) => node.subRoadmapSlug as string);

  let subRoadmapProgressMap: Record<string, SubRoadmapProgressInfo> = {};
  if (subRoadmapSlugs.length > 0 && userId) {
    for (const subSlug of subRoadmapSlugs) {
      const subRoadmap = await roadmapRepo.findRoadmapBySlug(subSlug);
      if (!subRoadmap) {
        subRoadmapProgressMap[subSlug] = {
          slug: subSlug,
          overallProgress: 0,
          nodesCompleted: 0,
          totalNodes: 0,
          exists: false,
        };
        continue;
      }

      const subProgress = await progressRepo.findByUserAndSlug(userId, subSlug);
      subRoadmapProgressMap[subSlug] = {
        slug: subSlug,
        overallProgress: subProgress?.overallProgress ?? 0,
        nodesCompleted: subProgress?.nodesCompleted ?? 0,
        totalNodes: subRoadmap.nodes.length,
        exists: true,
      };
    }
  }

  return {
    roadmap,
    progress,
    subRoadmaps,
    lessonAvailability,
    parentRoadmap,
    subRoadmapProgressMap,
  };
}

// Start learning a roadmap (creates progress record)
export async function startRoadmap(
  roadmapSlug: string
): Promise<UserRoadmapProgress | null> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Authentication required");
  }

  const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
  if (!roadmap) {
    throw new Error("Roadmap not found");
  }

  // Check if already started
  const existing = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (existing) {
    return existing;
  }

  // Create initial progress with first node available
  const firstNodes = findFirstNodes(roadmap);
  const initialNodeProgress = roadmap.nodes.map((node) => ({
    nodeId: node.id,
    status: firstNodes.includes(node.id)
      ? ("available" as NodeProgressStatus)
      : ("locked" as NodeProgressStatus),
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

  revalidatePath("/roadmaps");
  revalidatePath(`/roadmaps/${roadmapSlug}`);

  return progress;
}

// Start learning a specific node
export async function startNode(
  roadmapSlug: string,
  nodeId: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Authentication required");
  }

  const progress = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (!progress) {
    throw new Error("Please start the roadmap first");
  }

  await progressRepo.startNode(userId, progress.roadmapId, nodeId);
  revalidatePath(`/roadmaps/${roadmapSlug}`);
}

// Mark node as completed
export async function completeNode(
  roadmapSlug: string,
  nodeId: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Authentication required");
  }

  const progress = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (!progress) {
    throw new Error("Progress not found");
  }

  await progressRepo.markNodeCompleted(userId, progress.roadmapId, nodeId);

  // Unlock dependent nodes
  const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
  if (roadmap) {
    const dependentNodes = findDependentNodesAfterCompletion(
      roadmap,
      nodeId,
      progress
    );
    for (const depNodeId of dependentNodes) {
      await progressRepo.updateNodeProgress(
        userId,
        progress.roadmapId,
        depNodeId,
        {
          nodeId: depNodeId,
          status: "available",
        }
      );
    }

    // Sync progress to parent roadmap if this is a sub-roadmap (Requirements: 4.1)
    if (roadmap.parentRoadmapSlug && roadmap.parentNodeId) {
      // Don't await - fire and forget to avoid blocking the user
      syncSubRoadmapProgressInternal(
        userId,
        roadmap.parentRoadmapSlug,
        roadmap.parentNodeId,
        roadmapSlug
      ).catch((error) => {
        console.error("Failed to sync sub-roadmap progress:", error);
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

  return roadmap.nodes.find((n) => n.id === nodeId) || null;
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
  const targetNodes = new Set(roadmap.edges.map((e) => e.target));
  return roadmap.nodes.filter((n) => !targetNodes.has(n.id)).map((n) => n.id);
}

/**
 * Sub-Roadmap Info Interface
 */
export interface SubRoadmapInfo {
  exists: boolean;
  roadmap: Roadmap | null;
  progress: UserRoadmapProgress | null;
}

/**
 * Get sub-roadmap information by slug
 * Returns existence status, roadmap data, and user progress
 * Requirements: 1.1, 1.3, 7.1, 7.2, 7.3
 */
export async function getSubRoadmapInfo(
  subRoadmapSlug: string
): Promise<SubRoadmapInfo> {
  const { userId } = await auth();

  const roadmap = await roadmapRepo.findRoadmapBySlug(subRoadmapSlug);

  if (!roadmap) {
    return { exists: false, roadmap: null, progress: null };
  }

  let progress: UserRoadmapProgress | null = null;
  if (userId) {
    progress = await progressRepo.findByUserAndSlug(userId, subRoadmapSlug);
  }

  return { exists: true, roadmap, progress };
}

/**
 * Get parent roadmap by slug for breadcrumb display
 * Requirements: 2.1, 2.2
 */
export async function getParentRoadmap(
  parentSlug: string
): Promise<Roadmap | null> {
  return roadmapRepo.findRoadmapBySlug(parentSlug);
}

/**
 * Completion threshold for marking parent milestone as complete
 * When sub-roadmap progress reaches this percentage, parent milestone is marked complete
 */
const SUB_ROADMAP_COMPLETION_THRESHOLD = 0.8; // 80%

/**
 * Internal function to sync sub-roadmap progress (used when userId is already known)
 * This avoids re-authenticating when called from completeNode
 */
async function syncSubRoadmapProgressInternal(
  userId: string,
  parentRoadmapSlug: string,
  parentNodeId: string,
  subRoadmapSlug: string
): Promise<void> {
  const subProgress = await progressRepo.findByUserAndSlug(
    userId,
    subRoadmapSlug
  );
  if (!subProgress) return;

  const completionPercent = subProgress.overallProgress / 100;

  if (completionPercent >= SUB_ROADMAP_COMPLETION_THRESHOLD) {
    // Check if parent milestone is already completed to avoid redundant updates
    const parentProgress = await progressRepo.findByUserAndSlug(
      userId,
      parentRoadmapSlug
    );
    if (parentProgress) {
      const parentNodeProgress = parentProgress.nodeProgress.find(
        (np) => np.nodeId === parentNodeId
      );
      if (parentNodeProgress?.status === "completed") {
        return; // Already completed, no need to update
      }
    }

    // Mark parent milestone as complete
    await completeNodeInternal(userId, parentRoadmapSlug, parentNodeId);
    revalidatePath(`/roadmaps/${parentRoadmapSlug}`);
  }
}

/**
 * Internal function to complete a node (used when userId is already known)
 * This avoids re-authenticating when called from syncSubRoadmapProgressInternal
 */
async function completeNodeInternal(
  userId: string,
  roadmapSlug: string,
  nodeId: string
): Promise<void> {
  const progress = await progressRepo.findByUserAndSlug(userId, roadmapSlug);
  if (!progress) {
    // Create progress record if it doesn't exist
    const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
    if (!roadmap) return;

    const firstNodes = findFirstNodes(roadmap);
    const initialNodeProgress = roadmap.nodes.map((node) => ({
      nodeId: node.id,
      status: firstNodes.includes(node.id)
        ? ("available" as NodeProgressStatus)
        : ("locked" as NodeProgressStatus),
      activitiesCompleted: 0,
      timeSpentMinutes: 0,
      correctAnswers: 0,
      totalQuestions: 0,
    }));

    const newProgress = await progressRepo.createProgress({
      userId,
      roadmapId: roadmap._id,
      roadmapSlug: roadmap.slug,
      nodeProgress: initialNodeProgress,
      totalNodes: roadmap.nodes.length,
      streak: 0,
      startedAt: new Date(),
    });

    await progressRepo.markNodeCompleted(userId, newProgress.roadmapId, nodeId);
    return;
  }

  await progressRepo.markNodeCompleted(userId, progress.roadmapId, nodeId);

  // Unlock dependent nodes
  const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
  if (roadmap) {
    const dependentNodes = findDependentNodesAfterCompletion(
      roadmap,
      nodeId,
      progress
    );
    for (const depNodeId of dependentNodes) {
      await progressRepo.updateNodeProgress(
        userId,
        progress.roadmapId,
        depNodeId,
        {
          nodeId: depNodeId,
          status: "available",
        }
      );
    }
  }
}

/**
 * Sync sub-roadmap progress to parent roadmap milestone
 * Marks parent milestone as complete when threshold is reached
 * Requirements: 4.1
 */
export async function syncSubRoadmapProgress(
  parentRoadmapSlug: string,
  parentNodeId: string,
  subRoadmapSlug: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  await syncSubRoadmapProgressInternal(
    userId,
    parentRoadmapSlug,
    parentNodeId,
    subRoadmapSlug
  );
}

/**
 * Sub-roadmap progress info for displaying on parent milestones
 * Requirements: 4.2, 4.3
 */
export interface SubRoadmapProgressInfo {
  slug: string;
  overallProgress: number;
  nodesCompleted: number;
  totalNodes: number;
  exists: boolean;
}

/**
 * Get sub-roadmap progress for multiple slugs
 * Used to display progress indicators on parent roadmap milestones
 * Requirements: 4.2, 4.3
 */
export async function getSubRoadmapProgressMap(
  subRoadmapSlugs: string[]
): Promise<Record<string, SubRoadmapProgressInfo>> {
  const { userId } = await auth();

  const result: Record<string, SubRoadmapProgressInfo> = {};

  for (const slug of subRoadmapSlugs) {
    const roadmap = await roadmapRepo.findRoadmapBySlug(slug);

    if (!roadmap) {
      result[slug] = {
        slug,
        overallProgress: 0,
        nodesCompleted: 0,
        totalNodes: 0,
        exists: false,
      };
      continue;
    }

    let progress: UserRoadmapProgress | null = null;
    if (userId) {
      progress = await progressRepo.findByUserAndSlug(userId, slug);
    }

    result[slug] = {
      slug,
      overallProgress: progress?.overallProgress ?? 0,
      nodesCompleted: progress?.nodesCompleted ?? 0,
      totalNodes: roadmap.nodes.length,
      exists: true,
    };
  }

  return result;
}

// Helper: Find nodes that should be unlocked after completing a node
function findDependentNodesAfterCompletion(
  roadmap: Roadmap,
  completedNodeId: string,
  progress: UserRoadmapProgress
): string[] {
  const completedSet = new Set(
    progress.nodeProgress
      .filter((np) => np.status === "completed")
      .map((np) => np.nodeId)
  );
  completedSet.add(completedNodeId);

  const unlockable: string[] = [];

  // Find nodes that have this node as a prerequisite
  const dependentEdges = roadmap.edges.filter(
    (e) => e.source === completedNodeId
  );

  for (const edge of dependentEdges) {
    const targetNodeId = edge.target;

    // Check if all sequential prerequisites for this target are completed
    const prereqNodeIds = roadmap.edges
      .filter((e) => e.target === targetNodeId && e.type === "sequential")
      .map((e) => e.source);

    const allCompleted = prereqNodeIds.every((prereqId) =>
      completedSet.has(prereqId)
    );
    if (allCompleted) {
      unlockable.push(targetNodeId);
    }
  }

  return unlockable;
}
