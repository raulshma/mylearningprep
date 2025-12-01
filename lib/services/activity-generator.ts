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
import { TASK_TIER_MAPPING, type ModelTier } from "@/lib/db/schemas/settings";
import { getTierConfigFromDB } from "@/lib/db/tier-config";
import type { BYOKTierConfig } from "./ai-engine";

// Activity generation context
export interface ActivityGeneratorContext {
  goal: string;
  topic: LearningTopic;
  difficulty: DifficultyLevel;
  skillCluster: SkillCluster;
  previousActivities?: ActivityType[];
}

/**
 * Get effective config for an activity task, considering BYOK overrides
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
 * Build enhanced topic context from detailed topic fields
 */
function buildTopicContext(topic: LearningTopic): string {
  const sections: string[] = [];
  
  sections.push(`Topic: ${topic.title}`);
  sections.push(`Description: ${topic.description}`);
  
  if (topic.learningObjectives && topic.learningObjectives.length > 0) {
    const objectives = topic.learningObjectives
      .filter(obj => obj.isCore)
      .map(obj => `  - ${obj.description}`)
      .join('\n');
    if (objectives) {
      sections.push(`Core Learning Objectives:\n${objectives}`);
    }
  }
  
  if (topic.keyConceptsToMaster && topic.keyConceptsToMaster.length > 0) {
    sections.push(`Key Concepts: ${topic.keyConceptsToMaster.join(', ')}`);
  }
  
  if (topic.subtopics && topic.subtopics.length > 0) {
    const subtopics = topic.subtopics.map(s => `  - ${s.title}: ${s.description}`).join('\n');
    sections.push(`Subtopics:\n${subtopics}`);
  }
  
  if (topic.commonMistakes && topic.commonMistakes.length > 0) {
    sections.push(`Common Mistakes to Address: ${topic.commonMistakes.join('; ')}`);
  }
  
  if (topic.realWorldApplications && topic.realWorldApplications.length > 0) {
    sections.push(`Real-World Applications: ${topic.realWorldApplications.join(', ')}`);
  }
  
  if (topic.interviewRelevance) {
    sections.push(`Interview Relevance: ${topic.interviewRelevance}`);
  }
  
  return sections.join('\n\n');
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

  const topicContext = buildTopicContext(ctx.topic);

  const prompt = `Generate a multiple choice question for learning about "${ctx.topic.title}".

## Context
Learning Goal: ${ctx.goal}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

## Topic Details
${topicContext}

## Requirements
1. Create a clear, specific question that tests understanding of one of the key concepts or learning objectives
2. Provide exactly 4 answer options
3. One option must be correct, three must be plausible but incorrect
4. Include a detailed explanation of why the correct answer is right
5. The difficulty should match level ${ctx.difficulty}/10
6. If possible, incorporate common mistakes as incorrect options to help learners recognize them
7. Connect the question to real-world applications when appropriate

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

  const topicContext = buildTopicContext(ctx.topic);

  const prompt = `Generate a coding challenge for learning about "${ctx.topic.title}".

## Context
Learning Goal: ${ctx.goal}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

## Topic Details
${topicContext}

## Requirements
1. Create a practical coding problem that tests one or more of the key concepts or learning objectives
2. Provide clear input and output format specifications
3. Include specific evaluation criteria for the solution
4. Provide sample input and expected output
5. Optionally include starter code if helpful
6. The difficulty should match level ${ctx.difficulty}/10
7. Design the problem to reflect real-world applications when possible
8. Consider common mistakes and design the problem to help learners avoid them

Generate a JSON object with:
- type: "coding-challenge"
- problemDescription: detailed problem statement with context and requirements
- inputFormat: description of input format
- outputFormat: description of expected output format
- evaluationCriteria: array of criteria for evaluating the solution (include edge cases)
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

  const topicContext = buildTopicContext(ctx.topic);
  
  // Extract common mistakes to incorporate into bugs
  const commonMistakesContext = ctx.topic.commonMistakes && ctx.topic.commonMistakes.length > 0
    ? `\n\nCommon Mistakes to Incorporate as Bugs:\n${ctx.topic.commonMistakes.map(m => `- ${m}`).join('\n')}`
    : '';

  const prompt = `Generate a debugging task for learning about "${ctx.topic.title}".

## Context
Learning Goal: ${ctx.goal}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

## Topic Details
${topicContext}${commonMistakesContext}

## Requirements
1. Create code with intentional bugs related to the topic's key concepts
2. The bugs should be realistic - ones that developers commonly encounter
3. If common mistakes are listed above, incorporate them as bugs in the code
4. Describe the expected behavior clearly
5. Provide hints to guide the learner (more hints for lower difficulty)
6. The difficulty should match level ${ctx.difficulty}/10
7. For lower difficulty (1-4), include 1-2 obvious bugs with clear hints
8. For medium difficulty (5-7), include 2-3 bugs with subtle hints
9. For higher difficulty (8-10), include multiple subtle bugs with minimal hints

Generate a JSON object with:
- type: "debugging-task"
- buggyCode: code containing intentional bugs (use realistic, production-like code). IMPORTANT: Format the code with proper newlines (\\n) and indentation - do NOT put all code on a single line.
- expectedBehavior: description of what the code should do when fixed
- hints: array of hints to help find the bugs (adjust quantity based on difficulty)`;

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

  const topicContext = buildTopicContext(ctx.topic);

  const prompt = `Generate a comprehensive concept explanation for learning about "${ctx.topic.title}".

## Context
Learning Goal: ${ctx.goal}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

## Topic Details
${topicContext}

## Requirements
1. Provide a COMPREHENSIVE explanation covering all key concepts and learning objectives
2. Structure the explanation with clear sections using markdown headers
3. Include key points that summarize the most important aspects (5-7 points)
4. Include practical, real-world examples that demonstrate the concepts
5. Address common mistakes and misconceptions
6. Explain why this topic matters for technical interviews
7. Adapt the complexity to difficulty level ${ctx.difficulty}/10
8. For lower difficulty (1-4), use simpler language, more analogies, and step-by-step explanations
9. For medium difficulty (5-7), balance theory with practical application
10. For higher difficulty (8-10), include advanced nuances, edge cases, and performance considerations

Generate a JSON object with:
- type: "concept-explanation"
- content: detailed explanation in markdown format (include headers, code examples, and clear structure)
- keyPoints: array of 5-7 key takeaways
- examples: array of 2-4 practical examples with code snippets where appropriate`;

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
 * Map activity types to their corresponding task names for tier config
 */
function getTaskForActivityType(activityType: ActivityType): string {
  switch (activityType) {
    case 'mcq':
      return 'generate_mcq_activity';
    case 'coding-challenge':
      return 'generate_coding_challenge';
    case 'debugging-task':
      return 'generate_debugging_task';
    case 'concept-explanation':
      return 'generate_concept_explanation';
    default:
      return 'generate_mcq_activity';
  }
}

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
  const task = getTaskForActivityType(activityType);
  
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
  const topicContext = buildTopicContext(ctx.topic);
  
  const baseContext = `## Context
Learning Goal: ${ctx.goal}
Skill Cluster: ${ctx.skillCluster}
Difficulty Level: ${ctx.difficulty}/10 (${getDifficultyDescription(ctx.difficulty)})

## Topic Details
${topicContext}`;

  switch (activityType) {
    case 'mcq':
      return `Generate a multiple choice question for learning about "${ctx.topic.title}".

${baseContext}

Create a question that tests understanding of the key concepts. Include 4 plausible options with one correct answer and a detailed explanation.

Generate a JSON object with type "mcq", question, options (exactly 4), correctAnswer, and explanation.`;

    case 'coding-challenge':
      return `Generate a coding challenge for learning about "${ctx.topic.title}".

${baseContext}

Create a practical problem that tests the topic's key concepts with clear requirements and evaluation criteria.

Generate a JSON object with type "coding-challenge", problemDescription, inputFormat, outputFormat, evaluationCriteria, sampleInput, and sampleOutput.`;

    case 'debugging-task':
      return `Generate a debugging task for learning about "${ctx.topic.title}".

${baseContext}

Create realistic buggy code that incorporates common mistakes. Provide hints appropriate for the difficulty level.

Generate a JSON object with type "debugging-task", buggyCode (IMPORTANT: format with proper newlines and indentation, NOT on a single line), expectedBehavior, and hints array.`;

    case 'concept-explanation':
    default:
      return `Generate a comprehensive concept explanation for learning about "${ctx.topic.title}".

${baseContext}

Provide a thorough explanation covering all key concepts, with practical examples and key takeaways.

Generate a JSON object with type "concept-explanation", content (detailed markdown), keyPoints (5-7 items), and examples (2-4 practical examples).`;
  }
}

// Types are already exported via the interface definition above
