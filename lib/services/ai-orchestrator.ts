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
import { type ModelTier, type AIToolId } from "@/lib/db/schemas/settings";
import { getTierConfigFromDB } from "@/lib/db/tier-config";
import { getEnabledToolIds } from "@/lib/actions/admin";
import type { BYOKTierConfig } from "./ai-engine";
import type { AIToolName, ToolInvocation } from "./ai-tools";
import {
  createProviderWithFallback,
  type AIProviderType,
  type AIProviderAdapter,
  buildGoogleTools,
  hasImageGeneration,
  IMAGE_GENERATION_MODELS,
  type ProviderToolType,
} from "@/lib/ai";

// ============================================================================
// Types
// ============================================================================

export interface OrchestratorContext {
  userId: string;
  plan: "FREE" | "PRO" | "MAX";
  // Selected model for MAX plan users
  selectedModelId?: string;
  // Provider-specific tools to enable (e.g., googleSearch, urlContext)
  providerTools?: string[];
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
 * Get effective config for orchestrator (uses high tier for multi-tool)
 */
async function getOrchestratorConfig(byokConfig?: BYOKTierConfig): Promise<{
  provider: AIProviderType;
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
      provider: byok.provider || 'openrouter',
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
      `Model tier "${tier}" is not configured. Please configure it in admin settings.`,
    );
  }

  return {
    provider: config.provider || 'openrouter',
    model: config.primaryModel,
    fallbackModel: config.fallbackModel,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };
}

