"use server";

/**
 * Topic Server Actions
 * Handles topic deep dive and analogy mode regeneration
 * Requirements: 6.2, 6.3, 6.4
 *
 * NOTE: Streaming regeneration functions have been migrated to API routes.
 * See /api/interview/[id]/topic/[topicId]/regenerate
 */

import { getAuthUserId } from "@/lib/auth/get-user";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { createAPIError, type APIError } from "@/lib/schemas/error";
import type { RevisionTopic, TopicStatus } from "@/lib/db/schemas/interview";

/**
 * Result type for server actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: APIError };

/**
 * Analogy style type
 */
export type AnalogyStyle = "professional" | "construction" | "simple";

/**
 * Get a specific topic from an interview
 */
export async function getTopic(
  interviewId: string,
  topicId: string
): Promise<ActionResult<RevisionTopic>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Interview not found"),
      };
    }

    // Verify ownership (unless public)
    if (interview.userId !== user._id && !interview.isPublic) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    const topic = interview.modules.revisionTopics.find(
      (t) => t.id === topicId
    );
    if (!topic) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Topic not found"),
      };
    }

    return { success: true, data: topic };
  } catch (error) {
    console.error("getTopic error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get topic"),
    };
  }
}


/**
 * Update the status of a topic (not_started, in_progress, completed)
 */
export async function updateTopicStatus(
  interviewId: string,
  topicId: string,
  status: TopicStatus
): Promise<ActionResult<{ status: TopicStatus }>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Interview not found"),
      };
    }

    // Verify ownership
    if (interview.userId !== user._id) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    const topic = interview.modules.revisionTopics.find(
      (t) => t.id === topicId
    );
    if (!topic) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Topic not found"),
      };
    }

    await interviewRepository.updateTopicStatus(interviewId, topicId, status);

    return { success: true, data: { status } };
  } catch (error) {
    console.error("updateTopicStatus error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to update topic status"),
    };
  }
}
