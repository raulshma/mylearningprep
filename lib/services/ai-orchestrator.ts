/**
 * AI Orchestrator Service
 *
 * Orchestrates multi-tool AI interactions for interview prep and learning paths.
 * Uses Vercel AI SDK v5 with multi-step tool calling and parallel execution.
 *
 * Features:
 * - Multi-tool calling with parallel execution
 * - Context-aware tool selection
 * - Integration with learning paths and interview prep
 * - Streaming responses with tool status updates
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { searchService, isSearchEnabled } from "./search-service";
import { getSettingsCollection } from "@/lib/db/collections";
import {
  SETTINGS_KEYS,
  TASK_TIER_MAPPING,
  type ModelTier,
  type TierModelConfig,
} from "@/lib/db/schemas/settings";
import type { BYOKTierConfig } from "./ai-engine";
import type { AIToolName, ToolInvocation } from "./ai-tools";

// ============================================================================
// Types
// ============================================================================

export interface OrchestratorContext {
  userId: string;
  plan: "FREE" | "PRO" | "MAX";
  // Selected model for MAX plan users
  selectedModelId?: string;
  // Optional context for better responses
  interviewContext?: {
    jobTitle: string;
    company: string;
    resumeText?: string;
  };
  learningContext?: {
    goal: string;
    currentTopic?: string;
    difficulty: string;
  };
}

export interface OrchestratorMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    toolName: string;
    input: Record<string, unknown>;
    output?: unknown;
  }>;
}

export type ToolStatus = {
  toolName: AIToolName;
  status: "calling" | "complete" | "error";
  input?: Record<string, unknown>;
  output?: unknown;
  timestamp: Date;
};

// ============================================================================
// Configuration
// ============================================================================

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
 * Get effective config for orchestrator (uses high tier for multi-tool)
 */
