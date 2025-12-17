"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  getAuthUser,
  UnauthorizedResponse,
} from "@/lib/auth/get-user";
import {
  updateVisibility,
  getVisibilityOverview as getVisibilityOverviewService,
  getJourneyVisibilityDetails as getJourneyVisibilityDetailsService,
  updateObjectiveContentVisibility,
} from "@/lib/services/visibility-service";
import { setVisibilityBatch } from "@/lib/db/repositories/visibility-repository";
import { logAdminAction, logVisibilityChange } from "@/lib/services/audit-log";
import { getVisibility } from "@/lib/db/repositories/visibility-repository";
import type {
  EntityType,
  VisibilitySetting,
  VisibilityOverview,
  JourneyVisibilityDetails,
} from "@/lib/db/schemas/visibility";

/**
 * Result type for visibility toggle operations
 */
export interface VisibilityResult {
  success: true;
  setting: VisibilitySetting;
}

/**
 * Result type for batch visibility operations
 */
export interface BatchVisibilityResult {
  success: true;
  settings: VisibilitySetting[];
  updatedCount: number;
}

/**
 * Error result type
 */
export interface VisibilityErrorResult {
  success: false;
  error: string;
}

/**
 * Toggle visibility for a single entity
 * 
 * @param entityType - Type of entity (journey, milestone, objective)
 * @param entityId - Identifier of the entity
 * @param isPublic - New visibility state
 * @param parentJourneySlug - Parent journey slug (required for milestones/objectives)
 * @param parentMilestoneId - Parent milestone ID (required for objectives)
 */
export async function toggleVisibility(
  entityType: EntityType,
  entityId: string,
  isPublic: boolean,
  parentJourneySlug?: string,
  parentMilestoneId?: string
): Promise<VisibilityResult | VisibilityErrorResult | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    try {
      const setting = await updateVisibility(
        user.clerkId,
        entityType,
        entityId,
        isPublic,
        parentJourneySlug,
        parentMilestoneId
      );

      // Invalidate relevant caches
      revalidatePath("/admin");
      if (entityType === "journey") {
        revalidatePath("/journeys");
        revalidatePath(`/journeys/${entityId}`);
      }

      return { success: true, setting };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });
}


/**
 * Batch update for visibility toggle operations
 */
export interface BatchVisibilityUpdate {
  entityId: string;
  isPublic: boolean;
  parentJourneySlug?: string;
  parentMilestoneId?: string;
}

/**
 * Apply visibility updates to multiple entities of the same type in a single operation.
 *
 * @param entityType - The entity kind to update (e.g., "journey", "milestone", "objective").
 * @param updates - Array of update objects containing `entityId`, `isPublic`, and optional `parentJourneySlug` and `parentMilestoneId`.
 * @returns `BatchVisibilityResult` on success containing the updated settings and the number of updated records; `VisibilityErrorResult` with an `error` message on failure; or `UnauthorizedResponse` when the caller lacks required admin privileges.
 */
export async function toggleVisibilityBatch(
  entityType: EntityType,
  updates: BatchVisibilityUpdate[]
): Promise<BatchVisibilityResult | VisibilityErrorResult | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (updates.length === 0) {
      return { success: true, settings: [], updatedCount: 0 };
    }

    try {
      // Get current visibility for all entities for audit logging
      const entityIds = updates.map(u => u.entityId);
      const currentSettings = await Promise.all(
        entityIds.map(id => getVisibility(entityType, id))
      );
      
      // Create audit logs for each change BEFORE updating
      await Promise.all(
        updates.map(async (update, index) => {
          const currentSetting = currentSettings[index];
          const oldValue = currentSetting?.isPublic ?? null;
          
          await logVisibilityChange(
            user.clerkId,
            entityType,
            update.entityId,
            oldValue,
            update.isPublic,
            update.parentJourneySlug,
            update.parentMilestoneId
          );
        })
      );

      // Perform batch update
      const settings = await setVisibilityBatch(
        updates.map(update => ({
          entityType,
          entityId: update.entityId,
          isPublic: update.isPublic,
          parentJourneySlug: update.parentJourneySlug,
          parentMilestoneId: update.parentMilestoneId,
          updatedBy: user.clerkId,
        }))
      );

      // Invalidate relevant caches
      revalidatePath("/admin");
      revalidatePath("/explore");
      if (entityType === "journey") {
        revalidatePath("/journeys");
        // Revalidate each journey page
        for (const update of updates) {
          revalidatePath(`/journeys/${update.entityId}`);
          revalidatePath(`/explore/${update.entityId}`);
        }
      }

      return {
        success: true,
        settings,
        updatedCount: settings.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });
}

