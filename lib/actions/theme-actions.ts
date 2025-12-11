"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { getAuthUserId, getByokApiKey, getByokTierConfig } from "@/lib/auth/get-user";
import { aiLogRepository } from "@/lib/db/repositories/ai-log-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { getTierConfigFromDB } from "@/lib/db/tier-config";
import { createProviderWithFallback, type AIProviderType } from "@/lib/ai";
import { extractTokenUsage } from "@/lib/services/ai-logger";

// ============================================================================
// Types
// ============================================================================

const ThemeColorsSchema = z.object({
  background: z.string().describe("Background color in hex format (e.g., #ffffff)"),
  foreground: z.string().describe("Foreground/text color in hex format"),
  card: z.string().describe("Card background color"),
  cardForeground: z.string().describe("Card text color"),
  popover: z.string().describe("Popover background color"),
  popoverForeground: z.string().describe("Popover text color"),
  primary: z.string().describe("Primary brand color"),
  primaryForeground: z.string().describe("Text color on primary background"),
  secondary: z.string().describe("Secondary background color"),
  secondaryForeground: z.string().describe("Text color on secondary background"),
  muted: z.string().describe("Muted/subdued background color"),
  mutedForeground: z.string().describe("Muted text color"),
  accent: z.string().describe("Accent color for highlights"),
  accentForeground: z.string().describe("Text color on accent background"),
  destructive: z.string().describe("Destructive/error color (usually red)"),
  destructiveForeground: z.string().describe("Text color on destructive background"),
  border: z.string().describe("Border color"),
  input: z.string().describe("Input field border color"),
  ring: z.string().describe("Focus ring color"),
  chart1: z.string().describe("Chart color 1"),
  chart2: z.string().describe("Chart color 2"),
  chart3: z.string().describe("Chart color 3"),
  chart4: z.string().describe("Chart color 4"),
  chart5: z.string().describe("Chart color 5"),
  sidebar: z.string().describe("Sidebar background color"),
  sidebarForeground: z.string().describe("Sidebar text color"),
  sidebarPrimary: z.string().describe("Sidebar primary accent"),
  sidebarPrimaryForeground: z.string().describe("Sidebar primary text"),
  sidebarAccent: z.string().describe("Sidebar accent color"),
  sidebarAccentForeground: z.string().describe("Sidebar accent text"),
  sidebarBorder: z.string().describe("Sidebar border color"),
  sidebarRing: z.string().describe("Sidebar focus ring color"),
});

const ShadowConfigSchema = z.object({
  x: z.string().describe("Shadow X offset (e.g., 0px)"),
  y: z.string().describe("Shadow Y offset (e.g., 1px)"),
  blur: z.string().describe("Shadow blur radius (e.g., 2px)"),
  spread: z.string().describe("Shadow spread radius (e.g., 0px)"),
  opacity: z.string().describe("Shadow opacity (e.g., 0.05)"),
  color: z.string().describe("Shadow color in hex format"),
});

const AIThemeConfigSchema = z.object({
  name: z.string().describe("A short, creative name for the theme (2-3 words)"),
  light: ThemeColorsSchema.describe("Light mode color palette"),
  dark: ThemeColorsSchema.describe("Dark mode color palette"),
  radius: z.number().min(0).max(2).describe("Border radius in rem (0 = sharp, 0.5 = balanced, 1+ = rounded)"),
  shadow: ShadowConfigSchema.describe("Shadow configuration"),
});

export type AIThemeConfig = z.infer<typeof AIThemeConfigSchema>;

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get effective tier config for theme generation, considering BYOK overrides
 * Uses "low" tier for cost efficiency
 */
async function getEffectiveThemeTierConfig(byokApiKey: string | null) {
  const byokTierConfig = await getByokTierConfig();
  const tier = "low" as const;

  // Check if BYOK user has configured this tier
  if (byokApiKey && byokTierConfig?.[tier]?.model) {
    const byok = byokTierConfig[tier]!;
    return {
      provider: (byok.provider || "openrouter") as AIProviderType,
      primaryModel: byok.model,
      fallbackModel: byok.fallback || null,
      temperature: byok.temperature ?? 0.8,
      maxTokens: byok.maxTokens ?? 4096,
      isByok: true,
    };
  }

  // Fall back to system tier config
  const config = await getTierConfigFromDB(tier);
  return {
    provider: (config.provider || "openrouter") as AIProviderType,
    primaryModel: config.primaryModel,
    fallbackModel: config.fallbackModel,
    temperature: config.temperature ?? 0.8,
    maxTokens: config.maxTokens ?? 4096,
    isByok: false,
  };
}

