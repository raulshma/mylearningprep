import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { feedbackRepository } from "@/lib/db/repositories/feedback-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { feedbackAnalyzer, formatModelId, getEffectiveConfig } from "@/lib/services/feedback-analyzer";
import {
  logAIRequest,
  logAIError,
  createLoggerContext,
  extractTokenUsage,
} from "@/lib/services/ai-logger";
import { ITERATION_COSTS } from "@/lib/pricing-data";

/**
 * GET /api/feedback/analysis
 * Get weakness analysis for the current user
 * If no analysis exists or refresh is requested, generates new analysis
 * Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // Check if refresh is requested
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    // Get existing analysis
    let analysis = await feedbackRepository.getAnalysisByUserId(user._id);

    // If no analysis exists or refresh requested, generate new analysis
    if (!analysis || refresh) {
      // Get all user feedback entries
      const feedbackEntries = await feedbackRepository.findByUserId(user._id);

      if (feedbackEntries.length === 0) {
        return NextResponse.json({
          skillGaps: [],
          lastAnalyzedAt: new Date(),
          totalFeedbackCount: 0,
        });
      }

      // Check iteration limits (unless BYOK) - Requirement 7.4
      const isByok = await hasByokApiKey();
      if (!isByok) {
        if (user.iterations.count >= user.iterations.limit) {
          return NextResponse.json(
            { error: "Iteration limit reached. Please upgrade your plan." },
            { status: 429 }
          );
        }
        // Increment iteration count
        await userRepository.incrementIteration(clerkId, ITERATION_COSTS.FULL_GENERATION);
      }

      // Get BYOK API key and tier config if available - Requirements 7.1, 7.2, 7.3
      const apiKey = await getByokApiKey();
      const byokTierConfig = await getByokTierConfig();

      // Create logger context - Requirement 8.3
      const loggerCtx = createLoggerContext({
        streaming: false,
        byokUsed: !!apiKey,
      });

      try {
        // First, analyze any entries that haven't been analyzed yet
        for (const entry of feedbackEntries) {
          if (entry.skillClusters.length === 0) {
            const entryAnalysis = await feedbackAnalyzer.analyzeEntry(
              entry,
              apiKey ?? undefined,
              byokTierConfig ?? undefined
            );

            // Update the entry with analysis results
            await feedbackRepository.update(entry._id, {
              skillClusters: entryAnalysis.skillClusters,
              analysisConfidence: entryAnalysis.confidence,
            });

            // Update the entry in our local array
            entry.skillClusters = entryAnalysis.skillClusters;
            entry.analysisConfidence = entryAnalysis.confidence;
          }
        }

        // Aggregate all entries into weakness analysis
        const aggregatedAnalysis = await feedbackAnalyzer.aggregateAnalysis(
          feedbackEntries,
          apiKey ?? undefined,
          byokTierConfig ?? undefined
        );

        // Save the analysis (add updatedAt for the repository)
        await feedbackRepository.updateAnalysis(user._id, {
          ...aggregatedAnalysis,
          updatedAt: new Date(),
        });

        // Get the actual model used for logging
        const effectiveConfig = await getEffectiveConfig(
          "aggregate_feedback_analysis",
          byokTierConfig ?? undefined
        );
        const modelId = formatModelId(effectiveConfig.tier, effectiveConfig.model);

        // Log the AI request - Requirements 8.1, 8.2
        await logAIRequest({
          interviewId: "feedback-analysis",
          userId: user._id,
          action: "AGGREGATE_ANALYSIS",
          status: "success",
          model: modelId,
          prompt: `Aggregate analysis for ${feedbackEntries.length} feedback entries`,
          response: JSON.stringify(aggregatedAnalysis.skillGaps),
          toolsUsed: loggerCtx.toolsUsed,
          searchQueries: loggerCtx.searchQueries,
          searchResults: loggerCtx.searchResults,
          tokenUsage: extractTokenUsage({}),
          latencyMs: loggerCtx.getLatencyMs(),
          timeToFirstToken: loggerCtx.getTimeToFirstToken(),
          metadata: loggerCtx.metadata,
        });

        // Return the new analysis
        return NextResponse.json({
          _id: user._id,
          userId: user._id,
          ...aggregatedAnalysis,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        // Log the error - Requirement 8.4
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Get the model for error logging
        let errorModelId = "unknown";
        try {
          const errorConfig = await getEffectiveConfig(
            "aggregate_feedback_analysis",
            byokTierConfig ?? undefined
          );
          errorModelId = formatModelId(errorConfig.tier, errorConfig.model);
        } catch {
          // Ignore config errors during error logging
        }

        await logAIError({
          interviewId: "feedback-analysis",
          userId: user._id,
          action: "AGGREGATE_ANALYSIS",
          model: errorModelId,
          prompt: `Aggregate analysis for feedback entries`,
          errorMessage,
          errorCode: "ANALYSIS_ERROR",
          toolsUsed: loggerCtx.toolsUsed,
          searchQueries: loggerCtx.searchQueries,
          searchResults: loggerCtx.searchResults,
          tokenUsage: { input: 0, output: 0 },
          latencyMs: loggerCtx.getLatencyMs(),
          timeToFirstToken: loggerCtx.getTimeToFirstToken(),
          metadata: loggerCtx.metadata,
        });

        throw error;
      }
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Get analysis error:", error);
    
    // Check for rate limit errors (AI_RetryError with 429 status)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRateLimitError = 
      errorMessage.includes("quota") || 
      errorMessage.includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED");
    
    if (isRateLimitError) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again in a few moments.",
          code: "RATE_LIMIT_EXCEEDED"
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to get weakness analysis" },
      { status: 500 }
    );
  }
}