/**
 * Set whether an objective's lesson content is visible on the public explore page for its parent journey.
 *
 * @param objectiveEntityId - The objective entity's identifier
 * @param contentPublic - Whether the objective's lesson content should be visible on the public explore page
 * @param parentJourneySlug - Slug of the parent journey containing the objective
 * @param parentMilestoneId - Identifier of the parent milestone containing the objective
 * @returns `success` with the updated visibility setting on success, `error` with a message otherwise
 */
export async function toggleObjectiveContentVisibility(
  objectiveEntityId: string,
  contentPublic: boolean,
  parentJourneySlug: string,
  parentMilestoneId: string
): Promise<VisibilityResult | VisibilityErrorResult | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    try {
      const setting = await updateObjectiveContentVisibility(
        user.clerkId,
        objectiveEntityId,
        contentPublic,
        parentJourneySlug,
        parentMilestoneId
      );

      revalidatePath('/admin');
      revalidatePath('/explore');
      revalidatePath(`/explore/${parentJourneySlug}`);

      return { success: true, setting };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });
}

export interface BatchObjectiveContentUpdate {
  objectiveEntityId: string;
  contentPublic: boolean;
  parentJourneySlug: string;
  parentMilestoneId: string;
}

/**
 * Apply multiple updates that set whether each objective's lesson content is visible on the public explore pages.
 *
 * @param updates - Array of batch updates specifying `objectiveEntityId`, `contentPublic`, and optional `parentJourneySlug` and `parentMilestoneId` for each objective.
 * @returns `true`-case: `{ success: true, settings: VisibilitySetting[], updatedCount: number }` where `settings` reflects the new visibility records and `updatedCount` is the number applied; error-case: `{ success: false, error: string }` describing the failure; or `UnauthorizedResponse` if the caller is not an admin.
 */
export async function toggleObjectiveContentVisibilityBatch(
  updates: BatchObjectiveContentUpdate[]
): Promise<BatchVisibilityResult | VisibilityErrorResult | UnauthorizedResponse> {
  return requireAdmin(async () => {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (updates.length === 0) {
      return { success: true, settings: [], updatedCount: 0 };
    }

    try {
      const currentSettings = await Promise.all(
        updates.map(u => getVisibility('objective', u.objectiveEntityId))
      );

      await Promise.all(
        updates.map(async (update, index) => {
          const current = currentSettings[index];
          const oldValue = current?.contentPublic ?? null;
          await logAdminAction('objective_content_visibility_change', user.clerkId, undefined, {
            entityType: 'objective',
            entityId: update.objectiveEntityId,
            oldValue,
            newValue: update.contentPublic,
            parentJourneySlug: update.parentJourneySlug,
            parentMilestoneId: update.parentMilestoneId,
          });
        })
      );

      const settings = await setVisibilityBatch(
        updates.map((update, index) => ({
          entityType: 'objective' as const,
          entityId: update.objectiveEntityId,
          isPublic: currentSettings[index]?.isPublic ?? false,
          contentPublic: update.contentPublic,
          parentJourneySlug: update.parentJourneySlug,
          parentMilestoneId: update.parentMilestoneId,
          updatedBy: user.clerkId,
        }))
      );

      revalidatePath('/admin');
      revalidatePath('/explore');
      for (const update of updates) {
        revalidatePath(`/explore/${update.parentJourneySlug}`);
      }

      return { success: true, settings, updatedCount: settings.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}

/**
 * Get visibility overview for admin UI
 * 
 * Returns all journeys with their visibility status and stats.
 */
export async function getVisibilityOverview(): Promise<
  VisibilityOverview | VisibilityErrorResult | UnauthorizedResponse
> {
  return requireAdmin(async () => {
    try {
      const overview = await getVisibilityOverviewService();
      return overview;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false as const, error: message };
    }
  });
}

/**
 * Get detailed visibility information for a specific journey
 * 
 * Returns the journey with all milestones and objectives and their visibility status.
 * 
 * @param journeySlug - Slug of the journey to get details for
 */
export async function getJourneyVisibilityDetails(
  journeySlug: string
): Promise<JourneyVisibilityDetails | null | VisibilityErrorResult | UnauthorizedResponse> {
  return requireAdmin(async () => {
    try {
      const details = await getJourneyVisibilityDetailsService(journeySlug);
      return details;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false as const, error: message };
    }
  });
}