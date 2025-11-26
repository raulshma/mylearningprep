/**
 * AI Engine Core
 * Configures OpenRouter provider with tiered model selection
 * Requirements: 4.1, 4.2, 4.5
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamObject, generateObject, tool } from "ai";
import { z } from "zod";
import {
  MCQSchema,
  RevisionTopicSchema,
  RapidFireSchema,
  OpeningBriefSchema,
  type MCQ,
  type RevisionTopic,
  type RapidFire,
  type OpeningBrief,
} from "@/lib/db/schemas/interview";
import { searchService, isSearchEnabled } from "./search-service";
import { getSettingsCollection } from "@/lib/db/collections";
import {
  SETTINGS_KEYS,
  TASK_TIER_MAPPING,
  type ModelTier,
  type AITask,
  type TierModelConfig,
} from "@/lib/db/schemas/settings";

// AI Engine Configuration
export interface AIEngineConfig {
  model: string;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  searchEnabled: boolean;
}

// Generation Context
export interface GenerationContext {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  company: string;
  existingContent?: string[];
  customInstructions?: string;
}

// Error for unconfigured tiers
export class TierNotConfiguredError extends Error {
  constructor(public tier: ModelTier, public task: string) {
    super(
      `Model tier "${tier}" is not configured. Please configure it in admin settings before using ${task}.`
    );
    this.name = "TierNotConfiguredError";
  }
}

/**
 * Get tier setting key
 */
function getTierKey(tier: ModelTier): string {
  return {
    high: SETTINGS_KEYS.MODEL_TIER_HIGH,
    medium: SETTINGS_KEYS.MODEL_TIER_MEDIUM,
    low: SETTINGS_KEYS.MODEL_TIER_LOW,
  }[tier];
}

/**
 * Get a single tier's configuration from database (single document per tier)
 */
async function getTierConfigFromDB(tier: ModelTier): Promise<TierModelConfig> {
  const collection = await getSettingsCollection();
  const doc = await collection.findOne({ key: getTierKey(tier) });

  if (!doc?.value) {
    return {
      primaryModel: null,
      fallbackModel: null,
      temperature: 0.7,
      maxTokens: 4096,
    };
  }

  const value = doc.value as Partial<TierModelConfig>;
  return {
    primaryModel: value.primaryModel ?? null,
    fallbackModel: value.fallbackModel ?? null,
    temperature: value.temperature ?? 0.7,
    maxTokens: value.maxTokens ?? 4096,
  };
}

/**
 * Get the configuration for a specific AI task
 * Throws TierNotConfiguredError if the tier's primary model is not set
 */
async function getConfigForTask(task: AITask): Promise<{
  model: string;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
  tier: ModelTier;
}> {
  const tier = TASK_TIER_MAPPING[task] || "high";
  const config = await getTierConfigFromDB(tier);

  if (!config.primaryModel) {
    throw new TierNotConfiguredError(tier, task);
  }

  return {
    model: config.primaryModel,
    fallbackModel: config.fallbackModel,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    tier,
  };
}

/**
 * Check if all required tiers are configured
 */
export async function checkTiersConfigured(): Promise<{
  configured: boolean;
  missingTiers: ModelTier[];
}> {
  const [high, medium, low] = await Promise.all([
    getTierConfigFromDB("high"),
    getTierConfigFromDB("medium"),
    getTierConfigFromDB("low"),
  ]);

  const missingTiers: ModelTier[] = [];
  if (!high.primaryModel) missingTiers.push("high");
  if (!medium.primaryModel) missingTiers.push("medium");
  if (!low.primaryModel) missingTiers.push("low");

  return {
    configured: missingTiers.length === 0,
    missingTiers,
  };
}

/**
 * Get OpenRouter client
 */
function getOpenRouterClient(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OpenRouter API key is required");
  }
  return createOpenRouter({ apiKey: key });
}

/**
 * Search Web Tool Definition Schema
 */
const searchWebToolSchema = z.object({
  query: z.string().describe("The search query to find relevant information"),
});

/**
 * Create search web tool
 */
