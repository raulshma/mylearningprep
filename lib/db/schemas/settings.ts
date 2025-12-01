import { z } from "zod";

/**
 * System Settings Schema
 * Stores global configuration like default AI model
 */
export const SystemSettingsSchema = z.object({
  _id: z.string().optional(),
  key: z.string(),
  value: z.any(),
  updatedAt: z.date(),
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

// Settings keys
export const SETTINGS_KEYS = {
  // System settings
  AI_CONCURRENCY_LIMIT: "ai_concurrency_limit",

  // Tiered model configuration - single document per tier
  MODEL_TIER_HIGH: "model_tier_high",
  MODEL_TIER_MEDIUM: "model_tier_medium",
  MODEL_TIER_LOW: "model_tier_low",

  // AI Tools configuration
  AI_TOOLS_CONFIG: "ai_tools_config",

  // Crawl4ai service settings
  CRAWL4AI_URL: "crawl4ai.url",
  CRAWL4AI_ENABLED: "crawl4ai.enabled",
  CRAWL4AI_TIMEOUT: "crawl4ai.timeout",
  CRAWL4AI_TOKEN: "crawl4ai.token",
  CRAWL_QUOTA_FREE: "crawl.quota.free",
  CRAWL_QUOTA_PRO: "crawl.quota.pro",
  CRAWL_QUOTA_MAX: "crawl.quota.max",
  CRAWL_MAX_URLS_FREE: "crawl.maxUrls.free",
  CRAWL_MAX_URLS_PRO: "crawl.maxUrls.pro",
  CRAWL_MAX_URLS_MAX: "crawl.maxUrls.max",
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/**
 * Model capability tiers for different task complexities
 */
export type ModelTier = "high" | "medium" | "low";

/**
 * Configuration for a single tier (stored as single document)
 */
export interface TierModelConfig {
  primaryModel: string | null;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
  fallbackMaxTokens: number;
  toolsEnabled: boolean;
}

/**
 * Full tiered model configuration
 */
export interface FullTieredModelConfig {
  high: TierModelConfig;
  medium: TierModelConfig;
  low: TierModelConfig;
}

/**
 * Default tier config (unconfigured state)
 */
export const DEFAULT_TIER_CONFIG: TierModelConfig = {
  primaryModel: null,
  fallbackModel: null,
  temperature: 0.7,
  maxTokens: 4096,
  fallbackMaxTokens: 4096,
  toolsEnabled: true,
};

/**
 * Mapping of AI tasks to their required capability tier
 */
export const TASK_TIER_MAPPING: Record<string, ModelTier> = {
  // High capability - complex reasoning and content generation
  generate_topics: "high",
  generate_opening_brief: "high",
  regenerate_topic_analogy: "high",
  generate_mcqs: "high", // MCQs require high-quality reasoning for accurate questions

  // Medium capability - structured generation with moderate complexity
  generate_rapid_fire: "medium",

  // Low capability - simple parsing and extraction
  parse_interview_prompt: "low",
  generate_conversation_title: "low", // Simple title summarization

  // Feedback feature tasks
  analyze_feedback_entry: "high",      // Complex skill gap analysis
  aggregate_feedback_analysis: "high", // Comprehensive weakness analysis
  stream_improvement_activity: "medium", // Activity generation (streaming)

  // Learning path tasks
  parse_learning_goal: "medium",       // Goal parsing with moderate complexity
  generate_topic: "high",              // Topic generation requires deep knowledge
  select_next_topic: "medium",         // Topic selection with moderate reasoning

  // Activity generator tasks
  generate_mcq_activity: "high",       // MCQ activities require accurate content
  generate_coding_challenge: "high",   // Coding challenges need complex problem design
  generate_debugging_task: "high",     // Debugging tasks require technical accuracy
  generate_concept_explanation: "medium", // Explanations with moderate complexity
} as const;

export type AITask = keyof typeof TASK_TIER_MAPPING;

/**
 * Task descriptions for UI display
 */
export const TASK_DESCRIPTIONS: Record<string, string> = {
  generate_topics: "Generate revision topics with detailed explanations",
  generate_opening_brief: "Create comprehensive interview opening brief",
  regenerate_topic_analogy: "Rewrite topics with different analogy styles",
  generate_mcqs: "Generate multiple choice questions",
  generate_rapid_fire: "Generate rapid-fire Q&A pairs",
  parse_interview_prompt: "Parse natural language to structured data",
  generate_conversation_title: "Generate conversation title from message",
  // Feedback feature tasks
  analyze_feedback_entry: "Analyze interview feedback to identify skill gaps",
  aggregate_feedback_analysis: "Aggregate feedback entries into weakness analysis",
  stream_improvement_activity: "Stream improvement activity content in real-time",
  // Learning path tasks
  parse_learning_goal: "Parse learning goal into skill clusters",
  generate_topic: "Generate learning topic with detailed content",
  select_next_topic: "Select next topic based on progress",
  // Activity generator tasks
  generate_mcq_activity: "Generate MCQ learning activity",
  generate_coding_challenge: "Generate coding challenge activity",
  generate_debugging_task: "Generate debugging task activity",
  generate_concept_explanation: "Generate concept explanation activity",
};

/**
 * AI Tool names that can be enabled/disabled
 */
export type AIToolId =
  | "searchWeb"
  | "crawlWeb"
  | "searchAndCrawl"
  | "analyzeTechTrends"
  | "generateInterviewQuestions"
  | "analyzeGitHubRepo"
  | "generateSystemDesign"
  | "structureSTARResponse"
  | "findLearningResources";

/**
 * AI Tool configuration
 */
export interface AIToolConfig {
  id: AIToolId;
  name: string;
  description: string;
  enabled: boolean;
  requiredPlan: "FREE" | "PRO" | "MAX";
}

/**
 * Default AI tools configuration
 */
export const DEFAULT_AI_TOOLS: AIToolConfig[] = [
  {
    id: "searchWeb",
    name: "Web Search",
    description: "Search the web for current information via SearXNG",
    enabled: true,
    requiredPlan: "PRO",
  },
  {
    id: "crawlWeb",
    name: "Web Crawl",
    description: "Crawl and extract full content from web pages",
    enabled: true,
    requiredPlan: "PRO",
  },
  {
    id: "searchAndCrawl",
    name: "Search & Crawl",
    description: "Search the web and crawl top results for full content",
    enabled: true,
    requiredPlan: "PRO",
  },
  {
    id: "analyzeTechTrends",
    name: "Tech Trends Analysis",
    description: "Analyze technology trends, job market demand, and career prospects",
    enabled: true,
    requiredPlan: "PRO",
  },
  {
    id: "generateInterviewQuestions",
    name: "Interview Questions",
    description: "Generate tailored mock interview questions",
    enabled: true,
    requiredPlan: "PRO",
  },
  {
    id: "analyzeGitHubRepo",
    name: "GitHub Analysis",
    description: "Analyze GitHub repositories for learning insights",
    enabled: true,
    requiredPlan: "PRO",
  },
  {
    id: "generateSystemDesign",
    name: "System Design",
    description: "Generate comprehensive system design templates",
    enabled: true,
    requiredPlan: "MAX",
  },
  {
    id: "structureSTARResponse",
    name: "STAR Framework",
    description: "Structure behavioral answers using STAR method",
    enabled: true,
    requiredPlan: "PRO",
  },
  {
    id: "findLearningResources",
    name: "Learning Resources",
    description: "Find curated learning resources for topics",
    enabled: true,
    requiredPlan: "MAX",
  },
];
