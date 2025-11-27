import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { generateId } from "ai";
import { getAuthUserId, getByokApiKey, hasByokApiKey, getByokTierConfig } from "@/lib/auth/get-user";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { aiEngine, type GenerationContext } from "@/lib/services/ai-engine";
import {
  logAIRequest,
  createLoggerContext,
  extractTokenUsage,
} from "@/lib/services/ai-logger";
import {
  saveActiveStream,
  clearActiveStream,
  updateStreamStatus,
  appendStreamContent,
} from "@/lib/services/stream-store";
import type { ModuleType } from "@/lib/db/schemas/interview";

// Custom streaming headers
const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// Throttle interval in ms - only send updates this often
const STREAM_THROTTLE_MS = 100;

/**
 * POST /api/interview/[id]/generate
 * Generate a module for an interview with streaming + resumable support
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: interviewId } = await params;

  try {
    // Parse request body
    const body = await request.json();
    const { module, instructions } = body as {
      module: ModuleType;
      instructions?: string;
    };

    if (!module) {
      return NextResponse.json(
        { error: "Module type is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get interview
    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (interview.userId !== user._id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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

    // Build generation context
    const ctx: GenerationContext = {
      resumeText: interview.resumeContext,
      jobDescription: interview.jobDetails.description,
      jobTitle: interview.jobDetails.title,
      company: interview.jobDetails.company,
      customInstructions: instructions,
    };

    // Create logger context with metadata
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Create stream ID for resumability
    const streamId = generateId();

    // Save active stream record before starting
    await saveActiveStream({
      streamId,
      interviewId,
      module,
      userId: user._id,
      createdAt: Date.now(),
    });

    // Create the stream based on module type
    let responseText = "";

    const encoder = new TextEncoder();
    
    // Track if client disconnected
    let clientDisconnected = false;
    request.signal.addEventListener("abort", () => {
      clientDisconnected = true;
    });

    const stream = new ReadableStream({
      async start(controller) {
        // Throttle helper - only sends if enough time has passed
        let lastSentTime = 0;
        let pendingData: unknown = null;
        
        const sendThrottled = (data: unknown, force = false) => {
          const now = Date.now();
          pendingData = data;
          
          if (force || now - lastSentTime >= STREAM_THROTTLE_MS) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              module,
            });
            controller.enqueue(encoder.encode(`data: ${jsonData}\n\n`));
            lastSentTime = now;
            pendingData = null;
          }
        };
        
        // Flush any pending data
        const flushPending = () => {
          if (pendingData !== null && !clientDisconnected) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              module,
            });
            controller.enqueue(encoder.encode(`data: ${jsonData}\n\n`));
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
          switch (module) {
            case "openingBrief": {
              const result = await aiEngine.generateOpeningBrief(
                ctx,
                {},
                apiKey ?? undefined,
                byokTierConfig ?? undefined
              );

              let firstTokenMarked = false;
              for await (const partialObject of result.partialObjectStream) {
                if (partialObject.content) {
                  if (!firstTokenMarked) {
                    loggerCtx.markFirstToken();
                    firstTokenMarked = true;
                  }
                  sendThrottled(partialObject.content);
                  responseText = partialObject.content;
                }
              }
              flushPending();

              const finalObject = await result.object;
              await interviewRepository.updateModule(
                interviewId,
                "openingBrief",
                finalObject
              );

              // Log the request
              const usage = await result.usage;
              const modelId = result.modelId;
              await logAIRequest({
                interviewId,
                userId: user._id,
                action: "GENERATE_BRIEF",
                model: modelId,
                prompt: `Generate opening brief for ${interview.jobDetails.title} at ${interview.jobDetails.company}`,
                response: responseText,
                toolsUsed: loggerCtx.toolsUsed,
                searchQueries: loggerCtx.searchQueries,
                searchResults: loggerCtx.searchResults,
                tokenUsage: extractTokenUsage(usage),
                latencyMs: loggerCtx.getLatencyMs(),
                timeToFirstToken: loggerCtx.getTimeToFirstToken(),
                metadata: loggerCtx.metadata,
              });
              break;
            }

            case "revisionTopics": {
              const result = await aiEngine.generateTopics(
                ctx,
                5,
                {},
                apiKey ?? undefined,
                byokTierConfig ?? undefined
              );

              let firstTokenMarked = false;
              for await (const partialObject of result.partialObjectStream) {
                if (partialObject.topics) {
                  if (!firstTokenMarked) {
                    loggerCtx.markFirstToken();
                    firstTokenMarked = true;
                  }
                  sendThrottled(partialObject.topics);
                }
              }
              flushPending();

              const finalObject = await result.object;
              await interviewRepository.updateModule(
                interviewId,
                "revisionTopics",
                finalObject.topics
              );
              responseText = JSON.stringify(finalObject.topics);

              const usage = await result.usage;
              const modelId = result.modelId;
              await logAIRequest({
                interviewId,
                userId: user._id,
                action: "GENERATE_TOPICS",
                model: modelId,
                prompt: `Generate revision topics for ${interview.jobDetails.title}`,
                response: responseText,
                toolsUsed: loggerCtx.toolsUsed,
                searchQueries: loggerCtx.searchQueries,
                searchResults: loggerCtx.searchResults,
                tokenUsage: extractTokenUsage(usage),
                latencyMs: loggerCtx.getLatencyMs(),
                timeToFirstToken: loggerCtx.getTimeToFirstToken(),
                metadata: loggerCtx.metadata,
              });
              break;
            }

            case "mcqs": {
              const result = await aiEngine.generateMCQs(
                ctx,
                5,
                {},
                apiKey ?? undefined,
                byokTierConfig ?? undefined
              );

              let firstTokenMarked = false;
              for await (const partialObject of result.partialObjectStream) {
                if (partialObject.mcqs) {
                  if (!firstTokenMarked) {
                    loggerCtx.markFirstToken();
                    firstTokenMarked = true;
                  }
                  sendThrottled(partialObject.mcqs);
                }
              }
              flushPending();

              const finalObject = await result.object;
              await interviewRepository.updateModule(
                interviewId,
                "mcqs",
                finalObject.mcqs
              );
              responseText = JSON.stringify(finalObject.mcqs);

              const usage = await result.usage;
              const modelId = result.modelId;
              await logAIRequest({
                interviewId,
                userId: user._id,
                action: "GENERATE_MCQ",
                model: modelId,
                prompt: `Generate MCQs for ${interview.jobDetails.title}`,
                response: responseText,
                toolsUsed: loggerCtx.toolsUsed,
                searchQueries: loggerCtx.searchQueries,
                searchResults: loggerCtx.searchResults,
                tokenUsage: extractTokenUsage(usage),
                latencyMs: loggerCtx.getLatencyMs(),
                timeToFirstToken: loggerCtx.getTimeToFirstToken(),
                metadata: loggerCtx.metadata,
              });
              break;
            }

            case "rapidFire": {
              const result = await aiEngine.generateRapidFire(
                ctx,
                10,
                {},
                apiKey ?? undefined,
                byokTierConfig ?? undefined
              );

              let firstTokenMarked = false;
              for await (const partialObject of result.partialObjectStream) {
                if (partialObject.questions) {
                  if (!firstTokenMarked) {
                    loggerCtx.markFirstToken();
                    firstTokenMarked = true;
                  }
                  sendThrottled(partialObject.questions);
                }
              }
              flushPending();

              const finalObject = await result.object;
              await interviewRepository.updateModule(
                interviewId,
                "rapidFire",
                finalObject.questions
              );
              responseText = JSON.stringify(finalObject.questions);

              const usage = await result.usage;
              const modelId = result.modelId;
              await logAIRequest({
                interviewId,
                userId: user._id,
                action: "GENERATE_RAPID_FIRE",
                model: modelId,
                prompt: `Generate rapid fire questions for ${interview.jobDetails.title}`,
                response: responseText,
                toolsUsed: loggerCtx.toolsUsed,
                searchQueries: loggerCtx.searchQueries,
                searchResults: loggerCtx.searchResults,
                tokenUsage: extractTokenUsage(usage),
                latencyMs: loggerCtx.getLatencyMs(),
                timeToFirstToken: loggerCtx.getTimeToFirstToken(),
                metadata: loggerCtx.metadata,
              });
              break;
            }
          }

          // If client disconnected, clean up and exit early
          if (clientDisconnected) {
            controller.close();
            return;
          }

          // Send done event
          safeEnqueue(`data: ${JSON.stringify({ type: "done", module })}\n\n`);
          controller.close();

          // Mark stream as completed and clean up
          after(async () => {
            await updateStreamStatus(interviewId, module, "completed");
          });
        } catch (error) {
          // Ignore abort errors from client disconnect
          if (clientDisconnected || (error instanceof Error && error.name === "AbortError")) {
            controller.close();
            return;
          }
          
          console.error("Stream error:", error);
          const errorData = JSON.stringify({
            type: "error",
            error: "Failed to generate content",
            module,
          });
          safeEnqueue(`data: ${errorData}\n\n`);
          controller.close();

          // Mark stream as error and clean up
          after(async () => {
            await updateStreamStatus(interviewId, module, "error");
          });
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
    console.error("Generate module error:", error);
    return NextResponse.json(
      { error: "Failed to generate module" },
      { status: 500 }
    );
  }
}
