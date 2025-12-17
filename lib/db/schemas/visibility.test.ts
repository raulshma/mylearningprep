/**
 * Property-based tests for visibility schema validation
 * 
 * **Feature: journey-public-visibility, Property 1: Visibility Setting Round-Trip**
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  EntityTypeSchema,
  VisibilitySettingSchema,
  CreateVisibilitySettingSchema,
  type EntityType,
  type VisibilitySetting,
  type CreateVisibilitySetting,
} from './visibility';

// Arbitrary generators for property tests
const entityTypeArb = fc.constantFrom<EntityType>('journey', 'milestone', 'objective');

const entityIdArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

const journeySlugArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$|^[a-z0-9]$/)
  .filter(s => s.length >= 1 && s.length <= 50);

const adminIdArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

// Generator for CreateVisibilitySetting
const createVisibilitySettingArb = fc.record({
  entityType: entityTypeArb,
  entityId: entityIdArb,
  isPublic: fc.boolean(),
  parentJourneySlug: fc.option(journeySlugArb, { nil: undefined }),
  parentMilestoneId: fc.option(entityIdArb, { nil: undefined }),
  updatedBy: adminIdArb,
});

// Valid date generator that ensures no NaN dates
const validDateArb = fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
  .map(timestamp => new Date(timestamp));

// Generator for full VisibilitySetting (with generated fields)
const visibilitySettingArb = fc.record({
  _id: fc.uuid(),
  entityType: entityTypeArb,
  entityId: entityIdArb,
  isPublic: fc.boolean(),
  parentJourneySlug: fc.option(journeySlugArb, { nil: undefined }),
  parentMilestoneId: fc.option(entityIdArb, { nil: undefined }),
  updatedBy: adminIdArb,
  updatedAt: validDateArb,
  createdAt: validDateArb,
});

describe('Visibility Schema Property Tests', () => {
  /**
   * **Feature: journey-public-visibility, Property 1: Visibility Setting Round-Trip**
   * 
   * For any valid visibility setting, serializing (parsing) and then accessing
   * its properties should return the same values.
   * 
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2**
   */
  describe('Property 1: Visibility Setting Round-Trip', () => {
    it('should preserve all fields when parsing a valid VisibilitySetting', () => {
      fc.assert(
        fc.property(visibilitySettingArb, (setting) => {
          // Parse the setting through the schema
          const parsed = VisibilitySettingSchema.parse(setting);
          
          // Verify all fields are preserved
          expect(parsed._id).toBe(setting._id);
          expect(parsed.entityType).toBe(setting.entityType);
          expect(parsed.entityId).toBe(setting.entityId);
          expect(parsed.isPublic).toBe(setting.isPublic);
          expect(parsed.parentJourneySlug).toBe(setting.parentJourneySlug);
          expect(parsed.parentMilestoneId).toBe(setting.parentMilestoneId);
          expect(parsed.updatedBy).toBe(setting.updatedBy);
          expect(parsed.updatedAt.getTime()).toBe(setting.updatedAt.getTime());
          expect(parsed.createdAt.getTime()).toBe(setting.createdAt.getTime());
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve all fields when parsing a valid CreateVisibilitySetting', () => {
      fc.assert(
        fc.property(createVisibilitySettingArb, (setting) => {
          // Parse the setting through the schema
          const parsed = CreateVisibilitySettingSchema.parse(setting);
          
          // Verify all fields are preserved
          expect(parsed.entityType).toBe(setting.entityType);
          expect(parsed.entityId).toBe(setting.entityId);
          expect(parsed.isPublic).toBe(setting.isPublic);
          expect(parsed.parentJourneySlug).toBe(setting.parentJourneySlug);
          expect(parsed.parentMilestoneId).toBe(setting.parentMilestoneId);
          expect(parsed.updatedBy).toBe(setting.updatedBy);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly validate entity types', () => {
      fc.assert(
        fc.property(entityTypeArb, (entityType) => {
          const result = EntityTypeSchema.safeParse(entityType);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(entityType);
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid entity types', () => {
      // Note: valid types are exactly: 'journey' | 'milestone' | 'objective'
      const invalidTypes = ['invalid', 'Journey', 'Milestone', '', 'node', 'topic', 'milestones', 'objectives'];
      for (const invalidType of invalidTypes) {
        const result = EntityTypeSchema.safeParse(invalidType);
        expect(result.success).toBe(false);
      }
    });

    it('should handle boolean visibility values correctly', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          createVisibilitySettingArb,
          (isPublic, baseSetting) => {
            const setting = { ...baseSetting, isPublic };
            const parsed = CreateVisibilitySettingSchema.parse(setting);
            expect(parsed.isPublic).toBe(isPublic);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve parent references for hierarchical entities', () => {
      fc.assert(
        fc.property(
          journeySlugArb,
          entityIdArb,
          createVisibilitySettingArb,
          (parentSlug, parentMilestoneId, baseSetting) => {
            // Test milestone with parent journey
            const milestoneSetting: CreateVisibilitySetting = {
              ...baseSetting,
              entityType: 'milestone',
              parentJourneySlug: parentSlug,
              parentMilestoneId: undefined,
            };
            const parsedMilestone = CreateVisibilitySettingSchema.parse(milestoneSetting);
            expect(parsedMilestone.parentJourneySlug).toBe(parentSlug);
            
            // Test objective with parent milestone
            const objectiveSetting: CreateVisibilitySetting = {
              ...baseSetting,
              entityType: 'objective',
              parentJourneySlug: parentSlug,
              parentMilestoneId: parentMilestoneId,
            };
            const parsedObjective = CreateVisibilitySettingSchema.parse(objectiveSetting);
            expect(parsedObjective.parentJourneySlug).toBe(parentSlug);
            expect(parsedObjective.parentMilestoneId).toBe(parentMilestoneId);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
