"use server";

/**
 * Feedback Server Actions
 * Handles feedback CRUD operations and weakness analysis
 * Requirements: 1.2, 1.3, 1.5, 2.4, 4.1, 7.1, 7.2, 7.3, 7.4, 8.1, 8.3
 */

import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { feedbackRepository } from "@/lib/db/repositories/feedback-repository";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { createAPIError, type APIError } from "@/lib/schemas/error";
import {
  CreateFeedbackInputSchema,
  RecordActivityCompletionInputSchema,
  type CreateFeedbackInput,
  type RecordActivityCompletionInput,
} from "@/lib/schemas/feedback-input";
import type {
  FeedbackEntry,
  WeaknessAnalysis,
} from "@/lib/db/schemas/feedback";

/**
 * Result type for server actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: APIError };

// ============================================================================
// Feedback CRUD Actions
// ============================================================================

/**
 * Create a new feedback entry for an interview
 * Requirements: 1.2, 1.3
 */
export async function createFeedback(
  input: CreateFeedbackInput
): Promise<ActionResult<FeedbackEntry>> {
  try {
    // Validate input first (no async needed)
    const validationResult = CreateFeedbackInputSchema.safeParse(input);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          firstError
            ? `${firstError[0]}: ${firstError[1]?.[0]}`
            : "Invalid input",
          Object.fromEntries(
            Object.entries(fieldErrors).map(([k, v]) => [
              k,
              v?.[0] ?? "Invalid",
            ])
          )
        ),
      };
    }

    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(validationResult.data.interviewId),
    ]);

    if (!user) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "User not found. Please complete onboarding."
        ),
      };
    }

    if (!interview) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Interview not found"),
      };
    }

    if (interview.userId !== user._id) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "Not authorized to add feedback to this interview"
        ),
      };
    }

    // Create feedback entry
    const feedbackEntry = await feedbackRepository.create({
      interviewId: validationResult.data.interviewId,
      userId: user._id,
      question: validationResult.data.question.trim(),
      attemptedAnswer: validationResult.data.attemptedAnswer?.trim(),
      difficultyRating: validationResult.data.difficultyRating,
      topicHints: validationResult.data.topicHints,
    });

    return { success: true, data: feedbackEntry };
  } catch (error) {
    console.error("createFeedback error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to create feedback entry. Please try again."
      ),
    };
  }
}

/**
 * Get all feedback entries for an interview
 * Requirements: 1.4
 */
export async function getInterviewFeedback(
  interviewId: string
): Promise<ActionResult<FeedbackEntry[]>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user, interview, and feedback at the same time
    const [user, interview, feedbackEntries] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
      feedbackRepository.findByInterviewId(interviewId),
    ]);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    if (!interview) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Interview not found"),
      };
    }

    if (interview.userId !== user._id && !interview.isPublic) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "Not authorized to view feedback for this interview"
        ),
      };
    }

    return { success: true, data: feedbackEntries };
  } catch (error) {
    console.error("getInterviewFeedback error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get feedback entries. Please try again."
      ),
    };
  }
}

/**
 * Delete a feedback entry
 * Requirements: 1.5
 */
export async function deleteFeedback(
  feedbackId: string
): Promise<ActionResult<void>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get feedback entry
    const feedbackEntry = await feedbackRepository.findById(feedbackId);
    if (!feedbackEntry) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Feedback entry not found"),
      };
    }

    // Verify ownership
    if (feedbackEntry.userId !== user._id) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "Not authorized to delete this feedback entry"
        ),
      };
    }

    // Delete the feedback entry
    await feedbackRepository.delete(feedbackId);

    // Note: Analysis update will be handled separately when user requests analysis
    // This avoids unnecessary AI calls on every deletion

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteFeedback error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to delete feedback entry. Please try again."
      ),
    };
  }
}


// ============================================================================
// Weakness Analysis Actions
// ============================================================================

/**
 * Get weakness analysis for the current user
 * Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.3
 */
export async function getWeaknessAnalysis(): Promise<
  ActionResult<WeaknessAnalysis | null>
> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get existing analysis
    const analysis = await feedbackRepository.getAnalysisByUserId(user._id);

    return { success: true, data: analysis };
  } catch (error) {
    console.error("getWeaknessAnalysis error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get weakness analysis. Please try again."
      ),
    };
  }
}



/**
 * Record completion of an improvement activity
 * Updates improvement plan progress and gap scores
 * Requirements: 4.1, 4.3, 8.1, 8.3
 */
