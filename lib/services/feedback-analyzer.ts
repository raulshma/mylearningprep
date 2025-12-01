/**
 * Feedback Analyzer Service
 * 
 * AI-powered analysis of interview feedback entries to identify skill gaps
 * and weaknesses. Supports BYOK (Bring Your Own Key) and tiered model selection.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5, 7.1, 7.2, 7.3, 9.1
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import {
  type FeedbackEntry,
  type SkillGap,
  type WeaknessAnalysis,
} from "@/lib/db/schemas/feedback";
import { SkillClusterSchema, type SkillCluster } from "@/lib/db/schemas/learning-path";
import { TASK_TIER_MAPPING, type ModelTier } from "@/lib/db/schemas/settings";
import { getTierConfigFromDB } from "@/lib/db/tier-config";
import type { BYOKTierConfig } from "./ai-engine";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of analyzing a single feedback entry
 */
export interface EntryAnalysis {
  skillClusters: SkillCluster[];
  confidence: number;
  reasoning: string;
}

/**
 * Schema for AI-generated entry analysis
 */
const EntryAnalysisSchema = z.object({
  skillClusters: z.array(SkillClusterSchema).min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

/**
 * Schema for AI-generated aggregated analysis
 */
const AggregatedAnalysisSchema = z.object({
  skillGaps: z.array(z.object({
    skillCluster: SkillClusterSchema,
    gapScore: z.number().min(0).max(100),
    frequency: z.number().int().min(1),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  })),
});

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Get effective config for a feedback analysis task, considering BYOK overrides
 * 
 * Requirements: 7.1, 7.2, 7.3, 9.1
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
 * Get system prompt for feedback analysis
 */
function getAnalysisSystemPrompt(): string {
  return `You are an expert technical interview coach and skill assessment specialist. Your role is to analyze interview feedback to identify skill gaps and areas for improvement.

You have deep knowledge of:
- Data Structures & Algorithms (DSA)
- Object-Oriented Programming (OOP)
- System Design
- Debugging techniques
- Databases (SQL, NoSQL)
- API Design (REST, GraphQL)
- Testing methodologies
- DevOps practices
- Frontend development
- Backend development
- Security best practices
- Performance optimization

When analyzing feedback:
1. Carefully read the question the user struggled with
2. Consider their attempted answer (if provided)
3. Map the struggle to one or more skill clusters
4. Provide a confidence score based on how clearly the feedback maps to skills
5. Be thorough but precise in your analysis`;
}

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Analyze a single feedback entry to identify skill clusters
 * Uses HIGH tier model for complex skill gap analysis
 * 
 * Requirements: 2.1, 2.2, 7.1, 7.2, 7.3, 9.1
 */
export async function analyzeEntry(
  entry: FeedbackEntry,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
): Promise<EntryAnalysis> {
  const tierConfig = await getEffectiveConfig("analyze_feedback_entry", byokTierConfig);
  const openrouter = getOpenRouterClient(apiKey);

  const prompt = `Analyze this interview feedback to identify which skill clusters the user needs to improve.

## Interview Question the User Struggled With
"${entry.question}"

${entry.attemptedAnswer ? `## User's Attempted Answer\n"${entry.attemptedAnswer}"` : ''}

## Difficulty Rating (1-5)
${entry.difficultyRating}

${entry.topicHints.length > 0 ? `## Topic Hints Provided\n${entry.topicHints.join(', ')}` : ''}

## Available Skill Clusters
- dsa: Data Structures & Algorithms
- oop: Object-Oriented Programming
- system-design: System Design & Architecture
- debugging: Debugging & Troubleshooting
- databases: Database Design & Queries
- api-design: API Design (REST, GraphQL)
- testing: Testing Methodologies
- devops: DevOps & CI/CD
- frontend: Frontend Development
- backend: Backend Development
- security: Security Best Practices
- performance: Performance Optimization

## Task
1. Identify ALL relevant skill clusters this question tests (minimum 1)
2. Provide a confidence score (0-1) for your analysis
3. Explain your reasoning

Return a JSON object with:
- skillClusters: array of skill cluster IDs from the list above
- confidence: number between 0 and 1
- reasoning: brief explanation of why these clusters were identified`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: EntryAnalysisSchema,
    system: getAnalysisSystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });

  return {
    skillClusters: result.object.skillClusters,
    confidence: result.object.confidence,
    reasoning: result.object.reasoning,
  };
}

/**
 * Aggregate multiple feedback entries into a comprehensive weakness analysis
 * Uses HIGH tier model for comprehensive analysis
 * 
 * Requirements: 2.3, 7.1, 7.2, 7.3
 */
export async function aggregateAnalysis(
  entries: FeedbackEntry[],
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
): Promise<Omit<WeaknessAnalysis, '_id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  if (entries.length === 0) {
    return {
      skillGaps: [],
      lastAnalyzedAt: new Date(),
      totalFeedbackCount: 0,
    };
  }

  const tierConfig = await getEffectiveConfig("aggregate_feedback_analysis", byokTierConfig);
  const openrouter = getOpenRouterClient(apiKey);

  // Build summary of all entries
  const entriesSummary = entries.map((entry, index) => {
    const clusters = entry.skillClusters.length > 0 
      ? entry.skillClusters.join(', ') 
      : 'not yet analyzed';
    return `${index + 1}. Question: "${entry.question.substring(0, 200)}${entry.question.length > 200 ? '...' : ''}"
   Difficulty: ${entry.difficultyRating}/5
   Skill Clusters: ${clusters}
   ID: ${entry._id}`;
  }).join('\n\n');

  const prompt = `Analyze these ${entries.length} interview feedback entries to identify overall skill gaps and weaknesses.

## Feedback Entries
${entriesSummary}

## Available Skill Clusters
- dsa: Data Structures & Algorithms
- oop: Object-Oriented Programming
- system-design: System Design & Architecture
- debugging: Debugging & Troubleshooting
- databases: Database Design & Queries
- api-design: API Design (REST, GraphQL)
- testing: Testing Methodologies
- devops: DevOps & CI/CD
- frontend: Frontend Development
- backend: Backend Development
- security: Security Best Practices
- performance: Performance Optimization

## Task
For each skill cluster that appears in the feedback:
1. Calculate a gapScore (0-100) based on:
   - Frequency: How often this skill appears in struggles
   - Severity: Average difficulty rating of questions in this cluster
   - Recency: More recent struggles may indicate current gaps
2. Count the frequency (number of entries involving this skill)
3. Provide a confidence score (0-1) for the gap assessment
4. Explain your reasoning

Return skill gaps sorted by gapScore (highest first).`;

  const result = await generateObject({
    model: openrouter(tierConfig.model),
    schema: AggregatedAnalysisSchema,
    system: getAnalysisSystemPrompt(),
    prompt,
    temperature: tierConfig.temperature,
  });

  // Map AI results to SkillGap format with related feedback IDs
  const skillGaps: SkillGap[] = result.object.skillGaps.map(gap => {
    // Find all feedback entries that relate to this skill cluster
    const relatedIds = entries
      .filter(e => e.skillClusters.includes(gap.skillCluster))
      .map(e => e._id);

    return {
      skillCluster: gap.skillCluster,
      gapScore: gap.gapScore,
      frequency: gap.frequency,
      confidence: gap.confidence,
      relatedFeedbackIds: relatedIds.length > 0 ? relatedIds : [entries[0]._id], // Ensure at least one ID
    };
  });

  return {
    skillGaps: rankWeaknesses({ skillGaps } as { skillGaps: SkillGap[] }),
    lastAnalyzedAt: new Date(),
    totalFeedbackCount: entries.length,
  };
}

/**
 * Rank skill gaps by gapScore in descending order
 * 
 * Requirements: 2.3
 */
export function rankWeaknesses(analysis: { skillGaps: SkillGap[] }): SkillGap[] {
  return [...analysis.skillGaps].sort((a, b) => b.gapScore - a.gapScore);
}

/**
 * Update weakness analysis incrementally with a new feedback entry
 * More efficient than re-analyzing all entries
 * 
 * Requirements: 2.5
 */
export async function updateAnalysisIncremental(
  existing: WeaknessAnalysis,
  newEntry: FeedbackEntry,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
): Promise<WeaknessAnalysis> {
  // First, analyze the new entry if not already analyzed
  let entrySkillClusters = newEntry.skillClusters;
  let entryConfidence = newEntry.analysisConfidence ?? 0.5;

  if (entrySkillClusters.length === 0) {
    const analysis = await analyzeEntry(newEntry, apiKey, byokTierConfig);
    entrySkillClusters = analysis.skillClusters;
    entryConfidence = analysis.confidence;
  }

  // Create a map of existing skill gaps for easy lookup
  const gapMap = new Map<SkillCluster, SkillGap>();
  for (const gap of existing.skillGaps) {
    gapMap.set(gap.skillCluster, { ...gap });
  }

  // Update or create skill gaps for each cluster in the new entry
  for (const cluster of entrySkillClusters) {
    const existingGap = gapMap.get(cluster);

    if (existingGap) {
      // Update existing gap
      // Increase frequency
      existingGap.frequency += 1;
      
      // Add new entry to related IDs
      if (!existingGap.relatedFeedbackIds.includes(newEntry._id)) {
        existingGap.relatedFeedbackIds.push(newEntry._id);
      }
      
      // Recalculate gap score (weighted average considering new entry)
      // Higher difficulty ratings increase the gap score
      const difficultyFactor = newEntry.difficultyRating / 5; // Normalize to 0-1
      const frequencyBoost = Math.min(existingGap.frequency * 5, 30); // Cap at 30
      const newGapContribution = difficultyFactor * 20; // New entry contributes up to 20 points
      
      existingGap.gapScore = Math.min(
        100,
        existingGap.gapScore * 0.8 + newGapContribution + frequencyBoost * 0.1
      );
      
      // Update confidence (weighted average)
      existingGap.confidence = (existingGap.confidence * (existingGap.frequency - 1) + entryConfidence) / existingGap.frequency;
    } else {
      // Create new gap
      const difficultyFactor = newEntry.difficultyRating / 5;
      gapMap.set(cluster, {
        skillCluster: cluster,
        gapScore: Math.round(difficultyFactor * 50 + 20), // Base score 20-70 based on difficulty
        frequency: 1,
        confidence: entryConfidence,
        relatedFeedbackIds: [newEntry._id],
      });
    }
  }

  // Convert map back to array and rank
  const updatedGaps = rankWeaknesses({ skillGaps: Array.from(gapMap.values()) });

  return {
    ...existing,
    skillGaps: updatedGaps,
    lastAnalyzedAt: new Date(),
    totalFeedbackCount: existing.totalFeedbackCount + 1,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Exports
// ============================================================================

export interface FeedbackAnalyzer {
  analyzeEntry: typeof analyzeEntry;
  aggregateAnalysis: typeof aggregateAnalysis;
  rankWeaknesses: typeof rankWeaknesses;
  updateAnalysisIncremental: typeof updateAnalysisIncremental;
  formatModelId: typeof formatModelId;
}

export const feedbackAnalyzer: FeedbackAnalyzer = {
  analyzeEntry,
  aggregateAnalysis,
  rankWeaknesses,
  updateAnalysisIncremental,
  formatModelId,
};
