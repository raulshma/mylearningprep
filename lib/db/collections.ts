import { Collection, Document } from 'mongodb';
import { getDb } from './client';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  INTERVIEWS: 'interviews',
  AI_LOGS: 'ai_logs',
  SETTINGS: 'settings',
  TOPIC_CHATS: 'topic_chats',
  AI_CONVERSATIONS: 'ai_conversations',
  LEARNING_PATHS: 'learning_paths',
  FEEDBACK_ENTRIES: 'feedback_entries',
  WEAKNESS_ANALYSES: 'weakness_analyses',
  IMPROVEMENT_PLANS: 'improvement_plans',
  PROGRESS_HISTORY: 'progress_history',
} as const;

// Type definitions for documents (will be replaced with Zod inferred types later)
export interface UserDocument extends Document {
  _id: string;
  clerkId: string;
  stripeCustomerId?: string;
  plan: 'FREE' | 'PRO' | 'MAX';
  iterations: {
    count: number;
    limit: number;
    resetDate: Date;
  };
  preferences: {
    theme: 'light' | 'dark';
    defaultAnalogy: 'professional' | 'construction' | 'simple';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewDocument extends Document {
  _id: string;
  userId: string;
  isPublic: boolean;
  jobDetails: {
    title: string;
    company: string;
    description: string;
  };
  resumeContext: string;
  modules: {
    openingBrief?: {
      content: string;
      experienceMatch: number;
      keySkills: string[];
      prepTime: string;
      version: number;
    };
    revisionTopics: Array<{
      id: string;
      title: string;
      content: string;
      style: 'professional' | 'construction' | 'simple';
      reason: string;
      confidence: 'low' | 'medium' | 'high';
    }>;
    mcqs: Array<{
      id: string;
      question: string;
      options: string[];
      answer: string;
      explanation: string;
      source: 'ai' | 'search';
    }>;
    rapidFire: Array<{
      id: string;
      question: string;
      answer: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AILogDocument extends Document {
  _id: string;
  interviewId: string;
  userId: string;
  action: 'GENERATE_BRIEF' | 'GENERATE_TOPICS' | 'GENERATE_MCQ' | 'GENERATE_RAPID_FIRE' | 'REGENERATE_ANALOGY' | 'PARSE_PROMPT' | 'TOPIC_CHAT';
  status: 'success' | 'error' | 'timeout' | 'rate_limited' | 'cancelled';
  model: string;
  prompt: string;
  systemPrompt?: string;
  response: string;
  errorMessage?: string;
  errorCode?: string;
  toolsUsed: string[];
  searchQueries: string[];
  searchResults?: Array<{
    query: string;
    resultCount: number;
    sources: string[];
  }>;
  tokenUsage: {
    input: number;
    output: number;
  };
  estimatedCost?: number;
  latencyMs: number;
  timeToFirstToken?: number;
  metadata?: {
    temperature?: number;
    maxTokens?: number;
    stopReason?: string;
    modelVersion?: string;
    requestId?: string;
    streaming?: boolean;
    retryCount?: number;
    userAgent?: string;
    ipAddress?: string;
    byokUsed?: boolean;
  };
  timestamp: Date;
}

// Typed collection getters
export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>(COLLECTIONS.USERS);
}

export async function getInterviewsCollection(): Promise<Collection<InterviewDocument>> {
  const db = await getDb();
  return db.collection<InterviewDocument>(COLLECTIONS.INTERVIEWS);
}

export async function getAILogsCollection(): Promise<Collection<AILogDocument>> {
  const db = await getDb();
  return db.collection<AILogDocument>(COLLECTIONS.AI_LOGS);
}

export interface SettingsDocument extends Document {
  _id: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

export async function getSettingsCollection(): Promise<Collection<SettingsDocument>> {
  const db = await getDb();
  return db.collection<SettingsDocument>(COLLECTIONS.SETTINGS);
}

export interface AIConversationDocument extends Document {
  _id: string;
  userId: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      input?: unknown;
      output?: unknown;
      state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
      errorText?: string;
    }>;
    createdAt: Date;
  }>;
  context?: {
    interviewId?: string;
    learningPathId?: string;
    toolsUsed?: string[];
  };
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAIConversationsCollection(): Promise<Collection<AIConversationDocument>> {
  const db = await getDb();
  return db.collection<AIConversationDocument>(COLLECTIONS.AI_CONVERSATIONS);
}

export interface TopicChatDocument extends Document {
  _id: string;
  interviewId: string;
  topicId: string;
  userId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTopicChatsCollection(): Promise<Collection<TopicChatDocument>> {
  const db = await getDb();
  return db.collection<TopicChatDocument>(COLLECTIONS.TOPIC_CHATS);
}

export interface LearningPathDocument extends Document {
  _id: string;
  userId: string;
  goal: string;
  skillClusters: Array<
    | 'dsa'
    | 'oop'
    | 'system-design'
    | 'debugging'
    | 'databases'
    | 'api-design'
    | 'testing'
    | 'devops'
    | 'frontend'
    | 'backend'
    | 'security'
    | 'performance'
  >;
  currentTopicId: string | null;
  baselineDifficulty: number;
  currentDifficulty: number;
  overallElo: number;
  skillScores: Record<string, number>;
  topics: Array<{
    id: string;
    title: string;
    description: string;
    skillCluster: string;
    difficulty: number;
    prerequisites: string[];
  }>;
  timeline: Array<{
    id: string;
    activityId: string;
    topicId: string;
    topicTitle: string;
    activityType: string;
    success: boolean;
    eloChange: number;
    eloBefore: number;
    eloAfter: number;
    timeTakenSeconds: number;
    reflection?: {
      completed: boolean;
      difficultyRating: number;
      userAnswer?: string;
      strugglePoints?: string;
      timeTakenSeconds: number;
    };
    userNotes?: string;
    timestamp: Date;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getLearningPathsCollection(): Promise<Collection<LearningPathDocument>> {
  const db = await getDb();
  return db.collection<LearningPathDocument>(COLLECTIONS.LEARNING_PATHS);
}

// Feedback feature documents
export interface FeedbackEntryDocument extends Document {
  _id: string;
  interviewId: string;
  userId: string;
  question: string;
  attemptedAnswer?: string;
  difficultyRating: number;
  topicHints: string[];
  skillClusters: Array<
    | 'dsa'
    | 'oop'
    | 'system-design'
    | 'debugging'
    | 'databases'
    | 'api-design'
    | 'testing'
    | 'devops'
    | 'frontend'
    | 'backend'
    | 'security'
    | 'performance'
  >;
  analysisConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeaknessAnalysisDocument extends Document {
  _id: string;
  userId: string;
  skillGaps: Array<{
    skillCluster: string;
    gapScore: number;
    frequency: number;
    confidence: number;
    relatedFeedbackIds: string[];
  }>;
  lastAnalyzedAt: Date;
  totalFeedbackCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImprovementPlanDocument extends Document {
  _id: string;
  userId: string;
  skillGaps: Array<{
    skillCluster: string;
    gapScore: number;
    frequency: number;
    confidence: number;
    relatedFeedbackIds: string[];
  }>;
  activities: Array<{
    id: string;
    skillGapId: string;
    skillCluster: string;
    activityType: string;
    difficulty: number;
    content: unknown;
    status: 'pending' | 'in_progress' | 'completed';
    completedAt?: Date;
  }>;
  progress: {
    totalActivities: number;
    completedActivities: number;
    skillProgress: Record<string, number>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function getFeedbackEntriesCollection(): Promise<Collection<FeedbackEntryDocument>> {
  const db = await getDb();
  return db.collection<FeedbackEntryDocument>(COLLECTIONS.FEEDBACK_ENTRIES);
}

export async function getWeaknessAnalysesCollection(): Promise<Collection<WeaknessAnalysisDocument>> {
  const db = await getDb();
  return db.collection<WeaknessAnalysisDocument>(COLLECTIONS.WEAKNESS_ANALYSES);
}

export async function getImprovementPlansCollection(): Promise<Collection<ImprovementPlanDocument>> {
  const db = await getDb();
  return db.collection<ImprovementPlanDocument>(COLLECTIONS.IMPROVEMENT_PLANS);
}

export interface ProgressHistoryDocument extends Document {
  _id: string;
  userId: string;
  entries: Array<{
    skillCluster: string;
    gapScoreBefore: number;
    gapScoreAfter: number;
    activitiesCompleted: number;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export async function getProgressHistoryCollection(): Promise<Collection<ProgressHistoryDocument>> {
  const db = await getDb();
  return db.collection<ProgressHistoryDocument>(COLLECTIONS.PROGRESS_HISTORY);
}
