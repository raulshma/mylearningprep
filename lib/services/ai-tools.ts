/**
 * AI Tools Service
 *
 * Provides specialized AI tools for Pro and Max plans:
 * - Technology Trend Analysis
 * - Mock Interview Simulator
 * - GitHub Repository Analysis
 * - System Design Template Generator
 * - Behavioral Answer Framework (STAR)
 * - Learning Resource Aggregator
 *
 * Requirements: Premium features for enhanced AI capabilities
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, streamObject, tool } from "ai";
import { z } from "zod";
import { searchService, isSearchEnabled } from "./search-service";
import { getSettingsCollection } from "@/lib/db/collections";
import {
  SETTINGS_KEYS,
  TASK_TIER_MAPPING,
  type ModelTier,
  type TierModelConfig,
} from "@/lib/db/schemas/settings";
import {
  logAIRequest,
  logAIError,
  createLoggerContext,
  extractTokenUsage,
  type LoggerContext,
  type SearchResultEntry,
} from "./ai-logger";
import type { AIAction } from "@/lib/db/schemas/ai-log";
import type { BYOKTierConfig } from "./ai-engine";

// ============================================================================
// Types & Schemas
// ============================================================================

/**
 * Tool names for tracking and display
 */
export type AIToolName =
  | "searchWeb"
  | "crawlWeb"
  | "searchAndCrawl"
  | "analyzeTechTrends"
  | "mockInterview"
  | "analyzeGitHubRepo"
  | "generateSystemDesign"
  | "generateSTARFramework"
  | "findLearningResources";

/**
 * Tool invocation event for UI display
 */
export interface ToolInvocation {
  toolName: AIToolName;
  displayName: string;
  status: "calling" | "complete" | "error";
  input?: Record<string, unknown>;
  output?: unknown;
  timestamp: Date;
}

// Technology Trend Analysis Schema
const TechTrendSchema = z.object({
  technology: z.string().describe("Name of the technology"),
  popularityScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Current popularity score 0-100"),
  growthTrend: z
    .enum(["rising", "stable", "declining"])
    .describe("Growth trajectory"),
  marketDemand: z.string().describe("Current job market demand assessment"),
  keyStrengths: z
    .array(z.string())
    .describe("Main advantages of this technology"),
  keyWeaknesses: z
    .array(z.string())
    .describe("Potential drawbacks or limitations"),
  relatedSkills: z.array(z.string()).describe("Complementary skills to learn"),
  certifications: z.array(z.string()).describe("Recommended certifications"),
  companiesHiring: z
    .array(z.string())
    .describe("Notable companies using this technology"),
  learningPath: z.string().describe("Suggested learning approach"),
});

export type TechTrend = z.infer<typeof TechTrendSchema>;

const TechTrendsResponseSchema = z.object({
  trends: z.array(TechTrendSchema),
  summary: z.string().describe("Overall market analysis summary"),
  recommendations: z
    .array(z.string())
    .describe("Strategic recommendations for the learner"),
});

export type TechTrendsResponse = z.infer<typeof TechTrendsResponseSchema>;

// Mock Interview Schema
const MockInterviewQuestionSchema = z.object({
  questionNumber: z.number(),
  question: z.string().describe("The interview question"),
  type: z.enum(["behavioral", "technical", "system-design", "situational"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  timeLimit: z.number().describe("Suggested time limit in seconds"),
  hints: z.array(z.string()).describe("Hints to help answer"),
  idealAnswer: z.string().describe("Example of an ideal answer"),
  evaluationCriteria: z
    .array(z.string())
    .describe("What interviewers look for"),
  followUpQuestions: z
    .array(z.string())
    .describe("Potential follow-up questions"),
});

export type MockInterviewQuestion = z.infer<typeof MockInterviewQuestionSchema>;

const MockInterviewSessionSchema = z.object({
  role: z.string(),
  company: z.string(),
  interviewType: z.string(),
  questions: z.array(MockInterviewQuestionSchema),
  tips: z.array(z.string()).describe("General tips for this interview type"),
  commonMistakes: z.array(z.string()).describe("Common mistakes to avoid"),
});

export type MockInterviewSession = z.infer<typeof MockInterviewSessionSchema>;

// GitHub Repository Analysis Schema
const GitHubRepoAnalysisSchema = z.object({
  repoName: z.string(),
  description: z.string(),
  primaryLanguage: z.string(),
  technologies: z
    .array(z.string())
    .describe("Technologies and frameworks detected"),
  architecturePatterns: z
    .array(z.string())
    .describe("Design patterns and architecture used"),
  codeQualityIndicators: z.object({
    hasTests: z.boolean(),
    hasCI: z.boolean(),
    hasDocumentation: z.boolean(),
    hasLinting: z.boolean(),
    hasTypeScript: z.boolean(),
  }),
  suggestedImprovements: z.array(z.string()).describe("Potential improvements"),
  interviewQuestions: z
    .array(z.string())
    .describe("Questions based on the codebase"),
  learningOpportunities: z
    .array(z.string())
    .describe("What you can learn from this repo"),
  keyFiles: z
    .array(
      z.object({
        path: z.string(),
        purpose: z.string(),
      })
    )
    .describe("Important files to understand"),
});

export type GitHubRepoAnalysis = z.infer<typeof GitHubRepoAnalysisSchema>;

// System Design Template Schema
const SystemDesignComponentSchema = z.object({
  name: z.string(),
  type: z.enum([
    "client",
    "server",
    "database",
    "cache",
    "queue",
    "cdn",
    "loadBalancer",
    "service",
    "storage",
    "other",
  ]),
  description: z.string(),
  responsibilities: z.array(z.string()),
  technologies: z
    .array(z.string())
    .describe("Suggested technologies for this component"),
});

const SystemDesignTemplateSchema = z.object({
  systemName: z.string(),
  overview: z.string().describe("High-level system overview"),
  requirements: z.object({
    functional: z.array(z.string()),
    nonFunctional: z.array(z.string()),
  }),
  components: z.array(SystemDesignComponentSchema),
  dataFlow: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      description: z.string(),
      protocol: z.string().optional(),
    })
  ),
  scalabilityConsiderations: z.array(z.string()),
  tradeoffs: z.array(
    z.object({
      decision: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })
  ),
  estimations: z
    .object({
      qps: z.string().optional(),
      storage: z.string().optional(),
      bandwidth: z.string().optional(),
    })
    .optional(),
  diagram: z.string().describe("Mermaid diagram syntax for visualization"),
  interviewTips: z.array(z.string()),
});

