"use server";

/**
 * User Server Actions
 * Handles user management, iteration limits, and preferences
 * Requirements: 1.2, 1.4, 1.5
 */

import { cache } from "react";
import { getAuthUserId, getAuthUser, hasByokApiKey } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { createAPIError, type APIError } from "@/lib/schemas/error";
import type {
  User,
  UserPreferences,
  GenerationPreferences,
  PixelPetPreferences,
  PixelPetId,
  PixelPetEdge,
  PixelPetOffset,
  PixelPetPosition,
} from "@/lib/db/schemas/user";
import { GENERATION_LIMITS, PixelPetPreferencesSchema } from "@/lib/db/schemas/user";
import type { AIProviderType } from "@/lib/ai/types";
import { canAccess } from "@/lib/utils/feature-gate";

/**
 * Result type for server actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: APIError };

/**
 * Helper to get default reset date (first of next month)
 */
function getDefaultResetDate(): Date {
  const now = new Date();
  const resetDate = new Date(now);
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  resetDate.setHours(0, 0, 0, 0);
  return resetDate;
}

const DEFAULT_PIXEL_PET_PREFERENCES: PixelPetPreferences =
  PixelPetPreferencesSchema.parse({});

/**
 * Cached DB user lookup with auto-creation - shared across all user actions within a request
 * This eliminates duplicate findByClerkId calls and ensures user exists in DB
 * If user doesn't exist (e.g., webhook failed), creates them with default FREE plan
 */
const getCachedDbUser = cache(async (clerkId: string) => {
  let user = await userRepository.findByClerkId(clerkId);

  // If user doesn't exist in DB, create them (fallback for webhook failures)
  if (!user) {
    user = await userRepository.create({
      clerkId,
      plan: "FREE",
      iterations: {
        count: 0,
        limit: 20,
        resetDate: getDefaultResetDate(),
      },
      preferences: {
        theme: "dark",
        defaultAnalogy: "professional",
      },
    });

    // Audit log the auto-creation
    const { logSystemAction } = await import("@/lib/services/audit-log");
    await logSystemAction("userAutoCreated", clerkId, {
      reason: "User not found in DB on login (webhook may have failed)",
      plan: "FREE",
    });
  }

  return user;
});

/**
 * Get or create a user record
 * Creates a new user with default FREE plan if not exists
 * Requirements: 1.2
 */
export async function getOrCreateUser(): Promise<ActionResult<User>> {
  try {
    const clerkId = await getAuthUserId();

    // Try to find existing user
    let user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      // Create new user with default FREE plan settings
      // Requirements: 1.2 - Default FREE plan with iteration count 0 and limit 20
      user = await userRepository.create({
        clerkId,
        plan: "FREE",
        iterations: {
          count: 0,
          limit: 20,
          resetDate: getDefaultResetDate(),
        },
        preferences: {
          theme: "dark",
          defaultAnalogy: "professional",
        },
      });
    }

    return { success: true, data: user };
  } catch (error) {
    console.error("getOrCreateUser error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get or create user"),
    };
  }
}

/**
 * Check if user can perform an iteration (generation)
 * BYOK users bypass iteration limits
 * Requirements: 1.4, 1.5
 */
export async function checkIterationLimit(): Promise<
  ActionResult<{
    canGenerate: boolean;
    isByok: boolean;
    currentCount: number;
    limit: number;
    resetDate: Date;
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

    // Check if user has BYOK API key
    // Requirements: 1.4 - BYOK users bypass iteration limits
    const isByok = await hasByokApiKey();

    if (isByok) {
      return {
        success: true,
        data: {
          canGenerate: true,
          isByok: true,
          currentCount: user.iterations.count,
          limit: user.iterations.limit,
          resetDate: user.iterations.resetDate,
        },
      };
    }

    // Check iteration limit for non-BYOK users
    // Requirements: 1.5 - Prevent generations when limit reached
    const canGenerate = user.iterations.count < user.iterations.limit;

    return {
      success: true,
      data: {
        canGenerate,
        isByok: false,
        currentCount: user.iterations.count,
        limit: user.iterations.limit,
        resetDate: user.iterations.resetDate,
      },
    };
  } catch (error) {
    console.error("checkIterationLimit error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to check iteration limit"
      ),
    };
  }
}

/**
 * Update user preferences
 * Requirements: 1.2
 */
