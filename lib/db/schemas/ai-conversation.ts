import { z } from "zod";

/**
 * AI Request Metadata Schema
 * Stores performance and usage metrics for AI responses
 */
export const AIRequestMetadataSchema = z.object({
  model: z.string(), // Model ID used for this message
  modelName: z.string().optional(), // Human-readable model name
  tokensIn: z.number().optional(), // Input/prompt tokens
  tokensOut: z.number().optional(), // Output/completion tokens
  totalTokens: z.number().optional(), // Total tokens used
  latencyMs: z.number().optional(), // Total response time in ms
  ttft: z.number().optional(), // Time to first token in ms
  throughput: z.number().optional(), // Tokens per second
});

/**
 * AI Chat Message Schema
 * Stores individual messages in an AI conversation
 */
export const AIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "error"]),
  content: z.string(),
  // Reasoning/thinking content from the model
  reasoning: z.string().optional(),
  // Tool calls made during this message
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        input: z.unknown().optional(),
        output: z.unknown().optional(),
        state: z.enum([
          "input-streaming",
          "input-available",
          "output-available",
          "output-error",
        ]),
        errorText: z.string().optional(),
      })
    )
    .optional(),
  // Image references (stored in separate collection)
  imageIds: z.array(z.string()).optional(),
  // Error details for error messages
  errorDetails: z
    .object({
      code: z.string().optional(),
      isRetryable: z.boolean().optional(),
    })
    .optional(),
  // AI request metadata (for assistant messages)
  metadata: AIRequestMetadataSchema.optional(),
  createdAt: z.date(),
});

/**
 * AI Conversation Schema
 * A full conversation thread with the AI assistant
 */
export const AIConversationSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  title: z.string(), // Auto-generated from first message or user-set
  messages: z.array(AIMessageSchema).default([]),
  // Context for the conversation
  context: z
    .object({
      interviewId: z.string().optional(),
      learningPathId: z.string().optional(),
      toolsUsed: z.array(z.string()).default([]),
    })
    .optional(),
  // Chat mode: single model or multi-model comparison
  chatMode: z.enum(["single", "multi"]).default("single"),
  // Models used in multi-model comparison mode
  comparisonModels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    provider: z.enum(["openrouter", "google"]),
  })).optional(),
  // Parent conversation ID for branched conversations
  parentConversationId: z.string().optional(),
  branchedFromMessageId: z.string().optional(),
  // Metadata
  isPinned: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  lastMessageAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAIConversationSchema = AIConversationSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
});

export type AIRequestMetadata = z.infer<typeof AIRequestMetadataSchema>;
export type AIMessage = z.infer<typeof AIMessageSchema>;
export type AIConversation = z.infer<typeof AIConversationSchema>;
export type CreateAIConversation = z.infer<typeof CreateAIConversationSchema>;
