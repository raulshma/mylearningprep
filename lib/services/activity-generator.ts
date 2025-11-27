/**
 * Activity Generator Service
 * 
 * Generates learning activities (MCQ, coding challenges, debugging tasks, concept explanations)
 * using AI with tiered model selection and BYOK support.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamObject, generateObject } from "ai";
import { z } from "zod";
import {
  type SkillCluster,
  type ActivityType,
  type DifficultyLevel,
  type LearningTopic,
  type MCQActivity,
  type CodingChallenge,
  type DebuggingTask,
  type ConceptExplanation,
  type ActivityContent,
  MCQActivitySchema,
  CodingChallengeSchema,
  DebuggingTaskSchema,
  ConceptExplanationSchema,
} from "@/lib/db/schemas/learning-path";
import { getSettingsCollection } from "@/lib/db/collections";
import {
  SETTINGS_KEYS,
  TASK_TIER_MAPPING,
  type ModelTier,
  type TierModelConfig,
} from "@/lib/db/schemas/settings";
import type { BYOKTierConfig } from "./ai-engine";

// Activity generation context
export interface ActivityGeneratorContext {
  goal: string;
  topic: LearningTopic;
  difficulty: DifficultyLevel;
  skillCluster: SkillCluster;
  previousActivities?: ActivityType[];
}

// Add learning path tasks to tier mapping
const LEARNING_PATH_TASK_TIERS: Record<string, ModelTier> = {
  generate_mcq_activity: "high",
  generate_coding_challenge: "high",
  generate_debugging_task: "high",
  generate_concept_explanation: "medium",
};

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
 * Get a single tier's configuration from database
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
 * Get effective config for a learning path task, considering BYOK overrides
 */