export async function updatePreferences(
  preferences: Partial<UserPreferences>
): Promise<ActionResult<User>> {
  try {
    const clerkId = await getAuthUserId();

    const user = await userRepository.updatePreferences(clerkId, preferences);

    if (!user) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "User not found"),
      };
    }

    return { success: true, data: user };
  } catch (error) {
    console.error("updatePreferences error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to update preferences"),
    };
  }
}

/**
 * Update generation preferences (MAX users only)
 * Allows customizing topic count (5-10), MCQ count (5-20), and rapid-fire count (10-40)
 */
export async function updateGenerationPreferences(
  generation: Partial<GenerationPreferences>
): Promise<ActionResult<User>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "User not found"),
      };
    }

    // Only MAX users can customize generation preferences
    if (user.plan !== "MAX") {
      return {
        success: false,
        error: createAPIError("PLAN_REQUIRED", "Generation customization is only available for MAX plan users"),
      };
    }

    // Validate ranges using single source of truth
    if (generation.topicCount !== undefined && (generation.topicCount < GENERATION_LIMITS.topics.min || generation.topicCount > GENERATION_LIMITS.topics.max)) {
      return {
        success: false,
        error: createAPIError("VALIDATION_ERROR", `Topic count must be between ${GENERATION_LIMITS.topics.min} and ${GENERATION_LIMITS.topics.max}`),
      };
    }
    if (generation.mcqCount !== undefined && (generation.mcqCount < GENERATION_LIMITS.mcqs.min || generation.mcqCount > GENERATION_LIMITS.mcqs.max)) {
      return {
        success: false,
        error: createAPIError("VALIDATION_ERROR", `MCQ count must be between ${GENERATION_LIMITS.mcqs.min} and ${GENERATION_LIMITS.mcqs.max}`),
      };
    }
    if (generation.rapidFireCount !== undefined && (generation.rapidFireCount < GENERATION_LIMITS.rapidFire.min || generation.rapidFireCount > GENERATION_LIMITS.rapidFire.max)) {
      return {
        success: false,
        error: createAPIError("VALIDATION_ERROR", `Rapid-fire count must be between ${GENERATION_LIMITS.rapidFire.min} and ${GENERATION_LIMITS.rapidFire.max}`),
      };
    }

    const updatedUser = await userRepository.updateGenerationPreferences(clerkId, generation);

    if (!updatedUser) {
      return {
        success: false,
        error: createAPIError("DATABASE_ERROR", "Failed to update generation preferences"),
      };
    }

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("updateGenerationPreferences error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to update generation preferences"),
    };
  }
}

/**
 * Get pixel pet preferences for the current user (defaults applied if missing)
 */
export async function getPixelPetPreferences(): Promise<
  ActionResult<PixelPetPreferences>
> {
  try {
    const clerkId = await getAuthUserId();
    const user = await getCachedDbUser(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "User not found"),
      };
    }

    return {
      success: true,
      data: PixelPetPreferencesSchema.parse(user.pixelPet ?? {}),
    };
  } catch (error) {
    console.error("getPixelPetPreferences error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to get pixel pet preferences"
      ),
    };
  }
}

export interface UpdatePixelPetInput {
  enabled?: boolean;
  selectedId?: PixelPetId;
  surfaceId?: string;
  edge?: PixelPetEdge;
  progress?: number;
  offset?: Partial<PixelPetOffset>;
  size?: number;
  position?: PixelPetPosition;
}

/**
 * Update pixel pet preferences (PRO+ only)
 */
