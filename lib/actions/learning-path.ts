"use server";

/**
 * Learning Path Server Actions
 * Handles learning path CRUD operations, activity management, and insights
 * Requirements: 1.1, 1.5, 4.4, 5.1, 6.4, 7.2, 7.3, 7.4
 */

import {
  getAuthUserId,
  getByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { learningPathRepository } from "@/lib/db/repositories/learning-path-repository";
import {
  initializePath,
  validateGoal,
  processActivityCompletion,
  getNextActivity as orchestratorGetNextActivity,
} from "@/lib/services/learning-orchestrator";
import { generateInsights } from "@/lib/services/insight-generator";
import { createAPIError, type APIError } from "@/lib/schemas/error";
import {
  ReflectionSchema,
  type LearningPath,
  type Activity,
  type TimelineEntry,
  type Reflection,
} from "@/lib/db/schemas/learning-path";
import type { LearningInsights } from "@/lib/services/insight-generator";

/**
 * Result type for server actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: APIError };

/**
 * Create a new learning path from a goal
 * Requirements: 1.1, 1.5
 */
export async function createLearningPath(
  goal: string
): Promise<ActionResult<LearningPath>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "User not found. Please complete onboarding."
        ),
      };
    }

    // Validate goal
    const validation = validateGoal(goal);
    if (!validation.valid) {
      return {
        success: false,
        error: createAPIError("VALIDATION_ERROR", validation.error!),
      };
    }

    // Check if user already has an active learning path
    const existingPath = await learningPathRepository.findActiveByUserId(user._id);
    if (existingPath) {
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          "You already have an active learning path. Please deactivate it first."
        ),
      };
    }

    // Get BYOK API key and tier config if available
    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Initialize the learning path
    const learningPath = await initializePath(
      user._id,
      goal,
      apiKey ?? undefined,
      byokTierConfig ?? undefined
    );

    return { success: true, data: learningPath };
  } catch (error) {
    console.error("createLearningPath error:", error);
    return {
      success: false,
      error: createAPIError(
        "AI_ERROR",
        "Failed to create learning path. Please try again."
      ),
    };
  }
}

/**
 * Get the current user's active learning path
 */
export async function getActiveLearningPath(): Promise<ActionResult<LearningPath | null>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const learningPath = await learningPathRepository.findActiveByUserId(user._id);
    return { success: true, data: learningPath };
  } catch (error) {
    console.error("getActiveLearningPath error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get learning path"),
    };
  }
}

/**
 * Get a learning path by ID with authorization check
 */
export async function getLearningPath(
  pathId: string
): Promise<ActionResult<LearningPath>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const learningPath = await learningPathRepository.findById(pathId);
    if (!learningPath) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Learning path not found"),
      };
    }

    // Verify ownership
    if (learningPath.userId !== user._id) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized to access this learning path"),
      };
    }

    return { success: true, data: learningPath };
  } catch (error) {
    console.error("getLearningPath error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get learning path"),
    };
  }
}


/**
 * Submit a reflection after completing an activity
 * Requirements: 7.2, 7.3, 7.4
 */