async function getOrchestratorConfig(byokConfig?: BYOKTierConfig): Promise<{
  model: string;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
}> {
  const tier: ModelTier = "high";

  // Check if BYOK user has configured this tier
  if (byokConfig?.[tier]?.model) {
    const byok = byokConfig[tier]!;
    return {
      model: byok.model,
      fallbackModel: byok.fallback || null,
      temperature: byok.temperature ?? 0.7,
      maxTokens: byok.maxTokens ?? 8192,
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

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Create the full toolset for orchestration
 * All tools support parallel execution
 */
function createOrchestratorTools(
  ctx: OrchestratorContext,
  onToolStatus: (status: ToolStatus) => void
): ToolSet {
  const tools: ToolSet = {};

  // Web search tool (available for all paid plans)
  if (ctx.plan !== "FREE" && isSearchEnabled()) {
    tools.searchWeb = tool({
      description:
        "Search the web for current information about technologies, interview topics, companies, or job market trends.",
      inputSchema: z.object({
        query: z.string().describe("The search query"),
        maxResults: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe("Maximum number of results to return"),
      }),
      execute: async ({ query, maxResults = 5 }) => {
        onToolStatus({
          toolName: "searchWeb",
          status: "calling",
          input: { query, maxResults },
          timestamp: new Date(),
        });

        const response = await searchService.query(query, maxResults);

        onToolStatus({
          toolName: "searchWeb",
          status: "complete",
          input: { query, maxResults },
          output: { resultCount: response.results.length },
          timestamp: new Date(),
        });

        return response.results.map((r) => ({
          title: r.title,
          snippet: r.snippet,
          url: r.url,
        }));
      },
    });
  }

  // Tech trends analysis tool
  if (ctx.plan !== "FREE") {
    tools.analyzeTechTrends = tool({
      description:
        "Analyze technology trends, job market demand, and career prospects for specific technologies. IMPORTANT: You MUST provide a 'technologies' array with 1-5 technology names. Example: { \"technologies\": [\"React\", \"TypeScript\"] }",
      inputSchema: z.object({
        technologies: z
          .array(z.string())
          .min(1)
          .max(5)
          .describe("REQUIRED: Array of technology names to analyze (1-5 items). Example: [\"React\", \"Node.js\"]"),
        focusArea: z
          .enum(["job-market", "skills", "salary", "growth", "all"])
          .optional()
          .default("all")
          .describe("Specific area to focus on"),
      }),
      execute: async ({ technologies, focusArea = "all" }) => {
        onToolStatus({
          toolName: "analyzeTechTrends",
          status: "calling",
          input: { technologies, focusArea },
          timestamp: new Date(),
        });

        // Gather web search data if available
        let searchData = "";
        if (isSearchEnabled()) {
          const query = `${technologies.join(
            " "
          )} technology trends 2024 job market demand`;
          const results = await searchService.query(query, 5);
          searchData = results.results
            .map((r) => `${r.title}: ${r.snippet}`)
            .join("\n");
        }

        onToolStatus({
          toolName: "analyzeTechTrends",
          status: "complete",
          input: { technologies, focusArea },
          timestamp: new Date(),
        });

        return {
          technologies,
          focusArea,
          searchData,
          analysisReady: true,
        };
      },
    });
  }

  // Mock interview question generator
  if (ctx.plan !== "FREE") {
    tools.generateInterviewQuestions = tool({
      description:
        "Generate tailored interview questions based on role, company, and interview type.",
      inputSchema: z.object({
        role: z.string().describe("The job role to interview for"),
        company: z.string().optional().describe("Target company"),
        type: z
          .enum(["behavioral", "technical", "system-design", "mixed"])
          .describe("Type of interview questions"),
        count: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe("Number of questions"),
        difficulty: z
          .enum(["entry", "mid", "senior", "staff"])
          .optional()
          .describe("Difficulty level"),
      }),
      execute: async ({
        role,
        company,
        type,
        count = 5,
        difficulty = "mid",
      }) => {
        onToolStatus({
          toolName: "mockInterview",
          status: "calling",
          input: { role, company, type, count, difficulty },
          timestamp: new Date(),
        });

        // Use interview context if available
        const enrichedRole = ctx.interviewContext?.jobTitle || role;
        const enrichedCompany = ctx.interviewContext?.company || company;

        onToolStatus({
          toolName: "mockInterview",
          status: "complete",
          input: { role: enrichedRole, company: enrichedCompany, type },
          timestamp: new Date(),
        });

        return {
          role: enrichedRole,
          company: enrichedCompany || "General",
          type,
          count,
          difficulty,
          contextUsed: !!ctx.interviewContext,
        };
      },
    });
  }

  // GitHub repository analysis
  if (ctx.plan !== "FREE") {
    tools.analyzeGitHubRepo = tool({
      description:
        "Analyze a GitHub repository to understand its architecture, technologies, and generate learning insights.",
      inputSchema: z.object({
        repoUrl: z
          .string()
          .describe("GitHub repository URL or owner/repo format"),
        focus: z
          .enum(["architecture", "interview-prep", "learning", "code-review"])
          .optional()
          .describe("Focus area for analysis"),
      }),
      execute: async ({ repoUrl, focus = "learning" }) => {
        onToolStatus({
          toolName: "analyzeGitHubRepo",
          status: "calling",
          input: { repoUrl, focus },
          timestamp: new Date(),
        });

        // Extract owner/repo from URL
        const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        const repo = match ? match[1].replace(/\.git$/, "") : repoUrl;

        // Search for repo information
        let repoInfo = "";
        if (isSearchEnabled()) {
          const results = await searchService.query(
            `site:github.com ${repo} README technologies`,
            5
          );
          repoInfo = results.results
            .map((r) => `${r.title}: ${r.snippet}`)
            .join("\n");
        }

        onToolStatus({
          toolName: "analyzeGitHubRepo",
          status: "complete",
          input: { repoUrl, focus },
          timestamp: new Date(),
        });

        return {
          repo,
          focus,
          repoInfo,
          analysisReady: true,
        };
      },
    });
  }

  // System design template generator
  if (ctx.plan === "MAX") {
    tools.generateSystemDesign = tool({
      description:
        "Generate a comprehensive system design template for interview preparation.",
      inputSchema: z.object({
        system: z
          .string()
          .describe(
            "The system to design (e.g., 'URL shortener', 'Twitter feed')"
          ),
        scale: z
          .enum(["startup", "medium", "large-scale"])
          .optional()
          .describe("Target scale"),
        requirements: z
          .array(z.string())
          .optional()
          .describe("Specific requirements to address"),
      }),
      execute: async ({ system, scale = "large-scale", requirements = [] }) => {
        onToolStatus({
          toolName: "generateSystemDesign",
          status: "calling",
          input: { system, scale, requirements },
          timestamp: new Date(),
        });

        onToolStatus({
          toolName: "generateSystemDesign",
          status: "complete",
          input: { system, scale },
          timestamp: new Date(),
        });

        return {
          system,
          scale,
          requirements,
          designReady: true,
        };
      },
    });
  }

  // STAR framework helper
  if (ctx.plan !== "FREE") {
    tools.structureSTARResponse = tool({
      description:
        "Help structure a behavioral interview answer using the STAR framework (Situation, Task, Action, Result).",
      inputSchema: z.object({
        situation: z
          .string()
          .describe("The situation or experience to structure"),
        questionType: z
          .string()
          .optional()
          .describe(
            "Type of behavioral question (e.g., 'leadership', 'conflict')"
          ),
      }),
      execute: async ({ situation, questionType }) => {
        onToolStatus({
          toolName: "generateSTARFramework",
          status: "calling",
          input: { situation, questionType },
          timestamp: new Date(),
        });

        onToolStatus({
          toolName: "generateSTARFramework",
          status: "complete",
          input: { questionType },
          timestamp: new Date(),
        });

        return {
          situation,
          questionType: questionType || "general",
          structureReady: true,
        };
      },
    });
  }

  // Learning resource finder
  if (ctx.plan === "MAX") {
    tools.findLearningResources = tool({
      description:
        "Find curated learning resources for a topic including documentation, tutorials, videos, and courses.",
      inputSchema: z.object({
        topic: z.string().describe("The topic to find resources for"),
        level: z
          .enum(["beginner", "intermediate", "advanced"])
          .describe("Skill level"),
        preferFree: z.boolean().optional().describe("Prefer free resources"),
        preferVideo: z.boolean().optional().describe("Prefer video content"),
      }),
      execute: async ({
        topic,
        level,
        preferFree = true,
        preferVideo = false,
      }) => {
        onToolStatus({
          toolName: "findLearningResources",
          status: "calling",
          input: { topic, level, preferFree, preferVideo },
          timestamp: new Date(),
        });

        // Use learning context if available
        const enrichedTopic = ctx.learningContext?.currentTopic || topic;

        // Search for resources
        let resourceInfo = "";
        if (isSearchEnabled()) {
          const query = `${enrichedTopic} ${level} tutorial course documentation ${preferFree ? "free" : ""
            } ${preferVideo ? "video" : ""}`;
          const results = await searchService.query(query, 8);
          resourceInfo = results.results
            .map((r) => `${r.title} (${r.url}): ${r.snippet}`)
            .join("\n");
        }

        onToolStatus({
          toolName: "findLearningResources",
          status: "complete",
          input: { topic: enrichedTopic, level },
          timestamp: new Date(),
        });

        return {
          topic: enrichedTopic,
          level,
          preferences: { preferFree, preferVideo },
          resourceInfo,
          resourcesReady: true,
        };
      },
    });
  }

  return tools;
}

// ============================================================================
// System Prompt Builder
// ============================================================================

function buildSystemPrompt(ctx: OrchestratorContext): string {
  // Get current date and time
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  let prompt = `You are SyntaxState's AI Interview Assistant, an expert at helping software engineers prepare for technical interviews.

Current Context:
- Date: ${formattedDate}
- Time: ${formattedTime}
- ISO Date: ${now.toISOString()}

Your capabilities include:
- Analyzing technology trends and job market demand
- Generating tailored mock interview questions
- Helping structure behavioral answers using STAR framework
- Creating system design templates
- Finding learning resources
- Analyzing GitHub repositories for learning opportunities

Guidelines:
1. Be concise but thorough in your responses
2. Use tools when they would enhance your answer
3. You can call multiple tools in parallel when appropriate
4. Provide actionable advice
5. Reference specific examples when possible`;

  // Add interview context if available
  if (ctx.interviewContext) {
    prompt += `

Current Interview Context:
- Job Title: ${ctx.interviewContext.jobTitle}
- Company: ${ctx.interviewContext.company}
${ctx.interviewContext.resumeText
        ? "- Resume context is available for personalized advice"
        : ""
      }`;
  }

  // Add learning context if available
  if (ctx.learningContext) {
    prompt += `

Current Learning Context:
- Goal: ${ctx.learningContext.goal}
- Current Topic: ${ctx.learningContext.currentTopic || "Not specified"}
- Difficulty Level: ${ctx.learningContext.difficulty}`;
  }

  return prompt;
}

// ============================================================================
// Main Orchestrator Function
// ============================================================================

/**
 * Run the AI orchestrator with multi-tool support
 * Returns a stream of text and tool calls
 */
export async function runOrchestrator(
  messages: UIMessage[],
  ctx: OrchestratorContext,
  options: {
    apiKey?: string;
    byokConfig?: BYOKTierConfig;
    onToolStatus?: (status: ToolStatus) => void;
    maxSteps?: number;
  } = {}
) {
  const { apiKey, byokConfig, onToolStatus, maxSteps = 5 } = options;

  // Track tool statuses
  const toolStatuses: ToolStatus[] = [];
  const handleToolStatus = (status: ToolStatus) => {
    toolStatuses.push(status);
    onToolStatus?.(status);
  };

  // Get model configuration
  const config = await getOrchestratorConfig(byokConfig);
  const openrouter = getOpenRouterClient(apiKey);

  // For MAX plan users with a selected model, use their choice
  const modelToUse = ctx.plan === "MAX" && ctx.selectedModelId
    ? ctx.selectedModelId
    : config.model;

  // Create tools based on user's plan
  const tools = createOrchestratorTools(ctx, handleToolStatus);

  // Build the system prompt with context
  const systemPrompt = buildSystemPrompt(ctx);

  // Run streamText with multi-step tool calling
  // Disable retries for rate limit errors (429) - let the client handle them
  const result = streamText({
    model: openrouter(modelToUse),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(maxSteps),
    temperature: config.temperature,
    maxOutputTokens: config.maxTokens,
    maxRetries: 0, // Don't retry - rate limits should be shown to user immediately
  });

  return {
    stream: result,
    toolStatuses,
    modelId: modelToUse,
  };
}

/**
 * Export types for external use
 */
export type { ToolStatus as OrchestratorToolStatus };
