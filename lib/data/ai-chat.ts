import { cache } from "react";
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { aiConversationRepository } from "@/lib/db/repositories/ai-conversation-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import type { AIConversation } from "@/lib/db/schemas/ai-conversation";
import type { User, UserPlan } from "@/lib/db/schemas/user";

/**
 * AI Chat data fetching utilities with React cache for request deduplication.
 * These functions are designed to be called from Server Components and
 * automatically deduplicate requests within a single render pass.
 */

export interface AIChatPageData {
  conversations: AIConversation[];
  userPlan: UserPlan;
  userId: string;
}

/**
 * Cache the auth check - prevents multiple auth() calls
 */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const { userId } = await auth();
  return userId;
});

/**
 * Get the current user with caching - deduplicates across components
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const clerkId = await getAuthUserId();
  if (!clerkId) return null;
  return userRepository.findByClerkId(clerkId);
});

/**
 * Get conversations for a user with caching
 */
export const getUserConversations = cache(
  async (userId: string, limit = 50): Promise<AIConversation[]> => {
    return aiConversationRepository.findByUser(userId, {
      limit,
      includeArchived: false,
    });
  }
);

/**
 * Preload function to eagerly start data fetching
 * Call this at the top of your page component before any awaits
 */
export const preloadAIChatData = () => {
  void getAuthUserId();
  void getCurrentUser();
};

/**
 * Fetch all AI chat page data in parallel
 * Uses Promise.all to avoid waterfall requests
 */
export const getAIChatPageData = cache(async (): Promise<AIChatPageData | null> => {
  const clerkId = await getAuthUserId();
  if (!clerkId) return null;

  const user = await userRepository.findByClerkId(clerkId);
  if (!user) return null;

  // Fetch conversations using user's MongoDB _id
  const conversations = await getUserConversations(user._id);

  return {
    conversations,
    userPlan: user.plan,
    userId: user._id,
  };
});

/**
 * Get a single conversation by ID with caching
 */
export const getConversation = cache(
  async (conversationId: string): Promise<AIConversation | null> => {
    return aiConversationRepository.findById(conversationId);
  }
);