export async function submitReflection(
  pathId: string,
  activityId: string,
  reflection: Reflection
): Promise<ActionResult<TimelineEntry>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get and verify learning path ownership
    const learningPath = await learningPathRepository.findById(pathId);
    if (!learningPath) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Learning path not found"),
      };
    }

    if (learningPath.userId !== user._id) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    // Validate reflection data
    const validationResult = ReflectionSchema.safeParse(reflection);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          firstError
            ? `${firstError[0]}: ${firstError[1]?.[0]}`
            : "Invalid reflection data",
          Object.fromEntries(
            Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? "Invalid"])
          )
        ),
      };
    }

    // Find the activity in the current topic context
    // We need to reconstruct the activity from the path context
    const currentTopic = learningPath.topics.find(
      (t) => t.id === learningPath.currentTopicId
    );
    if (!currentTopic) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Current topic not found"),
      };
    }

    // Create a minimal activity object for processing
    // The actual activity content was generated and displayed to the user
    const activity: Activity = {
      id: activityId,
      topicId: currentTopic.id,
      type: "mcq", // This will be overridden by actual activity type in real usage
      content: {
        type: "mcq",
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
      },
      difficulty: learningPath.currentDifficulty,
      createdAt: new Date(),
    };

    // Process the completion with ELO updates
    const timelineEntry = await processActivityCompletion(
      pathId,
      activity,
      validationResult.data
    );

    // Clear the current activity after successful reflection submission
    // Requirements: 4.3 - Completed activities are cleared from currentActivity
    await learningPathRepository.clearCurrentActivity(pathId);

    return { success: true, data: timelineEntry };
  } catch (error) {
    console.error("submitReflection error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to submit reflection"),
    };
  }
}

/**
 * Get the next activity for a learning path
 * Requirements: 6.4
 */
export async function getNextActivity(
  pathId: string
): Promise<ActionResult<Activity>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get and verify learning path ownership
    const learningPath = await learningPathRepository.findById(pathId);
    if (!learningPath) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Learning path not found"),
      };
    }

    if (learningPath.userId !== user._id) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    if (!learningPath.isActive) {
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          "Learning path is not active"
        ),
      };
    }

    // Get BYOK API key and tier config if available
    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Generate the next activity
    const activity = await orchestratorGetNextActivity(
      pathId,
      apiKey ?? undefined,
      byokTierConfig ?? undefined
    );

    return { success: true, data: activity };
  } catch (error) {
    console.error("getNextActivity error:", error);
    return {
      success: false,
      error: createAPIError("AI_ERROR", "Failed to generate activity"),
    };
  }
}


/**
 * Get learning insights for a path
 * Requirements: 5.1
 */
export async function getLearningInsights(
  pathId: string
): Promise<ActionResult<LearningInsights>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get and verify learning path ownership
    const learningPath = await learningPathRepository.findById(pathId);
    if (!learningPath) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Learning path not found"),
      };
    }

    if (learningPath.userId !== user._id) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    // Generate insights
    const insights = generateInsights(learningPath);

    return { success: true, data: insights };
  } catch (error) {
    console.error("getLearningInsights error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to generate insights"),
    };
  }
}

/**
 * Add notes to a timeline entry
 * Requirements: 4.4
 */
export async function addTimelineNotes(
  pathId: string,
  entryId: string,
  notes: string
): Promise<ActionResult<void>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get and verify learning path ownership
    const learningPath = await learningPathRepository.findById(pathId);
    if (!learningPath) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Learning path not found"),
      };
    }

    if (learningPath.userId !== user._id) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    // Verify the timeline entry exists
    const entryExists = learningPath.timeline.some((e) => e.id === entryId);
    if (!entryExists) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Timeline entry not found"),
      };
    }

    // Update the notes
    await learningPathRepository.updateTimelineNotes(pathId, entryId, notes);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("addTimelineNotes error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to update notes"),
    };
  }
}

/**
 * Deactivate a learning path
 */
export async function deactivateLearningPath(
  pathId: string
): Promise<ActionResult<void>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get and verify learning path ownership
    const learningPath = await learningPathRepository.findById(pathId);
    if (!learningPath) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Learning path not found"),
      };
    }

    if (learningPath.userId !== user._id) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    // Deactivate the path
    await learningPathRepository.deactivate(pathId);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deactivateLearningPath error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to deactivate learning path"),
    };
  }
}

/**
 * Get all learning paths for the current user
 */
export async function getUserLearningPaths(): Promise<ActionResult<LearningPath[]>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const learningPaths = await learningPathRepository.findByUserId(user._id);
    return { success: true, data: learningPaths };
  } catch (error) {
    console.error("getUserLearningPaths error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get learning paths"),
    };
  }
}
