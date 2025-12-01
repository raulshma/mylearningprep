import { getSettingsCollection } from "@/lib/db/collections";
import {
  SETTINGS_KEYS,
  DEFAULT_TIER_CONFIG,
  type ModelTier,
  type TierModelConfig,
} from "@/lib/db/schemas/settings";

/**
 * Get the settings key for a tier
 */
export function getTierKey(tier: ModelTier): string {
  const keys: Record<ModelTier, string> = {
    high: SETTINGS_KEYS.MODEL_TIER_HIGH,
    medium: SETTINGS_KEYS.MODEL_TIER_MEDIUM,
    low: SETTINGS_KEYS.MODEL_TIER_LOW,
  };
  return keys[tier];
}

/**
 * Parse a tier config document value into a TierModelConfig
 */
export function parseTierConfig(value: unknown): TierModelConfig {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_TIER_CONFIG };
  }

  const v = value as Partial<TierModelConfig>;
  return {
    primaryModel: v.primaryModel ?? null,
    fallbackModel: v.fallbackModel ?? null,
    temperature: v.temperature ?? 0.7,
    maxTokens: v.maxTokens ?? 4096,
    fallbackMaxTokens: v.fallbackMaxTokens ?? 4096,
    toolsEnabled: v.toolsEnabled ?? true,
  };
}

/**
 * Get a single tier's configuration from database
 * This is the canonical implementation - all services should use this
 */
export async function getTierConfigFromDB(
  tier: ModelTier
): Promise<TierModelConfig> {
  const collection = await getSettingsCollection();
  const doc = await collection.findOne({ key: getTierKey(tier) });

  return parseTierConfig(doc?.value);
}