export type SystemDesignTemplate = z.infer<typeof SystemDesignTemplateSchema>;

// STAR Framework Schema
const STARResponseSchema = z.object({
  originalSituation: z.string(),
  situation: z.string().describe("The context and background"),
  task: z.string().describe("Your responsibility or challenge"),
  action: z.string().describe("Specific steps you took"),
  result: z.string().describe("Outcomes and impact"),
  metrics: z.array(z.string()).describe("Quantifiable results if applicable"),
  improvedVersion: z.string().describe("Polished version of the full answer"),
  tips: z.array(z.string()).describe("Tips for delivering this answer"),
  followUpPreparation: z.array(
    z.object({
      question: z.string(),
      suggestedResponse: z.string(),
    })
  ),
});

export type STARResponse = z.infer<typeof STARResponseSchema>;

// Learning Resource Schema
const LearningResourceSchema = z.object({
  title: z.string(),
  type: z.enum([
    "documentation",
    "tutorial",
    "video",
    "course",
    "book",
    "practice",
    "tool",
    "article",
  ]),
  url: z.string().optional(),
  description: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedTime: z.string().describe("Estimated time to complete"),
  isFree: z.boolean(),
  provider: z.string().optional(),
});

const LearningResourcesResponseSchema = z.object({
  topic: z.string(),
  level: z.string(),
  resources: z.object({
    documentation: z.array(LearningResourceSchema),
    tutorials: z.array(LearningResourceSchema),
    videos: z.array(LearningResourceSchema),
    courses: z.array(LearningResourceSchema),
    books: z.array(LearningResourceSchema),
    practice: z.array(LearningResourceSchema),
  }),
  learningPath: z.array(
    z.object({
      step: z.number(),
      title: z.string(),
      description: z.string(),
      resources: z.array(z.string()),
      estimatedTime: z.string(),
    })
  ),
  tips: z.array(z.string()),
});

export type LearningResourcesResponse = z.infer<
  typeof LearningResourcesResponseSchema
>;

// ============================================================================
// Configuration Helpers
// ============================================================================

function getTierKey(tier: ModelTier): string {
  return {
    high: SETTINGS_KEYS.MODEL_TIER_HIGH,
    medium: SETTINGS_KEYS.MODEL_TIER_MEDIUM,
    low: SETTINGS_KEYS.MODEL_TIER_LOW,
  }[tier];
}

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

async function getEffectiveConfig(
  tier: ModelTier,
  byokConfig?: BYOKTierConfig
): Promise<{
  model: string;
  temperature: number;
  maxTokens: number;
  tier: ModelTier;
}> {
  if (byokConfig?.[tier]?.model) {
    const byok = byokConfig[tier]!;
    return {
      model: byok.model,
      temperature: byok.temperature ?? 0.7,
      maxTokens: byok.maxTokens ?? 4096,
      tier,
    };
  }

  const config = await getTierConfigFromDB(tier);

  if (!config.primaryModel) {
    throw new Error(
      `Model tier "${tier}" is not configured. Please configure it in admin settings.`
    );
  }

  return {
    model: config.primaryModel,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    tier,
  };
}

function getOpenRouterClient(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OpenRouter API key is required");
  }
  return createOpenRouter({ apiKey: key });
}

// ============================================================================
// Tool Definitions for AI SDK
// ============================================================================

/**
 * Create the tech trends analysis tool
 */
const TechTrendsToolInputSchema = z.object({
  technologies: z.array(z.string()).describe("List of technologies to analyze"),
  context: z
    .string()
    .optional()
    .describe("Additional context like career goals or industry"),
});

