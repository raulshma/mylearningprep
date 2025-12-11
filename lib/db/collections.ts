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
  CHAT_IMAGES: 'chat_images',
  LEARNING_PATHS: 'learning_paths',
  FEEDBACK_ENTRIES: 'feedback_entries',
  WEAKNESS_ANALYSES: 'weakness_analyses',
  IMPROVEMENT_PLANS: 'improvement_plans',
  PROGRESS_HISTORY: 'progress_history',
  ROADMAPS: 'roadmaps',
  USER_ROADMAP_PROGRESS: 'user_roadmap_progress',
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
  gamification?: {
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate?: Date;
    badges: Array<{
      id: string;
      earnedAt: Date;
    }>;
    completedLessons: Array<{
      lessonId: string;
      experienceLevel: 'beginner' | 'intermediate' | 'advanced';
      sectionsCompleted: Array<{
        sectionId: string;
        completedAt: Date;
        xpEarned: number;
      }>;
      quizAnswers: Array<{
        questionId: string;
        selectedAnswer: string;
        isCorrect: boolean;
        answeredAt: Date;
      }>;
      xpEarned: number;
      startedAt?: Date;
      completedAt?: Date;
      timeSpentSeconds: number;
    }>;
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
    role: 'user' | 'assistant' | 'error';
    content: string;
    reasoning?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      input?: unknown;
      output?: unknown;
      state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
      errorText?: string;
    }>;
    imageIds?: string[]; // References to images in chat_images collection
    errorDetails?: {
      code?: string;
      isRetryable?: boolean;
    };
    metadata?: {
      model: string;
      modelName?: string;
      tokensIn?: number;
      tokensOut?: number;
      totalTokens?: number;
      latencyMs?: number;
      ttft?: number;
      throughput?: number;
    };
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

export interface ChatImageDocument extends Document {
  _id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  filename: string;
  mediaType: string;
  data: string;
  size: number;
  createdAt: Date;
}

export async function getChatImagesCollection(): Promise<Collection<ChatImageDocument>> {
  const db = await getDb();
  return db.collection<ChatImageDocument>(COLLECTIONS.CHAT_IMAGES);
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

// Roadmap feature documents
export interface RoadmapDocument extends Document {
  _id: string;
  slug: string;
  title: string;
  description: string;
  category: 'frontend' | 'backend' | 'devops' | 'mobile' | 'data-science' | 'system-design' | 'full-stack';
  version: string;
  parentRoadmapSlug?: string;
  parentNodeId?: string;
  nodes: Array<{
    id: string;
    title: string;
    description?: string;
    type: 'milestone' | 'topic' | 'checkpoint' | 'optional';
    position: { x: number; y: number };
    learningObjectives: string[];
    resources: Array<{
      title: string;
      type: 'documentation' | 'article' | 'video' | 'practice' | 'book';
      description: string;
    }>;
    estimatedMinutes: number;
    difficulty?: number;
    subRoadmapSlug?: string;
    skillCluster?: string;
    tags: string[];
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: 'sequential' | 'optional' | 'recommended';
    label?: string;
  }>;
  estimatedHours: number;
  difficulty: number;
  prerequisites: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoadmapProgressDocument extends Document {
  _id: string;
  userId: string;
  roadmapId: string;
  roadmapSlug: string;
  nodeProgress: Array<{
    nodeId: string;
    status: 'locked' | 'available' | 'in-progress' | 'completed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    activitiesCompleted: number;
    timeSpentMinutes: number;
    correctAnswers: number;
    totalQuestions: number;
  }>;
  currentNodeId?: string;
  overallProgress: number;
  nodesCompleted: number;
  totalNodes: number;
  streak: number;
  lastActivityAt?: Date;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function getRoadmapsCollection(): Promise<Collection<RoadmapDocument>> {
  const db = await getDb();
  return db.collection<RoadmapDocument>(COLLECTIONS.ROADMAPS);
}

export async function getUserRoadmapProgressCollection(): Promise<Collection<UserRoadmapProgressDocument>> {
  const db = await getDb();
  return db.collection<UserRoadmapProgressDocument>(COLLECTIONS.USER_ROADMAP_PROGRESS);
}


