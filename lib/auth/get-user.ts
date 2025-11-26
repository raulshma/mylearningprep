import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

export interface AuthUser {
  clerkId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  byokApiKey: string | null;
  isAdmin: boolean;
}

/**
 * Cached version of currentUser() - deduplicates calls within a single request
 */
const getCachedCurrentUser = cache(async () => {
  return currentUser();
});

/**
 * Cached version of auth() - deduplicates calls within a single request
 */
const getCachedAuth = cache(async () => {
  return auth();
});

/**
 * Get the current authenticated user's Clerk ID
 * Throws if not authenticated
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await getCachedAuth();

  if (!userId) {
    throw new Error("Unauthorized: No user session found");
  }

  return userId;
}

/**
 * Get the current authenticated user with full details
 * Returns null if not authenticated
 * Uses React cache() to deduplicate calls within a request
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const user = await getCachedCurrentUser();

  if (!user) {
    return null;
  }

  // Get BYOK API key from user's private metadata
  const byokApiKey = (user.privateMetadata?.openRouterApiKey as string) ?? null;

  // Get admin role from user's public metadata
  // Role should be set in Clerk Dashboard under user's publicMetadata: { "role": "admin" }
  const isAdmin = (user.publicMetadata?.role as string) === "admin";

  return {
    clerkId: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    byokApiKey,
    isAdmin,
  };
});

/**
 * Check if the current user has a BYOK API key configured
 */
export async function hasByokApiKey(): Promise<boolean> {
  const user = await getAuthUser();
  return user?.byokApiKey !== null && user?.byokApiKey !== "";
}

/**
 * Get the current user's BYOK API key if configured
 */
export async function getByokApiKey(): Promise<string | null> {
  const user = await getAuthUser();
  return user?.byokApiKey ?? null;
}

/**
 * BYOK tier configuration type (matches BYOKUserConfig from schemas)
 */
export interface BYOKTierConfigData {
  high?: { model: string; fallback?: string; temperature?: number; maxTokens?: number };
  medium?: { model: string; fallback?: string; temperature?: number; maxTokens?: number };
  low?: { model: string; fallback?: string; temperature?: number; maxTokens?: number };
}

/**
 * Get the current user's BYOK tier configuration if configured
 */
export async function getByokTierConfig(): Promise<BYOKTierConfigData | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;
  
  const tierConfig = user.privateMetadata?.byokTierConfig as BYOKTierConfigData | undefined;
  return tierConfig ?? null;
}

/**
 * Check if the current user has admin role
 * Uses cached getAuthUser to avoid duplicate Clerk API calls
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getAuthUser();
  return user?.isAdmin ?? false;
}

/**
 * Check if the current user is suspended
 * Returns true if suspended, false otherwise
 */
export async function isUserSuspended(): Promise<boolean> {
  const { userId } = await getCachedAuth();
  if (!userId) return false;

  // Dynamic import to avoid circular dependencies
  const { getUsersCollection } = await import("@/lib/db/collections");
  const usersCollection = await getUsersCollection();
  const user = await usersCollection.findOne({ clerkId: userId });

  return user?.suspended ?? false;
}

/**
 * Authorization error response type for admin actions
 */
export interface UnauthorizedResponse {
  success: false;
  error: string;
}

/**
 * Require admin authorization for a server action
 * Returns { success: false, error: "Unauthorized" } if user is not an admin
 * Otherwise executes the provided function and returns its result
 */
export async function requireAdmin<T>(
  fn: () => Promise<T>
): Promise<T | UnauthorizedResponse> {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  return fn();
}