function getProviderClient(provider: AIProviderType, apiKey?: string): AIProviderAdapter {
  try {
    return createProviderWithFallback(provider, apiKey);
  } catch (error) {
    throw new Error(`Failed to create ${provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  onToolStatus: (status: ToolStatus) => void,
  enabledTools: Set<AIToolId>,
): ToolSet {
  const tools: ToolSet = {};

  // Helper to check if a tool is enabled
  const isToolEnabled = (toolId: AIToolId) => enabledTools.has(toolId);

  // Web search tool (available for all paid plans)
  if (ctx.plan !== "FREE" && isSearchEnabled() && isToolEnabled("searchWeb")) {
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

  // Web crawl tool (available for all paid plans)
  if (ctx.plan !== "FREE" && isToolEnabled("crawlWeb")) {
    tools.crawlWeb = tool({
      description:
        "Crawl and extract full content from web pages. Use this when you need the complete article/page content, not just search snippets. Returns markdown, metadata, links, and images.",
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .describe("The URL to crawl and extract content from"),
        extractionType: z
          .enum(["full", "markdown-only", "metadata-only"])
          .optional()
          .default("full")
          .describe("Type of content to extract"),
        includeImages: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to include image information"),
      }),
      execute: async ({
        url,
        extractionType = "full",
        includeImages = false,
      }) => {
        // Import crawl services
        const { crawlService } = await import("./crawl-service");
        const { checkQuota, consumeQuota, logCrawlOperation } =
          await import("./crawl-quota");

        onToolStatus({
          toolName: "crawlWeb",
          status: "calling",
          input: { url, extractionType, includeImages },
          timestamp: new Date(),
        });

        try {
          // Check quota before crawling
          const quotaCheck = await checkQuota(ctx.userId, ctx.plan, 1);

          if (!quotaCheck.allowed) {
            onToolStatus({
              toolName: "crawlWeb",
              status: "error",
              input: { url },
              output: { error: quotaCheck.message },
              timestamp: new Date(),
            });

            return {
              success: false,
              error: quotaCheck.message,
              quotaInfo: {
                remaining: quotaCheck.remaining,
                limit: quotaCheck.limit,
              },
            };
          }

          // Perform the crawl
          const result = await crawlService.crawlUrl(url, {
            priority: ctx.plan === "MAX" ? 8 : 5,
            include_raw_html: extractionType === "full",
            timeout: 30000,
          });

          // Consume quota
          await consumeQuota(ctx.userId, ctx.plan, 1);

          // Log the operation
          await logCrawlOperation({
            userId: ctx.userId,
            requestId: `crawl-${Date.now()}`,
            urls: [url],
            plan: ctx.plan,
            status: result.success ? "success" : "error",
            resultCount: result.success ? 1 : 0,
            totalCrawlTime: result.crawl_time_ms,
            metadata: {
              toolName: "crawlWeb",
              context: "ai-orchestrator",
            },
          });

          onToolStatus({
            toolName: "crawlWeb",
            status: result.success ? "complete" : "error",
            input: { url, extractionType },
            output: {
              success: result.success,
              contentLength: result.markdown?.length || 0,
            },
            timestamp: new Date(),
          });

          // Return based on extraction type
          if (extractionType === "markdown-only") {
            return {
              success: result.success,
              url: result.url,
              markdown: result.markdown,
              error: result.error,
            };
          }

          if (extractionType === "metadata-only") {
            return {
              success: result.success,
              url: result.url,
              metadata: result.metadata,
              error: result.error,
            };
          }

          // Full extraction
          return {
            success: result.success,
            url: result.url,
            markdown: result.markdown,
            metadata: result.metadata,
            links: result.links,
            media: includeImages ? result.media : undefined,
            crawlTimeMs: result.crawl_time_ms,
            error: result.error,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          onToolStatus({
            toolName: "crawlWeb",
            status: "error",
            input: { url },
            output: { error: errorMessage },
            timestamp: new Date(),
          });

          return {
            success: false,
            error: `Failed to crawl URL: ${errorMessage}`,
          };
        }
      },
    });
  }

  // Combined search and crawl tool (available for all paid plans)
  if (ctx.plan !== "FREE" && isSearchEnabled() && isToolEnabled("searchAndCrawl")) {
    tools.searchAndCrawl = tool({
      description:
        "Search the web for information and optionally crawl top results for full content. This is the recommended tool for comprehensive research - it searches and can automatically crawl the most relevant results to get complete article content.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("The search query to find relevant information"),
        crawlTopResults: z
          .number()
          .min(0)
          .max(3)
          .optional()
          .default(1)
          .describe(
            "Number of top search results to crawl for full content (0-3)",
          ),
      }),
      execute: async ({ query, crawlTopResults = 1 }) => {
        onToolStatus({
          toolName: "searchAndCrawl",
          status: "calling",
          input: { query, crawlTopResults },
          timestamp: new Date(),
        });

        try {
          // First, search the web
          const searchResponse = await searchService.query(query, 5);

          if (searchResponse.results.length === 0) {
            onToolStatus({
              toolName: "searchAndCrawl",
              status: "complete",
              input: { query },
              output: { searchResults: 0, crawledPages: 0 },
              timestamp: new Date(),
            });

            return {
              searchResults: [],
              crawledContent: [],
              message: "No search results found",
            };
          }

          // If crawling is not requested or not enabled, return search results only
          const { crawlService, isCrawlEnabled } =
            await import("./crawl-service");
          if (crawlTopResults === 0 || !isCrawlEnabled()) {
            onToolStatus({
              toolName: "searchAndCrawl",
              status: "complete",
              input: { query },
              output: {
                searchResults: searchResponse.results.length,
                crawledPages: 0,
              },
              timestamp: new Date(),
            });

            return {
              searchResults: searchResponse.results.map((r) => ({
                title: r.title,
                snippet: r.snippet,
                url: r.url,
              })),
              crawledContent: [],
              message: `Found ${searchResponse.results.length} search results`,
            };
          }

          // Check quota before crawling
          const { checkQuota, consumeQuota } = await import("./crawl-quota");
          const quotaCheck = await checkQuota(
            ctx.userId,
            ctx.plan,
            crawlTopResults,
          );

          if (!quotaCheck.allowed) {
            onToolStatus({
              toolName: "searchAndCrawl",
              status: "complete",
              input: { query },
              output: {
                searchResults: searchResponse.results.length,
                crawledPages: 0,
                quotaExceeded: true,
              },
              timestamp: new Date(),
            });

            return {
              searchResults: searchResponse.results.map((r) => ({
                title: r.title,
                snippet: r.snippet,
                url: r.url,
              })),
              crawledContent: [],
              message: `Found ${searchResponse.results.length} results. ${quotaCheck.message}`,
            };
          }

          // Crawl top N results
          const urlsToCrawl = searchResponse.results
            .slice(0, crawlTopResults)
            .map((r) => r.url);

          const crawledContent: Array<{
            url: string;
            title: string;
            markdown?: string;
            error?: string;
          }> = [];

          for (const url of urlsToCrawl) {
            const crawlResult = await crawlService.crawlUrl(url, {
              priority: ctx.plan === "MAX" ? 8 : 5,
              timeout: 15000,
            });

            const searchResult = searchResponse.results.find(
              (r) => r.url === url,
            );

            if (crawlResult.success && crawlResult.markdown) {
              crawledContent.push({
                url,
                title:
                  searchResult?.title || crawlResult.metadata?.title || url,
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

          // Consume quota for successful crawls
          const successfulCrawls = crawledContent.filter(
            (c) => c.markdown,
          ).length;
          if (successfulCrawls > 0) {
            await consumeQuota(ctx.userId, ctx.plan, successfulCrawls);
          }

          onToolStatus({
            toolName: "searchAndCrawl",
            status: "complete",
            input: { query, crawlTopResults },
            output: {
              searchResults: searchResponse.results.length,
              crawledPages: successfulCrawls,
            },
            timestamp: new Date(),
          });

          return {
            searchResults: searchResponse.results.map((r) => ({
              title: r.title,
              snippet: r.snippet,
              url: r.url,
            })),
            crawledContent,
            message: `Found ${searchResponse.results.length} results, crawled ${successfulCrawls} pages`,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          onToolStatus({
            toolName: "searchAndCrawl",
            status: "error",
            input: { query },
            output: { error: errorMessage },
            timestamp: new Date(),
          });

          return {
            searchResults: [],
            crawledContent: [],
            error: `Search and crawl failed: ${errorMessage}`,
          };
        }
      },
    });
  }

  // Tech trends analysis tool
  if (ctx.plan !== "FREE" && isToolEnabled("analyzeTechTrends")) {
    tools.analyzeTechTrends = tool({
      description:
        'Analyze technology trends, job market demand, and career prospects for specific technologies. IMPORTANT: You MUST provide a \'technologies\' array with 1-5 technology names. Example: { "technologies": ["React", "TypeScript"] }',
      inputSchema: z.object({
        technologies: z
          .array(z.string())
          .min(1)
          .max(5)
          .describe(
            'REQUIRED: Array of technology names to analyze (1-5 items). Example: ["React", "Node.js"]',
          ),
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
            " ",
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
  if (ctx.plan !== "FREE" && isToolEnabled("generateInterviewQuestions")) {
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
  if (ctx.plan !== "FREE" && isToolEnabled("analyzeGitHubRepo")) {
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
            5,
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
  if (ctx.plan === "MAX" && isToolEnabled("generateSystemDesign")) {
    tools.generateSystemDesign = tool({
      description:
        "Generate a comprehensive system design template for interview preparation.",
      inputSchema: z.object({
        system: z
          .string()
          .describe(
            "The system to design (e.g., 'URL shortener', 'Twitter feed')",
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
  if (ctx.plan !== "FREE" && isToolEnabled("structureSTARResponse")) {
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
            "Type of behavioral question (e.g., 'leadership', 'conflict')",
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
  if (ctx.plan === "MAX" && isToolEnabled("findLearningResources")) {
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
          const query = `${enrichedTopic} ${level} tutorial course documentation ${
            preferFree ? "free" : ""
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
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  let prompt = `You are MyInterviewPrep's AI Interview Assistant, an expert at helping software engineers prepare for technical interviews.

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
${
  ctx.interviewContext.resumeText
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
  } = {},
) {
  const { apiKey, byokConfig, onToolStatus, maxSteps = 5 } = options;

  // Track tool statuses
  const toolStatuses: ToolStatus[] = [];
  const handleToolStatus = (status: ToolStatus) => {
    toolStatuses.push(status);
    onToolStatus?.(status);
  };

  // Get model configuration and enabled tools in parallel
  const [config, enabledTools] = await Promise.all([
    getOrchestratorConfig(byokConfig),
    getEnabledToolIds(),
  ]);
  // Determine effective provider and model
  let providerType = config.provider;
  let modelToUse = config.model;

  // For MAX plan users with a selected model, use their choice and parse provider
  if (ctx.plan === "MAX" && ctx.selectedModelId) {
    if (ctx.selectedModelId.startsWith('google:')) {
      providerType = 'google';
      modelToUse = ctx.selectedModelId.substring(7);
    } else {
      // Default to OpenRouter for IDs without valid provider prefix
      providerType = 'openrouter';
      modelToUse = ctx.selectedModelId;
    }
  }

  // Debug logging
  console.log('[AI Orchestrator] Provider selection:', {
    plan: ctx.plan,
    selectedModelId: ctx.selectedModelId,
    resolvedProvider: providerType,
    resolvedModel: modelToUse,
    hasApiKey: !!apiKey,
  });

  const provider = getProviderClient(providerType, apiKey);

  // Check if we're trying to use tools
  const hasToolsEnabled = enabledTools.size > 0 || (ctx.providerTools && ctx.providerTools.length > 0);
  
  // Check if the model supports tools (for OpenRouter)
  let modelSupportsTools = true;
  if (providerType === 'openrouter' && hasToolsEnabled) {
    try {
      const models = await provider.listModels();
      const modelMetadata = models.find(m => m.id === modelToUse);
      modelSupportsTools = modelMetadata?.capabilities?.tools ?? false;
      
      if (!modelSupportsTools) {
        console.warn(`[AI Orchestrator] Model ${modelToUse} does not support tools. Disabling tool use.`);
      }
    } catch (error) {
      console.error('[AI Orchestrator] Failed to check model capabilities:', error);
      // Assume no tool support if we can't check
      modelSupportsTools = false;
    }
  }
  
  // Create tools based on user's plan, enabled tools, and model capabilities
  let tools: ToolSet | undefined = undefined;
  
  if (hasToolsEnabled && modelSupportsTools) {
    tools = createOrchestratorTools(ctx, handleToolStatus, enabledTools);
    
    // Add Google-specific tools if provider is Google and tools are enabled
    if (providerType === 'google' && ctx.providerTools && ctx.providerTools.length > 0) {
      const googleTools = buildGoogleTools(ctx.providerTools as ProviderToolType[]);
      // Merge Google tools with orchestrator tools
      tools = { ...tools, ...googleTools } as ToolSet;
    }
  }

  // Build the system prompt with context
  let systemPrompt = buildSystemPrompt(ctx);

  // Add provider tool hints to system prompt (only if tools are actually enabled)
  if (ctx.providerTools && ctx.providerTools.length > 0 && modelSupportsTools) {
    const toolHints: string[] = [];
    if (ctx.providerTools.includes('googleSearch')) {
      toolHints.push('- Google Search: You can search the web for real-time information using the google_search tool');
    }
    if (ctx.providerTools.includes('urlContext')) {
      toolHints.push('- URL Context: You can analyze specific URLs mentioned by the user using the url_context tool');
    }
    if (ctx.providerTools.includes('codeExecution')) {
      toolHints.push('- Code Execution: You can execute Python code for calculations using the code_execution tool');
    }
    if (toolHints.length > 0) {
      systemPrompt += `\n\nEnabled Provider Tools:\n${toolHints.join('\n')}`;
    }
  } else if (ctx.providerTools && ctx.providerTools.length > 0 && !modelSupportsTools) {
    // Inform the AI that tools were requested but are not available
    systemPrompt += `\n\nNote: Tool use was requested but the current model (${modelToUse}) does not support tools. Please provide responses without using external tools.`;
  }

  // Check if image generation is enabled for this request
  const imageGenerationEnabled = ctx.providerTools && 
    hasImageGeneration(ctx.providerTools as ProviderToolType[]) &&
    IMAGE_GENERATION_MODELS.includes(modelToUse);

  // Debug logging for image generation
  if (imageGenerationEnabled) {
    console.log('[AI Orchestrator] Image generation enabled for model:', modelToUse);
  }

  // Run streamText with multi-step tool calling
  // Disable retries for rate limit errors (429) - let the client handle them
  // Note: We don't set maxOutputTokens here - let the model use its default
  // Setting it too high (e.g., 65536) causes OpenRouter to reject requests
  // when input + maxOutput > context limit, even though it's just a limit
  const result = streamText({
    model: provider.getModel(modelToUse),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools: imageGenerationEnabled ? undefined : (tools && Object.keys(tools).length > 0 ? tools : undefined), // Image gen models don't support tools, and only pass tools if they exist
    stopWhen: imageGenerationEnabled || !tools ? undefined : stepCountIs(maxSteps),
    temperature: config.temperature,
    maxRetries: 0, // Don't retry - rate limits should be shown to user immediately
    // Enable image generation for supported models
    ...(imageGenerationEnabled && {
      providerOptions: {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
    }),
  });

  return {
    stream: result,
    toolStatuses,
    modelId: modelToUse,
    warnings: !modelSupportsTools && hasToolsEnabled 
      ? [`Model ${modelToUse} does not support tool use. Tools have been disabled for this conversation.`]
      : [],
  };
}

/**
 * Export types for external use
 */
export type { ToolStatus as OrchestratorToolStatus };