function createSearchWebTool() {
  return {
    searchWeb: tool({
      description:
        "Search the web for current information about technologies, frameworks, or interview topics.",
      inputSchema: searchWebToolSchema,
      execute: async (params: { query: string }) => {
        const response = await searchService.query(params.query, 5);
        return response.results;
      },
    }),
  };
}

/**
 * Get tools based on configuration
 */
function getTools(searchEnabled: boolean) {
  if (searchEnabled && isSearchEnabled()) {
    return createSearchWebTool();
  }
  return undefined;
}

// Schema for streaming topics array
const TopicsArraySchema = z.object({
  topics: z.array(RevisionTopicSchema),
});

// Schema for parsed interview details from prompt
const ParsedInterviewDetailsSchema = z.object({
  jobTitle: z.string().describe("The job title extracted from the prompt"),
  company: z
    .string()
    .describe(
      'The company name extracted from the prompt, or "Unknown" if not specified'
    ),
  jobDescription: z
    .string()
    .describe(
      "A comprehensive job description generated based on the prompt context"
    ),
  resumeContext: z
    .string()
    .optional()
    .describe("Any resume or experience context mentioned in the prompt"),
});

// Schema for streaming MCQs array
const MCQsArraySchema = z.object({
  mcqs: z.array(MCQSchema),
});

// Schema for streaming rapid fire array
const RapidFireArraySchema = z.object({
  questions: z.array(RapidFireSchema),
});

/**
 * Generate system prompt for interview preparation
 */
function getSystemPrompt(): string {
  return `You are an expert interview preparation assistant. Your role is to help candidates prepare for technical interviews by generating relevant, high-quality content based on their resume and the job description.

Guidelines:
- Be specific and relevant to the job requirements
- Use the candidate's experience to personalize content
- Focus on practical, actionable preparation material
- When generating MCQs, ensure all options are plausible
- For revision topics, explain concepts clearly and concisely
- Use web search when you need current information about technologies or frameworks`;
}

/**
 * BYOK (Bring Your Own Key) tier configuration for users
 */
