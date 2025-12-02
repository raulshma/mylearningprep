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
import {
  TASK_TIER_MAPPING,
  type ModelTier,
  type AITask,
} from "@/lib/db/schemas/settings";
import { getTierConfigFromDB } from "@/lib/db/tier-config";

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
// Note: We don't enforce min() here because streamObject needs to build up the array incrementally
// The count is enforced via the prompt - the AI is instructed to generate the requested number
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

CRITICAL RULES:
- ALWAYS write actual, complete content - NEVER use placeholders like "[content here]", "[800 words]", or "[Follow-Up Questions Array]"
- Every piece of content must be fully written out with real information
- Code examples must be real, working code - not pseudo-code or placeholders
- Generate complete responses for every field requested

Guidelines:
- Be extremely thorough and detailed in all content you generate
- Provide extensive explanations with real-world examples and practical applications
- Cover edge cases, common pitfalls, and advanced considerations
- Use the candidate's experience to personalize content and identify skill gaps
- Focus on practical, actionable preparation material that mirrors real interview scenarios
- When generating MCQs, ensure all options are plausible and test deep understanding
- For revision topics, provide comprehensive explanations with code examples, diagram descriptions, and multiple perspectives
- Include industry best practices, performance considerations, and trade-offs
- Reference common interview patterns and what top companies typically ask
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

