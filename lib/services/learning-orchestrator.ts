/**
 * Learning Orchestrator Service
 * 
 * Orchestrates the learning path experience by:
 * - Initializing paths from user goals
 * - Selecting topics based on ELO and dependencies
 * - Generating activities using the activity generator
 * - Processing completions with ELO updates and timeline logging
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.3, 6.1, 6.2, 6.3, 6.4
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import { ObjectId } from "mongodb";
import {
  type LearningPath,
  type LearningTopic,
  type Activity,
  type Reflection,
  type TimelineEntry,
  type SkillCluster,
  type DifficultyLevel,
  type SkillScores,
  SkillClusterSchema,
  DifficultyLevelSchema,
  LearningTopicSchema,
} from "@/lib/db/schemas/learning-path";
import { learningPathRepository } from "@/lib/db/repositories/learning-path-repository";
import {
  updateScores,
  calculateNextDifficulty,
} from "./elo-engine";
import {
  generateActivity,
  selectActivityType,
  type ActivityGeneratorContext,
} from "./activity-generator";
import { getSettingsCollection } from "@/lib/db/collections";
import {
  SETTINGS_KEYS,
  type ModelTier,
  type TierModelConfig,
} from "@/lib/db/schemas/settings";
import type { BYOKTierConfig } from "./ai-engine";

// Constants
const MIN_GOAL_LENGTH = 10;
const RECENT_RESULTS_COUNT = 10;

// Learning path task tiers
const LEARNING_PATH_TASK_TIERS: Record<string, ModelTier> = {
  parse_learning_goal: "medium",
  generate_topic: "high",
  select_next_topic: "medium",
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
  const tier = LEARNING_PATH_TASK_TIERS[task] || "high";

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

// Schema for parsed learning goal
const ParsedGoalSchema = z.object({
  skillClusters: z.array(SkillClusterSchema).min(1),
  suggestedDifficulty: DifficultyLevelSchema,
  initialTopic: LearningTopicSchema,
});

// Schema for generated topic
const GeneratedTopicSchema = LearningTopicSchema;

/**
 * Validate learning goal
 * Requirements: 1.5
 */
export function validateGoal(goal: string): { valid: boolean; error?: string } {
  if (!goal || typeof goal !== "string") {
    return { valid: false, error: "Goal is required" };
  }

  const trimmedGoal = goal.trim();

  if (trimmedGoal.length === 0) {
    return { valid: false, error: "Goal cannot be empty" };
  }

  if (trimmedGoal.length < MIN_GOAL_LENGTH) {
    return {
      valid: false,
      error: `Goal must be at least ${MIN_GOAL_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Parse learning goal to extract skill clusters and initial topic
 * Requirements: 1.1, 1.2, 1.3
 */
export async function parseGoal(
  goal: string,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<{
  skillClusters: SkillCluster[];
  suggestedDifficulty: DifficultyLevel;
  initialTopic: LearningTopic;
}> {
  const tierConfig = await getEffectiveConfig("parse_learning_goal", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  const prompt = `Analyze this learning goal and extract the relevant information:

Learning Goal: "${goal}"

Based on this goal:
1. Identify the relevant skill clusters from this list: dsa, oop, system-design, debugging, databases, api-design, testing, devops, frontend, backend, security, performance
2. Suggest an appropriate starting difficulty level (1-10 scale, where 5 is intermediate)
3. Generate an initial topic to start learning

For the initial topic:
- Create a unique ID (format: topic_<random_string>)
- Give it a clear, specific title
- Write a brief description
- Assign it to the most relevant skill cluster
- Set an appropriate difficulty level
- List any prerequisites (empty array if none)

Consider the user's implied experience level from their goal when setting difficulty.`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: ParsedGoalSchema,
    system: `You are an expert learning path designer. Your role is to analyze learning goals and create structured learning paths. Be specific and practical in your topic suggestions.`,
    prompt,
    temperature: tierConfig.temperature,
  });

  return result.object;
}


/**
 * Initialize a new learning path from a goal
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export async function initializePath(
  userId: string,
  goal: string,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<LearningPath> {
  // Validate goal
  const validation = validateGoal(goal);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Parse goal to extract skill clusters and initial topic
  const parsed = await parseGoal(goal, apiKey, byokConfig);

  // Create the learning path
  const learningPath = await learningPathRepository.create({
    userId,
    goal: goal.trim(),
    skillClusters: parsed.skillClusters,
    baselineDifficulty: parsed.suggestedDifficulty,
    currentDifficulty: parsed.suggestedDifficulty,
    isActive: true,
  });

  // Add the initial topic
  await learningPathRepository.addTopic(learningPath._id, parsed.initialTopic);

  // Set the initial topic as current
  await learningPathRepository.setCurrentTopic(
    learningPath._id,
    parsed.initialTopic.id
  );

  // Fetch and return the updated path
  const updatedPath = await learningPathRepository.findById(learningPath._id);
  if (!updatedPath) {
    throw new Error("Failed to retrieve created learning path");
  }

  return updatedPath;
}

/**
 * Topic selection context
 */
