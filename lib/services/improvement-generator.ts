/**
 * Improvement Generator Service
 * 
 * Generates targeted learning activities to address identified skill gaps.
 * Supports BYOK (Bring Your Own Key) and tiered model selection.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 9.2
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, streamObject } from "ai";
import { z } from "zod";
import {
  type SkillGap,
  type ImprovementActivity,
  type ImprovementPlan,
} from "@/lib/db/schemas/feedback";
import {
  type SkillCluster,
  type ActivityType,
  type DifficultyLevel,
  type ActivityContent,
  ActivityTypeSchema,
  MCQActivitySchema,
  CodingChallengeSchema,
  DebuggingTaskSchema,
  ConceptExplanationSchema,
} from "@/lib/db/schemas/learning-path";
import { TASK_TIER_MAPPING, type ModelTier } from "@/lib/db/schemas/settings";
import { getTierConfigFromDB } from "@/lib/db/tier-config";
import type { BYOKTierConfig } from "./ai-engine";
import {
  logAIRequest,
  logAIError,
  createLoggerContext,
  extractTokenUsage,
  type LoggerContext,
} from "./ai-logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Context for generating improvement activities
 */
export interface ImprovementContext {
  userId: string;
  skillGaps: SkillGap[];
  userLevel: number; // User's overall skill level (1-10)
}



// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get effective config for an improvement task, considering BYOK overrides
 * 
 * Requirements: 7.1, 7.2, 7.3, 9.2
 */
