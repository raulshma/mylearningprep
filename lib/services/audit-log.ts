import { getDb } from "@/lib/db/client";
import { Collection, ObjectId } from "mongodb";

/**
 * Audit log entry for tracking sensitive admin actions
 */
export interface AuditLogEntry {
  _id?: ObjectId;
  /** Action performed (e.g., 'updateUserPlan', 'suspendUser') */
  action: string;
  /** Clerk ID of the admin who performed the action */
  adminUserId: string;
  /** MongoDB ID of the target user (if applicable) */
  targetUserId?: string;
  /** Additional details about the action */
  details?: Record<string, unknown>;
  /** Timestamp of the action - TTL index deletes after 90 days */
  createdAt: Date;
}

let auditLogsCollection: Collection<AuditLogEntry> | null = null;
let indexesEnsured = false;

/**
 * Get the audit_logs collection with TTL index
 */
async function getAuditLogsCollection(): Promise<Collection<AuditLogEntry>> {
  if (auditLogsCollection) {
    return auditLogsCollection;
  }

  const db = await getDb();
  auditLogsCollection = db.collection<AuditLogEntry>("audit_logs");

  // Ensure TTL index exists (90 days = 7776000 seconds)
  if (!indexesEnsured) {
    try {
      await auditLogsCollection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 7776000, background: true }
      );
      indexesEnsured = true;
    } catch (error) {
      // Index may already exist, which is fine
      console.warn("Audit log TTL index creation:", error);
      indexesEnsured = true;
    }
  }

  return auditLogsCollection;
}

/**
 * Log an admin action for audit purposes
 *
 * @param action - The action being performed
 * @param adminUserId - Clerk ID of the admin performing the action
 * @param targetUserId - MongoDB ID of the target user (optional)
 * @param details - Additional context about the action (optional)
 *
 * @example
 * ```typescript
 * await logAdminAction(
 *   'updateUserPlan',
 *   adminClerkId,
 *   userId,
 *   { oldPlan: 'FREE', newPlan: 'PRO' }
 * );
 * ```
 */
export async function logAdminAction(
  action: string,
  adminUserId: string,
  targetUserId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const collection = await getAuditLogsCollection();

    await collection.insertOne({
      action,
      adminUserId,
      targetUserId,
      details,
      createdAt: new Date(),
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break admin actions
    console.error("Failed to log admin action:", error);
  }
}

/**
 * Query audit logs (for future admin viewing capability)
 *
 * @param options - Query options
 * @returns Array of audit log entries
 */
export async function queryAuditLogs(options: {
  adminUserId?: string;
  targetUserId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}): Promise<AuditLogEntry[]> {
  const collection = await getAuditLogsCollection();

  const query: Record<string, unknown> = {};

  if (options.adminUserId) {
    query.adminUserId = options.adminUserId;
  }

  if (options.targetUserId) {
    query.targetUserId = options.targetUserId;
  }

  if (options.action) {
    query.action = options.action;
  }

  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) {
      (query.createdAt as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (query.createdAt as Record<string, Date>).$lte = options.endDate;
    }
  }

  return collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(options.skip ?? 0)
    .limit(options.limit ?? 50)
    .toArray();
}
