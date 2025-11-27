import { ObjectId } from 'mongodb';
import { getInterviewsCollection } from '../collections';
import { 
  Interview, 
  CreateInterview, 
  ModuleType,
  OpeningBrief,
  MCQ,
  RevisionTopic,
  RapidFire,
  TopicStatus,
} from '../schemas/interview';

/**
 * Lightweight interview data for dashboard listing
 */
export interface InterviewSummary {
  _id: string;
  userId: string;
  isPublic: boolean;
  jobDetails: {
    title: string;
    company: string;
    description: string;
    programmingLanguage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  // Computed fields for dashboard
  hasOpeningBrief: boolean;
  topicCount: number;
  mcqCount: number;
  rapidFireCount: number;
  topicTitles: string[];
  keySkills: string[];
}

/**
 * Ensures interview modules have default empty arrays to prevent undefined errors
 */
function normalizeInterview(interview: Interview): Interview {
  return {
    ...interview,
    modules: {
      openingBrief: interview.modules?.openingBrief,
      revisionTopics: interview.modules?.revisionTopics ?? [],
      mcqs: interview.modules?.mcqs ?? [],
      rapidFire: interview.modules?.rapidFire ?? [],
    },
    excludedModules: interview.excludedModules ?? [],
  };
}

export interface InterviewRepository {
  create(data: CreateInterview): Promise<Interview>;
  findById(id: string): Promise<Interview | null>;
  findByUserId(userId: string): Promise<Interview[]>;
  findSummariesByUserId(userId: string): Promise<InterviewSummary[]>;
  updateModule(id: string, module: 'openingBrief', content: OpeningBrief): Promise<void>;
  updateModule(id: string, module: 'revisionTopics', content: RevisionTopic[]): Promise<void>;
  updateModule(id: string, module: 'mcqs', content: MCQ[]): Promise<void>;
  updateModule(id: string, module: 'rapidFire', content: RapidFire[]): Promise<void>;
  appendToModule(id: string, module: 'mcqs', items: MCQ[]): Promise<void>;
  appendToModule(id: string, module: 'revisionTopics', items: RevisionTopic[]): Promise<void>;
  appendToModule(id: string, module: 'rapidFire', items: RapidFire[]): Promise<void>;
  updateTopicStyle(id: string, topicId: string, content: string, style: RevisionTopic['style']): Promise<void>;
  updateTopicStatus(id: string, topicId: string, status: TopicStatus): Promise<void>;
  setPublic(id: string, isPublic: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}

export const interviewRepository: InterviewRepository = {
  async create(data) {
    const collection = await getInterviewsCollection();
    const now = new Date();
    const id = new ObjectId().toString();
    
    const interview: Interview = {
      _id: id,
      userId: data.userId,
      isPublic: data.isPublic ?? false,
      jobDetails: data.jobDetails,
      resumeContext: data.resumeContext,
      modules: {
        openingBrief: data.modules.openingBrief,
        revisionTopics: data.modules.revisionTopics ?? [],
        mcqs: data.modules.mcqs ?? [],
        rapidFire: data.modules.rapidFire ?? [],
      },
      excludedModules: data.excludedModules ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(interview);
    return interview;
  },

  async findById(id: string) {
    const collection = await getInterviewsCollection();
    const interview = await collection.findOne({ _id: id });
    if (!interview) return null;
    return normalizeInterview(interview as Interview);
  },

  async findByUserId(userId: string) {
    const collection = await getInterviewsCollection();
    const interviews = await collection
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
    return (interviews as Interview[]).map(normalizeInterview);
  },

  /**
   * Optimized query for dashboard - uses aggregation to compute summary fields
   * and avoids fetching full module content
   */
  async findSummariesByUserId(userId: string): Promise<InterviewSummary[]> {
    const collection = await getInterviewsCollection();
    
    const summaries = await collection.aggregate<InterviewSummary>([
      { $match: { userId } },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          _id: 1,
          userId: 1,
          isPublic: 1,
          jobDetails: 1,
          createdAt: 1,
          updatedAt: 1,
          hasOpeningBrief: { $cond: [{ $ifNull: ['$modules.openingBrief', false] }, true, false] },
          topicCount: { $size: { $ifNull: ['$modules.revisionTopics', []] } },
          mcqCount: { $size: { $ifNull: ['$modules.mcqs', []] } },
          rapidFireCount: { $size: { $ifNull: ['$modules.rapidFire', []] } },
          // Get first 4 topic titles
          topicTitles: {
            $slice: [
              { $map: { input: { $ifNull: ['$modules.revisionTopics', []] }, as: 't', in: '$$t.title' } },
              4
            ]
          },
          // Get key skills from opening brief (first 4)
          keySkills: {
            $slice: [{ $ifNull: ['$modules.openingBrief.keySkills', []] }, 4]
          },
        },
      },
    ]).toArray();

    return summaries;
  },

  async updateModule(id: string, module: ModuleType, content: unknown) {
    const collection = await getInterviewsCollection();
    const now = new Date();
    
    await collection.updateOne(
      { _id: id },
      {
        $set: {
          [`modules.${module}`]: content,
          updatedAt: now,
        },
      }
    );
  },

  async appendToModule(id: string, module: 'mcqs' | 'revisionTopics' | 'rapidFire', items: unknown[]) {
    const collection = await getInterviewsCollection();
    const now = new Date();
    
    const pushUpdate = {
      [`modules.${module}`]: { $each: items },
    };
    
    await collection.updateOne(
      { _id: id },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: pushUpdate as any,
        $set: { updatedAt: now },
      }
    );
  },

  async updateTopicStyle(id: string, topicId: string, content: string, style: RevisionTopic['style']) {
    const collection = await getInterviewsCollection();
    const now = new Date();
    
    await collection.updateOne(
      { _id: id, 'modules.revisionTopics.id': topicId },
      {
        $set: {
          'modules.revisionTopics.$.content': content,
          'modules.revisionTopics.$.style': style,
          updatedAt: now,
        },
      }
    );
  },

  async updateTopicStatus(id: string, topicId: string, status: TopicStatus) {
    const collection = await getInterviewsCollection();
    const now = new Date();
    
    await collection.updateOne(
      { _id: id, 'modules.revisionTopics.id': topicId },
      {
        $set: {
          'modules.revisionTopics.$.status': status,
          updatedAt: now,
        },
      }
    );
  },

  async setPublic(id: string, isPublic: boolean) {
    const collection = await getInterviewsCollection();
    const now = new Date();
    
    await collection.updateOne(
      { _id: id },
      {
        $set: {
          isPublic,
          updatedAt: now,
        },
      }
    );
  },

  async delete(id: string) {
    const collection = await getInterviewsCollection();
    await collection.deleteOne({ _id: id });
  },
};
