import { z } from 'zod';

// Skill cluster categories
export const SkillClusterSchema = z.enum([
  'dsa',
  'oop',
  'system-design',
  'debugging',
  'databases',
  'api-design',
  'testing',
  'devops',
  'frontend',
  'backend',
  'security',
  'performance',
]);

// Activity types
export const ActivityTypeSchema = z.enum([
  'mcq',
  'coding-challenge',
  'debugging-task',
  'real-world-assignment',
  'concept-explanation',
  'mini-case-study',
]);

// Difficulty levels (1-10 scale)
export const DifficultyLevelSchema = z.number().int().min(1).max(10);

// MCQ Activity
export const MCQActivitySchema = z.object({
  type: z.literal('mcq'),
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

// Coding Challenge Activity
export const CodingChallengeSchema = z.object({
  type: z.literal('coding-challenge'),
  problemDescription: z.string().min(1),
  inputFormat: z.string().min(1),
  outputFormat: z.string().min(1),
  evaluationCriteria: z.array(z.string()).min(1),
  starterCode: z.string().optional(),
  sampleInput: z.string(),
  sampleOutput: z.string(),
});


// Debugging Task Activity
export const DebuggingTaskSchema = z.object({
  type: z.literal('debugging-task'),
  buggyCode: z.string().min(1),
  expectedBehavior: z.string().min(1),
  hints: z.array(z.string()).optional(),
});

// Concept Explanation Activity
export const ConceptExplanationSchema = z.object({
  type: z.literal('concept-explanation'),
  content: z.string().min(1),
  keyPoints: z.array(z.string()).min(1),
  examples: z.array(z.string()).optional(),
});

// Union of all activity content types
export const ActivityContentSchema = z.discriminatedUnion('type', [
  MCQActivitySchema,
  CodingChallengeSchema,
  DebuggingTaskSchema,
  ConceptExplanationSchema,
]);

// Topic within a learning path
export const LearningTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  skillCluster: SkillClusterSchema,
  difficulty: DifficultyLevelSchema,
  prerequisites: z.array(z.string()).default([]),
});

// Activity record
export const ActivitySchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  type: ActivityTypeSchema,
  content: ActivityContentSchema,
  difficulty: DifficultyLevelSchema,
  createdAt: z.date(),
});

// User reflection after activity
export const ReflectionSchema = z.object({
  completed: z.boolean(),
  difficultyRating: z.number().int().min(1).max(5),
  userAnswer: z.string().optional(),
  strugglePoints: z.string().optional(),
  timeTakenSeconds: z.number().int().min(0),
});


// Timeline entry
export const TimelineEntrySchema = z.object({
  id: z.string().min(1),
  activityId: z.string().min(1),
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  activityType: ActivityTypeSchema,
  success: z.boolean(),
  eloChange: z.number(),
  eloBefore: z.number(),
  eloAfter: z.number(),
  timeTakenSeconds: z.number().int().min(0),
  reflection: ReflectionSchema.optional(),
  userNotes: z.string().optional(),
  timestamp: z.date(),
});

// ELO scores per skill cluster
export const SkillScoresSchema = z.record(SkillClusterSchema, z.number());

// Learning Path document
export const LearningPathSchema = z.object({
  _id: z.string().min(1),
  userId: z.string().min(1),
  goal: z.string().min(1),
  skillClusters: z.array(SkillClusterSchema).min(1),
  currentTopicId: z.string().nullable(),
  currentActivity: ActivitySchema.nullable().default(null),
  baselineDifficulty: DifficultyLevelSchema,
  currentDifficulty: DifficultyLevelSchema,
  overallElo: z.number().default(1000),
  skillScores: SkillScoresSchema.default({}),
  topics: z.array(LearningTopicSchema).default([]),
  timeline: z.array(TimelineEntrySchema).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create input (without generated fields)
export const CreateLearningPathSchema = LearningPathSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  timeline: true,
  topics: true,
  currentTopicId: true,
  currentActivity: true,
  overallElo: true,
  skillScores: true,
});


// Export types
export type SkillCluster = z.infer<typeof SkillClusterSchema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
export type MCQActivity = z.infer<typeof MCQActivitySchema>;
export type CodingChallenge = z.infer<typeof CodingChallengeSchema>;
export type DebuggingTask = z.infer<typeof DebuggingTaskSchema>;
export type ConceptExplanation = z.infer<typeof ConceptExplanationSchema>;
export type ActivityContent = z.infer<typeof ActivityContentSchema>;
export type LearningTopic = z.infer<typeof LearningTopicSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Reflection = z.infer<typeof ReflectionSchema>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
export type SkillScores = z.infer<typeof SkillScoresSchema>;
export type LearningPath = z.infer<typeof LearningPathSchema>;
export type CreateLearningPath = z.infer<typeof CreateLearningPathSchema>;