export interface TopicSelectionContext {
  goal: string;
  skillClusters: SkillCluster[];
  currentElo: number;
  skillScores: SkillScores;
  completedTopicIds: string[];
  currentDifficulty: DifficultyLevel;
}

/**
 * Select the next topic based on ELO, dependencies, and performance
 * Requirements: 6.1, 6.2, 6.3
 */
export async function selectNextTopic(
  path: LearningPath,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<LearningTopic> {
  const tierConfig = await getEffectiveConfig("select_next_topic", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  // Get completed topic IDs from timeline
  const completedTopicIds = new Set(
    path.timeline
      .filter((entry) => entry.success)
      .map((entry) => entry.topicId)
  );

  // Find available topics (not completed, prerequisites met)
  const availableTopics = path.topics.filter((topic) => {
    if (completedTopicIds.has(topic.id)) return false;
    // Check prerequisites
    return topic.prerequisites.every((prereq) => completedTopicIds.has(prereq));
  });

  // If there are available topics, select based on ELO and difficulty
  if (availableTopics.length > 0) {
    // Sort by how close the topic difficulty is to current difficulty
    const sortedTopics = availableTopics.sort((a, b) => {
      const aDiff = Math.abs(a.difficulty - path.currentDifficulty);
      const bDiff = Math.abs(b.difficulty - path.currentDifficulty);
      return aDiff - bDiff;
    });
    return sortedTopics[0];
  }

  // No available topics - generate a new one
  const prompt = `Generate a new learning topic for this learning path.

Learning Goal: "${path.goal}"
Skill Clusters: ${path.skillClusters.join(", ")}
Current ELO: ${path.overallElo}
Current Difficulty: ${path.currentDifficulty}/10
Completed Topics: ${path.topics.filter((t) => completedTopicIds.has(t.id)).map((t) => t.title).join(", ") || "None"}

Generate a new topic that:
1. Advances the user's learning toward their goal
2. Is appropriate for their current skill level (ELO ${path.overallElo}, difficulty ${path.currentDifficulty})
3. Builds on what they've already learned
4. Belongs to one of their skill clusters: ${path.skillClusters.join(", ")}

Create a unique ID (format: topic_<random_string>), clear title, description, and set appropriate difficulty.`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: GeneratedTopicSchema,
    system: `You are an expert learning path designer. Generate topics that progressively build skills and knowledge.`,
    prompt,
    temperature: tierConfig.temperature,
  });

  const newTopic = result.object;

  // Add the new topic to the path
  await learningPathRepository.addTopic(path._id, newTopic);

  return newTopic;
}


/**
 * Generate the next activity for the current topic
 * Requirements: 2.1, 6.4
 */
