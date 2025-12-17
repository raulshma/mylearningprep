/**
 * Property-based tests for visibility service
 * 
 * Tests hierarchical visibility rules and service behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { EntityType, VisibilitySetting } from '@/lib/db/schemas/visibility';

// Mock the repository and collections
vi.mock('@/lib/db/repositories/visibility-repository', () => ({
  getVisibility: vi.fn(),
  setVisibility: vi.fn(),
  getVisibilityBatch: vi.fn(),
  findPublicEntities: vi.fn(),
  getVisibilityByParent: vi.fn(),
}));

vi.mock('@/lib/db/collections', () => ({
  getJourneysCollection: vi.fn(),
}));

vi.mock('./audit-log', () => ({
  logAdminAction: vi.fn(),
  logVisibilityChange: vi.fn(),
}));

// Import after mocking
import {
  isPubliclyVisible,
  updateVisibility,
  VisibilityError,
  VisibilityErrorCode,
} from './visibility-service';
import {
  getVisibility,
  setVisibility,
} from '@/lib/db/repositories/visibility-repository';
import { getJourneysCollection } from '@/lib/db/collections';
import { logVisibilityChange } from './audit-log';

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

describe('Visibility Service Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * **Feature: journey-public-visibility, Property 3: Hierarchical Visibility Override**
   * 
   * For any entity with a private parent (journey for milestones, milestone for objectives),
   * the effective visibility should be private regardless of the entity's own visibility setting.
   * 
   * **Validates: Requirements 2.3, 3.3**
   */
  describe('Property 3: Hierarchical Visibility Override', () => {
    it('milestone with private parent journey should always be private', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          fc.boolean(), // milestone's own visibility setting
          async (journeySlug, milestoneId, milestoneIsPublic) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // Setup: milestone has some visibility setting, but parent journey is private
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'milestone' && id === milestoneId) {
                return createMockVisibilitySetting(
                  'milestone',
                  milestoneId,
                  milestoneIsPublic,
                  journeySlug
                );
              }
              if (type === 'journey' && id === journeySlug) {
                // Parent journey is PRIVATE
                return createMockVisibilitySetting('journey', journeySlug, false);
              }
              return null;
            });

            // Clear cache by calling with unique params
            const result = await isPubliclyVisible('milestone', milestoneId);
            
            // Regardless of milestone's own setting, it should be private
            // because parent journey is private
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('objective with private parent milestone should always be private', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          entityIdArb,
          fc.boolean(), // objective's own visibility setting
          async (journeySlug, milestoneId, objectiveId, objectiveIsPublic) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // Setup: objective has some visibility, milestone is private, journey is public
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'objective' && id === objectiveId) {
                return createMockVisibilitySetting(
                  'objective',
                  objectiveId,
                  objectiveIsPublic,
                  journeySlug,
                  milestoneId
                );
              }
              if (type === 'milestone' && id === milestoneId) {
                // Parent milestone is PRIVATE
                return createMockVisibilitySetting(
                  'milestone',
                  milestoneId,
                  false,
                  journeySlug
                );
              }
              if (type === 'journey' && id === journeySlug) {
                // journey is public
                return createMockVisibilitySetting('journey', journeySlug, true);
              }
              return null;
            });

            const result = await isPubliclyVisible('objective', objectiveId);
            
            // Regardless of objective's own setting, it should be private
            // because parent milestone is private
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('objective with private grandparent journey should always be private', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          entityIdArb,
          fc.boolean(), // objective's own visibility
          fc.boolean(), // milestone's own visibility
          async (journeySlug, milestoneId, objectiveId, objectiveIsPublic, milestoneIsPublic) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // Setup: journey is private, milestone and objective have various settings
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'objective' && id === objectiveId) {
                return createMockVisibilitySetting(
                  'objective',
                  objectiveId,
                  objectiveIsPublic,
                  journeySlug,
                  milestoneId
                );
              }
              if (type === 'milestone' && id === milestoneId) {
                return createMockVisibilitySetting(
                  'milestone',
                  milestoneId,
                  milestoneIsPublic,
                  journeySlug
                );
              }
              if (type === 'journey' && id === journeySlug) {
                // journey is PRIVATE
                return createMockVisibilitySetting('journey', journeySlug, false);
              }
              return null;
            });

            const result = await isPubliclyVisible('objective', objectiveId);
            
            // Regardless of objective's or milestone's own settings,
            // it should be private because grandparent journey is private
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('entity is public only when all ancestors are public', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          entityIdArb,
          async (journeySlug, milestoneId, objectiveId) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // Setup: all entities are public
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'objective' && id === objectiveId) {
                return createMockVisibilitySetting(
                  'objective',
                  objectiveId,
                  true,
                  journeySlug,
                  milestoneId
                );
              }
              if (type === 'milestone' && id === milestoneId) {
                return createMockVisibilitySetting(
                  'milestone',
                  milestoneId,
                  true,
                  journeySlug
                );
              }
              if (type === 'journey' && id === journeySlug) {
                return createMockVisibilitySetting('journey', journeySlug, true);
              }
              return null;
            });

            const result = await isPubliclyVisible('objective', objectiveId);
            
            // When all ancestors are public, the entity should be public
            expect(result).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


  /**
   * **Feature: journey-public-visibility, Property 4: Parent Existence Validation**
   * 
   * For any visibility change on a milestone or objective, the system should reject
   * the change if the parent entity (journey or milestone) does not exist.
   * 
   * **Validates: Requirements 2.4, 3.4**
   */
  describe('Property 4: Parent Existence Validation', () => {
    it('milestone visibility change should be rejected when parent journey does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          adminIdArb,
          fc.boolean(),
          async (journeySlug, milestoneId, adminId, isPublic) => {
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            
            // Setup: journey does not exist
            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(null),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);

            // Attempt to update milestone visibility
            await expect(
              updateVisibility(
                adminId,
                'milestone',
                milestoneId,
                isPublic,
                journeySlug
              )
            ).rejects.toThrow(VisibilityError);

            try {
              await updateVisibility(
                adminId,
                'milestone',
                milestoneId,
                isPublic,
                journeySlug
              );
            } catch (error) {
              expect(error).toBeInstanceOf(VisibilityError);
              expect((error as VisibilityError).code).toBe(VisibilityErrorCode.PARENT_NOT_FOUND);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('objective visibility change should be rejected when parent journey does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          entityIdArb,
          adminIdArb,
          fc.boolean(),
          async (journeySlug, milestoneId, objectiveId, adminId, isPublic) => {
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            
            // Setup: journey does not exist
            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(null),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);

            // Attempt to update objective visibility
            await expect(
              updateVisibility(
                adminId,
                'objective',
                objectiveId,
                isPublic,
                journeySlug,
                milestoneId
              )
            ).rejects.toThrow(VisibilityError);

            try {
              await updateVisibility(
                adminId,
                'objective',
                objectiveId,
                isPublic,
                journeySlug,
                milestoneId
              );
            } catch (error) {
              expect(error).toBeInstanceOf(VisibilityError);
              expect((error as VisibilityError).code).toBe(VisibilityErrorCode.PARENT_NOT_FOUND);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('objective visibility change should be rejected when parent milestone does not exist in journey', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          entityIdArb,
          adminIdArb,
          fc.boolean(),
          async (journeySlug, milestoneId, objectiveId, adminId, isPublic) => {
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            
            // Setup: journey exists but milestone does not exist in it
            const mockjourney = {
              slug: journeySlug,
              nodes: [
                { id: 'other-milestone', title: 'Other Milestone' },
              ],
            };
            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(mockjourney),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);

            // Attempt to update objective visibility with non-existent milestone
            await expect(
              updateVisibility(
                adminId,
                'objective',
                objectiveId,
                isPublic,
                journeySlug,
                milestoneId
              )
            ).rejects.toThrow(VisibilityError);

            try {
              await updateVisibility(
                adminId,
                'objective',
                objectiveId,
                isPublic,
                journeySlug,
                milestoneId
              );
            } catch (error) {
              expect(error).toBeInstanceOf(VisibilityError);
              expect((error as VisibilityError).code).toBe(VisibilityErrorCode.PARENT_NOT_FOUND);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('milestone visibility change should succeed when parent journey exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          adminIdArb,
          fc.boolean(),
          async (journeySlug, milestoneId, adminId, isPublic) => {
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockSetVisibility = vi.mocked(setVisibility);
            
            // Setup: journey exists
            const mockjourney = {
              slug: journeySlug,
              nodes: [{ id: milestoneId, title: 'Test Milestone' }],
            };
            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(mockjourney),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);
            mockGetVisibility.mockResolvedValue(null);
            mockSetVisibility.mockResolvedValue(
              createMockVisibilitySetting('milestone', milestoneId, isPublic, journeySlug)
            );

            // Should succeed
            const result = await updateVisibility(
              adminId,
              'milestone',
              milestoneId,
              isPublic,
              journeySlug
            );

            expect(result.entityType).toBe('milestone');
            expect(result.entityId).toBe(milestoneId);
            expect(result.isPublic).toBe(isPublic);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('journey visibility change should succeed without parent validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          adminIdArb,
          fc.boolean(),
          async (journeySlug, adminId, isPublic) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockSetVisibility = vi.mocked(setVisibility);
            
            // Setup: no parent validation needed for journeys
            mockGetVisibility.mockResolvedValue(null);
            mockSetVisibility.mockResolvedValue(
              createMockVisibilitySetting('journey', journeySlug, isPublic)
            );

            // Should succeed without any parent checks
            const result = await updateVisibility(
              adminId,
              'journey',
              journeySlug,
              isPublic
            );

            expect(result.entityType).toBe('journey');
            expect(result.entityId).toBe(journeySlug);
            expect(result.isPublic).toBe(isPublic);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: journey-public-visibility, Property 5: Public Content Filtering**
   * 
   * For any public content request, the returned data should only include entities
   * that are effectively public (considering hierarchical visibility rules).
   * 
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   */
  describe('Property 5: Public Content Filtering', () => {
    it('getPublicjourneyBySlug should return null for private journeys', async () => {
      // Import the function we need to test
      const { getPublicJourneyBySlug } = await import('./visibility-service');
      
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          async (slug) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // Setup: journey is private
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'journey' && id === slug) {
                return createMockVisibilitySetting('journey', slug, false);
              }
              return null;
            });

            const result = await getPublicJourneyBySlug(slug);
            
            // Private journey should return null
            expect(result).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getPublicjourneys should only return journeys marked as public', async () => {
      const { getPublicJourneys } = await import('./visibility-service');
      const { findPublicEntities, getVisibilityByParent } = await import('@/lib/db/repositories/visibility-repository');
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(journeySlugArb, { minLength: 0, maxLength: 5 }),
          async (publicSlugs) => {
            const mockFindPublicEntities = vi.mocked(findPublicEntities);
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            const mockGetVisibilityByParent = vi.mocked(getVisibilityByParent);
            
            // Setup: return the public slugs
            mockFindPublicEntities.mockResolvedValue(publicSlugs);
            
            // Setup: mock journey documents
            const mockjourneys = publicSlugs.map(slug => ({
              _id: `journey-${slug}`,
              slug,
              title: `journey ${slug}`,
              description: 'Test description',
              category: 'frontend',
              difficulty: 5,
              estimatedHours: 10,
              nodes: [],
              edges: [],
              isActive: true,
            }));
            
            const mockCollection = {
              find: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue(mockjourneys),
              }),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);
            mockGetVisibilityByParent.mockResolvedValue([]);

            const result = await getPublicJourneys();
            
            // Should return exactly the public journeys
            expect(result.length).toBe(publicSlugs.length);
            for (const journey of result) {
              expect(publicSlugs).toContain(journey.slug);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filtered journey should only contain public milestones', async () => {
      const { getPublicJourneyBySlug } = await import('./visibility-service');
      const { getVisibilityByParent } = await import('@/lib/db/repositories/visibility-repository');
      
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          fc.array(entityIdArb, { minLength: 1, maxLength: 5 }),
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          async (slug, milestoneIds, milestoneVisibilities) => {
            // Ensure arrays are same length
            const ids = milestoneIds.slice(0, milestoneVisibilities.length);
            const visibilities = milestoneVisibilities.slice(0, ids.length);
            
            if (ids.length === 0) return true;
            
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            const mockGetVisibilityByParent = vi.mocked(getVisibilityByParent);
            
            // Setup: journey is public
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'journey' && id === slug) {
                return createMockVisibilitySetting('journey', slug, true);
              }
              return null;
            });
            
            // Setup: mock journey with milestones
            const mockjourney = {
              _id: `journey-${slug}`,
              slug,
              title: `journey ${slug}`,
              description: 'Test description',
              category: 'frontend',
              difficulty: 5,
              estimatedHours: 10,
              nodes: ids.map((id, i) => ({
                id,
                title: `Milestone ${i}`,
                type: 'milestone',
                position: { x: 0, y: i * 100 },
                learningObjectives: [],
                resources: [],
                estimatedMinutes: 30,
                tags: [],
              })),
              edges: [],
              isActive: true,
            };
            
            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(mockjourney),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);
            
            // Setup: milestone visibility settings
            const milestoneSettings = ids.map((id, i) => 
              createMockVisibilitySetting('milestone', id, visibilities[i], slug)
            );
            mockGetVisibilityByParent.mockImplementation(async (type) => {
              if (type === 'milestone') {
                return milestoneSettings;
              }
              return [];
            });

            const result = await getPublicJourneyBySlug(slug);
            
            if (result) {
              // All returned nodes should be from public milestones
              const publicMilestoneIds = ids.filter((_, i) => visibilities[i]);
              expect(result.nodes.length).toBe(publicMilestoneIds.length);
              for (const node of result.nodes) {
                expect(publicMilestoneIds).toContain(node.id);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: journey-public-visibility, Property 7: Generic Visibility Check**
   * 
   * For any entity type and identifier, the visibility check function should correctly
   * determine the effective visibility based on the entity's setting and its parent hierarchy.
   * 
   * **Validates: Requirements 7.2**
   */
  describe('Property 7: Generic Visibility Check', () => {
    it('isPubliclyVisible should work correctly for journey entity type', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          fc.boolean(),
          async (slug, isPublic) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'journey' && id === slug) {
                return createMockVisibilitySetting('journey', slug, isPublic);
              }
              return null;
            });

            const result = await isPubliclyVisible('journey', slug);
            
            // journey visibility should match its direct setting
            expect(result).toBe(isPublic);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isPubliclyVisible should work correctly for milestone entity type', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          fc.boolean(),
          fc.boolean(),
          async (journeySlug, milestoneId, journeyPublic, milestonePublic) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'journey' && id === journeySlug) {
                return createMockVisibilitySetting('journey', journeySlug, journeyPublic);
              }
              if (type === 'milestone' && id === milestoneId) {
                return createMockVisibilitySetting('milestone', milestoneId, milestonePublic, journeySlug);
              }
              return null;
            });

            const result = await isPubliclyVisible('milestone', milestoneId);
            
            // Milestone is public only if both it and its parent journey are public
            const expectedResult = journeyPublic && milestonePublic;
            expect(result).toBe(expectedResult);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isPubliclyVisible should work correctly for objective entity type', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          entityIdArb,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          async (journeySlug, milestoneId, objectiveId, journeyPublic, milestonePublic, objectivePublic) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === 'journey' && id === journeySlug) {
                return createMockVisibilitySetting('journey', journeySlug, journeyPublic);
              }
              if (type === 'milestone' && id === milestoneId) {
                return createMockVisibilitySetting('milestone', milestoneId, milestonePublic, journeySlug);
              }
              if (type === 'objective' && id === objectiveId) {
                return createMockVisibilitySetting('objective', objectiveId, objectivePublic, journeySlug, milestoneId);
              }
              return null;
            });

            const result = await isPubliclyVisible('objective', objectiveId);
            
            // Objective is public only if it, its milestone, and its journey are all public
            const expectedResult = journeyPublic && milestonePublic && objectivePublic;
            expect(result).toBe(expectedResult);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isPubliclyVisible should return false for non-existent entities', async () => {
      await fc.assert(
        fc.asyncProperty(
          entityTypeArb,
          entityIdArb,
          async (entityType, entityId) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // No visibility setting exists
            mockGetVisibility.mockResolvedValue(null);

            const result = await isPubliclyVisible(entityType, entityId);
            
            // Non-existent entities should be private by default
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isPubliclyVisible should return false for entities without parent references', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<EntityType>('milestone', 'objective'),
          entityIdArb,
          async (entityType, entityId) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            
            // Entity is marked public but has no parent reference
            mockGetVisibility.mockImplementation(async (type, id) => {
              if (type === entityType && id === entityId) {
                return {
                  _id: `vis-${entityId}`,
                  entityType,
                  entityId,
                  isPublic: true,
                  // Missing parent references
                  parentJourneySlug: undefined,
                  parentMilestoneId: undefined,
                  updatedBy: 'admin-123',
                  updatedAt: new Date(),
                  createdAt: new Date(),
                };
              }
              return null;
            });

            const result = await isPubliclyVisible(entityType, entityId);
            
            // Entities without proper parent references should be private
            expect(result).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: journey-public-visibility, Property 6: Audit Log Completeness**
   * 
   * For any visibility modification, the audit log entry should contain the admin user ID,
   * timestamp, previous value, new value, entity type, and entity ID.
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  describe('Property 6: Audit Log Completeness', () => {
    it('visibility changes should create complete audit records with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          adminIdArb,
          fc.boolean(), // old value
          fc.boolean(), // new value
          async (journeySlug, adminId, oldValue, newValue) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockSetVisibility = vi.mocked(setVisibility);
            const mockLogVisibilityChange = vi.mocked(logVisibilityChange);
            
            // Clear previous calls
            mockLogVisibilityChange.mockClear();
            
            // Setup: existing visibility setting
            mockGetVisibility.mockResolvedValue(
              oldValue ? createMockVisibilitySetting('journey', journeySlug, oldValue) : null
            );
            mockSetVisibility.mockResolvedValue(
              createMockVisibilitySetting('journey', journeySlug, newValue)
            );

            // Perform visibility update
            await updateVisibility(adminId, 'journey', journeySlug, newValue);

            // Verify audit log was called with complete information
            expect(mockLogVisibilityChange).toHaveBeenCalledTimes(1);
            
            const [
              loggedAdminId,
              loggedEntityType,
              loggedEntityId,
              loggedOldValue,
              loggedNewValue,
            ] = mockLogVisibilityChange.mock.calls[0];
            
            // Verify all required fields are present
            // Requirement 6.1: admin user identifier
            expect(loggedAdminId).toBe(adminId);
            
            // Requirement 6.4: entity type and identifier
            expect(loggedEntityType).toBe('journey');
            expect(loggedEntityId).toBe(journeySlug);
            
            // Requirement 6.3: previous and new visibility values
            expect(loggedOldValue).toBe(oldValue ? oldValue : null);
            expect(loggedNewValue).toBe(newValue);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('milestone visibility changes should include parent journey in audit log', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          adminIdArb,
          fc.boolean(),
          async (journeySlug, milestoneId, adminId, newValue) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockSetVisibility = vi.mocked(setVisibility);
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            const mockLogVisibilityChange = vi.mocked(logVisibilityChange);
            
            // Clear previous calls
            mockLogVisibilityChange.mockClear();
            
            // Setup: journey exists
            const mockjourney = {
              slug: journeySlug,
              nodes: [{ id: milestoneId, title: 'Test Milestone' }],
            };
            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(mockjourney),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);
            
            mockGetVisibility.mockResolvedValue(null);
            mockSetVisibility.mockResolvedValue(
              createMockVisibilitySetting('milestone', milestoneId, newValue, journeySlug)
            );

            // Perform visibility update
            await updateVisibility(adminId, 'milestone', milestoneId, newValue, journeySlug);

            // Verify audit log includes parent journey slug
            expect(mockLogVisibilityChange).toHaveBeenCalledTimes(1);
            
            const callArgs = mockLogVisibilityChange.mock.calls[0];
            expect(callArgs[0]).toBe(adminId); // adminId
            expect(callArgs[1]).toBe('milestone'); // entityType
            expect(callArgs[2]).toBe(milestoneId); // entityId
            expect(callArgs[5]).toBe(journeySlug); // parentJourneySlug
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('objective visibility changes should include parent milestone and journey in audit log', async () => {
      await fc.assert(
        fc.asyncProperty(
          journeySlugArb,
          entityIdArb,
          entityIdArb,
          adminIdArb,
          fc.boolean(),
          async (journeySlug, milestoneId, objectiveId, adminId, newValue) => {
            const mockGetVisibility = vi.mocked(getVisibility);
            const mockSetVisibility = vi.mocked(setVisibility);
            const mockGetJourneysCollection = vi.mocked(getJourneysCollection);
            const mockLogVisibilityChange = vi.mocked(logVisibilityChange);
            
            // Clear previous calls
            mockLogVisibilityChange.mockClear();
            
            // Setup: journey with milestone exists
            const mockjourney = {
              slug: journeySlug,
              nodes: [{ id: milestoneId, title: 'Test Milestone' }],
            };
            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(mockjourney),
            };
            mockGetJourneysCollection.mockResolvedValue(mockCollection as never);
            
            mockGetVisibility.mockResolvedValue(null);
            mockSetVisibility.mockResolvedValue(
              createMockVisibilitySetting('objective', objectiveId, newValue, journeySlug, milestoneId)
            );

            // Perform visibility update
            await updateVisibility(adminId, 'objective', objectiveId, newValue, journeySlug, milestoneId);

            // Verify audit log includes both parent references
            expect(mockLogVisibilityChange).toHaveBeenCalledTimes(1);
            
            const callArgs = mockLogVisibilityChange.mock.calls[0];
            expect(callArgs[0]).toBe(adminId); // adminId
            expect(callArgs[1]).toBe('objective'); // entityType
            expect(callArgs[2]).toBe(objectiveId); // entityId
            expect(callArgs[5]).toBe(journeySlug); // parentJourneySlug
            expect(callArgs[6]).toBe(milestoneId); // parentMilestoneId
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