async function getMongoUserId(): Promise<{ clerkId: string; mongoId: string }> {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);
  if (!user) {
    throw new Error("User not found");
  }
  return { clerkId, mongoId: user._id };
}

// ============================================================================
// Theme Generation
// ============================================================================

const THEME_SYSTEM_PROMPT = `You are an expert UI/UX designer specializing in color theory and theme design for web applications. Generate a complete theme configuration based on the user's description.

IMPORTANT GUIDELINES:
1. All colors must be in hex format (e.g., #ffffff, #0a0a0a)
2. Ensure sufficient contrast between background and foreground colors (WCAG AA minimum - 4.5:1 for text)
3. Light mode should have light backgrounds with dark text
4. Dark mode should have dark backgrounds with light text
5. Primary color should be vibrant and stand out
6. Destructive color should typically be a red variant
7. Chart colors should be visually distinct from each other
8. Sidebar colors should complement the main theme
9. Shadow color should typically match or complement the primary color

For the shadow configuration:
- x and y should be in pixels (e.g., "0px", "1px")
- blur and spread should be in pixels
- opacity should be a decimal between 0 and 1 (e.g., "0.05")
- color should be in hex format

Create a cohesive, professional theme that matches the user's description.`;

/**
 * Generate a theme configuration using AI based on user prompt
 * Uses low-tier model for cost efficiency
 * Supports BYOK configuration if user has it set up
 * Increments iteration count by 0.1
 */
export async function generateThemeWithAI(
  prompt: string
): Promise<ActionResult<AIThemeConfig>> {
  const startTime = Date.now();

  try {
    // Validate prompt
    if (!prompt || prompt.trim().length < 3) {
      return { success: false, error: "Please provide a theme description" };
    }

    const { clerkId, mongoId } = await getMongoUserId();

    // Check for BYOK API key
    const byokApiKey = await getByokApiKey();
    
    // Get effective tier config (BYOK or system)
    const tierConfig = await getEffectiveThemeTierConfig(byokApiKey);
    const modelId = tierConfig.primaryModel ?? "meta-llama/llama-3.1-8b-instruct";
    
    // Create provider with BYOK key if available
    const provider = createProviderWithFallback(tierConfig.provider, byokApiKey ?? undefined);

    // Generate theme with AI using structured output
    const result = await generateObject({
      model: provider.getModel(modelId),
      schema: AIThemeConfigSchema,
      system: THEME_SYSTEM_PROMPT,
      prompt: `Generate a complete theme configuration for: "${prompt.slice(0, 500)}"`,
      temperature: tierConfig.temperature,
    });

    const themeConfig = result.object;

    // Extract token usage
    const tokenUsage = extractTokenUsage(result.usage as Record<string, unknown>);

    // Log the AI request
    await aiLogRepository.create({
      action: "GENERATE_THEME",
      userId: mongoId,
      interviewId: `theme-${Date.now()}`, // Use timestamp as pseudo-id
      model: modelId,
      provider: tierConfig.provider,
      status: "success",
      prompt: `Generate theme: "${prompt.slice(0, 500)}"`,
      response: JSON.stringify(themeConfig),
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      tokenUsage,
      latencyMs: Date.now() - startTime,
      timestamp: new Date(),
      metadata: {
        streaming: false,
        byokUsed: tierConfig.isByok,
      },
    });

    // Increment iteration count by 0.1 for this lightweight operation
    // (only if not using BYOK, as BYOK users have their own API usage)
    if (!tierConfig.isByok) {
      await userRepository.incrementIteration(clerkId, 0.1);
    }

    return { success: true, data: themeConfig };
  } catch (error) {
    console.error("Failed to generate theme:", error);

    // Log error
    try {
      const { mongoId } = await getMongoUserId();
      const byokApiKey = await getByokApiKey();
      const tierConfig = await getEffectiveThemeTierConfig(byokApiKey);
      
      await aiLogRepository.create({
        action: "GENERATE_THEME",
        userId: mongoId,
        interviewId: `theme-${Date.now()}`,
        model: tierConfig.primaryModel ?? "unknown",
        provider: tierConfig.provider,
        status: "error",
        prompt: `Generate theme: "${prompt.slice(0, 500)}"`,
        response: "",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        toolsUsed: [],
        searchQueries: [],
        searchResults: [],
        tokenUsage: { input: 0, output: 0 },
        latencyMs: Date.now() - startTime,
        timestamp: new Date(),
        metadata: {
          streaming: false,
          byokUsed: tierConfig.isByok,
        },
      });
    } catch {
      // Ignore logging errors
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate theme",
    };
  }
}