export async function recordActivityCompletion(
  input: RecordActivityCompletionInput
): Promise<ActionResult<{ updatedGapScore: number; completedActivities: number }>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Validate input
    const validationResult =
      RecordActivityCompletionInputSchema.safeParse(input);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          firstError
            ? `${firstError[0]}: ${firstError[1]?.[0]}`
            : "Invalid input"
        ),
      };
    }

    // Get current analysis
    const analysis = await feedbackRepository.getAnalysisByUserId(user._id);
    if (!analysis) {
      return {
        success: false,
        error: createAPIError(
          "NOT_FOUND",
          "No weakness analysis found. Please submit feedback first."
        ),
      };
    }

    // Find the skill gap for this activity
    const skillGapIndex = analysis.skillGaps.findIndex(
      (gap) => gap.skillCluster === validationResult.data.skillCluster
    );

    if (skillGapIndex === -1) {
      return {
        success: false,
        error: createAPIError(
          "NOT_FOUND",
          "Skill gap not found in analysis"
        ),
      };
    }

    // Calculate new gap score (decrease by improvement factor)
    // Score decreases more with higher activity scores (Requirement 4.3)
    const currentGapScore = analysis.skillGaps[skillGapIndex].gapScore;
    const activityScore = validationResult.data.score ?? 70; // Default to 70% if not provided
    const improvementFactor = (activityScore / 100) * 5; // Max 5 point decrease per activity
    const newGapScore = Math.max(0, currentGapScore - improvementFactor);

    // Update the analysis with new gap score
    const updatedSkillGaps = [...analysis.skillGaps];
    updatedSkillGaps[skillGapIndex] = {
      ...updatedSkillGaps[skillGapIndex],
      gapScore: newGapScore,
    };

    await feedbackRepository.updateAnalysis(user._id, {
      skillGaps: updatedSkillGaps,
      lastAnalyzedAt: analysis.lastAnalyzedAt,
      totalFeedbackCount: analysis.totalFeedbackCount,
      updatedAt: new Date(),
    });

    // Update improvement plan if it exists (Requirement 4.1)
    const improvementPlan = await feedbackRepository.getImprovementPlanByUserId(user._id);
    let completedActivities = 0;
    
    if (improvementPlan) {
      // Find and update the activity status
      const activityIndex = improvementPlan.activities.findIndex(
        (a) => a.id === validationResult.data.activityId
      );
      
      if (activityIndex !== -1) {
        const updatedActivities = [...improvementPlan.activities];
        updatedActivities[activityIndex] = {
          ...updatedActivities[activityIndex],
          status: 'completed',
          completedAt: new Date(),
        };
        
        // Increment completedActivities count
        completedActivities = improvementPlan.progress.completedActivities + 1;
        
        // Update skill progress
        const skillCluster = validationResult.data.skillCluster as import("@/lib/db/schemas/learning-path").SkillCluster;
        const updatedSkillProgress: Record<string, number> = { ...improvementPlan.progress.skillProgress };
        updatedSkillProgress[skillCluster] = (updatedSkillProgress[skillCluster] || 0) + 1;
        
        await feedbackRepository.updateImprovementPlan(user._id, {
          activities: updatedActivities,
          progress: {
            totalActivities: improvementPlan.progress.totalActivities,
            completedActivities,
            skillProgress: updatedSkillProgress,
          },
        });
      }
    }

    // Record progress history entry (Requirement 4.4)
    await feedbackRepository.addProgressEntry(user._id, {
      skillCluster: validationResult.data.skillCluster as import("@/lib/db/schemas/learning-path").SkillCluster,
      gapScoreBefore: currentGapScore,
      gapScoreAfter: newGapScore,
      activitiesCompleted: 1,
      timestamp: new Date(),
    });

    return {
      success: true,
      data: { updatedGapScore: newGapScore, completedActivities },
    };
  } catch (error) {
    console.error("recordActivityCompletion error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to record activity completion. Please try again."
      ),
    };
  }
}

// ============================================================================
// Helper Functions for BYOK Support
// ============================================================================

/**
 * Check if user can perform AI operations (BYOK or within limits)
 * Requirements: 7.4
 */
export async function checkAIOperationAllowed(): Promise<
  ActionResult<{
    allowed: boolean;
    isByok: boolean;
    apiKey: string | null;
    byokTierConfig: Awaited<ReturnType<typeof getByokTierConfig>>;
  }>
> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const isByok = await hasByokApiKey();
    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // BYOK users bypass iteration limits
    if (isByok) {
      return {
        success: true,
        data: {
          allowed: true,
          isByok: true,
          apiKey,
          byokTierConfig,
        },
      };
    }

    // Check iteration limits for non-BYOK users
    const iterations = user.iterations ?? {
      count: 0,
      limit: 10,
      resetDate: new Date(),
    };

    if (iterations.count >= iterations.limit) {
      return {
        success: false,
        error: createAPIError(
          "RATE_LIMIT",
          `You have reached your ${user.plan} plan limit of ${
            iterations.limit
          } AI operations. Please upgrade or wait until ${iterations.resetDate.toLocaleDateString()}.`,
          { plan: user.plan, limit: String(iterations.limit) },
          Math.floor((iterations.resetDate.getTime() - Date.now()) / 1000)
        ),
      };
    }

    return {
      success: true,
      data: {
        allowed: true,
        isByok: false,
        apiKey: null,
        byokTierConfig: null,
      },
    };
  } catch (error) {
    console.error("checkAIOperationAllowed error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to check AI operation permissions"
      ),
    };
  }
}