Format your response as a structured brief with clear markdown sections and bullet points for readability.${ctx.customInstructions
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
 * Infer seniority level from job title
 */
function inferSeniorityLevel(jobTitle: string): 'junior' | 'mid' | 'senior' | 'staff' {
  const title = jobTitle.toLowerCase();
  if (title.includes('staff') || title.includes('principal') || title.includes('distinguished') || title.includes('architect')) {
    return 'staff';
  }
  if (title.includes('senior') || title.includes('sr.') || title.includes('lead') || title.includes('iii')) {
    return 'senior';
  }
  if (title.includes('junior') || title.includes('jr.') || title.includes('entry') || title.includes('associate') || title.includes('i') && !title.includes('ii')) {
    return 'junior';
  }
  return 'mid';
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
    ? `\n\nExisting topics to avoid duplicating:\n${ctx.existingContent.join("\n")}`
    : "";

  const seniorityLevel = inferSeniorityLevel(ctx.jobTitle);

  const seniorityGuidance = {
    junior: `Target depth: Foundational concepts with clear explanations. Focus on core fundamentals, basic patterns, and common gotchas. Assume 0-2 years experience. Interviewers will test understanding of basics and ability to learn.`,
    mid: `Target depth: Solid understanding with practical application. Cover standard patterns, trade-offs, and real implementation details. Assume 2-5 years experience. Interviewers will test problem-solving and hands-on knowledge.`,
    senior: `Target depth: Deep expertise with system-level thinking. Include architectural decisions, scalability concerns, and leadership aspects. Assume 5-8 years experience. Interviewers will test design skills and technical leadership.`,
    staff: `Target depth: Expert-level with strategic thinking. Cover cross-system architecture, organizational impact, and mentorship angles. Assume 8+ years experience. Interviewers will test vision, influence, and complex problem decomposition.`
  };

  const prompt = `Generate ${count} interview preparation topics for a ${ctx.jobTitle} position at ${ctx.company}.

## CANDIDATE CONTEXT

**Job Requirements:**
${ctx.jobDescription}

**Candidate Background:**
${ctx.resumeText}
${existingTopicsNote}

## TOPIC SELECTION STRATEGY

Analyze gaps between job requirements and candidate experience. Select topics that:
- Address skills required by the job but missing/weak in the resume (prioritize these)
- Cover core competencies interviewers always ask about for this role
- Include differentiators that could set the candidate apart

## CALIBRATION: ${seniorityLevel.toUpperCase()} LEVEL

${seniorityGuidance[seniorityLevel]}

## REQUIRED OUTPUT FOR EACH TOPIC

Generate exactly ${count} topics. For EACH topic, you MUST provide ALL of the following fields:

1. **id**: Unique identifier (format: "topic_" + 8 random alphanumeric chars, e.g., "topic_a7f3b2c9")
2. **title**: Specific, actionable topic name (e.g., "Database Indexing Strategies" not just "Databases")
3. **confidence**: "low", "medium", or "high" (how likely this topic will be asked)
4. **reason**: 1-2 sentences explaining WHY this topic matters for THIS specific interview
5. **content**: Complete markdown content following the structure below (400-600 words)
6. **difficulty**: "${seniorityLevel}" (must be one of: junior, mid, senior, staff)
7. **estimatedMinutes**: Realistic study time in minutes (15-60 minutes recommended)
8. **prerequisites**: Array of 2-4 prerequisite concepts (e.g., ["JavaScript basics", "Async programming"])
9. **skillGaps**: Array of 1-3 skills from the job description this topic addresses (be specific)
10. **followUpQuestions**: Array of 3-5 likely follow-up questions an interviewer would ask

## CONTENT STRUCTURE (800-1200 words per topic)

For the "content" field, write comprehensive, well-formatted markdown with proper spacing between sections:

### Quick Overview

A 3-4 sentence summary explaining what this topic is, why it matters in production systems, and how it's typically used in industry. Set the context for why interviewers care about this.

### Core Concepts

Explain 5-7 fundamental principles in detail:
- **Concept 1**: Detailed explanation with context
- **Concept 2**: How it works under the hood
- **Concept 3**: Relationship to other concepts
- **Concept 4**: Common variations or implementations
- **Concept 5**: Performance characteristics

Include how these concepts interact and build upon each other.

### How It Works

Step-by-step explanation of the mechanism or process:
1. First step with technical details
2. Second step explaining the flow
3. Third step covering edge cases

Include diagram descriptions where helpful (e.g., "Imagine a flow: Client → Load Balancer → Server Pool → Database").

### Practical Implementation

\`\`\`language
// Comprehensive code example (15-30 lines)
// Include error handling
// Show real-world usage patterns
// Add detailed comments explaining each part
\`\`\`

Explain the code: what it does, why certain choices were made, and how to extend it.

### Common Interview Questions

**Q: What is [topic] and why is it important?**
A: Structured answer with definition, use cases, and benefits.

**Q: How would you implement [topic] in a production system?**
A: Step-by-step approach covering architecture, trade-offs, and considerations.

**Q: What are the trade-offs of [topic]?**
A: Balanced analysis of pros, cons, and when to use alternatives.

**Q: Can you explain a time you used [topic]?**
A: STAR format answer framework (Situation, Task, Action, Result).

**Q: How does [topic] compare to [alternative]?**
A: Comparison covering performance, complexity, and use cases.

### Best Practices & Common Pitfalls

**Do:**
- Best practice 1 with explanation
- Best practice 2 with example
- Best practice 3 with reasoning

**Avoid:**
- Common mistake 1 and why it's problematic
- Common mistake 2 and how to fix it
- Anti-pattern and better alternative

### Real-World Applications

How this is used at scale:
- Example from well-known companies or systems
- Production considerations and optimizations
- Monitoring and debugging approaches

## GENERATION RULES

1. **Proper Markdown**: Include blank lines between headings and content. Each section must be clearly separated with proper formatting.

2. **Word Count**: 800-1200 words per topic for comprehensive coverage.

3. **Real Content Only**: No placeholders - provide actual technical explanations, working code examples, and specific details.

4. **Interview-Ready**: Content should prepare candidates to answer real interview questions confidently.

5. **Complete All Topics**: Generate ALL ${count} topics with all 10 fields populated.

6. **Field Requirements**:
   - "id": starts with "topic_" + 8 random chars
   - "difficulty": "${seniorityLevel}"
   - "estimatedMinutes": 15-60
   - "prerequisites": array of 2-4 items
   - "skillGaps": array of 1-3 items
   - "followUpQuestions": array of 3-5 questions${ctx.customInstructions
      ? `\n\n## ADDITIONAL USER INSTRUCTIONS\n${ctx.customInstructions}`
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
    ? `\n\nExisting question IDs to avoid duplicating (generate completely different questions):\n${ctx.existingContent.join("\n")}`
    : "";

  const seniorityLevel = inferSeniorityLevel(ctx.jobTitle);

  const seniorityMCQGuidance = {
    junior: `Focus on fundamentals and common gotchas. Test understanding of basic concepts, syntax, and standard patterns. Questions should be answerable by someone with 0-2 years experience who has studied well.`,
    mid: `Balance fundamentals with practical application. Include questions about trade-offs, debugging scenarios, and real-world implementation choices. Target 2-5 years experience level.`,
    senior: `Emphasize architectural decisions, system design trade-offs, and leadership scenarios. Include questions about scalability, performance optimization, and mentoring situations. Target 5-8 years experience.`,
    staff: `Focus on cross-system architecture, organizational impact, and strategic technical decisions. Include questions about tech strategy, team scaling, and complex system interactions. Target 8+ years experience.`,
  };

  const prompt = `You are creating a technical interview assessment. Generate ${count} multiple choice questions that mirror what real interviewers ask at ${ctx.company || "top tech companies"}.

## CONTEXT

**Position:** ${ctx.jobTitle}
**Company:** ${ctx.company}
**Seniority Level:** ${seniorityLevel.toUpperCase()}

**Job Requirements:**
${ctx.jobDescription}

**Candidate Background:**
${ctx.resumeText}
${existingQuestionsNote}

## DIFFICULTY CALIBRATION

${seniorityMCQGuidance[seniorityLevel]}

## STRATEGIC QUESTION SELECTION

Analyze the gap between job requirements and candidate experience. Create questions that:

1. **Test Critical Gaps** (40%): Skills required by the job but weak/missing in resume
2. **Verify Core Competencies** (40%): Must-have skills for this role level
3. **Probe Advanced Knowledge** (20%): Differentiator topics for strong candidates

## QUESTION TYPE MIX (calibrated for ${seniorityLevel} level)

${seniorityLevel === "junior" || seniorityLevel === "mid" ? `
- 3-4 **Conceptual Questions**: "What is X?" / "Which statement about X is true?"
- 2-3 **Code Analysis**: "What does this code output?" / "What's wrong with this code?"
- 2-3 **Scenario-Based**: "Given situation X, what's the best approach?"
- 1-2 **Best Practices**: "What's the recommended way to handle X?"
` : `
- 2-3 **Architecture/Design**: "Which approach best handles X at scale?"
- 2-3 **Trade-off Analysis**: "What's the primary trade-off of choosing X over Y?"
- 2-3 **Debugging/Troubleshooting**: "Production system shows X symptoms, what's the likely cause?"
- 2-3 **Leadership/Process**: "How would you approach X situation with your team?"
`}

## OUTPUT FORMAT

For each MCQ:

1. **id**: Unique identifier (format: mcq_<random_8chars>)

2. **question**: Clear, specific question that:
   - Tests real interview-level knowledge for ${seniorityLevel} candidates
   - Includes code snippets where relevant (properly formatted)
   - References realistic scenarios
   - Is unambiguous - only one answer should be clearly correct

3. **options**: Exactly 4 options where:
   - One is definitively correct
   - Three are plausible distractors representing:
     - Common misconceptions
     - Partially correct understanding
     - Related but incorrect concepts
   - All options are similar in length and specificity
   - Options are shuffled (correct answer not always in same position)

4. **answer**: Must EXACTLY match one of the options (copy-paste, not paraphrased)

5. **explanation**: Comprehensive explanation (4-6 sentences) that:
   - States why the correct answer is right with technical reasoning
   - Explains why EACH wrong option is incorrect (mention each by name/content)
   - Provides interview tip: "In an interview, also mention..."
   - References real-world implications where relevant

6. **source**: "ai"

## QUALITY CHECKLIST

Before finalizing each question, verify:
- [ ] Question is appropriate for ${seniorityLevel} level
- [ ] Only ONE answer is correct
- [ ] Distractors are plausible (not obviously wrong)
- [ ] Explanation addresses all 4 options
- [ ] Code snippets (if any) are syntactically correct
- [ ] Question tests job-relevant knowledge${ctx.customInstructions
      ? `\n\n## ADDITIONAL USER INSTRUCTIONS\n${ctx.customInstructions}`
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
    ? `\n\nExisting questions to avoid duplicating:\n${ctx.existingContent.join("\n")}`
    : "";

  const seniorityLevel = inferSeniorityLevel(ctx.jobTitle);

  const seniorityRapidFireGuidance = {
    junior: `Focus on definitions, basic concepts, and fundamental "what is" questions. Answers should be straightforward explanations a bootcamp grad could give after studying.`,
    mid: `Mix definitions with "how" and "why" questions. Include practical scenarios and comparison questions. Answers should show working knowledge.`,
    senior: `Emphasize trade-offs, architectural decisions, and "when would you" questions. Answers should demonstrate experience and nuanced understanding.`,
    staff: `Focus on strategic decisions, cross-cutting concerns, and organizational impact. Answers should reflect broad experience and leadership perspective.`,
  };

  const prompt = `Generate ${count} rapid-fire interview questions that interviewers use to quickly assess a candidate's baseline knowledge. These are the "warm-up" questions before diving deeper.

## CONTEXT

**Position:** ${ctx.jobTitle}
**Company:** ${ctx.company}
**Seniority Level:** ${seniorityLevel.toUpperCase()}

**Job Requirements:**
${ctx.jobDescription}

**Candidate Background:**
${ctx.resumeText}
${existingQuestionsNote}

## DIFFICULTY CALIBRATION

${seniorityRapidFireGuidance[seniorityLevel]}

## QUESTION CATEGORIES

Generate a strategic mix based on job requirements:

**From Job Description (50% - ${Math.round(count * 0.5)} questions):**
- Technologies explicitly mentioned in the job posting
- Frameworks and tools required for the role
- Domain-specific concepts

**Core Competencies (30% - ${Math.round(count * 0.3)} questions):**
- Language fundamentals for the primary tech stack
- Data structures & algorithms basics
- Design patterns and best practices

**Gap-Filling (20% - ${Math.round(count * 0.2)} questions):**
- Topics in job description but weak/missing in candidate's resume
- Common interview topics for this role level

## QUESTION TYPES (vary these)

- "What is X?" - Definition questions
- "What's the difference between X and Y?" - Comparison questions
- "When would you use X over Y?" - Decision questions
- "How does X work?" - Mechanism questions
- "Why is X important?" - Reasoning questions
- "What happens when X?" - Behavior questions

## OUTPUT FORMAT

For each question:

1. **id**: Unique identifier (format: rf_<random_8chars>)

2. **question**: Clear, direct question that:
   - Can be answered in 30-60 seconds
   - Has a definitive "correct" answer (not opinion-based)
   - Tests knowledge an interviewer expects at ${seniorityLevel} level
   - Is specific, not vague (e.g., "What is the time complexity of HashMap.get()?" not "Tell me about HashMaps")

3. **answer**: The ideal response (2-4 sentences) that:
   - Hits the key points interviewers listen for
   - Is specific and technical (not hand-wavy)
   - Could be spoken naturally in conversation
   - Includes one "bonus point" detail that impresses interviewers

## ORDERING

Order questions strategically:
1. Start with fundamentals (warm-up)
2. Progress to job-specific technologies
3. End with more nuanced/advanced questions

This mirrors how real interviewers structure rapid-fire rounds.

## QUALITY GUIDELINES

- Questions should be answerable without context (self-contained)
- Avoid questions that require lengthy code explanations
- Each answer should be memorizable for interview prep
- Focus on practical knowledge over trivia${ctx.customInstructions
      ? `\n\n## ADDITIONAL USER INSTRUCTIONS\n${ctx.customInstructions}`
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

  const seniorityLevel = topic.difficulty || inferSeniorityLevel(_ctx.jobTitle);

  const styleDescriptions = {
    professional: `Use professional, technical language appropriate for a ${seniorityLevel}-level developer. Include industry terminology, architectural considerations, and best practices. Write as if explaining to a peer in a technical discussion.`,
    construction: `Explain using house construction analogies - compare software concepts to building a house. Make technical concepts relatable through building metaphors (foundation = core architecture, plumbing = data flow, electrical = event systems, etc.). Keep the interview-readiness but make it memorable.`,
    simple: `Explain as if to someone completely new to programming - use simple words, everyday examples, and avoid jargon. Use fun analogies anyone would understand. Still cover the key points an interviewer expects, but in accessible language.`,
  };

  const prompt = `Regenerate the explanation for this interview preparation topic using a different communication style while maintaining interview-readiness.

## TOPIC DETAILS
- **Title**: ${topic.title}
- **Why It Matters**: ${topic.reason}
- **Target Level**: ${seniorityLevel}
- **Confidence**: ${topic.confidence} likelihood of being asked
${topic.skillGaps?.length ? `- **Addresses Gaps**: ${topic.skillGaps.join(", ")}` : ""}
${topic.prerequisites?.length ? `- **Prerequisites**: ${topic.prerequisites.join(", ")}` : ""}

## STYLE REQUIREMENTS
**Target Style**: ${style.toUpperCase()}
${styleDescriptions[style]}

## CONTENT STRUCTURE

Rewrite the content (800-1200 words) maintaining this interview-focused structure but in the ${style} style:

## What It Is & Why It Matters
- Concise definition in ${style} style
- Business/practical impact
- Big picture context

## Core Concepts to Articulate
Present 4-6 key concepts using ${style === "construction" ? "building analogies" : style === "simple" ? "everyday examples" : "technical precision"}:
- Each concept clearly explained
- How concepts relate to each other
- Common misconceptions

## How to Explain It (Interview-Ready)
- 30-second explanation (${style} style)
- 2-3 minute deep dive (${style} style)
- Mental model or analogy to use

## Practical Code/Implementation
\`\`\`language
// Code example with ${style === "simple" ? "very detailed beginner-friendly" : style === "construction" ? "building-analogy" : "professional"} comments
// Show the concept in action
\`\`\`

## Interview Question Patterns
Reframe these questions and answers in ${style} style:
1. Basic "What is X?" with answer framework
2. "How does X work?" with key points
3. "When would you use X?" with decision criteria
4. Trade-offs question with nuanced answer

## Common Follow-Up Questions
3-4 follow-ups interviewers ask, with ${style}-style answer hints

## Red Flags to Avoid
What NOT to say (in ${style} terms)

## PRESERVE THESE FIELDS
- Keep the same id: ${topic.id}
- Keep the same title: ${topic.title}
- Keep the same reason
- Keep the same confidence level: ${topic.confidence}
- Keep difficulty: ${seniorityLevel}
- Keep estimatedMinutes: ${topic.estimatedMinutes || 30}
- Keep prerequisites and skillGaps if present
- Update followUpQuestions to match the new style${_ctx.customInstructions
      ? `\n\n## ADDITIONAL USER INSTRUCTIONS\n${_ctx.customInstructions}`
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
