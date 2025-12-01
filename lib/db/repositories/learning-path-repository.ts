import { ObjectId } from 'mongodb';
import { getLearningPathsCollection } from '../collections';
import {
  LearningPath,
  CreateLearningPath,
  LearningTopic,
  TimelineEntry,
  SkillScores,
  DifficultyLevel,
  Activity,
} from '../schemas/learning-path';

/**
 * Ensures learning path has default values to prevent undefined errors
 */
function normalizeLearningPath(path: LearningPath): LearningPath {
  return {
    ...path,
    topics: path.topics ?? [],
    timeline: path.timeline ?? [],
    skillScores: path.skillScores ?? {},
    overallElo: path.overallElo ?? 1000,
    isActive: path.isActive ?? true,
    currentActivity: path.currentActivity ?? null,
  };
}

export interface LearningPathRepository {
  create(data: CreateLearningPath): Promise<LearningPath>;
  findById(id: string): Promise<LearningPath | null>;
  findByUserId(userId: string): Promise<LearningPath[]>;
  findActiveByUserId(userId: string): Promise<LearningPath | null>;

  // Topic management
  addTopic(pathId: string, topic: LearningTopic): Promise<void>;
  setCurrentTopic(pathId: string, topicId: string): Promise<void>;

  // Activity persistence
  setCurrentActivity(pathId: string, activity: Activity | null): Promise<void>;
  clearCurrentActivity(pathId: string): Promise<void>;

  // Timeline management
  addTimelineEntry(pathId: string, entry: TimelineEntry): Promise<void>;
  updateTimelineNotes(pathId: string, entryId: string, notes: string): Promise<void>;

  // ELO updates
  updateEloScores(pathId: string, overallElo: number, skillScores: SkillScores): Promise<void>;
  updateDifficulty(pathId: string, difficulty: DifficultyLevel): Promise<void>;

  // Path lifecycle
  deactivate(pathId: string): Promise<void>;
  delete(pathId: string): Promise<void>;
}


export const learningPathRepository: LearningPathRepository = {
  async create(data) {
    const collection = await getLearningPathsCollection();
    const now = new Date();
    const id = new ObjectId().toString();

    const learningPath: LearningPath = {
      _id: id,
      userId: data.userId,
      goal: data.goal,
      programmingLanguage: data.programmingLanguage || 'typescript',
      skillClusters: data.skillClusters,
      currentTopicId: null,
      currentActivity: null,
      baselineDifficulty: data.baselineDifficulty,
      currentDifficulty: data.currentDifficulty,
      overallElo: 1000,
      skillScores: {},
      topics: [],
      timeline: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(learningPath);
    return learningPath;
  },

  async findById(id: string) {
    const collection = await getLearningPathsCollection();
    const path = await collection.findOne({ _id: id });
    if (!path) return null;
    return normalizeLearningPath(path as LearningPath);
  },

  async findByUserId(userId: string) {
    const collection = await getLearningPathsCollection();
    const paths = await collection
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
    return (paths as LearningPath[]).map(normalizeLearningPath);
  },

  async findActiveByUserId(userId: string) {
    const collection = await getLearningPathsCollection();
    const path = await collection.findOne({ userId, isActive: true });
    if (!path) return null;
    return normalizeLearningPath(path as LearningPath);
  },


  async addTopic(pathId: string, topic: LearningTopic) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
         
        $push: { topics: topic } as any,
        $set: { updatedAt: now },
      }
    );
  },

  async setCurrentTopic(pathId: string, topicId: string) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
        $set: {
          currentTopicId: topicId,
          updatedAt: now,
        },
      }
    );
  },

  async setCurrentActivity(pathId: string, activity: Activity | null) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
        $set: {
          currentActivity: activity,
          updatedAt: now,
        },
      }
    );
  },

  async clearCurrentActivity(pathId: string) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
        $set: {
          currentActivity: null,
          updatedAt: now,
        },
      }
    );
  },

  async addTimelineEntry(pathId: string, entry: TimelineEntry) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
         
        $push: { timeline: entry } as any,
        $set: { updatedAt: now },
      }
    );
  },

  async updateTimelineNotes(pathId: string, entryId: string, notes: string) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId, 'timeline.id': entryId },
      {
        $set: {
          'timeline.$.userNotes': notes,
          updatedAt: now,
        },
      }
    );
  },


  async updateEloScores(pathId: string, overallElo: number, skillScores: SkillScores) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
        $set: {
          overallElo,
          skillScores,
          updatedAt: now,
        },
      }
    );
  },

  async updateDifficulty(pathId: string, difficulty: DifficultyLevel) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
        $set: {
          currentDifficulty: difficulty,
          updatedAt: now,
        },
      }
    );
  },

  async deactivate(pathId: string) {
    const collection = await getLearningPathsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: pathId },
      {
        $set: {
          isActive: false,
          updatedAt: now,
        },
      }
    );
  },

  async delete(pathId: string) {
    const collection = await getLearningPathsCollection();
    await collection.deleteOne({ _id: pathId });
  },
};
