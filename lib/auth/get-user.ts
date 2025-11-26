import { auth, currentUser } from "@clerk/nextjs/server";

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
 * Get the current authenticated user's Clerk ID
 * Throws if not authenticated
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized: No user session found");
  }

  return userId;
}

/**
 * Get the current authenticated user with full details
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const user = await currentUser();

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
}

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
 * Check if the current user has admin role
 * Uses publicMetadata.role from Clerk user
 *
 * To grant admin access:
 * 1. Go to Clerk Dashboard -> Users -> Select user
 * 2. Edit publicMetadata and set: { "role": "admin" }
 *
 * For middleware/session-based checks, also configure:
 * Clerk Dashboard -> Sessions -> Customize session token
 * Add claim: "metadata" = "{{user.public_metadata}}"
 */
export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) {
    return false;
  }
  return (user.publicMetadata?.role as string) === "admin";
}

/**
 * Check if the current user is suspended
 * Returns true if suspended, false otherwise
 */
export async function isUserSuspended(): Promise<boolean> {
  const { userId } = await auth();
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
 *
 * Usage:
 * ```typescript
 * export async function sensitiveAdminAction() {
 *   return requireAdmin(async () => {
 *     // your admin-only logic here
 *     return { success: true, data: ... };
 *   });
 * }
 * ```
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
