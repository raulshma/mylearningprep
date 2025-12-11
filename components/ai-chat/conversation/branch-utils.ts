/**
 * Branch Utilities (Client-safe)
 *
 * Client-safe utility functions for conversation branching.
 * Server-side branching logic is handled by server actions.
 */

import type { Message } from "@/lib/store/chat/types";

/**
 * Get the last message ID from a conversation's messages
 * Useful for branching from the end of a conversation
 */
export function getLastMessageId(messages: Message[]): string | null {
  if (messages.length === 0) {
    return null;
  }
  return messages[messages.length - 1].id;
}

/**
 * Validate that a branch operation is valid
 */
export function validateBranch(
  sourceMessages: Message[],
  branchFromMessageId: string
): { valid: boolean; error?: string } {
  if (sourceMessages.length === 0) {
    return { valid: false, error: "Cannot branch from empty conversation" };
  }

  const messageIndex = sourceMessages.findIndex(
    (m) => m.id === branchFromMessageId
  );

  if (messageIndex === -1) {
    return { valid: false, error: "Branch point message not found" };
  }

  return { valid: true };
}
