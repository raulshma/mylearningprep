import { z } from "zod";

export const AIActionSchema = z.enum([
  "GENERATE_BRIEF",
  "GENERATE_TOPICS",
  "GENERATE_MCQ",
  "GENERATE_RAPID_FIRE",
  "REGENERATE_ANALOGY",
  "PARSE_PROMPT",
  "TOPIC_CHAT",
  // Learning path activity actions
  "GENERATE_ACTIVITY_MCQ",
  "GENERATE_ACTIVITY_CODING_CHALLENGE",
  "GENERATE_ACTIVITY_DEBUGGING_TASK",
  "GENERATE_ACTIVITY_CONCEPT_EXPLANATION",
  "GENERATE_ACTIVITY_REAL_WORLD_ASSIGNMENT",
  "GENERATE_ACTIVITY_MINI_CASE_STUDY",
  // Feedback feature actions
  "ANALYZE_FEEDBACK",
  "AGGREGATE_ANALYSIS",
  "GENERATE_IMPROVEMENT_PLAN",
  "STREAM_IMPROVEMENT_ACTIVITY",
  // AI Tools actions (Pro/Max)
  "ANALYZE_TECH_TRENDS",
  "GENERATE_MOCK_INTERVIEW",
  "ANALYZE_GITHUB_REPO",
  "GENERATE_SYSTEM_DESIGN",
  "GENERATE_STAR_FRAMEWORK",
  "FIND_LEARNING_RESOURCES",
  // AI Assistant (multi-tool orchestration)
  "AI_ASSISTANT_CHAT",
  // AI Chat
  "GENERATE_CONVERSATION_TITLE",
]);

export const AIStatusSchema = z.enum([
  "success",
  "error",
  "timeout",
  "rate_limited",
  "cancelled",
]);

export const TokenUsageSchema = z.object({
  input: z.number().int().min(0),
  output: z.number().int().min(0),
});

export const AIMetadataSchema = z.object({
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  stopReason: z.string().optional(),
  modelVersion: z.string().optional(),
  requestId: z.string().optional(),
  streaming: z.boolean().optional(),
  retryCount: z.number().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  byokUsed: z.boolean().optional(),
});

export const AILogSchema = z.object({
  _id: z.string(),
  interviewId: z.string(),
  userId: z.string(),
  action: AIActionSchema,
  status: AIStatusSchema.default("success"),
  model: z.string(),
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  response: z.string(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  toolsUsed: z.array(z.string()).default([]),
  searchQueries: z.array(z.string()).default([]),
  searchResults: z
    .array(
      z.object({
        query: z.string(),
        resultCount: z.number(),
        sources: z.array(z.string()),
      })
    )
    .default([]),
  tokenUsage: TokenUsageSchema,
  estimatedCost: z.number().optional(),
  latencyMs: z.number().min(0),
  timeToFirstToken: z.number().optional(),
  metadata: AIMetadataSchema.optional(),
  timestamp: z.date(),
});

export const CreateAILogSchema = AILogSchema.omit({ _id: true });

export type AIAction = z.infer<typeof AIActionSchema>;
export type AIStatus = z.infer<typeof AIStatusSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type AIMetadata = z.infer<typeof AIMetadataSchema>;
export type AILog = z.infer<typeof AILogSchema>;
export type CreateAILog = z.infer<typeof CreateAILogSchema>;
