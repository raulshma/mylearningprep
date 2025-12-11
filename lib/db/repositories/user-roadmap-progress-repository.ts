import { ObjectId } from 'mongodb';
import { cache } from 'react';
import { getUserRoadmapProgressCollection } from '../collections';
import type { 
  UserRoadmapProgress, 
  CreateUserRoadmapProgress, 
  NodeProgress,
  NodeProgressStatus 
} from '../schemas/user-roadmap-progress';

/**
 * User Roadmap Progress Repository
 * Track user progress through roadmaps
 */

// Find user's progress for a specific roadmap
export const findByUserAndRoadmap = cache(async (
  userId: string, 
  roadmapId: string
): Promise<UserRoadmapProgress | null> => {
  const collection = await getUserRoadmapProgressCollection();
  const doc = await collection.findOne({ userId, roadmapId });
  
  if (!doc) return null;
  
  return {
    ...doc,
    _id: doc._id.toString(),
  } as UserRoadmapProgress;
});

// Find user's progress by roadmap slug
export const findByUserAndSlug = cache(async (
  userId: string, 
  roadmapSlug: string
): Promise<UserRoadmapProgress | null> => {
  const collection = await getUserRoadmapProgressCollection();
  const doc = await collection.findOne({ userId, roadmapSlug });
  
  if (!doc) return null;
  
  return {
    ...doc,
    _id: doc._id.toString(),
  } as UserRoadmapProgress;
});

// Find all roadmap progress for a user
export const findAllByUser = cache(async (userId: string): Promise<UserRoadmapProgress[]> => {
  const collection = await getUserRoadmapProgressCollection();
  const docs = await collection
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
  
  return docs.map(doc => ({
    ...doc,
    _id: doc._id.toString(),
  })) as UserRoadmapProgress[];
});

// Create initial progress record when user starts a roadmap
export async function createProgress(progress: CreateUserRoadmapProgress): Promise<UserRoadmapProgress> {
  const collection = await getUserRoadmapProgressCollection();
  const now = new Date();
  const id = new ObjectId().toString();
  
  const doc = {
    ...progress,
    _id: id,
    overallProgress: 0,
    nodesCompleted: 0,
    createdAt: now,
    updatedAt: now,
  };
  
  await collection.insertOne(doc as any);
  
  return doc as UserRoadmapProgress;
}

// Update node progress
export async function updateNodeProgress(
  userId: string,
  roadmapId: string,
  nodeId: string,
  nodeUpdate: Partial<NodeProgress>
): Promise<void> {
  const collection = await getUserRoadmapProgressCollection();
  
  // First, check if node progress exists
  const existing = await collection.findOne({
    userId,
    roadmapId,
    'nodeProgress.nodeId': nodeId,
  });
  
  if (existing) {
    // Update existing node progress
    await collection.updateOne(
      { userId, roadmapId, 'nodeProgress.nodeId': nodeId },
      {
        $set: {
          'nodeProgress.$': { nodeId, ...nodeUpdate },
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        },
      }
    );
  } else {
    // Add new node progress
    await collection.updateOne(
      { userId, roadmapId },
      {
        $push: { nodeProgress: { nodeId, ...nodeUpdate } as any },
        $set: { 
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        },
      }
    );
  }
}

// Mark node as completed and recalculate overall progress
export async function markNodeCompleted(
  userId: string,
  roadmapId: string,
  nodeId: string
): Promise<void> {
  const collection = await getUserRoadmapProgressCollection();
  const now = new Date();
  
  // Check if node exists in progress
  const progress = await collection.findOne({
    userId,
    roadmapId,
    'nodeProgress.nodeId': nodeId,
  });
  
  if (progress) {
    // Update existing node
    await collection.updateOne(
      { userId, roadmapId, 'nodeProgress.nodeId': nodeId },
      {
        $set: {
          'nodeProgress.$.status': 'completed' as NodeProgressStatus,
          'nodeProgress.$.completedAt': now,
          updatedAt: now,
          lastActivityAt: now,
        },
        $inc: { nodesCompleted: 1 },
      }
    );
  } else {
    // Add as completed
    await collection.updateOne(
      { userId, roadmapId },
      {
        $push: {
          nodeProgress: {
            nodeId,
            status: 'completed' as NodeProgressStatus,
            completedAt: now,
            activitiesCompleted: 0,
            timeSpentMinutes: 0,
            correctAnswers: 0,
            totalQuestions: 0,
          } as any,
        },
        $set: { 
          updatedAt: now,
          lastActivityAt: now,
        },
        $inc: { nodesCompleted: 1 },
      }
    );
  }
  
  // Recalculate overall progress
  await recalculateProgress(userId, roadmapId);
}

// Start learning a node
export async function startNode(
  userId: string,
  roadmapId: string,
  nodeId: string
): Promise<void> {
  const collection = await getUserRoadmapProgressCollection();
  const now = new Date();
  
  await collection.updateOne(
    { userId, roadmapId },
    {
      $set: { 
        currentNodeId: nodeId,
        updatedAt: now,
        lastActivityAt: now,
      },
    }
  );
  
  // Update or create node progress
  await updateNodeProgress(userId, roadmapId, nodeId, {
    nodeId,
    status: 'in-progress' as NodeProgressStatus,
    startedAt: now,
  } as NodeProgress);
}

// Recalculate overall progress percentage
async function recalculateProgress(userId: string, roadmapId: string): Promise<void> {
  const collection = await getUserRoadmapProgressCollection();
  
  const progress = await collection.findOne({ userId, roadmapId });
  if (!progress) return;
  
  const completedCount = progress.nodeProgress.filter(
    (n: { status: NodeProgressStatus }) => n.status === 'completed'
  ).length;
  
  const totalNodes = progress.totalNodes || 1;
  const overallProgress = Math.round((completedCount / totalNodes) * 100);
  
  await collection.updateOne(
    { userId, roadmapId },
    {
      $set: {
        nodesCompleted: completedCount,
        overallProgress,
        updatedAt: new Date(),
      },
    }
  );
}

// Increment activity stats for a node
export async function incrementNodeActivity(
  userId: string,
  roadmapId: string,
  nodeId: string,
  timeSpentMinutes: number = 0,
  correctAnswers: number = 0,
  totalQuestions: number = 0
): Promise<void> {
  const collection = await getUserRoadmapProgressCollection();
  
  await collection.updateOne(
    { userId, roadmapId, 'nodeProgress.nodeId': nodeId },
    {
      $inc: {
        'nodeProgress.$.activitiesCompleted': 1,
        'nodeProgress.$.timeSpentMinutes': timeSpentMinutes,
        'nodeProgress.$.correctAnswers': correctAnswers,
        'nodeProgress.$.totalQuestions': totalQuestions,
      },
      $set: {
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      },
    }
  );
}
