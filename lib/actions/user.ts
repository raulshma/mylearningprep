'use server';

/**
 * User Server Actions
 * Handles user management, iteration limits, and preferences
 * Requirements: 1.2, 1.4, 1.5
 */

import { getAuthUserId, getAuthUser, hasByokApiKey } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { createAPIError, type APIError } from '@/lib/schemas/error';
import type { User, UserPreferences } from '@/lib/db/schemas/user';

/**
 * Result type for server actions
 */
export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: APIError };

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
      // Requirements: 1.2 - Default FREE plan with iteration count 0 and limit 5
      user = await userRepository.create({
        clerkId,
        plan: 'FREE',
        iterations: {
          count: 0,
          limit: 5,
          resetDate: getDefaultResetDate(),
        },
        preferences: {
          theme: 'dark',
          defaultAnalogy: 'professional',
        },
      });
    }

    return { success: true, data: user };
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to get or create user'),
    };
  }
}


/**
 * Check if user can perform an iteration (generation)
 * BYOK users bypass iteration limits
 * Requirements: 1.4, 1.5
 */
export async function checkIterationLimit(): Promise<ActionResult<{
  canGenerate: boolean;
  isByok: boolean;
  currentCount: number;
  limit: number;
  resetDate: Date;
}>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);
    
    if (!user) {
      return {
        success: false,
        error: createAPIError('AUTH_ERROR', 'User not found'),
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
    console.error('checkIterationLimit error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to check iteration limit'),
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
        error: createAPIError('NOT_FOUND', 'User not found'),
      };
    }

    return { success: true, data: user };
  } catch (error) {
    console.error('updatePreferences error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to update preferences'),
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
        error: createAPIError('NOT_FOUND', 'User not found'),
      };
    }

    return { success: true, data: user };
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to get user'),
    };
  }
}

/**
 * Get user's iteration and interview status
 */
export async function getIterationStatus(): Promise<ActionResult<{
  count: number;
  limit: number;
  remaining: number;
  resetDate: Date;
  plan: string;
  isByok: boolean;
  interviews: { count: number; limit: number; resetDate: Date };
}>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);
    
    if (!user) {
      return {
        success: false,
        error: createAPIError('NOT_FOUND', 'User not found'),
      };
    }

    const isByok = await hasByokApiKey();
    const interviews = user.interviews ?? { count: 0, limit: 3, resetDate: getDefaultResetDate() };

    return {
      success: true,
      data: {
        count: user.iterations.count,
        limit: user.iterations.limit,
        remaining: Math.max(0, user.iterations.limit - user.iterations.count),
        resetDate: user.iterations.resetDate,
        plan: user.plan,
        isByok,
        interviews,
      },
    };
  } catch (error) {
    console.error('getIterationStatus error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to get iteration status'),
    };
  }
}

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

/**
 * Get user profile data including Clerk info
 */
export async function getUserProfile(): Promise<ActionResult<{
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
}>> {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return {
        success: false,
        error: createAPIError('AUTH_ERROR', 'Not authenticated'),
      };
    }

    const dbUser = await userRepository.findByClerkId(authUser.clerkId);
    
    return {
      success: true,
      data: {
        clerkId: authUser.clerkId,
        email: authUser.email,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        imageUrl: authUser.imageUrl,
        plan: dbUser?.plan ?? 'FREE',
        iterations: dbUser?.iterations ?? { count: 0, limit: 5, resetDate: getDefaultResetDate() },
        interviews: dbUser?.interviews ?? { count: 0, limit: 3, resetDate: getDefaultResetDate() },
        hasStripeSubscription: !!dbUser?.stripeCustomerId,
        hasByokKey: !!authUser.byokApiKey,
      },
    };
  } catch (error) {
    console.error('getUserProfile error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to get user profile'),
    };
  }
}

/**
 * Save BYOK API key to Clerk user metadata
 */
export async function saveByokApiKey(apiKey: string): Promise<ActionResult<{ saved: boolean }>> {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerkId = await getAuthUserId();
    const client = await clerkClient();
    
    await client.users.updateUserMetadata(clerkId, {
      privateMetadata: {
        openRouterApiKey: apiKey || null,
      },
    });

    return { success: true, data: { saved: true } };
  } catch (error) {
    console.error('saveByokApiKey error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to save API key'),
    };
  }
}

/**
 * Remove BYOK API key from Clerk user metadata
 */
export async function removeByokApiKey(): Promise<ActionResult<{ removed: boolean }>> {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerkId = await getAuthUserId();
    const client = await clerkClient();
    
    await client.users.updateUserMetadata(clerkId, {
      privateMetadata: {
        openRouterApiKey: null,
      },
    });

    return { success: true, data: { removed: true } };
  } catch (error) {
    console.error('removeByokApiKey error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to remove API key'),
    };
  }
}
