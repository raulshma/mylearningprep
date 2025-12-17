/**
 * Property-based tests for visibility admin actions
 * 
 * Tests authorization enforcement and batch update consistency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { EntityType, VisibilitySetting } from '@/lib/db/schemas/visibility';

// Mock the auth module
vi.mock('@/lib/auth/get-user', () => ({
  requireAdmin: vi.fn(),
  getAuthUser: vi.fn(),
}));

// Mock the visibility service
vi.mock('@/lib/services/visibility-service', () => ({
  updateVisibility: vi.fn(),
  getVisibilityOverview: vi.fn(),
  getjourneyVisibilityDetails: vi.fn(),
}));

// Mock the visibility repository
vi.mock('@/lib/db/repositories/visibility-repository', () => ({
  setVisibilityBatch: vi.fn(),
  getVisibility: vi.fn(),
}));

// Mock the audit log
vi.mock('@/lib/services/audit-log', () => ({
  logVisibilityChange: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking
import { requireAdmin, getAuthUser } from '@/lib/auth/get-user';
import { updateVisibility as updateVisibilityService } from '@/lib/services/visibility-service';
import { setVisibilityBatch, getVisibility } from '@/lib/db/repositories/visibility-repository';
import { logVisibilityChange } from '@/lib/services/audit-log';
import {
  toggleVisibility,
  toggleVisibilityBatch,
} from './visibility-admin';

// Arbitrary generators
const entityTypeArb = fc.constantFrom<EntityType>('journey', 'milestone', 'objective');
const entityIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const journeySlugArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$|^[a-z0-9]$/)
  .filter(s => s.length >= 1 && s.length <= 50);
const adminIdArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);


// Helper to create a mock visibility setting
function createMockVisibilitySetting(
  entityType: EntityType,
  entityId: string,
  isPublic: boolean,
  parentJourneySlug?: string,
  parentMilestoneId?: string
): VisibilitySetting {
  return {
    _id: `vis-${entityId}`,
    entityType,
    entityId,
    isPublic,
    parentJourneySlug,
    parentMilestoneId,
    updatedBy: 'admin-123',
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

describe('Visibility Admin Actions Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * **Feature: journey-public-visibility, Property 2: Authorization Enforcement**
   * 
   * For any visibility modification request from a non-admin user,
   * the system should reject the request and return an unauthorized error.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Authorization Enforcement', () => {
    it('toggleVisibility should reject non-admin requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          entityTypeArb,
          entityIdArb,
          fc.boolean(),
          async (entityType, entityId, isPublic) => {
            const mockRequireAdmin = vi.mocked(requireAdmin);
            
            // Setup: requireAdmin returns unauthorized response for non-admin
            mockRequireAdmin.mockImplementation(async () => {
              return { success: false, error: 'Unauthorized' };
            });

            const result = await toggleVisibility(entityType, entityId, isPublic);
            
            // Should return unauthorized error
            expect(result).toEqual({ success: false, error: 'Unauthorized' });
            
            // The inner function should never be called
            expect(vi.mocked(updateVisibilityService)).not.toHaveBeenCalled();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('toggleVisibilityBatch should reject non-admin requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          entityTypeArb,
          fc.array(
            fc.record({
              entityId: entityIdArb,
              isPublic: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (entityType, updates) => {
            const mockRequireAdmin = vi.mocked(requireAdmin);
            
            // Setup: requireAdmin returns unauthorized response for non-admin
            mockRequireAdmin.mockImplementation(async () => {
              return { success: false, error: 'Unauthorized' };
            });

            const result = await toggleVisibilityBatch(entityType, updates);
            
            // Should return unauthorized error
            expect(result).toEqual({ success: false, error: 'Unauthorized' });
            
            // The batch operation should never be called
            expect(vi.mocked(setVisibilityBatch)).not.toHaveBeenCalled();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('toggleVisibility should succeed for admin requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          fc.boolean(),
          adminIdArb,
          async (journeySlug, isPublic, adminId) => {
            const mockRequireAdmin = vi.mocked(requireAdmin);
            const mockGetAuthUser = vi.mocked(getAuthUser);
            const mockUpdateVisibility = vi.mocked(updateVisibilityService);
            
            // Setup: admin user
            mockGetAuthUser.mockResolvedValue({
              clerkId: adminId,
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
              imageUrl: null,
              byokApiKey: null,
              openRouterApiKey: null,
              googleApiKey: null,
              isAdmin: true,
            });
            
            const mockSetting = createMockVisibilitySetting('journey', journeySlug, isPublic);
            mockUpdateVisibility.mockResolvedValue(mockSetting);
            
            // Setup: requireAdmin executes the function for admin
            mockRequireAdmin.mockImplementation(async (fn) => {
              return fn();
            });

            const result = await toggleVisibility('journey', journeySlug, isPublic);
            
            // Should succeed
            expect(result).toHaveProperty('success', true);
            if ('setting' in result) {
              expect(result.setting.entityId).toBe(journeySlug);
              expect(result.setting.isPublic).toBe(isPublic);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: journey-public-visibility, Property 8: Batch Update Consistency**
   * 
   * For any batch visibility update, all specified entities should be updated atomically,
   * and reading back their visibility should reflect the batch update values.
   * 
   * **Validates: Requirements 7.4**
   */
  describe('Property 8: Batch Update Consistency', () => {
    it('batch updates should update all entities with correct values', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate unique entityIds to avoid duplicate key issues
          fc.uniqueArray(journeySlugArb, { minLength: 1, maxLength: 10 })
            .chain(entityIds => 
              fc.tuple(
                fc.constant(entityIds),
                fc.array(fc.boolean(), { minLength: entityIds.length, maxLength: entityIds.length })
              )
            )
            .map(([entityIds, isPublicValues]) => 
              entityIds.map((entityId, i) => ({ entityId, isPublic: isPublicValues[i] }))
            ),
          adminIdArb,
          async (updates, adminId) => {
            const mockRequireAdmin = vi.mocked(requireAdmin);
            const mockGetAuthUser = vi.mocked(getAuthUser);
            const mockSetVisibilityBatch = vi.mocked(setVisibilityBatch);
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockLogVisibilityChange = vi.mocked(logVisibilityChange);
            
            // Clear previous calls
            mockLogVisibilityChange.mockClear();
            mockSetVisibilityBatch.mockClear();
            
            // Setup: admin user
            mockGetAuthUser.mockResolvedValue({
              clerkId: adminId,
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
              imageUrl: null,
              byokApiKey: null,
              openRouterApiKey: null,
              googleApiKey: null,
              isAdmin: true,
            });
            
            // Setup: no existing visibility settings
            mockGetVisibility.mockResolvedValue(null);
            
            // Setup: batch update returns the updated settings
            const expectedSettings = updates.map(u => 
              createMockVisibilitySetting('journey', u.entityId, u.isPublic)
            );
            mockSetVisibilityBatch.mockResolvedValue(expectedSettings);
            
            // Setup: requireAdmin executes the function for admin
            mockRequireAdmin.mockImplementation(async (fn) => {
              return fn();
            });

            const result = await toggleVisibilityBatch('journey', updates);
            
            // Should succeed
            expect(result).toHaveProperty('success', true);
            
            if ('settings' in result) {
              // All updates should be reflected
              expect(result.settings.length).toBe(updates.length);
              expect(result.updatedCount).toBe(updates.length);
              
              // Each setting should match the requested update
              for (let i = 0; i < updates.length; i++) {
                const setting = result.settings.find(s => s.entityId === updates[i].entityId);
                expect(setting).toBeDefined();
                expect(setting?.isPublic).toBe(updates[i].isPublic);
              }
            }
            
            // Verify setVisibilityBatch was called with all updates
            expect(mockSetVisibilityBatch).toHaveBeenCalledTimes(1);
            const batchCall = mockSetVisibilityBatch.mock.calls[0][0];
            expect(batchCall.length).toBe(updates.length);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('batch updates should create audit logs for each entity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              entityId: journeySlugArb,
              isPublic: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          adminIdArb,
          async (updates, adminId) => {
            const mockRequireAdmin = vi.mocked(requireAdmin);
            const mockGetAuthUser = vi.mocked(getAuthUser);
            const mockSetVisibilityBatch = vi.mocked(setVisibilityBatch);
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockLogVisibilityChange = vi.mocked(logVisibilityChange);
            
            // Clear previous calls
            mockLogVisibilityChange.mockClear();
            
            // Setup: admin user
            mockGetAuthUser.mockResolvedValue({
              clerkId: adminId,
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
              imageUrl: null,
              byokApiKey: null,
              openRouterApiKey: null,
              googleApiKey: null,
              isAdmin: true,
            });
            
            // Setup: no existing visibility settings
            mockGetVisibility.mockResolvedValue(null);
            
            // Setup: batch update returns the updated settings
            const expectedSettings = updates.map(u => 
              createMockVisibilitySetting('journey', u.entityId, u.isPublic)
            );
            mockSetVisibilityBatch.mockResolvedValue(expectedSettings);
            
            // Setup: requireAdmin executes the function for admin
            mockRequireAdmin.mockImplementation(async (fn) => {
              return fn();
            });

            await toggleVisibilityBatch('journey', updates);
            
            // Verify audit log was called for each entity
            expect(mockLogVisibilityChange).toHaveBeenCalledTimes(updates.length);
            
            // Each audit log should have the correct admin ID
            for (const call of mockLogVisibilityChange.mock.calls) {
              expect(call[0]).toBe(adminId);
              expect(call[1]).toBe('journey');
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty batch updates should succeed without calling repository', async () => {
      await fc.assert(
        fc.asyncProperty(
          entityTypeArb,
          adminIdArb,
          async (entityType, adminId) => {
            const mockRequireAdmin = vi.mocked(requireAdmin);
            const mockGetAuthUser = vi.mocked(getAuthUser);
            const mockSetVisibilityBatch = vi.mocked(setVisibilityBatch);
            
            // Clear previous calls
            mockSetVisibilityBatch.mockClear();
            
            // Setup: admin user
            mockGetAuthUser.mockResolvedValue({
              clerkId: adminId,
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
              imageUrl: null,
              byokApiKey: null,
              openRouterApiKey: null,
              googleApiKey: null,
              isAdmin: true,
            });
            
            // Setup: requireAdmin executes the function for admin
            mockRequireAdmin.mockImplementation(async (fn) => {
              return fn();
            });

            const result = await toggleVisibilityBatch(entityType, []);
            
            // Should succeed with empty results
            expect(result).toEqual({
              success: true,
              settings: [],
              updatedCount: 0,
            });
            
            // Repository should not be called for empty batch
            expect(mockSetVisibilityBatch).not.toHaveBeenCalled();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('batch updates should preserve parent references', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.record({
              entityId: entityIdArb,
              isPublic: fc.boolean(),
              parentJourneySlug: journeySlugArb,
            }),
            { selector: (u) => u.entityId, minLength: 1, maxLength: 5 }
          ),
          adminIdArb,
          async (updates, adminId) => {
            const mockRequireAdmin = vi.mocked(requireAdmin);
            const mockGetAuthUser = vi.mocked(getAuthUser);
            const mockSetVisibilityBatch = vi.mocked(setVisibilityBatch);
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // Clear previous calls
            mockSetVisibilityBatch.mockClear();
            
            // Setup: admin user
            mockGetAuthUser.mockResolvedValue({
              clerkId: adminId,
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
              imageUrl: null,
              byokApiKey: null,
              openRouterApiKey: null,
              googleApiKey: null,
              isAdmin: true,
            });
            
            // Setup: no existing visibility settings
            mockGetVisibility.mockResolvedValue(null);
            
            // Setup: batch update returns the updated settings with parent refs
            const expectedSettings = updates.map(u => 
              createMockVisibilitySetting('milestone', u.entityId, u.isPublic, u.parentJourneySlug)
            );
            mockSetVisibilityBatch.mockResolvedValue(expectedSettings);
            
            // Setup: requireAdmin executes the function for admin
            mockRequireAdmin.mockImplementation(async (fn) => {
              return fn();
            });

            await toggleVisibilityBatch('milestone', updates);
            
            // Verify setVisibilityBatch was called with parent references
            expect(mockSetVisibilityBatch).toHaveBeenCalledTimes(1);
            const batchCall = mockSetVisibilityBatch.mock.calls[0][0];
            
            for (let i = 0; i < updates.length; i++) {
              const setting = batchCall.find((s: { entityId: string }) => s.entityId === updates[i].entityId) as { entityId: string; parentJourneySlug?: string } | undefined;
              expect(setting).toBeDefined();
              expect(setting?.parentJourneySlug).toBe(updates[i].parentJourneySlug);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
