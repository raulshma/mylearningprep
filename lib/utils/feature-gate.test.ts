/**
 * Tests for Feature Gate Utility
 * **Feature: plan-features, Property 6: BYOK access control**
 * **Validates: Requirements 3.1, 3.2, 3.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  canAccess,
  getAvailableFeatures,
  getAnalogyStyles,
  getModelTierForPlan,
  canUseAnalogyStyle,
  FEATURE_ACCESS_MAP,
  ANALOGY_ACCESS_MAP,
  PLAN_MODEL_TIER_MAP,
} from './feature-gate';
import type { PlanFeature, AnalogyStyle } from './feature-gate';
import type { UserPlan } from '@/lib/db/schemas/user';

// Generators for property-based testing
const userPlanArb = fc.constantFrom<UserPlan>('FREE', 'PRO', 'MAX');
const planFeatureArb = fc.constantFrom<PlanFeature>(
  'analogy_all_styles',
  'pdf_export',
  'byok',
  'custom_prompts',
  'advanced_ai'
);

describe('Feature Gate Utility', () => {
  describe('canAccess', () => {
    it('should allow MAX plan users to access BYOK', () => {
      const result = canAccess('byok', 'MAX');
      expect(result.allowed).toBe(true);
    });

    it('should deny FREE plan users from accessing BYOK', () => {
      const result = canAccess('byok', 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.requiredPlan).toBe('MAX');
    });

    it('should deny PRO plan users from accessing BYOK', () => {
      const result = canAccess('byok', 'PRO');
      expect(result.allowed).toBe(false);
      expect(result.requiredPlan).toBe('MAX');
    });

    it('should allow MAX plan users to access custom_prompts', () => {
      const result = canAccess('custom_prompts', 'MAX');
      expect(result.allowed).toBe(true);
    });

    it('should deny FREE plan users from accessing custom_prompts', () => {
      const result = canAccess('custom_prompts', 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.requiredPlan).toBe('MAX');
    });

    it('should allow PRO plan users to access pdf_export', () => {
      const result = canAccess('pdf_export', 'PRO');
      expect(result.allowed).toBe(true);
    });

    it('should deny FREE plan users from accessing pdf_export', () => {
      const result = canAccess('pdf_export', 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.requiredPlan).toBe('PRO');
    });

    it('should allow FREE plan users to access basic features', () => {
      // FREE users should not have access to any premium features
      const premiumFeatures: PlanFeature[] = [
        'analogy_all_styles',
        'pdf_export',
        'byok',
        'custom_prompts',
        'advanced_ai',
      ];

      premiumFeatures.forEach((feature) => {
        const result = canAccess(feature, 'FREE');
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('getAvailableFeatures', () => {
    it('should return only ai_chat for FREE plan', () => {
      const features = getAvailableFeatures('FREE');
      expect(features).toEqual(['ai_chat']);
    });

    it('should return PRO features for PRO plan', () => {
      const features = getAvailableFeatures('PRO');
      expect(features).toContain('analogy_all_styles');
      expect(features).toContain('pdf_export');
      expect(features).toContain('advanced_ai');
      expect(features).not.toContain('byok');
      expect(features).not.toContain('custom_prompts');
    });

    it('should return all features for MAX plan', () => {
      const features = getAvailableFeatures('MAX');
      expect(features).toContain('analogy_all_styles');
      expect(features).toContain('pdf_export');
      expect(features).toContain('byok');
      expect(features).toContain('custom_prompts');
      expect(features).toContain('advanced_ai');
    });
  });

  describe('getAnalogyStyles', () => {
    it('should return only professional for FREE plan', () => {
      const styles = getAnalogyStyles('FREE');
      expect(styles).toEqual(['professional']);
    });

    it('should return all styles for PRO plan', () => {
      const styles = getAnalogyStyles('PRO');
      expect(styles).toContain('professional');
      expect(styles).toContain('construction');
      expect(styles).toContain('simple');
    });

    it('should return all styles for MAX plan', () => {
      const styles = getAnalogyStyles('MAX');
      expect(styles).toContain('professional');
      expect(styles).toContain('construction');
      expect(styles).toContain('simple');
    });
  });

  describe('getModelTierForPlan', () => {
    it('should return standard tier for FREE plan', () => {
      const tier = getModelTierForPlan('FREE');
      expect(tier).toBe('standard');
    });

    it('should return advanced tier for PRO plan', () => {
      const tier = getModelTierForPlan('PRO');
      expect(tier).toBe('advanced');
    });

    it('should return advanced tier for MAX plan', () => {
      const tier = getModelTierForPlan('MAX');
      expect(tier).toBe('advanced');
    });
  });

  describe('canUseAnalogyStyle', () => {
    it('should allow professional style for FREE plan', () => {
      expect(canUseAnalogyStyle('professional', 'FREE')).toBe(true);
    });

    it('should deny construction style for FREE plan', () => {
      expect(canUseAnalogyStyle('construction', 'FREE')).toBe(false);
    });

    it('should deny simple style for FREE plan', () => {
      expect(canUseAnalogyStyle('simple', 'FREE')).toBe(false);
    });

    it('should allow all styles for PRO plan', () => {
      expect(canUseAnalogyStyle('professional', 'PRO')).toBe(true);
      expect(canUseAnalogyStyle('construction', 'PRO')).toBe(true);
      expect(canUseAnalogyStyle('simple', 'PRO')).toBe(true);
    });

    it('should allow all styles for MAX plan', () => {
      expect(canUseAnalogyStyle('professional', 'MAX')).toBe(true);
      expect(canUseAnalogyStyle('construction', 'MAX')).toBe(true);
      expect(canUseAnalogyStyle('simple', 'MAX')).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 6: BYOK access control', () => {
      it('should only allow MAX plan users to access BYOK', () => {
        fc.assert(
          fc.property(userPlanArb, (plan) => {
            const result = canAccess('byok', plan);
            return result.allowed === (plan === 'MAX');
          }),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 12: Feature gate consistency', () => {
      it('should return consistent results for the same plan and feature', () => {
        fc.assert(
          fc.property(userPlanArb, planFeatureArb, (plan, feature) => {
            const result1 = canAccess(feature, plan);
            const result2 = canAccess(feature, plan);
            return result1.allowed === result2.allowed;
          }),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 15: Feature availability by plan', () => {
      it('should return features that match the FEATURE_ACCESS_MAP', () => {
        fc.assert(
          fc.property(userPlanArb, (plan) => {
            const features = getAvailableFeatures(plan);
            // All returned features should be accessible for this plan
            return features.every((feature) => canAccess(feature, plan).allowed);
          }),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 2: Analogy style availability', () => {
      it('should return styles that match the ANALOGY_ACCESS_MAP', () => {
        fc.assert(
          fc.property(userPlanArb, (plan) => {
            const styles = getAnalogyStyles(plan);
            // All returned styles should be usable for this plan
            return styles.every((style) => canUseAnalogyStyle(style, plan));
          }),
          { numRuns: 100 }
        );
      });
    });
  });

  describe('FEATURE_ACCESS_MAP', () => {
    it('should have BYOK restricted to MAX plan only', () => {
      expect(FEATURE_ACCESS_MAP.byok).toEqual(['MAX']);
    });

    it('should have custom_prompts restricted to MAX plan only', () => {
      expect(FEATURE_ACCESS_MAP.custom_prompts).toEqual(['MAX']);
    });

    it('should have pdf_export available for PRO and MAX', () => {
      expect(FEATURE_ACCESS_MAP.pdf_export).toContain('PRO');
      expect(FEATURE_ACCESS_MAP.pdf_export).toContain('MAX');
      expect(FEATURE_ACCESS_MAP.pdf_export).not.toContain('FREE');
    });

    it('should have analogy_all_styles available for PRO and MAX', () => {
      expect(FEATURE_ACCESS_MAP.analogy_all_styles).toContain('PRO');
      expect(FEATURE_ACCESS_MAP.analogy_all_styles).toContain('MAX');
      expect(FEATURE_ACCESS_MAP.analogy_all_styles).not.toContain('FREE');
    });

    it('should have advanced_ai available for PRO and MAX', () => {
      expect(FEATURE_ACCESS_MAP.advanced_ai).toContain('PRO');
      expect(FEATURE_ACCESS_MAP.advanced_ai).toContain('MAX');
      expect(FEATURE_ACCESS_MAP.advanced_ai).not.toContain('FREE');
    });
  });

  describe('ANALOGY_ACCESS_MAP', () => {
    it('should restrict FREE plan to professional only', () => {
      expect(ANALOGY_ACCESS_MAP.FREE).toEqual(['professional']);
    });

    it('should allow PRO plan all styles', () => {
      expect(ANALOGY_ACCESS_MAP.PRO).toContain('professional');
      expect(ANALOGY_ACCESS_MAP.PRO).toContain('construction');
      expect(ANALOGY_ACCESS_MAP.PRO).toContain('simple');
    });

    it('should allow MAX plan all styles', () => {
      expect(ANALOGY_ACCESS_MAP.MAX).toContain('professional');
      expect(ANALOGY_ACCESS_MAP.MAX).toContain('construction');
      expect(ANALOGY_ACCESS_MAP.MAX).toContain('simple');
    });
  });

  describe('PLAN_MODEL_TIER_MAP', () => {
    it('should map FREE to standard tier', () => {
      expect(PLAN_MODEL_TIER_MAP.FREE).toBe('standard');
    });

    it('should map PRO to advanced tier', () => {
      expect(PLAN_MODEL_TIER_MAP.PRO).toBe('advanced');
    });

    it('should map MAX to advanced tier', () => {
      expect(PLAN_MODEL_TIER_MAP.MAX).toBe('advanced');
    });
  });
});
