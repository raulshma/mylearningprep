"use server";

import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { getAuthUserId } from "@/lib/auth/get-user";
import { aiConversationRepository } from "@/lib/db/repositories/ai-conversation-repository";
import { aiLogRepository } from "@/lib/db/repositories/ai-log-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { getTierConfigFromDB } from "@/lib/db/tier-config";
import type { AIMessage, AIConversation } from "@/lib/db/schemas/ai-conversation";
import { createProviderWithFallback, type AIProviderType } from "@/lib/ai";
import { extractTokenUsage } from "@/lib/services/ai-logger";

/**
 * Helper to get the MongoDB user ID from Clerk ID
 */
async function getMongoUserId(): Promise<string> {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);
  if (!user) {
    throw new Error("User not found");
  }
  return user._id;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get low tier model configuration
 */
async function getLowTierConfig() {
  const config = await getTierConfigFromDB("low");
  return {
    ...config,
    provider: (config.provider || 'openrouter') as AIProviderType,
  };
}

/**
 * Create a new AI conversation
 */
export async function createConversation(
  title?: string,
  context?: AIConversation["context"]
): Promise<ActionResult<AIConversation>> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.create(
      userId,
      title || "New Chat",
      context
    );
    revalidatePath("/ai-chat");
    return { success: true, data: conversation };
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return { success: false, error: "Failed to create conversation" };
  }
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  id: string
): Promise<ActionResult<AIConversation>> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(id);

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    if (conversation.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    return { success: true, data: conversation };
  } catch (error) {
    console.error("Failed to get conversation:", error);
    return { success: false, error: "Failed to get conversation" };
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(options?: {
  limit?: number;
  includeArchived?: boolean;
}): Promise<ActionResult<AIConversation[]>> {
  try {
    const userId = await getMongoUserId();
    const conversations = await aiConversationRepository.findByUser(
      userId,
      options
    );
    return { success: true, data: conversations };
  } catch (error) {
    console.error("Failed to get conversations:", error);
    return { success: false, error: "Failed to get conversations" };
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<ActionResult> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(id);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    await aiConversationRepository.updateTitle(id, title);
    revalidatePath("/ai-chat");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update title:", error);
    return { success: false, error: "Failed to update title" };
  }
}

/**
 * Generate a title from the first words of a message (fallback method)
 */
function generateFallbackTitle(message: string): string {
  // Get first ~50 chars, but try to break at word boundary
  const maxLength = 50;
  if (message.length <= maxLength) {
    return message;
  }
  
  const truncated = message.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  // If there's a space in the last 15 chars, break there for cleaner title
  if (lastSpace > maxLength - 15) {
    return truncated.slice(0, lastSpace) + "...";
  }
  
  return truncated + "...";
}

/**
 * Generate a conversation title using low-tier AI model
 * If AI title generation is disabled in admin settings, uses first words from message
 */
export async function generateConversationTitle(
  conversationId: string,
  firstMessage: string
): Promise<ActionResult<string>> {
  const startTime = Date.now();
  
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    // Check if AI title generation is enabled
    const { getAITitleGenerationEnabled } = await import("@/lib/actions/admin");
    const aiTitleEnabled = await getAITitleGenerationEnabled();
    
    if (!aiTitleEnabled) {
      // Use fallback: first words from message
      const fallbackTitle = generateFallbackTitle(firstMessage);
      await aiConversationRepository.updateTitle(conversationId, fallbackTitle);
      revalidatePath("/ai-chat");
      return { success: true, data: fallbackTitle };
    }

    // Get low tier model config
    const tierConfig = await getLowTierConfig();
    const modelId = tierConfig.primaryModel ?? "meta-llama/llama-3.1-8b-instruct";
    const provider = createProviderWithFallback(tierConfig.provider);
    
    // Generate title with AI
    const result = await generateText({
      model: provider.getModel(modelId),
      temperature: 0.7,
      system: "You are a title generator. Generate a brief, descriptive title (3-6 words) for a conversation based on the user's first message. Respond with ONLY the title, no quotes or punctuation.",
      prompt: `Generate a title for this conversation: "${firstMessage.slice(0, 500)}"`,
    });

    const generatedTitle = result.text.trim().slice(0, 60);
    
    // Update conversation with generated title
    await aiConversationRepository.updateTitle(conversationId, generatedTitle);

    // Extract token usage using the standard helper
    const tokenUsage = extractTokenUsage(result.usage as Record<string, unknown>);

    // Log the AI request (0.05 iteration usage)
    await aiLogRepository.create({
      action: "GENERATE_CONVERSATION_TITLE",
      userId,
      interviewId: conversationId, // Use conversationId as interviewId for tracking
      model: modelId,
      provider: tierConfig.provider,
      status: "success",
      prompt: `Generate a title for this conversation: "${firstMessage.slice(0, 500)}"`,
      response: generatedTitle,
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      tokenUsage,
      latencyMs: Date.now() - startTime,
      timestamp: new Date(),
      metadata: {
        streaming: false,
      },
    });

    revalidatePath("/ai-chat");
    return { success: true, data: generatedTitle };
  } catch (error) {
    console.error("Failed to generate title:", error);
    
    // Fall back to truncated message
    const fallbackTitle = generateFallbackTitle(firstMessage);
    try {
      await aiConversationRepository.updateTitle(conversationId, fallbackTitle);
    } catch {
      // Ignore fallback errors
    }
    
    return { success: true, data: fallbackTitle };
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessageToConversation(
  conversationId: string,
  message: AIMessage
): Promise<ActionResult<{ shouldGenerateTitle: boolean; firstMessage?: string }>> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    await aiConversationRepository.addMessage(conversationId, message);
    
    // Check if we should generate a title (first user message on a new chat)
    const shouldGenerateTitle = 
      conversation.title === "New Chat" &&
      message.role === "user" &&
      conversation.messages.length === 0;

    return { 
      success: true, 
      data: { 
        shouldGenerateTitle,
        firstMessage: shouldGenerateTitle ? message.content : undefined
      } 
    };
  } catch (error) {
    console.error("Failed to add message:", error);
    return { success: false, error: "Failed to add message" };
  }
}