export async function updatePixelPetPreferences(
  input: UpdatePixelPetInput
): Promise<ActionResult<User>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "User not found"),
      };
    }

    const access = canAccess("pixel_pet", user.plan);
    if (!access.allowed) {
      return {
        success: false,
        error: createAPIError(
          "PLAN_REQUIRED",
          access.upgradeMessage ?? "Pixel pets require PRO plan or higher"
        ),
      };
    }

    if (input.progress !== undefined && (input.progress < 0 || input.progress > 1)) {
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          "progress must be between 0 and 1"
        ),
      };
    }

    const update: Parameters<typeof userRepository.updatePixelPetPreferences>[1] = {
      schemaVersion: 1,
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.selectedId !== undefined ? { selectedId: input.selectedId } : {}),
      ...(input.surfaceId !== undefined ? { surfaceId: input.surfaceId } : {}),
      ...(input.edge !== undefined ? { edge: input.edge } : {}),
      ...(input.progress !== undefined ? { progress: input.progress } : {}),
      ...(input.offset !== undefined ? { offset: input.offset } : {}),
      ...(input.size !== undefined ? { size: input.size } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    };

    const updatedUser = await userRepository.updatePixelPetPreferences(clerkId, update);

    if (!updatedUser) {
      return {
        success: false,
        error: createAPIError(
          "DATABASE_ERROR",
          "Failed to update pixel pet preferences"
        ),
      };
    }

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("updatePixelPetPreferences error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to update pixel pet preferences"
      ),
    };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<ActionResult<User>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "User not found"),
      };
    }

    return { success: true, data: user };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get user"),
    };
  }
}

/**
 * Internal cached function to fetch iteration status data
 * Deduplicates calls within a single request
 */
const getIterationStatusInternal = cache(async () => {
  const [authUser, isByok] = await Promise.all([
    getAuthUser(),
    hasByokApiKey(),
  ]);

  if (!authUser) {
    return null;
  }

  const user = await getCachedDbUser(authUser.clerkId);
  if (!user) {
    return null;
  }

  const interviews = user.interviews ?? {
    count: 0,
    limit: 3,
    resetDate: getDefaultResetDate(),
  };

  return {
    count: user.iterations.count,
    limit: user.iterations.limit,
    remaining: Math.max(0, user.iterations.limit - user.iterations.count),
    resetDate: user.iterations.resetDate,
    plan: user.plan,
    isByok,
    interviews,
  };
});

/**
 * Get user's iteration and interview status
 * Uses React cache() to deduplicate calls within a request
 */
export async function getIterationStatus(): Promise<
  ActionResult<{
    count: number;
    limit: number;
    remaining: number;
    resetDate: Date;
    plan: string;
    isByok: boolean;
    interviews: { count: number; limit: number; resetDate: Date };
  }>
> {
  try {
    const data = await getIterationStatusInternal();

    if (!data) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "User not found"),
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("getIterationStatus error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get iteration status"),
    };
  }
}

/**
 * Internal cached function to fetch user profile data
 * Deduplicates calls within a single request
 */
const getUserProfileInternal = cache(async () => {
  const authUser = await getAuthUser();

  if (!authUser) {
    return null;
  }

  const dbUser = await getCachedDbUser(authUser.clerkId);

  return {
    clerkId: authUser.clerkId,
    email: authUser.email,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
    imageUrl: authUser.imageUrl,
    plan: dbUser?.plan ?? "FREE",
    iterations: dbUser?.iterations ?? {
      count: 0,
      limit: 20,
      resetDate: getDefaultResetDate(),
    },
    interviews: dbUser?.interviews ?? {
      count: 0,
      limit: 3,
      resetDate: getDefaultResetDate(),
    },
    hasStripeSubscription: !!dbUser?.stripeCustomerId,
    hasByokKey: !!authUser.byokApiKey,
  };
});

/**
 * Get user profile data including Clerk info
 * Uses React cache() to deduplicate calls within a request
 */
export async function getUserProfile(): Promise<
  ActionResult<{
    clerkId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    plan: string;
    iterations: { count: number; limit: number; resetDate: Date };
    interviews: { count: number; limit: number; resetDate: Date };
    hasStripeSubscription: boolean;
    hasByokKey: boolean;
  }>
> {
  try {
    const data = await getUserProfileInternal();

    if (!data) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authenticated"),
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("getUserProfile error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get user profile"),
    };
  }
}

/**
 * Save BYOK API key to Clerk user metadata
 */
export async function saveByokApiKey(
  apiKey: string,
  provider: AIProviderType = 'openrouter'
): Promise<ActionResult<{ saved: boolean }>> {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerkId = await getAuthUserId();
    const client = await clerkClient();

    const updateData: any = {};
    if (provider === 'google') {
      updateData.googleApiKey = apiKey || null;
    } else {
      updateData.openRouterApiKey = apiKey || null;
    }

    await client.users.updateUserMetadata(clerkId, {
      privateMetadata: updateData,
    });

    return { success: true, data: { saved: true } };
  } catch (error) {
    console.error("saveByokApiKey error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to save API key"),
    };
  }
}

