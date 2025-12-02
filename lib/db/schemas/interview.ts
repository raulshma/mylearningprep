import { z } from 'zod';

export const MCQSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.string(),
  explanation: z.string(),
  source: z.enum(['ai', 'search']).default('ai'),
});

export const TopicStatusSchema = z.enum(['not_started', 'in_progress', 'completed']);

export const TopicStyleCacheSchema = z.object({
  professional: z.string().optional(),
  construction: z.string().optional(),
  simple: z.string().optional(),
});

export const SeniorityLevelSchema = z.enum(['junior', 'mid', 'senior', 'staff']);

export const RevisionTopicSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  content: z.string().min(100), // Ensure topics have substantial content (at least 100 chars)
  style: z.enum(['professional', 'construction', 'simple']).default('professional'),
  reason: z.string().min(1),
  confidence: z.enum(['low', 'medium', 'high']),
  status: TopicStatusSchema.default('not_started'),
  styleCache: TopicStyleCacheSchema.optional(),
  // Enhanced topic generation fields for detailed content
  difficulty: SeniorityLevelSchema.optional(),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
  prerequisites: z.array(z.string()).optional(),
  skillGaps: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
});

export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;

export type TopicStatus = z.infer<typeof TopicStatusSchema>;
export type TopicStyleCache = z.infer<typeof TopicStyleCacheSchema>;

export const RapidFireSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const OpeningBriefSchema = z.object({
  content: z.string(),
  experienceMatch: z.number().min(0).max(100),
  keySkills: z.array(z.string()),
  prepTime: z.string(),
  version: z.number().int().min(1).default(1),
});

export const InterviewModulesSchema = z.object({
  openingBrief: OpeningBriefSchema.optional(),
  revisionTopics: z.array(RevisionTopicSchema).default([]),
  mcqs: z.array(MCQSchema).default([]),
  rapidFire: z.array(RapidFireSchema).default([]),
});

export const JobDetailsSchema = z.object({
  title: z.string(),
  company: z.string(),
  description: z.string(),
  programmingLanguage: z.string().optional(),
});

export const ModuleTypeSchema = z.enum(['openingBrief', 'revisionTopics', 'mcqs', 'rapidFire']);
export type ModuleType = z.infer<typeof ModuleTypeSchema>;

export const MODULE_LABELS: Record<ModuleType, string> = {
  openingBrief: 'Opening Brief',
  revisionTopics: 'Revision Topics',
  mcqs: 'Multiple Choice Questions',
  rapidFire: 'Rapid-Fire Questions',
};

export const InterviewSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  isPublic: z.boolean().default(false),
  jobDetails: JobDetailsSchema,
  resumeContext: z.string(),
  modules: InterviewModulesSchema,
  excludedModules: z.array(ModuleTypeSchema).default([]),
  customInstructions: z.string().max(2000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});


export const CreateInterviewSchema = InterviewSchema.omit({ 
  _id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type MCQ = z.infer<typeof MCQSchema>;
export type RevisionTopic = z.infer<typeof RevisionTopicSchema>;
export type RapidFire = z.infer<typeof RapidFireSchema>;
export type OpeningBrief = z.infer<typeof OpeningBriefSchema>;
export type InterviewModules = z.infer<typeof InterviewModulesSchema>;
export type JobDetails = z.infer<typeof JobDetailsSchema>;
export type Interview = z.infer<typeof InterviewSchema>;
export type CreateInterview = z.infer<typeof CreateInterviewSchema>;