async function getEffectiveConfig(
  task: string,
  byokConfig?: BYOKTierConfig
): Promise<{
  model: string;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
  tier: ModelTier;
}> {
  const tier = LEARNING_PATH_TASK_TIERS[task] || TASK_TIER_MAPPING[task] || "high";

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
  const config = await getTierConfigFromDB(tier);
  
  if (!config.primaryModel) {
    throw new Error(
      `Model tier "${tier}" is not configured. Please configure it in admin settings.`
    );
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
 * Format model ID for logging
 */
function formatModelId(tier: ModelTier, model: string): string {
  return `${tier} - ${model}`;
}

/**
 * Get system prompt for activity generation
 */
function getActivitySystemPrompt(): string {
  return `You are an expert technical educator and interview preparation specialist. Your role is to generate high-quality learning activities that help users master technical concepts.

Guidelines:
- Create activities appropriate for the specified difficulty level (1-10 scale)
- Ensure content is accurate, practical, and relevant to real-world scenarios
- For MCQs, all options should be plausible to avoid obvious elimination
- For coding challenges, provide clear problem statements and evaluation criteria
- For debugging tasks, include realistic bugs that developers commonly encounter
- Adapt complexity based on the skill cluster and topic context`;
}

/**
 * Get difficulty description for prompts
 */
function getDifficultyDescription(difficulty: DifficultyLevel): string {
  if (difficulty <= 2) return "beginner-friendly, focusing on fundamentals";
  if (difficulty <= 4) return "intermediate, requiring solid understanding";
  if (difficulty <= 6) return "advanced, testing deeper knowledge";
  if (difficulty <= 8) return "expert-level, requiring comprehensive mastery";
  return "extremely challenging, for senior/principal level expertise";
}


/**
 * Generate MCQ Activity
 * Uses HIGH tier model - requires accurate technical knowledge
 * 
 * Requirements: 2.2
 */
export async function generateMCQ(
  ctx: ActivityGeneratorContext,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<MCQActivity> {
  const tierConfig = await getEffectiveConfig("generate_mcq_activity", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  const prompt = `Generate a multiple choice question for learning about "${ctx.topic.title}".

Learning Goal: ${ctx.goal}
Topic: ${ctx.topic.title}
Topic Description: ${ctx.topic.description}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

Requirements:
1. Create a clear, specific question that tests understanding of the topic
2. Provide exactly 4 answer options
3. One option must be correct, three must be plausible but incorrect
4. Include a detailed explanation of why the correct answer is right
5. The difficulty should match level ${ctx.difficulty}/10

Generate a JSON object with:
- type: "mcq"
- question: the question text
- options: array of exactly 4 answer options
- correctAnswer: the correct option (must match one of the options exactly)
- explanation: detailed explanation of the correct answer`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: MCQActivitySchema,
    system: getActivitySystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });

  return result.object;
}

/**
 * Generate Coding Challenge Activity
 * Uses HIGH tier model - requires complex problem design
 * 
 * Requirements: 2.3
 */
export async function generateCodingChallenge(
  ctx: ActivityGeneratorContext,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<CodingChallenge> {
  const tierConfig = await getEffectiveConfig("generate_coding_challenge", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  const prompt = `Generate a coding challenge for learning about "${ctx.topic.title}".

Learning Goal: ${ctx.goal}
Topic: ${ctx.topic.title}
Topic Description: ${ctx.topic.description}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

Requirements:
1. Create a practical coding problem that tests the topic concepts
2. Provide clear input and output format specifications
3. Include specific evaluation criteria for the solution
4. Provide sample input and expected output
5. Optionally include starter code if helpful
6. The difficulty should match level ${ctx.difficulty}/10

Generate a JSON object with:
- type: "coding-challenge"
- problemDescription: detailed problem statement
- inputFormat: description of input format
- outputFormat: description of expected output format
- evaluationCriteria: array of criteria for evaluating the solution
- starterCode: optional starter code template
- sampleInput: example input
- sampleOutput: expected output for the sample input`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: CodingChallengeSchema,
    system: getActivitySystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });

  return result.object;
}


/**
 * Generate Debugging Task Activity
 * Uses HIGH tier model - requires realistic bug generation
 * 
 * Requirements: 2.4
 */
export async function generateDebuggingTask(
  ctx: ActivityGeneratorContext,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<DebuggingTask> {
  const tierConfig = await getEffectiveConfig("generate_debugging_task", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  const prompt = `Generate a debugging task for learning about "${ctx.topic.title}".

Learning Goal: ${ctx.goal}
Topic: ${ctx.topic.title}
Topic Description: ${ctx.topic.description}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

Requirements:
1. Create code with intentional bugs related to the topic
2. The bugs should be realistic - ones that developers commonly encounter
3. Describe the expected behavior clearly
4. Optionally provide hints to guide the learner
5. The difficulty should match level ${ctx.difficulty}/10
6. For lower difficulty, include more obvious bugs; for higher difficulty, include subtle bugs

Generate a JSON object with:
- type: "debugging-task"
- buggyCode: code containing intentional bugs (use realistic code)
- expectedBehavior: description of what the code should do when fixed
- hints: optional array of hints to help find the bugs`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: DebuggingTaskSchema,
    system: getActivitySystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });

  return result.object;
}

/**
 * Generate Concept Explanation Activity
 * Uses MEDIUM tier model - structured content generation
 * 
 * Requirements: 2.1 (concept-explanation type)
 */
export async function generateConceptExplanation(
  ctx: ActivityGeneratorContext,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<ConceptExplanation> {
  const tierConfig = await getEffectiveConfig("generate_concept_explanation", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  const prompt = `Generate a concept explanation for learning about "${ctx.topic.title}".

Learning Goal: ${ctx.goal}
Topic: ${ctx.topic.title}
Topic Description: ${ctx.topic.description}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

Requirements:
1. Provide a comprehensive explanation of the concept
2. Include key points that summarize the most important aspects
3. Optionally include practical examples
4. Adapt the complexity to difficulty level ${ctx.difficulty}/10
5. For lower difficulty, use simpler language and more analogies
6. For higher difficulty, include advanced nuances and edge cases

Generate a JSON object with:
- type: "concept-explanation"
- content: detailed explanation in markdown format
- keyPoints: array of key takeaways (3-5 points)
- examples: optional array of practical examples`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: ConceptExplanationSchema,
    system: getActivitySystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });

  return result.object;
}


/**
 * Select the best activity type based on context
 * Ensures variety in learning by avoiding repetition
 * 
 * Requirements: 2.1
 */
export function selectActivityType(
  ctx: ActivityGeneratorContext,
  recentTypes: ActivityType[] = []
): ActivityType {
  // All available activity types for generation
  const allTypes: ActivityType[] = [
    'mcq',
    'coding-challenge',
    'debugging-task',
    'concept-explanation',
  ];

  // Weight different activity types based on skill cluster
  const clusterWeights: Record<SkillCluster, Partial<Record<ActivityType, number>>> = {
    'dsa': { 'coding-challenge': 3, 'mcq': 2, 'debugging-task': 1, 'concept-explanation': 1 },
    'oop': { 'coding-challenge': 2, 'mcq': 2, 'debugging-task': 2, 'concept-explanation': 2 },
    'system-design': { 'concept-explanation': 3, 'mcq': 2, 'coding-challenge': 1, 'debugging-task': 1 },
    'debugging': { 'debugging-task': 4, 'coding-challenge': 2, 'mcq': 1, 'concept-explanation': 1 },
    'databases': { 'coding-challenge': 2, 'mcq': 2, 'concept-explanation': 2, 'debugging-task': 1 },
    'api-design': { 'coding-challenge': 2, 'concept-explanation': 2, 'mcq': 2, 'debugging-task': 1 },
    'testing': { 'coding-challenge': 2, 'debugging-task': 2, 'mcq': 2, 'concept-explanation': 1 },
    'devops': { 'concept-explanation': 2, 'mcq': 2, 'debugging-task': 2, 'coding-challenge': 1 },
    'frontend': { 'coding-challenge': 2, 'debugging-task': 2, 'mcq': 2, 'concept-explanation': 1 },
    'backend': { 'coding-challenge': 3, 'debugging-task': 2, 'mcq': 2, 'concept-explanation': 1 },
    'security': { 'mcq': 2, 'concept-explanation': 2, 'debugging-task': 2, 'coding-challenge': 1 },
    'performance': { 'debugging-task': 2, 'coding-challenge': 2, 'concept-explanation': 2, 'mcq': 1 },
  };

  // Get weights for current skill cluster
  const weights = clusterWeights[ctx.skillCluster] || {};

  // Reduce weight for recently used types to ensure variety
  const recentTypeCounts: Record<string, number> = {};
  for (const type of recentTypes.slice(-5)) {
    recentTypeCounts[type] = (recentTypeCounts[type] || 0) + 1;
  }

  // Calculate adjusted weights
  const adjustedWeights: { type: ActivityType; weight: number }[] = allTypes.map(type => {
    let weight = weights[type] || 1;
    
    // Reduce weight based on recent usage
    const recentCount = recentTypeCounts[type] || 0;
    weight = Math.max(0.1, weight - recentCount * 0.5);
    
    return { type, weight };
  });

  // Weighted random selection
  const totalWeight = adjustedWeights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { type, weight } of adjustedWeights) {
    random -= weight;
    if (random <= 0) {
      return type;
    }
  }

  // Fallback to first type
  return allTypes[0];
}


/**
 * Generate activity based on type
 * Dispatches to the appropriate generator function
 * 
 * Requirements: 2.1
 */
export async function generateActivity(
  ctx: ActivityGeneratorContext,
  activityType: ActivityType,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<ActivityContent> {
  switch (activityType) {
    case 'mcq':
      return generateMCQ(ctx, apiKey, byokConfig);
    case 'coding-challenge':
      return generateCodingChallenge(ctx, apiKey, byokConfig);
    case 'debugging-task':
      return generateDebuggingTask(ctx, apiKey, byokConfig);
    case 'concept-explanation':
      return generateConceptExplanation(ctx, apiKey, byokConfig);
    case 'real-world-assignment':
    case 'mini-case-study':
      // Fall back to concept explanation for unsupported types
      return generateConceptExplanation(ctx, apiKey, byokConfig);
    default:
      throw new Error(`Unsupported activity type: ${activityType}`);
  }
}

// Schema for streaming activity generation
const StreamingActivitySchema = z.object({
  activity: z.discriminatedUnion('type', [
    MCQActivitySchema,
    CodingChallengeSchema,
    DebuggingTaskSchema,
    ConceptExplanationSchema,
  ]),
});

/**
 * Stream activity generation
 * Returns a streaming response for real-time UI updates
 * 
 * Requirements: 2.1
 */
export async function streamActivity(
  ctx: ActivityGeneratorContext,
  activityType: ActivityType,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
) {
  const task = activityType === 'concept-explanation' 
    ? 'generate_concept_explanation' 
    : 'generate_mcq_activity';
  
  const tierConfig = await getEffectiveConfig(task, byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  // Select the appropriate schema based on activity type
  const schema = getSchemaForActivityType(activityType);
  const prompt = getPromptForActivityType(ctx, activityType);

  const stream = streamObject({
    model: openrouter(tierConfig.model),
    schema,
    system: getActivitySystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });

  return Object.assign(stream, {
    modelId: formatModelId(tierConfig.tier, tierConfig.model),
  });
}

/**
 * Get the appropriate schema for an activity type
 */
function getSchemaForActivityType(activityType: ActivityType) {
  switch (activityType) {
    case 'mcq':
      return MCQActivitySchema;
    case 'coding-challenge':
      return CodingChallengeSchema;
    case 'debugging-task':
      return DebuggingTaskSchema;
    case 'concept-explanation':
    default:
      return ConceptExplanationSchema;
  }
}

/**
 * Get the appropriate prompt for an activity type
 */
function getPromptForActivityType(
  ctx: ActivityGeneratorContext,
  activityType: ActivityType
): string {
  const baseContext = `Learning Goal: ${ctx.goal}
Topic: ${ctx.topic.title}
Topic Description: ${ctx.topic.description}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})`;

  switch (activityType) {
    case 'mcq':
      return `Generate a multiple choice question for learning about "${ctx.topic.title}".

${baseContext}

Generate a JSON object with type "mcq", question, options (exactly 4), correctAnswer, and explanation.`;

    case 'coding-challenge':
      return `Generate a coding challenge for learning about "${ctx.topic.title}".

${baseContext}

Generate a JSON object with type "coding-challenge", problemDescription, inputFormat, outputFormat, evaluationCriteria, sampleInput, and sampleOutput.`;

    case 'debugging-task':
      return `Generate a debugging task for learning about "${ctx.topic.title}".

${baseContext}

Generate a JSON object with type "debugging-task", buggyCode, expectedBehavior, and optional hints.`;

    case 'concept-explanation':
    default:
      return `Generate a concept explanation for learning about "${ctx.topic.title}".

${baseContext}

Generate a JSON object with type "concept-explanation", content (markdown), keyPoints (array), and optional examples.`;
  }
}

// Types are already exported via the interface definition above