/**
 * Remove BYOK API key from Clerk user metadata
 */
export async function removeByokApiKey(
  provider: AIProviderType = 'openrouter'
): Promise<ActionResult<{ removed: boolean }>> {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerkId = await getAuthUserId();
    const client = await clerkClient();

    const updateData: any = {};
    if (provider === 'google') {
      updateData.googleApiKey = null;
    } else {
      updateData.openRouterApiKey = null;
    }

    await client.users.updateUserMetadata(clerkId, {
      privateMetadata: updateData,
    });

    return { success: true, data: { removed: true } };
  } catch (error) {
    console.error("removeByokApiKey error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to remove API key"),
    };
  }
}

/**
 * Combined settings page data - fetches all required data in a single optimized call
 * Eliminates duplicate DB/Clerk calls between layout and page
 */
export interface SettingsPageData {
  profile: {
    clerkId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    plan: "FREE" | "PRO" | "MAX";
    iterations: { count: number; limit: number; resetDate: Date };
    interviews: { count: number; limit: number; resetDate: Date };
    hasStripeSubscription: boolean;
    hasByokKey: boolean;
    hasOpenRouterKey: boolean;
    hasGoogleKey: boolean;
    subscriptionCancelAt?: string | null;
    generationPreferences?: {
      topicCount: number;
      mcqCount: number;
      rapidFireCount: number;
    };
    pixelPet?: PixelPetPreferences;
  };
  subscription: {
    plan: "FREE" | "PRO" | "MAX";
    hasSubscription: boolean;
  };
}

const getSettingsPageDataInternal = cache(
  async (): Promise<SettingsPageData | null> => {
    const authUser = await getAuthUser();

    if (!authUser) {
      return null;
    }

    const dbUser = await getCachedDbUser(authUser.clerkId);

    const defaultIterations = {
      count: 0,
      limit: 20,
      resetDate: getDefaultResetDate(),
    };
    const defaultInterviews = {
      count: 0,
      limit: 3,
      resetDate: getDefaultResetDate(),
    };

    // Check if subscription is scheduled for cancellation
    let subscriptionCancelAt: string | null = null;
    if (dbUser?.stripeSubscriptionId) {
      try {
        const { getSubscription, getSubscriptionPeriodEnd } = await import(
          "@/lib/services/stripe"
        );
        const subscription = await getSubscription(dbUser.stripeSubscriptionId);
        if (subscription?.cancel_at_period_end) {
          const periodEnd = getSubscriptionPeriodEnd(subscription);
          // Validate periodEnd is a valid timestamp before converting to ISO string
          if (periodEnd && !isNaN(periodEnd) && periodEnd > 0) {
            subscriptionCancelAt = new Date(periodEnd * 1000).toISOString();
          }
        }
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
      }
    }

    const profile = {
      clerkId: authUser.clerkId,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      imageUrl: authUser.imageUrl,
      plan: dbUser?.plan ?? "FREE",
      iterations: dbUser?.iterations ?? defaultIterations,
      interviews: dbUser?.interviews ?? defaultInterviews,
      hasStripeSubscription: !!dbUser?.stripeCustomerId,
      hasByokKey: !!authUser.openRouterApiKey || !!authUser.googleApiKey,
      hasOpenRouterKey: !!authUser.openRouterApiKey,
      hasGoogleKey: !!authUser.googleApiKey,
      subscriptionCancelAt,
      generationPreferences: dbUser?.preferences?.generation ?? {
        topicCount: GENERATION_LIMITS.topics.default,
        mcqCount: GENERATION_LIMITS.mcqs.default,
        rapidFireCount: GENERATION_LIMITS.rapidFire.default,
      },
      pixelPet: PixelPetPreferencesSchema.parse(dbUser?.pixelPet ?? {}),
    };

    const subscription = {
      plan: dbUser?.plan ?? "FREE",
      hasSubscription: !!dbUser?.stripeCustomerId,
    };

    return { profile, subscription };
  }
);

/**
 * Get all settings page data in one call
 * Uses React cache() to deduplicate within a request
 */
export async function getSettingsPageData(): Promise<
  ActionResult<SettingsPageData>
> {
  try {
    const data = await getSettingsPageDataInternal();

    if (!data) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authenticated"),
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("getSettingsPageData error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get settings data"),
    };
  }
}