export interface BYOKTierConfig {
  high?: {
    model: string;
    fallback?: string;
    temperature?: number;
    maxTokens?: number;
  };
  medium?: {
    model: string;
    fallback?: string;
    temperature?: number;
    maxTokens?: number;
  };
  low?: {
    model: string;
    fallback?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Get effective config for a task, considering BYOK overrides
 */
async function getEffectiveConfig(
  task: AITask,
  byokConfig?: BYOKTierConfig
): Promise<{
  model: string;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
  tier: ModelTier;
}> {
  const tier = TASK_TIER_MAPPING[task] || "high";

  // Check if BYOK user has configured this tier
  if (byokConfig?.[tier]?.model) {
    const byok = byokConfig[tier]!;
    return {
      model: byok.model,
      fallbackModel: byok.fallback || null,
      temperature: byok.temperature ?? 0.7,
      maxTokens: byok.maxTokens ?? 4096,
      tier,
    };
  }

  // Fall back to system tier config
  return getConfigForTask(task);
}

/**
 * Format model ID for logging: "tier - model"
 */
export function formatModelId(tier: ModelTier, model: string): string {
  return `${tier} - ${model}`;
}

/**
 * Generate Opening Brief with streaming
 * Uses HIGH tier model - complex reasoning and comprehensive analysis
 */
export async function generateOpeningBrief(
  ctx: GenerationContext,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "generate_opening_brief",
    byokTierConfig
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const prompt = `Generate an opening brief for an interview preparation plan.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}

Generate a comprehensive opening brief that includes:
1. A summary of how well the candidate's experience matches the job requirements
2. Key skills to highlight during the interview
3. Estimated preparation time needed
4. An experience match percentage (0-100)

Format your response as a structured brief with clear sections.${
    ctx.customInstructions
      ? `\n\nAdditional Instructions from user:\n${ctx.customInstructions}`
      : ""
  }`;

  const stream = streamObject({
    model: openrouter(modelToUse),
    schema: OpeningBriefSchema,
    system: getSystemPrompt(),
    prompt,
    temperature: config.temperature ?? tierConfig.temperature,
  });

  return Object.assign(stream, {
    modelId: formatModelId(tierConfig.tier, modelToUse),
  });
}

/**
 * Generate Revision Topics with streaming
 * Uses HIGH tier model - requires deep technical knowledge and explanation
 */
export async function generateTopics(
  ctx: GenerationContext,
  count: number = 5,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "generate_topics",
    byokTierConfig
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const existingTopicsNote = ctx.existingContent?.length
    ? `\n\nExisting topics to avoid duplicating:\n${ctx.existingContent.join(
        "\n"
      )}`
    : "";

  const prompt = `Generate ${count} revision topics for interview preparation.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}
${existingTopicsNote}

For each topic, provide:
1. A unique ID (use format: topic_<random_string>)
2. A clear title
3. Content structured as follows (use markdown formatting):
   - **Quick Overview**: A 2-3 sentence summary of what this topic is about
   - **Detailed Explanation**: In-depth explanation covering key concepts, how it works, and why it matters
   - **Code Example** (if applicable): Practical code snippet demonstrating the concept with comments
4. The reason why this topic is important for this interview
5. A confidence level (low, medium, high) indicating how likely this topic will come up

Focus on topics that bridge the gap between the candidate's experience and job requirements.${
    ctx.customInstructions
      ? `\n\nAdditional Instructions from user:\n${ctx.customInstructions}`
      : ""
  }`;

  const stream = streamObject({
    model: openrouter(modelToUse),
    schema: TopicsArraySchema,
    system: getSystemPrompt(),
    prompt,
    temperature: config.temperature ?? tierConfig.temperature,
  });

  return Object.assign(stream, {
    modelId: formatModelId(tierConfig.tier, modelToUse),
  });
}

/**
 * Generate MCQs with streaming and duplicate prevention
 * Uses MEDIUM tier model - structured output with moderate complexity
 */
export async function generateMCQs(
  ctx: GenerationContext,
  count: number = 5,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig("generate_mcqs", byokTierConfig);
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const existingQuestionsNote = ctx.existingContent?.length
    ? `\n\nExisting question IDs to avoid duplicating (generate completely different questions):\n${ctx.existingContent.join(
        "\n"
      )}`
    : "";

  const prompt = `Generate ${count} multiple choice questions for interview preparation.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}
${existingQuestionsNote}

For each MCQ, provide:
1. A unique ID (use format: mcq_<random_string>)
2. A clear, specific question
3. Exactly 4 options (one correct, three plausible distractors)
4. The correct answer (must match one of the options exactly)
5. A detailed explanation of why the answer is correct
6. Source as "ai" (or "search" if you used web search to verify)

Focus on practical knowledge that would be tested in a technical interview for this role.${
    ctx.customInstructions
      ? `\n\nAdditional Instructions from user:\n${ctx.customInstructions}`
      : ""
  }`;

  const stream = streamObject({
    model: openrouter(modelToUse),
    schema: MCQsArraySchema,
    system: getSystemPrompt(),
    prompt,
    temperature: config.temperature ?? tierConfig.temperature,
  });

  return Object.assign(stream, {
    modelId: formatModelId(tierConfig.tier, modelToUse),
  });
}

/**
 * Generate Rapid Fire Questions with streaming
 * Uses MEDIUM tier model - structured Q&A generation
 */
export async function generateRapidFire(
  ctx: GenerationContext,
  count: number = 10,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "generate_rapid_fire",
    byokTierConfig
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const existingQuestionsNote = ctx.existingContent?.length
    ? `\n\nExisting questions to avoid duplicating:\n${ctx.existingContent.join(
        "\n"
      )}`
    : "";

  const prompt = `Generate ${count} rapid-fire interview questions with short answers.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}
${existingQuestionsNote}

For each question, provide:
1. A unique ID (use format: rf_<random_string>)
2. A concise question that can be answered quickly
3. A brief, direct answer (1-2 sentences max)

These should be quick-fire questions that test fundamental knowledge relevant to the role.${
    ctx.customInstructions
      ? `\n\nAdditional Instructions from user:\n${ctx.customInstructions}`
      : ""
  }`;

  const stream = streamObject({
    model: openrouter(modelToUse),
    schema: RapidFireArraySchema,
    system: getSystemPrompt(),
    prompt,
    temperature: config.temperature ?? tierConfig.temperature,
  });

  return Object.assign(stream, {
    modelId: formatModelId(tierConfig.tier, modelToUse),
  });
}

/**
 * Parse a user prompt to extract interview details
 * Uses LOW tier model - simple extraction and parsing task
 */
export async function parseInterviewPrompt(
  prompt: string,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "parse_interview_prompt",
    byokTierConfig
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const systemPrompt = `You are an expert at understanding interview preparation requests. Your job is to extract structured information from a user's natural language prompt about their interview preparation needs.

Guidelines:
- Extract the job title they're preparing for
- Extract the company name if mentioned, otherwise use "Unknown"
- Generate a comprehensive job description based on the context provided
- If they mention their experience or background, capture it as resume context
- Be thorough in generating the job description - include typical responsibilities, requirements, and skills for the role
- If the prompt is vague, make reasonable assumptions based on common industry standards`;

  const userPrompt = `Parse the following interview preparation request and extract the relevant details:

"${prompt}"

Extract:
1. Job Title - the position they're preparing for
2. Company - the company name (use "Unknown" if not specified)
3. Job Description - generate a comprehensive job description based on the role and any context provided. Include typical responsibilities, required skills, and qualifications for this type of role.
4. Resume Context - any background, experience, or skills they mentioned about themselves (optional)`;

  const result = await generateObject({
    model: openrouter(modelToUse),
    schema: ParsedInterviewDetailsSchema,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: config.temperature ?? tierConfig.temperature,
  });

  return {
    ...result,
    modelId: formatModelId(tierConfig.tier, modelToUse),
  };
}

/**
 * Regenerate topic with different analogy style
 * Uses HIGH tier model - creative rewriting with style adaptation
 */
export async function regenerateTopicAnalogy(
  topic: RevisionTopic,
  style: "professional" | "construction" | "simple",
  _ctx: GenerationContext,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "regenerate_topic_analogy",
    byokTierConfig
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const styleDescriptions = {
    professional:
      "Use professional, technical language appropriate for a senior developer or architect. Include industry terminology and best practices.",
    construction:
      "Explain using house construction analogies - compare software concepts to building a house. Make technical concepts relatable through building metaphors.",
    simple:
      "Explain as if to a 5-year-old - use simple words, everyday examples, and avoid jargon. Use fun analogies kids would understand.",
  };

  const prompt = `Regenerate the explanation for this interview topic using a different style.

Topic: ${topic.title}
Reason for importance: ${topic.reason}

New Style: ${style}
Style Guidelines: ${styleDescriptions[style]}

Structure your content with markdown formatting:
- **Quick Overview**: A 2-3 sentence summary of what this topic is about (in the requested style)
- **Detailed Explanation**: In-depth explanation covering key concepts, how it works, and why it matters (in the requested style)
- **Code Example** (if applicable): Practical code snippet demonstrating the concept with comments

Keep the same topic ID, title, and reason. Only change the content to match the new style.
The explanation should be comprehensive but match the requested style throughout.${
    _ctx.customInstructions
      ? `\n\nAdditional Instructions from user:\n${_ctx.customInstructions}`
      : ""
  }`;

  const stream = streamObject({
    model: openrouter(modelToUse),
    schema: RevisionTopicSchema,
    system: getSystemPrompt(),
    prompt,
    temperature: config.temperature ?? tierConfig.temperature,
  });

  return Object.assign(stream, {
    modelId: formatModelId(tierConfig.tier, modelToUse),
  });
}

// Export types
export type { MCQ, RevisionTopic, RapidFire, OpeningBrief };

// Export search tool for external use
export { createSearchWebTool, getTools };

// Export AI Engine interface
export interface AIEngine {
  generateOpeningBrief: typeof generateOpeningBrief;
  generateTopics: typeof generateTopics;
  generateMCQs: typeof generateMCQs;
  generateRapidFire: typeof generateRapidFire;
  regenerateTopicAnalogy: typeof regenerateTopicAnalogy;
  parseInterviewPrompt: typeof parseInterviewPrompt;
  checkTiersConfigured: typeof checkTiersConfigured;
}

export const aiEngine: AIEngine = {
  generateOpeningBrief,
  generateTopics,
  generateMCQs,
  generateRapidFire,
  regenerateTopicAnalogy,
  parseInterviewPrompt,
  checkTiersConfigured,
};