export function createTechTrendsTool(
  onInvoke?: (invocation: ToolInvocation) => void
) {
  return {
    analyzeTechTrends: tool({
      description:
        "Analyze technology trends, market demand, and growth trajectory for specified technologies. Use this to help users understand which technologies are worth learning.",
      inputSchema: TechTrendsToolInputSchema,
      execute: async ({
        technologies,
        context,
      }: z.infer<typeof TechTrendsToolInputSchema>) => {
        onInvoke?.({
          toolName: "analyzeTechTrends",
          displayName: "Analyzing Tech Trends",
          status: "calling",
          input: { technologies, context },
          timestamp: new Date(),
        });

        // Use web search if available to get current data
        let searchResults = "";
        if (isSearchEnabled()) {
          const query = `${technologies.join(
            " "
          )} technology trends 2024 job market demand`;
          const results = await searchService.query(query, 5);
          searchResults = results.results
            .map((r) => `${r.title}: ${r.snippet}`)
            .join("\n");
        }

        return {
          technologies,
          context,
          searchResults,
          message: "Technology trend data collected for analysis",
        };
      },
    }),
  };
}

/**
 * Create the mock interview tool
 */
const MockInterviewToolInputSchema = z.object({
  role: z.string().describe("The job role to interview for"),
  company: z.string().optional().describe("Target company if known"),
  type: z.enum(["behavioral", "technical", "system-design", "mixed"]),
  difficulty: z.enum(["entry", "mid", "senior", "staff"]),
  questionCount: z.number().min(3).max(10).default(5),
});

export function createMockInterviewTool(
  onInvoke?: (invocation: ToolInvocation) => void
) {
  return {
    mockInterview: tool({
      description:
        "Generate a realistic mock interview session with questions, ideal answers, and evaluation criteria.",
      inputSchema: MockInterviewToolInputSchema,
      execute: async ({
        role,
        company,
        type,
        difficulty,
        questionCount,
      }: z.infer<typeof MockInterviewToolInputSchema>) => {
        onInvoke?.({
          toolName: "mockInterview",
          displayName: "Preparing Mock Interview",
          status: "calling",
          input: { role, company, type, difficulty, questionCount },
          timestamp: new Date(),
        });

        return {
          role,
          company: company || "General",
          type,
          difficulty,
          questionCount,
          message: "Mock interview parameters set",
        };
      },
    }),
  };
}

/**
 * Create the GitHub repo analysis tool
 */
const GitHubAnalysisToolInputSchema = z.object({
  repoUrl: z.string().describe("GitHub repository URL or owner/repo format"),
  focus: z
    .enum(["architecture", "interview-prep", "learning", "code-review"])
    .optional(),
});

export function createGitHubAnalysisTool(
  onInvoke?: (invocation: ToolInvocation) => void
) {
  return {
    analyzeGitHubRepo: tool({
      description:
        "Analyze a GitHub repository to understand its architecture, technologies, and generate interview questions based on the codebase.",
      inputSchema: GitHubAnalysisToolInputSchema,
      execute: async ({
        repoUrl,
        focus,
      }: z.infer<typeof GitHubAnalysisToolInputSchema>) => {
        onInvoke?.({
          toolName: "analyzeGitHubRepo",
          displayName: "Analyzing GitHub Repository",
          status: "calling",
          input: { repoUrl, focus },
          timestamp: new Date(),
        });

        // Extract owner/repo from URL
        const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        const repo = match ? match[1] : repoUrl;

        // Use web search to get repo info
        let searchResults = "";
        if (isSearchEnabled()) {
          const query = `site:github.com ${repo} README technologies stack`;
          const results = await searchService.query(query, 5);
          searchResults = results.results
            .map((r) => `${r.title}: ${r.snippet}`)
            .join("\n");
        }

        return {
          repo,
          focus: focus || "learning",
          searchResults,
          message: "Repository information gathered",
        };
      },
    }),
  };
}

/**
 * Create the system design template tool
 */
const SystemDesignToolInputSchema = z.object({
  system: z
    .string()
    .describe(
      "The system to design (e.g., 'URL shortener', 'Twitter feed', 'Payment system')"
    ),
  scale: z.enum(["startup", "medium", "large-scale"]).optional(),
  focus: z
    .array(z.string())
    .optional()
    .describe("Specific aspects to focus on"),
});

export function createSystemDesignTool(
  onInvoke?: (invocation: ToolInvocation) => void
) {
  return {
    generateSystemDesign: tool({
      description:
        "Generate a comprehensive system design template with components, data flow, and tradeoffs for common interview problems.",
      inputSchema: SystemDesignToolInputSchema,
      execute: async ({
        system,
        scale,
        focus,
      }: z.infer<typeof SystemDesignToolInputSchema>) => {
        onInvoke?.({
          toolName: "generateSystemDesign",
          displayName: "Generating System Design",
          status: "calling",
          input: { system, scale, focus },
          timestamp: new Date(),
        });

        return {
          system,
          scale: scale || "large-scale",
          focus: focus || [],
          message: "System design parameters configured",
        };
      },
    }),
  };
}