export async function getEffectiveConfig(
  task: string,
  byokConfig?: BYOKTierConfig
): Promise<{
  model: string;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
  tier: ModelTier;
}> {
  const tier = TASK_TIER_MAPPING[task] || "high";

  // Check if BYOK user has configured this tier (Requirement 7.2)
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

  // Fall back to system tier config (Requirement 7.3)
  const config = await getTierConfigFromDB(tier);
  
  if (!config.primaryModel) {
    throw new Error(
      `Model tier "${tier}" is not configured. Please configure it in admin settings before using ${task}.`
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
 * 
 * Requirements: 7.1
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
export function formatModelId(tier: ModelTier, model: string): string {
  return `${tier} - ${model}`;
}

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Get system prompt for activity generation
 */
function getActivitySystemPrompt(): string {
  return `You are an expert technical educator creating learning activities to help users improve their skills. Generate high-quality, practical content that:

1. Is appropriate for the specified difficulty level (1-10 scale)
2. Focuses on real-world applications and interview scenarios
3. Includes clear explanations and actionable insights
4. Tests understanding rather than memorization
5. Addresses common misconceptions and pitfalls`;
}

// ============================================================================
// Difficulty Matching (Requirement 3.4)
// ============================================================================

/**
 * Calculate appropriate difficulty for an activity based on user level and gap score
 * Matches activity difficulty to user's skill level (±2 range)
 * 
 * Requirements: 3.4
 */
export function calculateActivityDifficulty(
  userLevel: number,
  gapScore: number
): DifficultyLevel {
  // Base difficulty on user level
  let baseDifficulty = userLevel;
  
  // Adjust based on gap score - higher gaps suggest starting slightly easier
  if (gapScore >= 70) {
    // Large gap - start 1-2 levels below user level
    baseDifficulty = Math.max(1, userLevel - 2);
  } else if (gapScore >= 40) {
    // Medium gap - start 1 level below
    baseDifficulty = Math.max(1, userLevel - 1);
  }
  // Small gap - use user level as-is
  
  // Ensure within ±2 range of user level and valid bounds
  const minDifficulty = Math.max(1, userLevel - 2);
  const maxDifficulty = Math.min(10, userLevel + 2);
  
  return Math.max(minDifficulty, Math.min(maxDifficulty, baseDifficulty)) as DifficultyLevel;
}

// ============================================================================
// Activity Type Selection (Requirement 3.5)
// ============================================================================

/**
 * Activity type weights by skill cluster
 */
const CLUSTER_ACTIVITY_WEIGHTS: Record<SkillCluster, Partial<Record<ActivityType, number>>> = {
  'dsa': { 'coding-challenge': 4, 'mcq': 2, 'debugging-task': 1, 'concept-explanation': 1 },
  'oop': { 'coding-challenge': 2, 'mcq': 2, 'debugging-task': 2, 'concept-explanation': 2 },
  'system-design': { 'concept-explanation': 4, 'mcq': 2, 'coding-challenge': 1, 'debugging-task': 1 },
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

/**
 * Select activity types for a skill gap ensuring variety
 * 
 * Requirements: 3.5
 */
export function selectActivityTypes(
  gap: SkillGap,
  existingTypes: ActivityType[] = [],
  count: number = 2
): ActivityType[] {
  const allTypes: ActivityType[] = ['mcq', 'coding-challenge', 'debugging-task', 'concept-explanation'];
  const weights = CLUSTER_ACTIVITY_WEIGHTS[gap.skillCluster] || {};
  
  // Count existing types to reduce their weight
  const typeCounts: Record<string, number> = {};
  for (const type of existingTypes) {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  
  const selectedTypes: ActivityType[] = [];
  
  for (let i = 0; i < count; i++) {
    // Calculate adjusted weights
    const adjustedWeights = allTypes.map(type => {
      let weight = weights[type] || 1;
      
      // Reduce weight for already selected types in this batch
      if (selectedTypes.includes(type)) {
        weight *= 0.3;
      }
      
      // Reduce weight based on existing types
      const existingCount = typeCounts[type] || 0;
      weight = Math.max(0.1, weight - existingCount * 0.5);
      
      return { type, weight };
    });
    
    // Weighted random selection
    const totalWeight = adjustedWeights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { type, weight } of adjustedWeights) {
      random -= weight;
      if (random <= 0) {
        selectedTypes.push(type);
        break;
      }
    }
    
    // Fallback if nothing selected
    if (selectedTypes.length <= i) {
      const remaining = allTypes.filter(t => !selectedTypes.includes(t));
      selectedTypes.push(remaining[0] || allTypes[0]);
    }
  }
  
  return selectedTypes;
}

/**
 * Ensure activity type variety in a plan
 * For plans with 4+ activities, ensures at least 2 different types
 * 
 * Requirements: 3.5
 */
export function ensureActivityVariety(
  activities: Array<{ activityType: ActivityType }>
): boolean {
  if (activities.length < 4) return true;
  
  const uniqueTypes = new Set(activities.map(a => a.activityType));
  return uniqueTypes.size >= 2;
}

// ============================================================================
// Core Generation Functions
// ============================================================================

/**
 * Generate an improvement plan for identified skill gaps
 * Uses HIGH tier model for strategic planning
 * 
 * Requirements: 3.1, 3.2, 7.1, 7.2, 7.3, 9.2
 */
export async function generatePlan(
  gaps: SkillGap[],
  userLevel: number,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
): Promise<Omit<ImprovementPlan, '_id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  if (gaps.length === 0) {
    return {
      skillGaps: [],
      activities: [],
      progress: {
        totalActivities: 0,
        completedActivities: 0,
        skillProgress: {},
      },
    };
  }

  // Sort gaps by gapScore descending (Requirement 3.2)
  const sortedGaps = [...gaps].sort((a, b) => b.gapScore - a.gapScore);
  
  const activities: ImprovementActivity[] = [];
  const existingTypes: ActivityType[] = [];
  
  // Generate activities for each gap (Requirement 3.1)
  for (const gap of sortedGaps) {
    // Select activity types ensuring variety (Requirement 3.5)
    const activityTypes = selectActivityTypes(gap, existingTypes, 2);
    
    for (const activityType of activityTypes) {
      // Calculate difficulty matching user level (Requirement 3.4)
      const difficulty = calculateActivityDifficulty(userLevel, gap.gapScore);
      
      const activity: ImprovementActivity = {
        id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        skillGapId: `${gap.skillCluster}_${gap.gapScore}`,
        skillCluster: gap.skillCluster,
        activityType,
        difficulty,
        content: null, // Content generated on demand via streaming
        status: 'pending',
      };
      
      activities.push(activity);
      existingTypes.push(activityType);
    }
  }
  
  // Verify variety requirement (Requirement 3.5)
  if (!ensureActivityVariety(activities) && activities.length >= 4) {
    // Force variety by changing some activity types
    const types = new Set(activities.map(a => a.activityType));
    if (types.size < 2) {
      const allTypes: ActivityType[] = ['mcq', 'coding-challenge', 'debugging-task', 'concept-explanation'];
      const currentType = activities[0].activityType;
      const alternativeType = allTypes.find(t => t !== currentType) || 'concept-explanation';
      
      // Change every other activity to alternative type
      for (let i = 1; i < activities.length; i += 2) {
        activities[i].activityType = alternativeType;
      }
    }
  }
  
  // Initialize skill progress
  const skillProgress: Record<string, number> = {};
  for (const gap of sortedGaps) {
    skillProgress[gap.skillCluster] = 0;
  }
  
  return {
    skillGaps: sortedGaps,
    activities,
    progress: {
      totalActivities: activities.length,
      completedActivities: 0,
      skillProgress,
    },
  };
}


// ============================================================================
// Activity Content Generation
// ============================================================================

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
 * Get skill cluster description for prompts
 */
function getSkillClusterDescription(cluster: SkillCluster): string {
  const descriptions: Record<SkillCluster, string> = {
    'dsa': 'Data Structures & Algorithms - arrays, trees, graphs, sorting, searching, dynamic programming',
    'oop': 'Object-Oriented Programming - classes, inheritance, polymorphism, design patterns',
    'system-design': 'System Design - scalability, distributed systems, architecture patterns',
    'debugging': 'Debugging & Troubleshooting - error analysis, logging, profiling',
    'databases': 'Databases - SQL, NoSQL, indexing, query optimization, data modeling',
    'api-design': 'API Design - REST, GraphQL, authentication, versioning',
    'testing': 'Testing - unit tests, integration tests, TDD, mocking',
    'devops': 'DevOps - CI/CD, containers, infrastructure as code',
    'frontend': 'Frontend Development - React, state management, performance',
    'backend': 'Backend Development - servers, APIs, microservices',
    'security': 'Security - authentication, authorization, encryption, vulnerabilities',
    'performance': 'Performance Optimization - profiling, caching, optimization techniques',
  };
  return descriptions[cluster] || cluster;
}

/**
 * Build prompt for activity generation
 */
function buildActivityPrompt(
  gap: SkillGap,
  activityType: ActivityType,
  difficulty: DifficultyLevel,
  programmingLanguage?: string
): string {
  const clusterDesc = getSkillClusterDescription(gap.skillCluster);
  const difficultyDesc = getDifficultyDescription(difficulty);
  const langContext = programmingLanguage 
    ? `\nProgramming Language: ${programmingLanguage} (use this language for all code examples)`
    : '';
  
  const baseContext = `## Context
Skill Area: ${clusterDesc}
Gap Score: ${gap.gapScore}/100 (higher = bigger gap to address)
Difficulty Level: ${difficulty}/10 (${difficultyDesc})
Activity Type: ${activityType}${langContext}

## Goal
Create a learning activity that helps the user improve in this skill area. The activity should:
- Be appropriate for the difficulty level
- Address common weaknesses in this skill cluster
- Be practical and interview-relevant
- Use ${programmingLanguage || 'the most appropriate programming language'} for any code examples`;

  switch (activityType) {
    case 'mcq':
      return `Generate a multiple choice question to test understanding of ${gap.skillCluster}.

${baseContext}

Create a question that:
1. Tests deep understanding, not surface-level knowledge
2. Has 4 plausible options with one correct answer
3. Includes a detailed explanation of why the correct answer is right
4. Addresses common misconceptions as incorrect options

Generate a JSON object with:
- type: "mcq"
- question: the question text
- options: array of exactly 4 answer options
- correctAnswer: the correct option (must match one of the options exactly)
- explanation: detailed explanation`;

    case 'coding-challenge':
      return `Generate a coding challenge for ${gap.skillCluster}.

${baseContext}

Create a problem that:
1. Tests practical coding skills in this area
2. Has clear input/output specifications
3. Includes evaluation criteria
4. Is solvable within 15-30 minutes

Generate a JSON object with:
- type: "coding-challenge"
- problemDescription: detailed problem statement
- inputFormat: description of input format
- outputFormat: description of expected output
- evaluationCriteria: array of criteria for evaluation
- sampleInput: example input
- sampleOutput: expected output for the sample`;

    case 'debugging-task':
      return `Generate a debugging task for ${gap.skillCluster}.

${baseContext}

Create a task that:
1. Contains realistic bugs developers commonly encounter
2. Has clear expected behavior
3. Provides appropriate hints based on difficulty
4. Tests debugging skills relevant to this skill cluster

Generate a JSON object with:
- type: "debugging-task"
- buggyCode: code with intentional bugs (IMPORTANT: format with proper newlines and indentation)
- expectedBehavior: what the code should do when fixed
- hints: array of hints to help find the bugs`;

    case 'concept-explanation':
    default:
      return `Generate a concept explanation for ${gap.skillCluster}.

${baseContext}

Create an explanation that:
1. Covers key concepts in this skill area
2. Uses clear, practical examples
3. Addresses common misconceptions
4. Is appropriate for the difficulty level

Generate a JSON object with:
- type: "concept-explanation"
- content: detailed explanation in markdown format
- keyPoints: array of 5-7 key takeaways
- examples: array of 2-4 practical examples`;
  }
}

/**
 * Get schema for activity type
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
 * Stream improvement activity content with AI logging
 * Uses appropriate tier based on activity type complexity
 * 
 * Requirements: 3.3, 8.1, 8.2, 8.3
 */
export async function streamActivity(
  gap: SkillGap,
  activityType: ActivityType,
  difficulty: DifficultyLevel,
  userId: string,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig,
  programmingLanguage?: string
): Promise<{
  stream: ReturnType<typeof streamObject>;
  modelId: string;
  loggerContext: LoggerContext;
}> {
  const tierConfig = await getEffectiveConfig("stream_improvement_activity", byokTierConfig);
  const openrouter = getOpenRouterClient(apiKey);
  
  // Create logger context with BYOK metadata (Requirement 8.3)
  const loggerContext = createLoggerContext({
    streaming: true,
    byokUsed: !!apiKey,
  });
  
  const schema = getSchemaForActivityType(activityType);
  const prompt = buildActivityPrompt(gap, activityType, difficulty, programmingLanguage);
  
  const stream = streamObject({
    model: openrouter(tierConfig.model),
    schema,
    system: getActivitySystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });
  
  return {
    stream,
    modelId: formatModelId(tierConfig.tier, tierConfig.model),
    loggerContext,
  };
}

/**
 * Generate activity content (non-streaming)
 * Used for batch generation or when streaming is not needed
 */
export async function generateActivityContent(
  gap: SkillGap,
  activityType: ActivityType,
  difficulty: DifficultyLevel,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig,
  programmingLanguage?: string
): Promise<ActivityContent> {
  const tierConfig = await getEffectiveConfig("stream_improvement_activity", byokTierConfig);
  const openrouter = getOpenRouterClient(apiKey);
  
  const schema = getSchemaForActivityType(activityType);
  const prompt = buildActivityPrompt(gap, activityType, difficulty, programmingLanguage);
  
  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema,
    system: getActivitySystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });
  
  return result.object as ActivityContent;
}

