import { UserPlan } from '@/lib/db/schemas/user';

/**
 * Analogy styles available for topic regeneration
 */
export type AnalogyStyle = 'professional' | 'construction' | 'simple';

/**
 * Plan-gated features
 */
export type PlanFeature =
  | 'analogy_all_styles'
  | 'pdf_export'
  | 'byok'
  | 'custom_prompts'
  | 'advanced_ai'
  | 'custom_theme'
  | 'custom_theme_builder'
  | 'analytics'
  | 'web_search_crawl'
  | 'ai_tools'
  | 'ai_chat'
  | 'pixel_pet';

/**
 * Result of a feature access check
 */
export interface FeatureAccess {
  allowed: boolean;
  requiredPlan?: UserPlan;
  upgradeMessage?: string;
}

/**
 * Maps features to the plans that have access
 */
export const FEATURE_ACCESS_MAP: Record<PlanFeature, UserPlan[]> = {
  analogy_all_styles: ['PRO', 'MAX'],
  pdf_export: ['PRO', 'MAX'],
  byok: ['MAX'],
  custom_prompts: ['MAX'],
  advanced_ai: ['PRO', 'MAX'],
  custom_theme: ['PRO', 'MAX'],
  custom_theme_builder: ['MAX'], // Visual theme builder only for MAX
  analytics: ['PRO', 'MAX'],
  web_search_crawl: ['PRO', 'MAX'],
  ai_tools: ['PRO', 'MAX'],
  ai_chat: ['FREE', 'PRO', 'MAX'], // All plans have AI chat, but with different limits
  pixel_pet: ['PRO', 'MAX'],
};

/**
 * Maps plans to available analogy styles
 */
export const ANALOGY_ACCESS_MAP: Record<UserPlan, AnalogyStyle[]> = {
  FREE: ['professional'],
  PRO: ['professional', 'construction', 'simple'],
  MAX: ['professional', 'construction', 'simple'],
};

/**
 * Maps plans to AI model tiers
 */
export const PLAN_MODEL_TIER_MAP: Record<UserPlan, 'standard' | 'advanced'> = {
  FREE: 'standard',
  PRO: 'advanced',
  MAX: 'advanced',
};

/**
 * Check if a user with a given plan can access a feature
 *
 * @param feature - The feature to check access for
 * @param userPlan - The user's subscription plan
 * @returns FeatureAccess object with allowed status and upgrade info if needed
 *
 * @example
 * ```typescript
 * const access = canAccess('pdf_export', userPlan);
 * if (!access.allowed) {
 *   return { error: 'PLAN_REQUIRED', requiredPlan: access.requiredPlan };
 * }
 * ```
 */
export function canAccess(feature: PlanFeature, userPlan: UserPlan): FeatureAccess {
  const allowedPlans = FEATURE_ACCESS_MAP[feature];
  const allowed = allowedPlans.includes(userPlan);

  if (allowed) {
    return { allowed: true };
  }

  // Find the minimum plan required for this feature
  const requiredPlan = allowedPlans[0];

  return {
    allowed: false,
    requiredPlan,
    upgradeMessage: `This feature requires a ${requiredPlan} plan or higher. Please upgrade to access it.`,
  };
}

/**
 * Get all available features for a given plan
 *
 * @param userPlan - The user's subscription plan
 * @returns Array of features available to the user
 *
 * @example
 * ```typescript
 * const features = getAvailableFeatures('PRO');
 * // ['analogy_all_styles', 'pdf_export', 'advanced_ai']
 * ```
 */
export function getAvailableFeatures(userPlan: UserPlan): PlanFeature[] {
  return Object.entries(FEATURE_ACCESS_MAP)
    .filter(([, plans]) => plans.includes(userPlan))
    .map(([feature]) => feature as PlanFeature);
}

/**
 * Get available analogy styles for a given plan
 *
 * @param userPlan - The user's subscription plan
 * @returns Array of analogy styles available to the user
 *
 * @example
 * ```typescript
 * const styles = getAnalogyStyles('FREE');
 * // ['professional']
 * ```
 */
export function getAnalogyStyles(userPlan: UserPlan): AnalogyStyle[] {
  return ANALOGY_ACCESS_MAP[userPlan];
}

/**
 * Get the AI model tier for a given plan
 *
 * @param userPlan - The user's subscription plan
 * @returns The model tier ('standard' or 'advanced')
 *
 * @example
 * ```typescript
 * const tier = getModelTierForPlan('PRO');
 * // 'advanced'
 * ```
 */
export function getModelTierForPlan(userPlan: UserPlan): 'standard' | 'advanced' {
  return PLAN_MODEL_TIER_MAP[userPlan];
}

/**
 * Require a feature to be accessible, throwing an error if not
 *
 * @param feature - The feature to require
 * @param userPlan - The user's subscription plan
 * @throws Error if the feature is not accessible
 *
 * @example
 * ```typescript
 * try {
 *   requireFeature('pdf_export', userPlan);
 * } catch (error) {
 *   return { error: error.message };
 * }
 * ```
 */
export function requireFeature(feature: PlanFeature, userPlan: UserPlan): void {
  const access = canAccess(feature, userPlan);
  if (!access.allowed) {
    throw new Error(
      access.upgradeMessage ||
        `Feature "${feature}" requires a ${access.requiredPlan} plan or higher.`
    );
  }
}

/**
 * Check if a specific analogy style is available for a user's plan
 *
 * @param style - The analogy style to check
 * @param userPlan - The user's subscription plan
 * @returns true if the style is available, false otherwise
 *
 * @example
 * ```typescript
 * if (!canUseAnalogyStyle('construction', userPlan)) {
 *   return { error: 'STYLE_NOT_AVAILABLE' };
 * }
 * ```
 */
export function canUseAnalogyStyle(style: AnalogyStyle, userPlan: UserPlan): boolean {
  return getAnalogyStyles(userPlan).includes(style);
}