/**
 * Create the STAR framework tool
 */
const STARFrameworkToolInputSchema = z.object({
  situation: z
    .string()
    .describe("Describe the situation or experience you want to structure"),
  questionType: z
    .string()
    .optional()
    .describe(
      "The type of behavioral question (e.g., 'leadership', 'conflict', 'failure')"
    ),
});

export function createSTARFrameworkTool(
  onInvoke?: (invocation: ToolInvocation) => void
) {
  return {
    generateSTARFramework: tool({
      description:
        "Structure a behavioral interview answer using the STAR method (Situation, Task, Action, Result) with improvements and follow-up preparation.",
      inputSchema: STARFrameworkToolInputSchema,
      execute: async ({
        situation,
        questionType,
      }: z.infer<typeof STARFrameworkToolInputSchema>) => {
        onInvoke?.({
          toolName: "generateSTARFramework",
          displayName: "Structuring STAR Response",
          status: "calling",
          input: { situation, questionType },
          timestamp: new Date(),
        });

        return {
          situation,
          questionType: questionType || "general",
          message: "STAR framework input received",
        };
      },
    }),
  };
}

/**
 * Create the learning resource aggregator tool
 */
const LearningResourcesToolInputSchema = z.object({
  topic: z.string().describe("The topic to find resources for"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  preferences: z
    .object({
      preferFree: z.boolean().optional(),
      preferVideo: z.boolean().optional(),
      preferHands: z.boolean().optional().describe("Prefer hands-on practice"),
    })
    .optional(),
});

export function createLearningResourcesTool(
  onInvoke?: (invocation: ToolInvocation) => void
) {
  return {
    findLearningResources: tool({
      description:
        "Find and curate learning resources for a topic including documentation, tutorials, videos, courses, and practice problems.",
      inputSchema: LearningResourcesToolInputSchema,
      execute: async ({
        topic,
        level,
        preferences,
      }: z.infer<typeof LearningResourcesToolInputSchema>) => {
        onInvoke?.({
          toolName: "findLearningResources",
          displayName: "Finding Learning Resources",
          status: "calling",
          input: { topic, level, preferences },
          timestamp: new Date(),
        });

        // Use web search to find resources
        let searchResults = "";
        if (isSearchEnabled()) {
          const query = `${topic} ${level} tutorial course documentation learn`;
          const results = await searchService.query(query, 8);
          searchResults = results.results
            .map((r) => `${r.title} (${r.url}): ${r.snippet}`)
            .join("\n");
        }

        return {
          topic,
          level,
          preferences,
          searchResults,
          message: "Resource search completed",
        };
      },
    }),
  };
}

// ============================================================================
// AI Tool Generation Functions
// ============================================================================

/**
 * Helper to format model ID for logging
 */
function formatModelId(tier: ModelTier, model: string): string {
  return `${tier}:${model}`;
}

/**
 * Analyze technology trends
 */
export async function analyzeTechTrends(
  technologies: string[],
  context: string | undefined,
  apiKey?: string,
  byokConfig?: BYOKTierConfig,
  onToolInvoke?: (invocation: ToolInvocation) => void,
  userId?: string
): Promise<TechTrendsResponse> {
  const tierConfig = await getEffectiveConfig("high", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);
  const modelId = formatModelId("high", tierConfig.model);

  // Create logger context
  const loggerCtx = createLoggerContext({
    byokUsed: !!apiKey,
    temperature: tierConfig.temperature,
  });

  // Notify tool invocation
  onToolInvoke?.({
    toolName: "analyzeTechTrends",
    displayName: "Analyzing Tech Trends",
    status: "calling",
    input: { technologies, context },
    timestamp: new Date(),
  });

  // Get web search results if available
  let searchContext = "";
  const searchQueries: string[] = [];
  if (isSearchEnabled()) {
    const query = `${technologies.join(
      " OR "
    )} technology trends 2024 2025 job market demand growth`;
    searchQueries.push(query);
    loggerCtx.addSearchQuery(query);
    const results = await searchService.query(query, 5);
    loggerCtx.addSearchResult({
      query,
      resultCount: results.results.length,
      sources: results.results.map((r) => r.url),
    });
    searchContext = results.results
      .map((r) => `- ${r.title}: ${r.snippet}`)
      .join("\n");
  }

  const prompt = `Analyze the following technologies for their current market trends, demand, and career prospects:

Technologies: ${technologies.join(", ")}
${context ? `Context: ${context}` : ""}

${searchContext ? `Recent Market Data:\n${searchContext}\n` : ""}

For each technology, provide:
1. Popularity score (0-100)
2. Growth trend (rising/stable/declining)
3. Market demand assessment
4. Key strengths and weaknesses
5. Related skills to learn
6. Recommended certifications
7. Companies actively hiring
8. Suggested learning path

Also provide an overall summary and strategic recommendations for someone deciding what to learn.`;

  try {
    const result = await generateObject({
      model: openrouter(tierConfig.model),
      schema: TechTrendsResponseSchema,
      prompt,
      temperature: tierConfig.temperature,
    });

    const usage = extractTokenUsage(result.usage as Record<string, unknown>);

    // Log the AI request
    await logAIRequest({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "ANALYZE_TECH_TRENDS" as AIAction,
      status: "success",
      model: modelId,
      prompt,
      response: JSON.stringify(result.object),
      toolsUsed: searchQueries.length > 0 ? ["searchWeb"] : [],
      searchQueries: loggerCtx.searchQueries,
      searchResults: loggerCtx.searchResults,
      tokenUsage: usage,
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    onToolInvoke?.({
      toolName: "analyzeTechTrends",
      displayName: "Analyzing Tech Trends",
      status: "complete",
      output: result.object,
      timestamp: new Date(),
    });

    return result.object;
  } catch (error) {
    // Log error
    await logAIError({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "ANALYZE_TECH_TRENDS" as AIAction,
      model: modelId,
      prompt,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorCode: "GENERATION_FAILED",
      toolsUsed: searchQueries.length > 0 ? ["searchWeb"] : [],
      searchQueries: loggerCtx.searchQueries,
      searchResults: loggerCtx.searchResults,
      tokenUsage: { input: 0, output: 0 },
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    throw error;
  }
}

/**
 * Generate mock interview session
 */
export async function generateMockInterview(
  role: string,
  company: string | undefined,
  type: "behavioral" | "technical" | "system-design" | "mixed",
  difficulty: "entry" | "mid" | "senior" | "staff",
  questionCount: number = 5,
  apiKey?: string,
  byokConfig?: BYOKTierConfig,
  onToolInvoke?: (invocation: ToolInvocation) => void,
  userId?: string
): Promise<MockInterviewSession> {
  const tierConfig = await getEffectiveConfig("high", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);
  const modelId = formatModelId("high", tierConfig.model);

  // Create logger context
  const loggerCtx = createLoggerContext({
    byokUsed: !!apiKey,
    temperature: 0.8,
  });

  onToolInvoke?.({
    toolName: "mockInterview",
    displayName: "Preparing Mock Interview",
    status: "calling",
    input: { role, company, type, difficulty, questionCount },
    timestamp: new Date(),
  });

  const prompt = `Generate a realistic mock interview session for the following:

Role: ${role}
${company ? `Company: ${company}` : ""}
Interview Type: ${type}
Seniority Level: ${difficulty}
Number of Questions: ${questionCount}

Create ${questionCount} interview questions that would be asked at this level. For each question provide:
1. The actual question
2. Question type and difficulty
3. Suggested time limit
4. Helpful hints
5. Example of an ideal answer
6. What interviewers are looking for
7. Potential follow-up questions

Also include general tips for this type of interview and common mistakes to avoid.`;

  try {
    const result = await generateObject({
      model: openrouter(tierConfig.model),
      schema: MockInterviewSessionSchema,
      prompt,
      temperature: 0.8, // Slightly higher for variety
    });

    const usage = extractTokenUsage(result.usage as Record<string, unknown>);

    // Log the AI request
    await logAIRequest({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "GENERATE_MOCK_INTERVIEW" as AIAction,
      status: "success",
      model: modelId,
      prompt,
      response: JSON.stringify(result.object),
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      tokenUsage: usage,
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    onToolInvoke?.({
      toolName: "mockInterview",
      displayName: "Preparing Mock Interview",
      status: "complete",
      output: result.object,
      timestamp: new Date(),
    });

    return result.object;
  } catch (error) {
    await logAIError({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "GENERATE_MOCK_INTERVIEW" as AIAction,
      model: modelId,
      prompt,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorCode: "GENERATION_FAILED",
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      tokenUsage: { input: 0, output: 0 },
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    throw error;
  }
}

/**
 * Analyze a GitHub repository
 */
export async function analyzeGitHubRepo(
  repoUrl: string,
  focus:
    | "architecture"
    | "interview-prep"
    | "learning"
    | "code-review" = "learning",
  apiKey?: string,
  byokConfig?: BYOKTierConfig,
  onToolInvoke?: (invocation: ToolInvocation) => void,
  userId?: string
): Promise<GitHubRepoAnalysis> {
  const tierConfig = await getEffectiveConfig("high", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);
  const modelId = formatModelId("high", tierConfig.model);

  // Create logger context
  const loggerCtx = createLoggerContext({
    byokUsed: !!apiKey,
    temperature: tierConfig.temperature,
  });

  onToolInvoke?.({
    toolName: "analyzeGitHubRepo",
    displayName: "Analyzing GitHub Repository",
    status: "calling",
    input: { repoUrl, focus },
    timestamp: new Date(),
  });

  // Extract repo name
  const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
  const repo = match ? match[1].replace(/\.git$/, "") : repoUrl;

  // Get info via web search
  let repoContext = "";
  const searchQueries: string[] = [];
  if (isSearchEnabled()) {
    const query = `site:github.com/${repo} README.md package.json technologies`;
    searchQueries.push(query);
    loggerCtx.addSearchQuery(query);
    const results = await searchService.query(query, 5);
    loggerCtx.addSearchResult({
      query,
      resultCount: results.results.length,
      sources: results.results.map((r) => r.url),
    });
    repoContext = results.results
      .map((r) => `${r.title}: ${r.snippet}`)
      .join("\n");
  }

  const prompt = `Analyze this GitHub repository for ${focus}:

Repository: ${repo}
${repoContext ? `\nRepository Information:\n${repoContext}` : ""}

Based on common patterns for repositories like this, provide:
1. Primary language and technologies used
2. Architecture patterns and design decisions
3. Code quality indicators (testing, CI, docs, linting, TypeScript)
4. Suggested improvements
5. Interview questions based on this type of codebase
6. Learning opportunities from studying this repo
7. Key files to understand

Focus your analysis on: ${focus}`;

  try {
    const result = await generateObject({
      model: openrouter(tierConfig.model),
      schema: GitHubRepoAnalysisSchema,
      prompt,
      temperature: tierConfig.temperature,
    });

    const usage = extractTokenUsage(result.usage as Record<string, unknown>);

    // Log the AI request
    await logAIRequest({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "ANALYZE_GITHUB_REPO" as AIAction,
      status: "success",
      model: modelId,
      prompt,
      response: JSON.stringify(result.object),
      toolsUsed: searchQueries.length > 0 ? ["searchWeb"] : [],
      searchQueries: loggerCtx.searchQueries,
      searchResults: loggerCtx.searchResults,
      tokenUsage: usage,
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    onToolInvoke?.({
      toolName: "analyzeGitHubRepo",
      displayName: "Analyzing GitHub Repository",
      status: "complete",
      output: result.object,
      timestamp: new Date(),
    });

    return result.object;
  } catch (error) {
    await logAIError({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "ANALYZE_GITHUB_REPO" as AIAction,
      model: modelId,
      prompt,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorCode: "GENERATION_FAILED",
      toolsUsed: searchQueries.length > 0 ? ["searchWeb"] : [],
      searchQueries: loggerCtx.searchQueries,
      searchResults: loggerCtx.searchResults,
      tokenUsage: { input: 0, output: 0 },
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    throw error;
  }
}

/**
 * Generate system design template
 */
export async function generateSystemDesignTemplate(
  system: string,
  scale: "startup" | "medium" | "large-scale" = "large-scale",
  focus?: string[],
  apiKey?: string,
  byokConfig?: BYOKTierConfig,
  onToolInvoke?: (invocation: ToolInvocation) => void,
  userId?: string
): Promise<SystemDesignTemplate> {
  const tierConfig = await getEffectiveConfig("high", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);
  const modelId = `openrouter/${tierConfig.model}`;

  const loggerCtx = createLoggerContext({
    byokUsed: !!apiKey,
  });

  onToolInvoke?.({
    toolName: "generateSystemDesign",
    displayName: "Generating System Design",
    status: "calling",
    input: { system, scale, focus },
    timestamp: new Date(),
  });

  const prompt = `Generate a comprehensive system design template for:

System: ${system}
Scale: ${scale}
${focus?.length ? `Focus Areas: ${focus.join(", ")}` : ""}

Provide a complete system design that includes:

1. **Overview**: High-level description of the system
2. **Requirements**:
   - Functional requirements (what the system should do)
   - Non-functional requirements (scalability, availability, latency, etc.)
3. **Components**: Each component with:
   - Name and type (client, server, database, cache, queue, CDN, etc.)
   - Responsibilities
   - Suggested technologies
4. **Data Flow**: How data moves between components
5. **Scalability Considerations**: How to scale each component
6. **Tradeoffs**: Key design decisions with pros and cons
7. **Capacity Estimations**: QPS, storage, bandwidth (if applicable)
8. **Mermaid Diagram**: A flowchart showing the architecture
9. **Interview Tips**: How to present this design effectively

Make the design practical and interview-ready at ${scale} scale.`;

  try {
    const result = await generateObject({
      model: openrouter(tierConfig.model),
      schema: SystemDesignTemplateSchema,
      prompt,
      temperature: tierConfig.temperature,
    });

    onToolInvoke?.({
      toolName: "generateSystemDesign",
      displayName: "Generating System Design",
      status: "complete",
      output: result.object,
      timestamp: new Date(),
    });

    // Log successful request
    await logAIRequest({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "GENERATE_SYSTEM_DESIGN" as AIAction,
      model: modelId,
      prompt,
      response: JSON.stringify(result.object),
      tokenUsage: extractTokenUsage(
        result as unknown as Record<string, unknown>
      ),
      latencyMs: loggerCtx.getLatencyMs(),
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      metadata: loggerCtx.metadata,
    });

    return result.object;
  } catch (error) {
    await logAIError({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "GENERATE_SYSTEM_DESIGN" as AIAction,
      model: modelId,
      prompt,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorCode: "GENERATION_FAILED",
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      tokenUsage: { input: 0, output: 0 },
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    throw error;
  }
}

/**
 * Generate STAR framework response
 */
export async function generateSTARFramework(
  situation: string,
  questionType?: string,
  apiKey?: string,
  byokConfig?: BYOKTierConfig,
  onToolInvoke?: (invocation: ToolInvocation) => void,
  userId?: string
): Promise<STARResponse> {
  const tierConfig = await getEffectiveConfig("medium", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);
  const modelId = `openrouter/${tierConfig.model}`;

  const loggerCtx = createLoggerContext({
    byokUsed: !!apiKey,
  });

  onToolInvoke?.({
    toolName: "generateSTARFramework",
    displayName: "Structuring STAR Response",
    status: "calling",
    input: { situation, questionType },
    timestamp: new Date(),
  });

  const prompt = `Help structure this experience using the STAR method for behavioral interviews:

Experience/Situation: "${situation}"
${questionType ? `Question Type: ${questionType}` : ""}

Break this down into the STAR framework:
1. **Situation**: Set the context clearly (who, what, when, where)
2. **Task**: What was your specific responsibility or goal?
3. **Action**: What specific steps did YOU take? (Use "I" not "we")
4. **Result**: What were the outcomes? Include metrics if possible.

Also provide:
- Quantifiable metrics or results if applicable
- An improved/polished version of the full answer
- Tips for delivering this answer effectively
- Potential follow-up questions with suggested responses

Make the response compelling and interview-ready.`;

  try {
    const result = await generateObject({
      model: openrouter(tierConfig.model),
      schema: STARResponseSchema,
      prompt,
      temperature: 0.7,
    });

    onToolInvoke?.({
      toolName: "generateSTARFramework",
      displayName: "Structuring STAR Response",
      status: "complete",
      output: result.object,
      timestamp: new Date(),
    });

    // Log successful request
    await logAIRequest({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "GENERATE_STAR_FRAMEWORK" as AIAction,
      model: modelId,
      prompt,
      response: JSON.stringify(result.object),
      tokenUsage: extractTokenUsage(
        result as unknown as Record<string, unknown>
      ),
      latencyMs: loggerCtx.getLatencyMs(),
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      metadata: loggerCtx.metadata,
    });

    return result.object;
  } catch (error) {
    await logAIError({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "GENERATE_STAR_FRAMEWORK" as AIAction,
      model: modelId,
      prompt,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorCode: "GENERATION_FAILED",
      toolsUsed: [],
      searchQueries: [],
      searchResults: [],
      tokenUsage: { input: 0, output: 0 },
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    throw error;
  }
}

/**
 * Find learning resources for a topic
 */
export async function findLearningResources(
  topic: string,
  level: "beginner" | "intermediate" | "advanced",
  preferences?: {
    preferFree?: boolean;
    preferVideo?: boolean;
    preferHandsOn?: boolean;
  },
  apiKey?: string,
  byokConfig?: BYOKTierConfig,
  onToolInvoke?: (invocation: ToolInvocation) => void,
  userId?: string
): Promise<LearningResourcesResponse> {
  const tierConfig = await getEffectiveConfig("medium", byokConfig);
  const openrouter = getOpenRouterClient(apiKey);
  const modelId = `openrouter/${tierConfig.model}`;

  const loggerCtx = createLoggerContext({
    byokUsed: !!apiKey,
  });

  const searchQueries: string[] = [];
  const searchResultsData: SearchResultEntry[] = [];

  onToolInvoke?.({
    toolName: "findLearningResources",
    displayName: "Finding Learning Resources",
    status: "calling",
    input: { topic, level, preferences },
    timestamp: new Date(),
  });

  // Search for resources
  let resourceContext = "";
  if (isSearchEnabled()) {
    const queries = [
      `${topic} ${level} tutorial documentation`,
      `${topic} course ${preferences?.preferFree ? "free" : ""}`,
      `${topic} practice exercises leetcode`,
    ];

    for (const query of queries) {
      searchQueries.push(query);
      loggerCtx.addSearchQuery(query);
      const results = await searchService.query(query, 3);
      const searchResult: SearchResultEntry = {
        query,
        resultCount: results.results.length,
        sources: results.results.map((r) => r.url),
      };
      searchResultsData.push(searchResult);
      loggerCtx.addSearchResult(searchResult);
      resourceContext += results.results
        .map((r) => `- ${r.title} (${r.url}): ${r.snippet}`)
        .join("\n");
    }
  }

  const prompt = `Curate learning resources for the following:

Topic: ${topic}
Level: ${level}
${preferences?.preferFree ? "Preference: Free resources prioritized" : ""}
${preferences?.preferVideo ? "Preference: Video content prioritized" : ""}
${preferences?.preferHandsOn ? "Preference: Hands-on practice prioritized" : ""}

${resourceContext ? `\nDiscovered Resources:\n${resourceContext}` : ""}

Provide a comprehensive learning resource guide with:

1. **Documentation**: Official docs, references, API guides
2. **Tutorials**: Step-by-step guides, blog posts
3. **Videos**: YouTube tutorials, conference talks
4. **Courses**: Online courses (Udemy, Coursera, etc.)
5. **Books**: Recommended reading
6. **Practice**: Coding challenges, exercises, projects

For each resource include:
- Title and type
- URL (if known/discoverable)
- Description
- Difficulty level
- Estimated completion time
- Whether it's free

Also provide:
- A structured learning path with steps
- Tips for effective learning

Focus on high-quality, up-to-date resources for ${level} level learners.`;

  try {
    const result = await generateObject({
      model: openrouter(tierConfig.model),
      schema: LearningResourcesResponseSchema,
      prompt,
      temperature: tierConfig.temperature,
    });

    onToolInvoke?.({
      toolName: "findLearningResources",
      displayName: "Finding Learning Resources",
      status: "complete",
      output: result.object,
      timestamp: new Date(),
    });

    // Log successful request
    await logAIRequest({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "FIND_LEARNING_RESOURCES" as AIAction,
      model: modelId,
      prompt,
      response: JSON.stringify(result.object),
      tokenUsage: extractTokenUsage(
        result as unknown as Record<string, unknown>
      ),
      latencyMs: loggerCtx.getLatencyMs(),
      toolsUsed: searchQueries.length > 0 ? ["searchWeb"] : [],
      searchQueries: loggerCtx.searchQueries,
      searchResults: loggerCtx.searchResults,
      metadata: loggerCtx.metadata,
    });

    return result.object;
  } catch (error) {
    await logAIError({
      interviewId: "ai-tools",
      userId: userId || "anonymous",
      action: "FIND_LEARNING_RESOURCES" as AIAction,
      model: modelId,
      prompt,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorCode: "GENERATION_FAILED",
      toolsUsed: searchQueries.length > 0 ? ["searchWeb"] : [],
      searchQueries: loggerCtx.searchQueries,
      searchResults: loggerCtx.searchResults,
      tokenUsage: { input: 0, output: 0 },
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    throw error;
  }
}

// ============================================================================
// Combined Tool Set for AI Generation
// ============================================================================

/**
 * Get all AI tools based on user plan
 */
export function getAITools(
  plan: "FREE" | "PRO" | "MAX",
  onToolInvoke?: (invocation: ToolInvocation) => void
) {
  if (plan === "FREE") {
    return undefined;
  }

  // Pro and Max users get all tools
  return {
    ...createTechTrendsTool(onToolInvoke),
    ...createMockInterviewTool(onToolInvoke),
    ...createGitHubAnalysisTool(onToolInvoke),
    ...createSystemDesignTool(onToolInvoke),
    ...createSTARFrameworkTool(onToolInvoke),
    ...createLearningResourcesTool(onToolInvoke),
  };
}

/**
 * Tool display names for UI
 */
export const TOOL_DISPLAY_NAMES: Record<AIToolName, string> = {
  searchWeb: "Searching Web",
  crawlWeb: "Crawling Web Page",
  searchAndCrawl: "Searching & Crawling Web",
  analyzeTechTrends: "Analyzing Tech Trends",
  mockInterview: "Preparing Mock Interview",
  analyzeGitHubRepo: "Analyzing GitHub Repository",
  generateSystemDesign: "Generating System Design",
  generateSTARFramework: "Structuring STAR Response",
  findLearningResources: "Finding Learning Resources",
};

/**
 * Tool descriptions for users
 */
export const TOOL_DESCRIPTIONS: Record<AIToolName, string> = {
  searchWeb: "Search the web for current information",
  crawlWeb: "Extract full content from web pages",
  searchAndCrawl: "Search the web and crawl top results for full content",
  analyzeTechTrends: "Analyze technology market trends and job demand",
  mockInterview: "Generate realistic mock interview questions",
  analyzeGitHubRepo: "Analyze GitHub repositories for learning",
  generateSystemDesign: "Create system design templates",
  generateSTARFramework: "Structure behavioral answers with STAR method",
  findLearningResources: "Find curated learning resources",
};

// Export the AI tools interface
export interface AIToolsService {
  analyzeTechTrends: typeof analyzeTechTrends;
  generateMockInterview: typeof generateMockInterview;
  analyzeGitHubRepo: typeof analyzeGitHubRepo;
  generateSystemDesignTemplate: typeof generateSystemDesignTemplate;
  generateSTARFramework: typeof generateSTARFramework;
  findLearningResources: typeof findLearningResources;
  getAITools: typeof getAITools;
  TOOL_DISPLAY_NAMES: typeof TOOL_DISPLAY_NAMES;
  TOOL_DESCRIPTIONS: typeof TOOL_DESCRIPTIONS;
}

export const aiToolsService: AIToolsService = {
  analyzeTechTrends,
  generateMockInterview,
  analyzeGitHubRepo,
  generateSystemDesignTemplate,
  generateSTARFramework,
  findLearningResources,
  getAITools,
  TOOL_DISPLAY_NAMES,
  TOOL_DESCRIPTIONS,
};