/**
 * Async generator for streaming activities with logging
 * Yields activity content as it's generated
 * 
 * Requirements: 3.3, 8.1, 8.2, 8.3
 */
export async function* streamActivities(
  gap: SkillGap,
  difficulty: DifficultyLevel,
  userId: string,
  interviewId: string,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
): AsyncGenerator<{
  type: 'partial' | 'complete';
  activityType: ActivityType;
  content: Partial<ActivityContent> | ActivityContent;
}> {
  // Select activity types for this gap
  const activityTypes = selectActivityTypes(gap, [], 2);
  
  for (const activityType of activityTypes) {
    const { stream, modelId, loggerContext } = await streamActivity(
      gap,
      activityType,
      difficulty,
      userId,
      apiKey,
      byokTierConfig
    );
    
    let finalContent: ActivityContent | null = null;
    let promptText = buildActivityPrompt(gap, activityType, difficulty);
    
    try {
      // Stream partial results
      for await (const partial of stream.partialObjectStream) {
        yield {
          type: 'partial',
          activityType,
          content: partial as Partial<ActivityContent>,
        };
        loggerContext.markFirstToken();
      }
      
      // Get final result
      const result = await stream;
      const objectResult = await result.object;
      finalContent = objectResult as ActivityContent;
      const usage = await result.usage;
      
      // Yield complete result
      yield {
        type: 'complete',
        activityType,
        content: finalContent,
      };
      
      // Log successful AI request (Requirements 8.1, 8.2, 8.3)
      await logAIRequest({
        interviewId,
        userId,
        action: 'STREAM_IMPROVEMENT_ACTIVITY',
        status: 'success',
        model: modelId,
        prompt: promptText,
        systemPrompt: getActivitySystemPrompt(),
        response: JSON.stringify(finalContent),
        toolsUsed: loggerContext.toolsUsed,
        searchQueries: loggerContext.searchQueries,
        searchResults: loggerContext.searchResults,
        tokenUsage: extractTokenUsage(usage as unknown as Record<string, unknown>),
        latencyMs: loggerContext.getLatencyMs(),
        timeToFirstToken: loggerContext.getTimeToFirstToken(),
        metadata: loggerContext.metadata,
      });
      
    } catch (error) {
      // Log error (Requirement 8.4)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAIError({
        interviewId,
        userId,
        action: 'STREAM_IMPROVEMENT_ACTIVITY',
        model: modelId,
        prompt: promptText,
        systemPrompt: getActivitySystemPrompt(),
        errorMessage,
        errorCode: 'STREAM_ERROR',
        toolsUsed: loggerContext.toolsUsed,
        searchQueries: loggerContext.searchQueries,
        searchResults: loggerContext.searchResults,
        tokenUsage: { input: 0, output: 0 },
        latencyMs: loggerContext.getLatencyMs(),
        timeToFirstToken: loggerContext.getTimeToFirstToken(),
        metadata: loggerContext.metadata,
      });
      
      throw error;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export interface ImprovementGenerator {
  generatePlan: typeof generatePlan;
  streamActivity: typeof streamActivity;
  streamActivities: typeof streamActivities;
  generateActivityContent: typeof generateActivityContent;
  selectActivityTypes: typeof selectActivityTypes;
  calculateActivityDifficulty: typeof calculateActivityDifficulty;
  ensureActivityVariety: typeof ensureActivityVariety;
  formatModelId: typeof formatModelId;
}

export const improvementGenerator: ImprovementGenerator = {
  generatePlan,
  streamActivity,
  streamActivities,
  generateActivityContent,
  selectActivityTypes,
  calculateActivityDifficulty,
  ensureActivityVariety,
  formatModelId,
};
