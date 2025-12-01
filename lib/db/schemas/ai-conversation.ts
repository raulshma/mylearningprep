import { z } from "zod";

/**
 * AI Chat Message Schema
 * Stores individual messages in an AI conversation
 */
export const AIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
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

export type AIMessage = z.infer<typeof AIMessageSchema>;
export type AIConversation = z.infer<typeof AIConversationSchema>;
export type CreateAIConversation = z.infer<typeof CreateAIConversationSchema>;
