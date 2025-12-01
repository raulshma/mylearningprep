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
import { crawlService, isCrawlEnabled } from "./crawl-service";
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

// Plan Context for model tier selection
export interface PlanContext {
  plan: 'FREE' | 'PRO' | 'MAX';
}

// Generation Context
export interface GenerationContext {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  company: string;
  existingContent?: string[];
  customInstructions?: string;
  planContext?: PlanContext;
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
 * Crawl Web Tool Definition Schema
 */
const crawlWebToolSchema = z.object({
  url: z.string().url().describe("The URL to crawl and extract content from"),
  extractionType: z
    .enum(["full", "markdown-only", "metadata-only"])
    .optional()
    .default("markdown-only")
    .describe("Type of content to extract"),
});

/**
 * Combined Search and Crawl Tool Definition Schema
 * This tool first searches for relevant URLs, then crawls the most relevant ones
 */
const searchAndCrawlToolSchema = z.object({
  query: z.string().describe("The search query to find relevant information"),
  crawlTopResults: z
    .number()
    .min(0)
    .max(3)
    .optional()
    .default(1)
    .describe("Number of top search results to crawl for full content (0-3)"),
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
 * Create crawl web tool
 */
function createCrawlWebTool() {
  return {
    crawlWeb: tool({
      description:
        "Crawl and extract full content from a web page. Use this when you need the complete article/page content, not just search snippets. Returns markdown content.",
      inputSchema: crawlWebToolSchema,
      execute: async (params: { url: string; extractionType?: string }) => {
        const result = await crawlService.crawlUrl(params.url, {
          timeout: 15000,
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error || "Failed to crawl URL",
          };
        }

        if (params.extractionType === "metadata-only") {
          return {
            success: true,
            url: result.url,
            metadata: result.metadata,
          };
        }

        return {
          success: true,
          url: result.url,
          markdown: result.markdown,
          metadata: result.metadata,
        };
      },
    }),
  };
}

/**
 * Create combined search and crawl tool
 * This is the recommended tool for interview prep - it searches and optionally crawls top results
 */
function createSearchAndCrawlTool() {
  return {
    searchAndCrawl: tool({
      description:
        "Search the web for information and optionally crawl top results for full content. Use this to get comprehensive, up-to-date information about technologies, frameworks, companies, or interview topics. Set crawlTopResults > 0 to get full article content from the most relevant search results.",
      inputSchema: searchAndCrawlToolSchema,
      execute: async (params: { query: string; crawlTopResults?: number }) => {
        const crawlCount = params.crawlTopResults ?? 1;

        // First, search the web
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
 * Get tools based on configuration
 * Returns search, crawl, and combined search+crawl tools when available
 */
function getTools(searchEnabled: boolean) {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  if (searchEnabled && isSearchEnabled()) {
    Object.assign(tools, createSearchWebTool());
    Object.assign(tools, createSearchAndCrawlTool());
  }

  if (isCrawlEnabled()) {
    Object.assign(tools, createCrawlWebTool());
  }

  return Object.keys(tools).length > 0 ? tools : undefined;
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
  return `You are an expert interview preparation assistant with deep knowledge across software engineering, system design, algorithms, and industry best practices. Your role is to help candidates prepare for technical interviews by generating comprehensive, in-depth, and highly relevant content based on their resume and the job description.

Guidelines:
- Be extremely thorough and detailed in all content you generate
- Provide extensive explanations with real-world examples and practical applications
- Cover edge cases, common pitfalls, and advanced considerations
- Use the candidate's experience to personalize content and identify skill gaps
- Focus on practical, actionable preparation material that mirrors real interview scenarios
- When generating MCQs, ensure all options are plausible and test deep understanding
- For revision topics, provide comprehensive explanations with code examples, diagrams descriptions, and multiple perspectives
- Include industry best practices, performance considerations, and trade-offs
- Reference common interview patterns and what top companies typically ask
- Use web search when you need current information about technologies or frameworks
- Always aim for interview-ready depth that would satisfy a senior interviewer`;
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
 * Get the model tier based on user plan
 * FREE users get standard tier, PRO/MAX users get advanced tier
 */
function getPlanBasedTier(plan?: 'FREE' | 'PRO' | 'MAX'): ModelTier {
  if (!plan || plan === 'FREE') {
    return 'medium'; // Standard tier for FREE users
  }
  return 'high'; // Advanced tier for PRO/MAX users
}

/**
 * Get effective config for a task, considering plan and BYOK overrides
 */
async function getEffectiveConfig(
  task: AITask,
  byokConfig?: BYOKTierConfig,
  planContext?: PlanContext
): Promise<{
  model: string;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
  tier: ModelTier;
}> {
  // Determine tier: use plan-based tier if provided, otherwise use task-based tier
  let tier = TASK_TIER_MAPPING[task] || "high";
  
  if (planContext?.plan) {
    tier = getPlanBasedTier(planContext.plan);
  }

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
 * Requirements: 5.1, 5.2, 5.4
 */
export async function generateOpeningBrief(
  ctx: GenerationContext,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "generate_opening_brief",
    byokTierConfig,
    ctx.planContext
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const prompt = `Generate a comprehensive and detailed opening brief for an interview preparation plan.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}

Generate an EXTENSIVE opening brief that includes:

1. **Executive Summary** (3-4 paragraphs):
   - Detailed analysis of how well the candidate's experience matches the job requirements
   - Specific strengths that align with the role
   - Areas where the candidate may need to demonstrate growth or learning
   - Overall assessment of interview readiness

2. **Key Skills to Highlight** (8-12 skills):
   - List the most important skills from the candidate's background that match the job
   - For each skill, briefly explain WHY it's relevant and HOW to present it
   - Include both technical and soft skills

3. **Gap Analysis**:
   - Identify any requirements in the job description that aren't clearly covered by the resume
   - Suggest how to address these gaps in the interview (transferable skills, quick learning, etc.)

4. **Company & Role Insights**:
   - What the candidate should research about the company
   - Likely interview focus areas based on the job description
   - Questions the candidate should prepare to ask

5. **Preparation Strategy**:
   - Estimated preparation time needed (be specific: X hours for topics, Y hours for practice)
   - Priority areas to focus on
   - Recommended preparation sequence

6. **Experience Match Analysis**:
   - Provide an experience match percentage (0-100) with justification
   - Break down the match by category (technical skills, experience level, domain knowledge)

Format your response as a structured brief with clear markdown sections and bullet points for readability.${
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
 * Requirements: 5.1, 5.2, 5.4
 */
export async function generateTopics(
  ctx: GenerationContext,
  count: number = 8,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "generate_topics",
    byokTierConfig,
    ctx.planContext
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const existingTopicsNote = ctx.existingContent?.length
    ? `\n\nExisting topics to avoid duplicating:\n${ctx.existingContent.join(
        "\n"
      )}`
    : "";

  const prompt = `Generate ${count} comprehensive revision topics for interview preparation. Each topic should be EXTENSIVE and interview-ready.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}
${existingTopicsNote}

For each topic, provide DETAILED content structured as follows:

1. A unique ID (use format: topic_<random_string>)
2. A clear, specific title

3. **Content** (use markdown formatting, aim for 800-1200 words per topic):

   ## Quick Overview
   A 3-4 sentence summary explaining what this topic is, why it matters, and how it's typically used in industry.

   ## Core Concepts
   - Explain the fundamental principles (5-7 key concepts)
   - Define important terminology
   - Describe how components interact

   ## How It Works
   - Step-by-step explanation of the mechanism/process
   - Include diagrams descriptions where helpful (e.g., "Imagine a flow: Client → Load Balancer → Server Pool")
   - Explain the underlying architecture or algorithm

   ## Practical Implementation
   \`\`\`language
   // Comprehensive code example with detailed comments
   // Show real-world usage patterns
   // Include error handling and edge cases
   \`\`\`

   ## Common Interview Questions
   - List 3-5 questions interviewers commonly ask about this topic
   - Provide brief answer frameworks for each

   ## Best Practices & Pitfalls
   - What are the industry best practices?
   - Common mistakes to avoid
   - Performance considerations
   - Trade-offs to discuss

   ## Real-World Applications
   - How is this used at scale in production systems?
   - Examples from well-known companies or systems

4. **Reason**: A detailed explanation (2-3 sentences) of why this topic is critical for THIS specific interview, referencing the job description

5. **Confidence Level**: (low, medium, high) - how likely this topic will come up, with brief justification

Focus on topics that:
- Bridge gaps between the candidate's experience and job requirements
- Are commonly asked in technical interviews for this role level
- Demonstrate both theoretical understanding and practical application
- Cover a mix of fundamentals and advanced concepts${
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
 * Uses HIGH tier model - requires accurate technical knowledge for quality questions
 * Requirements: 5.1, 5.2, 5.4
 */
export async function generateMCQs(
  ctx: GenerationContext,
  count: number = 10,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig("generate_mcqs", byokTierConfig, ctx.planContext);
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const existingQuestionsNote = ctx.existingContent?.length
    ? `\n\nExisting question IDs to avoid duplicating (generate completely different questions):\n${ctx.existingContent.join(
        "\n"
      )}`
    : "";

  const prompt = `Generate ${count} challenging multiple choice questions for interview preparation. These should test DEEP understanding, not surface-level knowledge.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}
${existingQuestionsNote}

Generate a diverse mix of question types:
- 3-4 conceptual questions (testing understanding of WHY things work)
- 2-3 scenario-based questions (given a situation, what's the best approach?)
- 2-3 code analysis questions (what does this code do, what's wrong with it?)
- 1-2 best practices questions (what's the recommended approach?)

For each MCQ, provide:
1. A unique ID (use format: mcq_<random_string>)
2. A clear, specific question that tests real interview-level knowledge
   - Questions should be challenging enough for a technical interview
   - Include code snippets where relevant
   - Reference real-world scenarios when possible
3. Exactly 4 options:
   - One correct answer
   - Three plausible distractors that represent common misconceptions or partial understanding
   - All options should be similar in length and detail
4. The correct answer (must match one of the options exactly)
5. A COMPREHENSIVE explanation (3-5 sentences) that:
   - Explains why the correct answer is right
   - Explains why each wrong answer is incorrect
   - Provides additional context or tips for the interview
6. Source as "ai" (or "search" if you used web search to verify)

Focus on:
- Topics that are commonly asked in technical interviews for this role
- Questions that differentiate between candidates who truly understand vs. those who memorized
- Practical knowledge that demonstrates job readiness${
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
 * Requirements: 5.1, 5.2, 5.4
 */
export async function generateRapidFire(
  ctx: GenerationContext,
  count: number = 20,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  const tierConfig = await getEffectiveConfig(
    "generate_rapid_fire",
    byokTierConfig,
    ctx.planContext
  );
  const openrouter = getOpenRouterClient(apiKey);
  const modelToUse = config.model || tierConfig.model;

  const existingQuestionsNote = ctx.existingContent?.length
    ? `\n\nExisting questions to avoid duplicating:\n${ctx.existingContent.join(
        "\n"
      )}`
    : "";

  const prompt = `Generate ${count} rapid-fire interview questions with concise but complete answers. These are the quick knowledge-check questions that interviewers use to assess baseline competency.

Job Title: ${ctx.jobTitle}
Company: ${ctx.company}

Job Description:
${ctx.jobDescription}

Candidate's Resume:
${ctx.resumeText}
${existingQuestionsNote}

Generate a comprehensive mix of rapid-fire questions covering:
- Core language/framework concepts (5-6 questions)
- Data structures & algorithms basics (3-4 questions)
- System design fundamentals (3-4 questions)
- Best practices & patterns (3-4 questions)
- Tools & technologies from the job description (3-4 questions)
- Debugging & troubleshooting (2-3 questions)

For each question, provide:
1. A unique ID (use format: rf_<random_string>)
2. A clear, direct question that tests fundamental knowledge
   - These should be questions an interviewer might ask to quickly gauge competency
   - Mix of "What is...", "How does...", "When would you...", "What's the difference between..."
3. A concise but COMPLETE answer (2-4 sentences):
   - The answer should be what a strong candidate would say
   - Include the key points that an interviewer is looking for
   - Be specific, not vague

These questions should:
- Cover the breadth of knowledge expected for this role
- Be answerable in 30-60 seconds by a prepared candidate
- Test practical, job-relevant knowledge
- Progress from fundamental to slightly more advanced${
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
 * Requirements: 5.1, 5.2, 5.4
 */
export async function parseInterviewPrompt(
  prompt: string,
  config: Partial<AIEngineConfig> = {},
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig,
  planContext?: PlanContext
) {
  const tierConfig = await getEffectiveConfig(
    "parse_interview_prompt",
    byokTierConfig,
    planContext
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
 * Requirements: 5.1, 5.2, 5.4
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
    byokTierConfig,
    _ctx.planContext
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

// Export tools for external use
export { createSearchWebTool, createCrawlWebTool, createSearchAndCrawlTool, getTools };

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