/**
 * Get a single feedback entry by ID
 */
export async function getFeedbackById(
  feedbackId: string
): Promise<ActionResult<FeedbackEntry>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const feedbackEntry = await feedbackRepository.findById(feedbackId);
    if (!feedbackEntry) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Feedback entry not found"),
      };
    }

    // Verify ownership
    if (feedbackEntry.userId !== user._id) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "Not authorized to view this feedback entry"
        ),
      };
    }

    return { success: true, data: feedbackEntry };
  } catch (error) {
    console.error("getFeedbackById error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get feedback entry. Please try again."
      ),
    };
  }
}

/**
 * Get all feedback entries for the current user
 */
export async function getUserFeedback(): Promise<ActionResult<FeedbackEntry[]>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const feedbackEntries = await feedbackRepository.findByUserId(user._id);

    return { success: true, data: feedbackEntries };
  } catch (error) {
    console.error("getUserFeedback error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get feedback entries. Please try again."
      ),
    };
  }
}

// ============================================================================
// Improvement Plan Actions
// ============================================================================

/**
 * Get the current user's improvement plan
 * Requirements: 4.2
 */
export async function getImprovementPlan(): Promise<
  ActionResult<import("@/lib/db/schemas/feedback").ImprovementPlan | null>
> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const plan = await feedbackRepository.getImprovementPlanByUserId(user._id);

    return { success: true, data: plan };
  } catch (error) {
    console.error("getImprovementPlan error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get improvement plan. Please try again."
      ),
    };
  }
}

/**
 * Create or update an improvement plan for the current user
 * Requirements: 3.1, 4.1
 */
export async function saveImprovementPlan(
  plan: Omit<import("@/lib/db/schemas/feedback").ImprovementPlan, '_id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<ActionResult<import("@/lib/db/schemas/feedback").ImprovementPlan>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Check if plan already exists
    const existingPlan = await feedbackRepository.getImprovementPlanByUserId(user._id);
    
    if (existingPlan) {
      // Update existing plan
      await feedbackRepository.updateImprovementPlan(user._id, plan);
      const updatedPlan = await feedbackRepository.getImprovementPlanByUserId(user._id);
      return { success: true, data: updatedPlan! };
    } else {
      // Create new plan
      const newPlan = await feedbackRepository.createImprovementPlan(user._id, plan);
      return { success: true, data: newPlan };
    }
  } catch (error) {
    console.error("saveImprovementPlan error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to save improvement plan. Please try again."
      ),
    };
  }
}

// ============================================================================
// Progress History Actions
// ============================================================================

/**
 * Get progress history for the current user
 * Requirements: 4.4
 */
export async function getProgressHistory(): Promise<
  ActionResult<import("@/lib/db/schemas/feedback").ProgressHistory | null>
> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const history = await feedbackRepository.getProgressHistory(user._id);

    return { success: true, data: history };
  } catch (error) {
    console.error("getProgressHistory error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get progress history. Please try again."
      ),
    };
  }
}

/**
 * Get progress summary for the current user
 * Returns aggregated progress data for dashboard display
 * Requirements: 4.2, 4.4
 */
export async function getProgressSummary(): Promise<
  ActionResult<{
    totalActivitiesCompleted: number;
    skillProgress: Record<string, { completed: number; gapReduction: number }>;
    recentProgress: Array<{
      skillCluster: string;
      gapScoreBefore: number;
      gapScoreAfter: number;
      timestamp: Date;
    }>;
  }>
> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get improvement plan for total activities
    const plan = await feedbackRepository.getImprovementPlanByUserId(user._id);
    const totalActivitiesCompleted = plan?.progress.completedActivities ?? 0;

    // Get progress history for trend data
    const history = await feedbackRepository.getProgressHistory(user._id);
    const entries = history?.entries ?? [];

    // Aggregate skill progress
    const skillProgress: Record<string, { completed: number; gapReduction: number }> = {};
    
    for (const entry of entries) {
      const cluster = entry.skillCluster;
      if (!skillProgress[cluster]) {
        skillProgress[cluster] = { completed: 0, gapReduction: 0 };
      }
      skillProgress[cluster].completed += entry.activitiesCompleted;
      skillProgress[cluster].gapReduction += entry.gapScoreBefore - entry.gapScoreAfter;
    }

    // Get recent progress (last 10 entries)
    const recentProgress = entries
      .slice(-10)
      .reverse()
      .map((entry) => ({
        skillCluster: entry.skillCluster,
        gapScoreBefore: entry.gapScoreBefore,
        gapScoreAfter: entry.gapScoreAfter,
        timestamp: entry.timestamp,
      }));

    return {
      success: true,
      data: {
        totalActivitiesCompleted,
        skillProgress,
        recentProgress,
      },
    };
  } catch (error) {
    console.error("getProgressSummary error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get progress summary. Please try again."
      ),
    };
  }
}
