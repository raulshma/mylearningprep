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
import { generateObject, tool } from "ai";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { searchService, isSearchEnabled } from "./search-service";
import { crawlService, isCrawlEnabled } from "./crawl-service";
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
  TASK_TIER_MAPPING,
  type ModelTier,
  type TierModelConfig,
} from "@/lib/db/schemas/settings";
import type { BYOKTierConfig } from "./ai-engine";

// Constants
const MIN_GOAL_LENGTH = 10;
const RECENT_RESULTS_COUNT = 10;

// ============================================================================
// Search and Crawl Tools for Learning Path Generation
// ============================================================================

/**
 * Search and Crawl Tool Schema for learning path generation
 */
const searchAndCrawlToolSchema = z.object({
  query: z.string().describe("The search query to find relevant learning information"),
  crawlTopResults: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .default(1)
    .describe("Number of top search results to crawl for full content (0-2)"),
});

/**
 * Create search and crawl tool for learning path generation
 * This tool searches for learning resources and optionally crawls top results
 */
function createLearningSearchAndCrawlTool() {
  return {
    searchAndCrawl: tool({
      description:
        "Search the web for learning resources, documentation, tutorials, and technical information. Optionally crawl top results for full content. Use this to find up-to-date information about technologies, best practices, and learning materials.",
      inputSchema: searchAndCrawlToolSchema,
      execute: async (params: { query: string; crawlTopResults?: number }) => {
        const crawlCount = params.crawlTopResults ?? 1;

        // First, search the web
        if (!isSearchEnabled()) {
          return {
            searchResults: [],
            crawledContent: [],
            message: "Search is not enabled",
          };
        }

        const searchResponse = await searchService.query(params.query, 5);

        if (searchResponse.results.length === 0) {
          return {
            searchResults: [],
            crawledContent: [],
            message: "No search results found",
          };
        }

        // If crawling is disabled or not requested, return search results only
        if (crawlCount === 0 || !isCrawlEnabled()) {
          return {
            searchResults: searchResponse.results,
            crawledContent: [],
            message: `Found ${searchResponse.results.length} search results`,
          };
        }

        // Crawl top N results
        const urlsToCrawl = searchResponse.results
          .slice(0, crawlCount)
          .map((r) => r.url);

        const crawledContent: Array<{
          url: string;
          title: string;
          markdown?: string;
          error?: string;
        }> = [];

        for (const url of urlsToCrawl) {
          const crawlResult = await crawlService.crawlUrl(url, {
            timeout: 15000,
          });

          const searchResult = searchResponse.results.find(
            (r) => r.url === url
          );

          if (crawlResult.success && crawlResult.markdown) {
            crawledContent.push({
              url,
              title: searchResult?.title || crawlResult.metadata?.title || url,
              markdown: crawlResult.markdown,
            });
          } else {
            crawledContent.push({
              url,
              title: searchResult?.title || url,
              error: crawlResult.error || "Failed to crawl",
            });
          }
        }

        return {
          searchResults: searchResponse.results,
          crawledContent,
          message: `Found ${searchResponse.results.length} results, crawled ${crawledContent.filter((c) => c.markdown).length} pages`,
        };
      },
    }),
  };
}

/**
 * Get learning tools based on service availability
 */
