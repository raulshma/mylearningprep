import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { generateId } from "ai";
import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { feedbackRepository } from "@/lib/db/repositories/feedback-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import {
  improvementGenerator,
  calculateActivityDifficulty,
  getEffectiveConfig,
  formatModelId,
} from "@/lib/services/improvement-generator";
import {
  logAIRequest,
  logAIError,
  createLoggerContext,
  extractTokenUsage,
} from "@/lib/services/ai-logger";
import type { ImprovementActivity } from "@/lib/db/schemas/feedback";
import type { ActivityType, DifficultyLevel } from "@/lib/db/schemas/learning-path";
import { ITERATION_COSTS } from "@/lib/pricing-data";

// Custom streaming headers
const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// Throttle interval in ms
const STREAM_THROTTLE_MS = 100;

/**
 * POST /api/feedback/improvement/stream
 * Stream improvement activity generation for a skill gap
 * Requirements: 3.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: {
      skillCluster?: string;
      activityType?: ActivityType;
      difficulty?: DifficultyLevel;
      userLevel?: number;
      programmingLanguage?: string;
    } = {};
    
    try {
      body = await request.json();
    } catch {
      // Request body might be empty if client disconnected
    }
    
    const { skillCluster, activityType, difficulty, userLevel = 5, programmingLanguage } = body;

    if (!skillCluster) {
      return NextResponse.json(
        { error: "Skill cluster is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // Get user's weakness analysis
    const analysis = await feedbackRepository.getAnalysisByUserId(user._id);
    if (!analysis) {
      return NextResponse.json(
        { error: "No weakness analysis found. Please submit feedback first." },
        { status: 404 }
      );
    }

    // Find the skill gap for the requested cluster
    const skillGap = analysis.skillGaps.find(
      (gap) => gap.skillCluster === skillCluster
    );

    if (!skillGap) {
      return NextResponse.json(
        { error: `No skill gap found for cluster: ${skillCluster}` },
        { status: 404 }
      );
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
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Calculate difficulty if not provided - Requirement 3.4
    const activityDifficulty = difficulty ?? calculateActivityDifficulty(userLevel, skillGap.gapScore);

    // Select activity type if not provided
    const selectedActivityType = activityType ?? 
      improvementGenerator.selectActivityTypes(skillGap, [], 1)[0];

    // Create stream ID
    const streamId = generateId();

    // Create the streaming response
    let responseText = "";
    const encoder = new TextEncoder();
    
    // Track if client disconnected
    let clientDisconnected = false;
    request.signal.addEventListener("abort", () => {
      clientDisconnected = true;
    });

    const stream = new ReadableStream({
      async start(controller) {
        // Throttle helper
        let lastSentTime = 0;
        let pendingData: unknown = null;

        const sendThrottled = async (data: unknown, force = false) => {
          const now = Date.now();
          pendingData = data;

          if (force || now - lastSentTime >= STREAM_THROTTLE_MS) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              activityType: selectedActivityType,
            });
            const sseMessage = `data: ${jsonData}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
            lastSentTime = now;
            pendingData = null;
          }
        };

        const flushPending = async () => {
          if (pendingData !== null && !clientDisconnected) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              activityType: selectedActivityType,
            });
            const sseMessage = `data: ${jsonData}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
            pendingData = null;
          }
        };

        // Helper to safely enqueue data
        const safeEnqueue = (data: string) => {
          if (!clientDisconnected) {
            try {
              controller.enqueue(encoder.encode(data));
            } catch {
              clientDisconnected = true;
            }
          }
        };

        try {
          // Stream the activity generation
          const { stream: activityStream, modelId, loggerContext } = 
            await improvementGenerator.streamActivity(
              skillGap,
              selectedActivityType,
              activityDifficulty,
              user._id,
              apiKey ?? undefined,
              byokTierConfig ?? undefined,
              programmingLanguage
            );

          let firstTokenMarked = false;

          for await (const partialObject of activityStream.partialObjectStream) {
            if (clientDisconnected) {
              break;
            }
            if (partialObject) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                loggerContext.markFirstToken();
                firstTokenMarked = true;
              }
              await sendThrottled(partialObject);
            }
          }

          if (clientDisconnected) {
            controller.close();
            return;
          }

          await flushPending();

          // Get the final object
          const activityResult = await activityStream;
          const activityContent = await activityResult.object;
          responseText = JSON.stringify(activityContent);

          // Create the activity record
          const activityId = generateId();
          const finalActivity: ImprovementActivity = {
            id: activityId,
            skillGapId: `${skillGap.skillCluster}_${skillGap.gapScore}`,
            skillCluster: skillGap.skillCluster,
            activityType: selectedActivityType,
            difficulty: activityDifficulty,
            content: activityContent as ImprovementActivity["content"],
            status: "pending",
          };

          // Send the complete activity
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "complete",
              activity: finalActivity,
            })}\n\n`
          );

          // Send done event
          safeEnqueue(
            `data: ${JSON.stringify({ 
              type: "done", 
              activityType: selectedActivityType 
            })}\n\n`
          );
          controller.close();

          // After streaming completes: update improvement plan, log AI request
          after(async () => {
            // Get or create improvement plan
            let plan = await feedbackRepository.getImprovementPlanByUserId(user._id);
            
            if (plan) {
              // Add activity to existing plan
              const updatedActivities = [...plan.activities, finalActivity];
              await feedbackRepository.updateImprovementPlan(user._id, {
                activities: updatedActivities,
                progress: {
                  ...plan.progress,
                  totalActivities: updatedActivities.length,
                },
              });
            } else {
              // Create new plan with this activity
              await feedbackRepository.createImprovementPlan(user._id, {
                skillGaps: analysis.skillGaps,
                activities: [finalActivity],
                progress: {
                  totalActivities: 1,
                  completedActivities: 0,
                  skillProgress: {},
                },
              });
            }

            // Log the AI request - Requirements 8.1, 8.2, 8.3
            const usage = await activityResult.usage;
            await logAIRequest({
              interviewId: "feedback-improvement",
              userId: user._id,
              action: "STREAM_IMPROVEMENT_ACTIVITY",
              status: "success",
              model: modelId,
              prompt: `Generate ${selectedActivityType} for skill gap: ${skillGap.skillCluster}`,
              response: responseText,
              toolsUsed: loggerContext.toolsUsed,
              searchQueries: loggerContext.searchQueries,
              searchResults: loggerContext.searchResults,
              tokenUsage: extractTokenUsage(usage as unknown as Record<string, unknown>),
              latencyMs: loggerContext.getLatencyMs(),
              timeToFirstToken: loggerContext.getTimeToFirstToken(),
              metadata: loggerContext.metadata,
            });
          });
        } catch (error) {
          console.error("Stream error:", error);

          // Log the error - Requirement 8.4
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          // Get the actual model for error logging
          let errorModelId = "unknown";
          try {
            const errorConfig = await getEffectiveConfig(
              "stream_improvement_activity",
              byokTierConfig ?? undefined
            );
            errorModelId = formatModelId(errorConfig.tier, errorConfig.model);
          } catch {
            // Ignore config errors during error logging
          }

          await logAIError({
            interviewId: "feedback-improvement",
            userId: user._id,
            action: "STREAM_IMPROVEMENT_ACTIVITY",
            model: errorModelId,
            prompt: `Generate ${selectedActivityType} for skill gap: ${skillGap.skillCluster}`,
            errorMessage,
            errorCode: "STREAM_ERROR",
            toolsUsed: loggerCtx.toolsUsed,
            searchQueries: loggerCtx.searchQueries,
            searchResults: loggerCtx.searchResults,
            tokenUsage: { input: 0, output: 0 },
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });

          const errorData = JSON.stringify({
            type: "error",
            error: errorMessage,
            activityType: selectedActivityType,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...STREAM_HEADERS,
        "X-Stream-Id": streamId,
      },
    });
  } catch (error) {
    console.error("Generate improvement error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate improvement activity";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