export async function generateNextActivity(
  path: LearningPath,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<Activity> {
  // Get current topic
  const currentTopic = path.topics.find((t) => t.id === path.currentTopicId);
  if (!currentTopic) {
    throw new Error("No current topic set for learning path");
  }

  // Get recent activity types for variety
  const recentTypes = path.timeline
    .slice(-5)
    .map((entry) => entry.activityType);

  // Select activity type
  const activityType = selectActivityType(
    {
      goal: path.goal,
      topic: currentTopic,
      difficulty: path.currentDifficulty,
      skillCluster: currentTopic.skillCluster,
      previousActivities: recentTypes,
    },
    recentTypes
  );

  // Generate activity content
  const ctx: ActivityGeneratorContext = {
    goal: path.goal,
    topic: currentTopic,
    difficulty: path.currentDifficulty,
    skillCluster: currentTopic.skillCluster,
    previousActivities: recentTypes,
  };

  const content = await generateActivity(ctx, activityType, apiKey, byokConfig);

  // Create activity record
  const activity: Activity = {
    id: `activity_${new ObjectId().toString()}`,
    topicId: currentTopic.id,
    type: activityType,
    content,
    difficulty: path.currentDifficulty,
    createdAt: new Date(),
  };

  return activity;
}

/**
 * Get recent results from timeline for difficulty adjustment
 */
function getRecentResults(timeline: TimelineEntry[], count: number): boolean[] {
  return timeline
    .slice(-count)
    .map((entry) => entry.success);
}

/**
 * Process activity completion with ELO updates and timeline logging
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1
 */
export async function processActivityCompletion(
  pathId: string,
  activity: Activity,
  reflection: Reflection
): Promise<TimelineEntry> {
  // Get the learning path
  const path = await learningPathRepository.findById(pathId);
  if (!path) {
    throw new Error("Learning path not found");
  }

  // Get the topic
  const topic = path.topics.find((t) => t.id === activity.topicId);
  if (!topic) {
    throw new Error("Topic not found");
  }

  // Calculate ELO changes
  const eloResult = updateScores(
    path.overallElo,
    path.skillScores,
    topic.skillCluster,
    activity.difficulty,
    reflection.completed,
    reflection.timeTakenSeconds
  );

  // Create timeline entry
  const timelineEntry: TimelineEntry = {
    id: `timeline_${new ObjectId().toString()}`,
    activityId: activity.id,
    topicId: topic.id,
    topicTitle: topic.title,
    activityType: activity.type,
    success: reflection.completed,
    eloChange: eloResult.eloChange,
    eloBefore: path.overallElo,
    eloAfter: eloResult.newOverallElo,
    timeTakenSeconds: reflection.timeTakenSeconds,
    reflection,
    timestamp: new Date(),
  };

  // Add timeline entry
  await learningPathRepository.addTimelineEntry(pathId, timelineEntry);

  // Update ELO scores
  await learningPathRepository.updateEloScores(
    pathId,
    eloResult.newOverallElo,
    eloResult.newSkillScores
  );

  // Calculate and update difficulty based on recent performance
  const recentResults = getRecentResults(
    [...path.timeline, timelineEntry],
    RECENT_RESULTS_COUNT
  );
  const newDifficulty = calculateNextDifficulty(
    path.currentDifficulty,
    recentResults,
    eloResult.newOverallElo
  );

  if (newDifficulty !== path.currentDifficulty) {
    await learningPathRepository.updateDifficulty(pathId, newDifficulty);
  }

  return timelineEntry;
}


/**
 * Advance to the next topic if current topic is mastered
 * A topic is considered mastered after 3 successful activities
 */
export async function checkAndAdvanceTopic(
  pathId: string,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<LearningTopic | null> {
  const path = await learningPathRepository.findById(pathId);
  if (!path) {
    throw new Error("Learning path not found");
  }

  if (!path.currentTopicId) {
    // No current topic, select one
    const nextTopic = await selectNextTopic(path, apiKey, byokConfig);
    await learningPathRepository.setCurrentTopic(pathId, nextTopic.id);
    return nextTopic;
  }

  // Count successful activities for current topic
  const currentTopicSuccesses = path.timeline.filter(
    (entry) => entry.topicId === path.currentTopicId && entry.success
  ).length;

  // If 3+ successes, advance to next topic
  if (currentTopicSuccesses >= 3) {
    const nextTopic = await selectNextTopic(path, apiKey, byokConfig);
    await learningPathRepository.setCurrentTopic(pathId, nextTopic.id);
    return nextTopic;
  }

  return null;
}

/**
 * Get the next activity for a learning path
 * This is the main entry point for continuous learning
 * Requirements: 6.4
 */
export async function getNextActivity(
  pathId: string,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<Activity> {
  // Check if we need to advance to a new topic
  await checkAndAdvanceTopic(pathId, apiKey, byokConfig);

  // Get updated path
  const path = await learningPathRepository.findById(pathId);
  if (!path) {
    throw new Error("Learning path not found");
  }

  // Generate and return the next activity
  return generateNextActivity(path, apiKey, byokConfig);
}

/**
 * Learning Orchestrator interface
 */
export interface LearningOrchestrator {
  validateGoal: typeof validateGoal;
  parseGoal: typeof parseGoal;
  initializePath: typeof initializePath;
  selectNextTopic: typeof selectNextTopic;
  generateNextActivity: typeof generateNextActivity;
  processActivityCompletion: typeof processActivityCompletion;
  checkAndAdvanceTopic: typeof checkAndAdvanceTopic;
  getNextActivity: typeof getNextActivity;
}

export const learningOrchestrator: LearningOrchestrator = {
  validateGoal,
  parseGoal,
  initializePath,
  selectNextTopic,
  generateNextActivity,
  processActivityCompletion,
  checkAndAdvanceTopic,
  getNextActivity,
};
