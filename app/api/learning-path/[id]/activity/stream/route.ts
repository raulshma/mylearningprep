import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { generateId } from "ai";
import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { learningPathRepository } from "@/lib/db/repositories/learning-path-repository";
import {
  streamActivity,
  selectActivityType,
  type ActivityGeneratorContext,
} from "@/lib/services/activity-generator";
import {
  logAIRequest,
  createLoggerContext,
  extractTokenUsage,
} from "@/lib/services/ai-logger";
import {
  saveLearningPathStream,
  updateLearningPathStreamStatus,
  appendLearningPathStreamContent,
  clearLearningPathStream,
} from "@/lib/services/stream-store";
import type { ActivityType } from "@/lib/db/schemas/learning-path";
import type { AIAction } from "@/lib/db/schemas/ai-log";

// Map activity types to AI action types
const ACTIVITY_TYPE_TO_ACTION: Record<ActivityType, AIAction> = {
  'mcq': 'GENERATE_ACTIVITY_MCQ',
  'coding-challenge': 'GENERATE_ACTIVITY_CODING_CHALLENGE',
  'debugging-task': 'GENERATE_ACTIVITY_DEBUGGING_TASK',
  'concept-explanation': 'GENERATE_ACTIVITY_CONCEPT_EXPLANATION',
  'real-world-assignment': 'GENERATE_ACTIVITY_REAL_WORLD_ASSIGNMENT',
  'mini-case-study': 'GENERATE_ACTIVITY_MINI_CASE_STUDY',
};

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
 * POST /api/learning-path/[id]/activity/stream
 * Stream activity generation for a learning path
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.4, 5.1, 5.3, 5.4
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pathId } = await params;

  try {
    // Parse request body with error handling for aborted requests
    let body: { activityType?: ActivityType; topicId?: string; regenerate?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Request body might be empty if client disconnected
      // Continue with default empty body
    }
    const { activityType: requestedType, topicId, regenerate } = body;

    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }


    // Get learning path
    const learningPath = await learningPathRepository.findById(pathId);
    if (!learningPath) {
      return NextResponse.json(
        { error: "Learning path not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (learningPath.userId !== user._id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Check if path is active
    if (!learningPath.isActive) {
      return NextResponse.json(
        { error: "Learning path is not active" },
        { status: 400 }
      );
    }

    // Check for existing currentActivity (Requirements: 4.2, 4.4)
    // If exists and no regenerate flag, return existing activity immediately
    if (learningPath.currentActivity && !regenerate) {
      const encoder = new TextEncoder();
      const existingActivityStream = new ReadableStream({
        start(controller) {
          // Send the existing activity as complete
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                activity: learningPath.currentActivity,
              })}\n\n`
            )
          );
          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ 
                type: "done", 
                activityType: learningPath.currentActivity!.type,
                cached: true 
              })}\n\n`
            )
          );
          controller.close();
        },
      });

      return new Response(existingActivityStream, {
        headers: {
          ...STREAM_HEADERS,
          "X-Cached-Activity": "true",
        },
      });
    }

    // Get the topic to generate activity for
    const targetTopicId = topicId || learningPath.currentTopicId;
    if (!targetTopicId) {
      return NextResponse.json(
        { error: "No topic selected for activity generation" },
        { status: 400 }
      );
    }

    const topic = learningPath.topics.find((t) => t.id === targetTopicId);
    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found in learning path" },
        { status: 404 }
      );
    }

    // Check iteration limits (unless BYOK)
    const isByok = await hasByokApiKey();
    if (!isByok) {
      if (user.iterations.count >= user.iterations.limit) {
        return NextResponse.json(
          { error: "Iteration limit reached. Please upgrade your plan." },
          { status: 429 }
        );
      }
      // Increment iteration count
      await userRepository.incrementIteration(clerkId);
    }

    // Get BYOK API key and tier config if available
    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Get recent activity types for variety
    const recentTypes = learningPath.timeline
      .slice(-5)
      .map((entry) => entry.activityType);

    // Select activity type if not specified
    const activityType =
      requestedType ||
      selectActivityType(
        {
          goal: learningPath.goal,
          topic,
          difficulty: learningPath.currentDifficulty,
          skillCluster: topic.skillCluster,
          previousActivities: recentTypes,
        },
        recentTypes
      );

    // Build generation context
    const ctx: ActivityGeneratorContext = {
      goal: learningPath.goal,
      topic,
      difficulty: learningPath.currentDifficulty,
      skillCluster: topic.skillCluster,
      previousActivities: recentTypes,
    };

    // Create logger context
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Create stream ID
    const streamId = generateId();

    // Register stream in Stream_Store (Requirements: 5.1)
    await saveLearningPathStream({
      streamId,
      learningPathId: pathId,
      activityType,
      userId: user._id,
      createdAt: Date.now(),
    });

    // Create the streaming response
    let responseText = "";
    const encoder = new TextEncoder();
    
    // Track if client disconnected
    let clientDisconnected = false;
    const abortSignal = request.signal;
    
    abortSignal.addEventListener("abort", () => {
      clientDisconnected = true;
    });

    const stream = new ReadableStream({
      async start(controller) {
        // Throttle helper
        let lastSentTime = 0;
        let pendingData: unknown = null;

        const sendThrottled = (data: unknown, force = false) => {
          const now = Date.now();
          pendingData = data;

          if (force || now - lastSentTime >= STREAM_THROTTLE_MS) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              activityType,
            });
            controller.enqueue(encoder.encode(`data: ${jsonData}\n\n`));
            // Buffer content for resumption (Requirements: 5.2)
            appendLearningPathStreamContent(pathId, `data: ${jsonData}\n\n`);
            lastSentTime = now;
            pendingData = null;
          }
        };

        const flushPending = () => {
          if (pendingData !== null && !clientDisconnected) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              activityType,
            });
            controller.enqueue(encoder.encode(`data: ${jsonData}\n\n`));
            // Buffer content for resumption
            appendLearningPathStreamContent(pathId, `data: ${jsonData}\n\n`);
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
          const result = await streamActivity(
            ctx,
            activityType,
            apiKey ?? undefined,
            byokTierConfig ?? undefined
          );

          let firstTokenMarked = false;

          for await (const partialObject of result.partialObjectStream) {
            // Check if client disconnected
            if (clientDisconnected) {
              break;
            }
            if (partialObject) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }
              sendThrottled(partialObject);
            }
          }
          
          // If client disconnected, clean up and exit early
          if (clientDisconnected) {
            await updateLearningPathStreamStatus(pathId, "error");
            controller.close();
            return;
          }
          
          flushPending();

          // Get the final object
          const activity = await result.object;
          responseText = JSON.stringify(activity);

          // Send the final activity with ID
          const activityId = generateId();
          const finalActivity = {
            id: activityId,
            topicId: topic.id,
            type: activityType,
            content: activity,
            difficulty: learningPath.currentDifficulty,
            createdAt: new Date().toISOString(),
          };

          safeEnqueue(
            `data: ${JSON.stringify({
              type: "complete",
              activity: finalActivity,
            })}\n\n`
          );

          // Send done event
          safeEnqueue(
            `data: ${JSON.stringify({ type: "done", activityType })}\n\n`
          );
          controller.close();

          // After streaming completes: persist activity, update stream status, log AI request
          after(async () => {
            // Persist completed activity to learning path (Requirements: 4.1)
            await learningPathRepository.setCurrentActivity(pathId, {
              id: activityId,
              topicId: topic.id,
              type: activityType,
              content: activity,
              difficulty: learningPath.currentDifficulty,
              createdAt: new Date(),
            });

            // Update stream status to completed (Requirements: 5.3)
            await updateLearningPathStreamStatus(pathId, "completed");

            // Clear stream content buffer after successful completion
            await clearLearningPathStream(pathId);

            // Log the AI request (Requirements: 2.1, 2.2, 2.3)
            const usage = await result.usage;
            const modelId = result.modelId;
            await logAIRequest({
              interviewId: pathId, // Using pathId as interviewId for logging
              userId: user._id,
              action: ACTIVITY_TYPE_TO_ACTION[activityType],
              model: modelId,
              prompt: `Generate ${activityType} for topic "${topic.title}" in learning path`,
              response: responseText,
              toolsUsed: loggerCtx.toolsUsed,
              searchQueries: loggerCtx.searchQueries,
              searchResults: loggerCtx.searchResults,
              tokenUsage: extractTokenUsage(usage),
              latencyMs: loggerCtx.getLatencyMs(),
              timeToFirstToken: loggerCtx.getTimeToFirstToken(),
              metadata: loggerCtx.metadata,
            });
          });
        } catch (error) {
          console.error("Stream error:", error);
          
          // Update stream status to error (Requirements: 5.4)
          await updateLearningPathStreamStatus(pathId, "error");
          
          const errorMessage =
            error instanceof Error ? error.message : "Failed to generate activity";
          const errorData = JSON.stringify({
            type: "error",
            error: errorMessage,
            activityType,
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
    console.error("Generate activity error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate activity";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