/**
 * Toggle pin status of a conversation
 */
export async function togglePinConversation(id: string): Promise<ActionResult> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(id);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    await aiConversationRepository.togglePin(id);
    revalidatePath("/ai-chat");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to toggle pin:", error);
    return { success: false, error: "Failed to toggle pin" };
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(id: string): Promise<ActionResult> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(id);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    await aiConversationRepository.archive(id);
    revalidatePath("/ai-chat");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to archive:", error);
    return { success: false, error: "Failed to archive" };
  }
}

/**
 * Restore an archived conversation
 */
export async function restoreConversation(id: string): Promise<ActionResult> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(id);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    await aiConversationRepository.restore(id);
    revalidatePath("/ai-chat");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to restore:", error);
    return { success: false, error: "Failed to restore" };
  }
}

/**
 * Get archived conversations for the current user
 */
export async function getArchivedConversations(): Promise<ActionResult<AIConversation[]>> {
  try {
    const userId = await getMongoUserId();
    const conversations = await aiConversationRepository.findArchivedByUser(userId);
    return { success: true, data: conversations };
  } catch (error) {
    console.error("Failed to get archived conversations:", error);
    return { success: false, error: "Failed to get archived conversations" };
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<ActionResult> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(id);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    await aiConversationRepository.delete(id);
    revalidatePath("/ai-chat");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete:", error);
    return { success: false, error: "Failed to delete" };
  }
}

/**
 * Branch a conversation from a specific message
 */
export async function branchConversation(
  sourceConversationId: string,
  branchedFromMessageId: string
): Promise<ActionResult<AIConversation>> {
  try {
    const userId = await getMongoUserId();
    const sourceConversation = await aiConversationRepository.findById(sourceConversationId);

    if (!sourceConversation || sourceConversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    // Find the message index to branch from
    const messageIndex = sourceConversation.messages.findIndex(
      (m) => m.id === branchedFromMessageId
    );

    if (messageIndex === -1) {
      return { success: false, error: "Message not found" };
    }

    // Get messages up to and including the branched message
    const branchedMessages = sourceConversation.messages.slice(0, messageIndex + 1);

    // Create new conversation with branched messages
    const branchedConversation = await aiConversationRepository.createBranch(
      sourceConversationId,
      branchedFromMessageId,
      userId,
      `${sourceConversation.title} (Branch)`,
      branchedMessages,
      sourceConversation.context
    );

    revalidatePath("/ai-chat");
    return { success: true, data: branchedConversation };
  } catch (error) {
    console.error("Failed to branch conversation:", error);
    return { success: false, error: "Failed to branch conversation" };
  }
}

/**
 * Delete messages from a specific index onwards (for regeneration)
 */
export async function deleteMessagesFrom(
  conversationId: string,
  messageIndex: number
): Promise<ActionResult> {
  try {
    const userId = await getMongoUserId();
    const conversation = await aiConversationRepository.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: "Conversation not found" };
    }

    await aiConversationRepository.deleteMessagesFrom(conversationId, messageIndex);
    revalidatePath("/ai-chat");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete messages:", error);
    return { success: false, error: "Failed to delete messages" };
  }
}