function getLearningTools() {
  if (isSearchEnabled() || isCrawlEnabled()) {
    return createLearningSearchAndCrawlTool();
  }
  return undefined;
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

// Schema for parsed learning goal - now generates comprehensive curriculum
const ParsedGoalSchema = z.object({
  skillClusters: z.array(SkillClusterSchema).min(1),
  suggestedDifficulty: DifficultyLevelSchema,
  pathOverview: z.object({
    estimatedTotalHours: z.number().min(1),
    targetOutcome: z.string().min(1),
    prerequisites: z.array(z.string()).default([]),
    milestones: z.array(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      topicIds: z.array(z.string()).min(1),
    })).min(1),
  }),
  topics: z.array(LearningTopicSchema).min(5).max(15), // Generate 5-15 comprehensive topics
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
 * Gather search context for learning goal
 * Uses search and crawl to get up-to-date information about the learning topic
 */
async function gatherLearningContext(goal: string): Promise<string> {
  if (!isSearchEnabled()) {
    return "";
  }

  try {
    // Search for relevant learning resources and interview topics
    const searchQuery = `${goal} interview preparation learning path topics`;
    const searchResponse = await searchService.query(searchQuery, 3);

    if (searchResponse.results.length === 0) {
      return "";
    }

    let context = "\n\n## Current Industry Context (from web search):\n";
    context += searchResponse.results
      .map((r) => `- ${r.title}: ${r.snippet}`)
      .join("\n");

    // Optionally crawl the top result for more detailed content
    if (isCrawlEnabled() && searchResponse.results.length > 0) {
      const topUrl = searchResponse.results[0].url;
      const crawlResult = await crawlService.crawlUrl(topUrl, { timeout: 10000 });

      if (crawlResult.success && crawlResult.markdown) {
        // Truncate to avoid token limits
        const truncatedContent = crawlResult.markdown.slice(0, 2000);
        context += `\n\n## Detailed Resource Content:\n${truncatedContent}`;
      }
    }

    return context;
  } catch (error) {
    console.error("Error gathering learning context:", error);
    return "";
  }
}

/**
 * Parse learning goal to extract skill clusters and generate comprehensive curriculum
 * Requirements: 1.1, 1.2, 1.3
 * Now enhanced with search and crawl for up-to-date curriculum generation
 */
export async function parseGoal(
  goal: string,
  apiKey?: string,
  byokConfig?: BYOKTierConfig
): Promise<{
  skillClusters: SkillCluster[];
  suggestedDifficulty: DifficultyLevel;
  pathOverview: {
    estimatedTotalHours: number;
    targetOutcome: string;
    prerequisites: string[];
    milestones: Array<{
      title: string;
      description: string;
      topicIds: string[];
    }>;
  };
  topics: LearningTopic[];
}> {
  const tierConfig = await getEffectiveConfig("parse_learning_goal", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  // Gather search context for better curriculum generation
  const searchContext = await gatherLearningContext(goal);

  const prompt = `You are designing a comprehensive, interview-focused learning curriculum. Analyze this learning goal and create an extensive, structured learning path.

Learning Goal: "${goal}"${searchContext}

Create a DETAILED and COMPREHENSIVE learning path with the following:

## 1. Skill Clusters
Identify ALL relevant skill clusters from: dsa, oop, system-design, debugging, databases, api-design, testing, devops, frontend, backend, security, performance

## 2. Difficulty Assessment
Suggest starting difficulty (1-10 scale, where 1-3 is beginner, 4-6 is intermediate, 7-10 is advanced)

## 3. Path Overview
- estimatedTotalHours: Total hours to complete the entire path
- targetOutcome: What the learner will be able to do after completing this path
- prerequisites: What the learner should already know before starting
- milestones: 3-5 major milestones that mark significant progress points

## 4. Topics (Generate 8-12 comprehensive topics)
For EACH topic, provide:

- id: Unique identifier (format: topic_<descriptive_slug>_<random_4chars>)
- title: Clear, specific title
- description: 2-3 sentence description of what this topic covers
- skillCluster: Primary skill cluster this belongs to
- difficulty: Difficulty level (1-10)
- prerequisites: Array of topic IDs that should be completed first
- order: Suggested order in the learning path (0-indexed)
- estimatedMinutes: Time to master this topic (15-120 minutes)
- interviewRelevance: Why this topic matters for technical interviews

- learningObjectives: 3-5 specific, measurable objectives like:
  - { id: "obj_1", description: "Explain the time complexity of common sorting algorithms", isCore: true }
  - { id: "obj_2", description: "Implement quicksort from scratch", isCore: true }
  - { id: "obj_3", description: "Compare and contrast different sorting approaches", isCore: false }

- subtopics: 2-4 subtopics that break down the main topic:
  - { id: "sub_1", title: "Understanding Big O Notation", description: "...", estimatedMinutes: 20 }

- keyConceptsToMaster: 4-6 key concepts as strings, e.g., ["Time complexity", "Space complexity", "Best/worst/average case"]

- commonMistakes: 2-4 common mistakes learners make, e.g., ["Confusing O(n) with O(n²)", "Forgetting edge cases"]

- realWorldApplications: 2-3 real-world applications, e.g., ["Database indexing", "Search engine ranking"]

- resources: 2-3 recommended resources:
  - { title: "Visualgo Sorting", type: "practice", description: "Interactive sorting visualizations" }
  - Types: documentation, article, video, practice, book

## Topic Sequencing Guidelines:
1. Start with foundational concepts before advanced ones
2. Build complexity gradually
3. Group related topics together
4. Ensure prerequisites form a logical dependency graph
5. Include both theoretical understanding and practical application topics
6. Cover common interview patterns and questions for each area

## Quality Requirements:
- Each topic should be substantial enough for 15-120 minutes of focused learning
- Learning objectives should be specific and measurable
- Include topics that cover both breadth and depth
- Ensure the path prepares for real technical interviews
- Include debugging and problem-solving topics where relevant`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: ParsedGoalSchema,
    system: `You are a world-class technical educator and interview preparation specialist with deep expertise in software engineering education. Your role is to design comprehensive, structured learning paths that thoroughly prepare candidates for technical interviews.

Key principles:
- Be thorough and detailed - learners need comprehensive coverage
- Focus on practical, interview-relevant skills
- Build knowledge progressively from fundamentals to advanced concepts
- Include real-world context and applications
- Anticipate common misconceptions and address them
- Create clear dependencies between topics
- Balance theory with hands-on practice opportunities`,
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

  // Parse goal to extract skill clusters and comprehensive curriculum
  const parsed = await parseGoal(goal, apiKey, byokConfig);

  // Create the learning path with overview metadata
  const learningPath = await learningPathRepository.create({
    userId,
    goal: goal.trim(),
    programmingLanguage: 'typescript',
    skillClusters: parsed.skillClusters,
    baselineDifficulty: parsed.suggestedDifficulty,
    currentDifficulty: parsed.suggestedDifficulty,
    isActive: true,
  });

  // Sort topics by order and add all of them to the learning path
  const sortedTopics = [...parsed.topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  for (const topic of sortedTopics) {
    await learningPathRepository.addTopic(learningPath._id, topic);
  }

  // Set the first topic (lowest order, no prerequisites) as current
  const firstTopic = sortedTopics.find(t => 
    !t.prerequisites || t.prerequisites.length === 0
  ) || sortedTopics[0];
  
  await learningPathRepository.setCurrentTopic(
    learningPath._id,
    firstTopic.id
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
    // Sort by order first, then by difficulty match
    const sortedTopics = availableTopics.sort((a, b) => {
      // Prefer topics with lower order (earlier in curriculum)
      const orderDiff = (a.order ?? 999) - (b.order ?? 999);
      if (orderDiff !== 0) return orderDiff;
      
      // Then by how close the topic difficulty is to current difficulty
      const aDiff = Math.abs(a.difficulty - path.currentDifficulty);
      const bDiff = Math.abs(b.difficulty - path.currentDifficulty);
      return aDiff - bDiff;
    });
    return sortedTopics[0];
  }

  // No available topics - generate a comprehensive new one
  const completedTopicsList = path.topics
    .filter((t) => completedTopicIds.has(t.id))
    .map((t) => `- ${t.title} (${t.skillCluster}, difficulty ${t.difficulty})`)
    .join("\n") || "None";

  // Gather search context for better topic generation
  const searchContext = await gatherLearningContext(
    `${path.goal} ${path.skillClusters.join(" ")} advanced topics`
  );

  const prompt = `Generate a NEW, COMPREHENSIVE learning topic to extend this learning path.${searchContext}

## Current Learning Path Context
Learning Goal: "${path.goal}"
Skill Clusters: ${path.skillClusters.join(", ")}
Current ELO: ${path.overallElo}
Current Difficulty Level: ${path.currentDifficulty}/10

## Completed Topics:
${completedTopicsList}

## Requirements for the New Topic

Generate a topic that:
1. Advances the user toward their learning goal
2. Matches their current skill level (ELO ${path.overallElo}, difficulty ${path.currentDifficulty})
3. Builds logically on completed topics
4. Belongs to one of: ${path.skillClusters.join(", ")}
5. Covers material NOT already covered in completed topics

Provide a DETAILED topic with:
- id: Unique identifier (topic_<descriptive_slug>_<random_4chars>)
- title: Clear, specific title
- description: 2-3 sentence description
- skillCluster: Primary skill cluster
- difficulty: Appropriate difficulty (1-10)
- prerequisites: IDs of topics that should be completed first (from existing topics)
- order: Next order number (${path.topics.length})
- estimatedMinutes: Time to master (15-120 minutes)
- interviewRelevance: Why this matters for interviews

- learningObjectives: 3-5 specific, measurable objectives with:
  - id: Unique objective ID
  - description: What the learner will be able to do
  - isCore: Whether this is a core (required) objective

- subtopics: 2-4 subtopics breaking down the main topic:
  - id: Unique subtopic ID
  - title: Subtopic title
  - description: What this subtopic covers
  - estimatedMinutes: Time for this subtopic

- keyConceptsToMaster: 4-6 key concepts as strings
- commonMistakes: 2-4 common mistakes learners make
- realWorldApplications: 2-3 real-world applications

- resources: 2-3 recommended resources with:
  - title: Resource name
  - type: One of: documentation, article, video, practice, book
  - description: Brief description of the resource`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: GeneratedTopicSchema,
    system: `You are a world-class technical educator designing comprehensive learning content. Create detailed, interview-focused topics that thoroughly prepare candidates. Each topic should be substantial and include practical, actionable learning objectives.`,
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
