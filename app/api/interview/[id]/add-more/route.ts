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
  updateStreamStatus,
  appendStreamContent,
  clearStreamContent,
} from "@/lib/services/stream-store";
import type { MCQ, RevisionTopic, RapidFire } from "@/lib/db/schemas/interview";

// Custom streaming headers
const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// Throttle interval in ms - only send updates this often
const STREAM_THROTTLE_MS = 100;

type AddMoreModule = "mcqs" | "rapidFire" | "revisionTopics";

/**
 * Helper to get existing content IDs for duplicate prevention
 */
function getExistingContentIds(
  interview: Awaited<ReturnType<typeof interviewRepository.findById>>,
  module: AddMoreModule
): string[] {
  if (!interview) return [];
  switch (module) {
    case "mcqs":
      return interview.modules.mcqs.map((m) => m.id);
    case "revisionTopics":
      return interview.modules.revisionTopics.map((t) => t.id);
    case "rapidFire":
      return interview.modules.rapidFire.map((q) => q.id);
    default:
      return [];
  }
}

/**
 * POST /api/interview/[id]/add-more
 * Add more content to an existing module with streaming + resumable support
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: interviewId } = await params;

  try {
    // Parse request body
    const body = await request.json();
    // Default counts: more topics (5), more MCQs (5), more rapid-fire (10)
    const defaultCounts: Record<AddMoreModule, number> = {
      revisionTopics: 5,
      mcqs: 5,
      rapidFire: 10,
    };
    const { module, count, instructions } = body as {
      module: AddMoreModule;
      count?: number;
      instructions?: string;
    };
    const effectiveCount = count ?? defaultCounts[module] ?? 5;

    if (!module || !["mcqs", "rapidFire", "revisionTopics"].includes(module)) {
      return NextResponse.json(
        { error: "Valid module type is required (mcqs, rapidFire, revisionTopics)" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

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

    // Build generation context with existing content for duplicate prevention
    const existingContent = getExistingContentIds(interview, module);

    const ctx: GenerationContext = {
      resumeText: interview.resumeContext,
      jobDescription: interview.jobDetails.description,
      jobTitle: interview.jobDetails.title,
      company: interview.jobDetails.company,
      existingContent,
      customInstructions: instructions,
    };

    // Create logger context with metadata
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Create stream ID for resumability
    const streamId = generateId();

    // Clear any previous stream content and save new active stream record
    const moduleKey = `addMore_${module}`;
    await clearStreamContent(interviewId, moduleKey);
    await saveActiveStream({
      streamId,
      interviewId,
      module: moduleKey,
      userId: user._id,
      createdAt: Date.now(),
    });

    const encoder = new TextEncoder();
    let responseText = "";
    
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
        
        const sendThrottled = async (data: unknown, force = false) => {
          const now = Date.now();
          pendingData = data;
          
          if (force || now - lastSentTime >= STREAM_THROTTLE_MS) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              module,
            });
            const sseMessage = `data: ${jsonData}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
            // Store content for resumption
            await appendStreamContent(interviewId, moduleKey, sseMessage);
            lastSentTime = now;
            pendingData = null;
          }
        };
        
        // Flush any pending data
        const flushPending = async () => {
          if (pendingData !== null && !clientDisconnected) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              module,
            });
            const sseMessage = `data: ${jsonData}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
            // Store content for resumption
            await appendStreamContent(interviewId, moduleKey, sseMessage);
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
            case "mcqs": {
              const result = await aiEngine.generateMCQs(
                ctx,
                effectiveCount,
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
                  await sendThrottled(partialObject.mcqs);
                }
              }
              await flushPending();

              const finalObject = await result.object;

              // Filter out any duplicates that might have slipped through
              const existingIds = new Set(interview.modules.mcqs.map((m) => m.id));
              const uniqueItems = finalObject.mcqs.filter(
                (m: MCQ) => !existingIds.has(m.id)
              );

              await interviewRepository.appendToModule(
                interviewId,
                "mcqs",
                uniqueItems
              );
              responseText = JSON.stringify(uniqueItems);

              const usage = await result.usage;
              const modelId = result.modelId;
              await logAIRequest({
                interviewId,
                userId: user._id,
                action: "GENERATE_MCQ",
                model: modelId,
                prompt: `Add ${effectiveCount} more MCQs for ${interview.jobDetails.title}`,
                response: responseText,
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
                effectiveCount,
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
                  await sendThrottled(partialObject.topics);
                }
              }
              await flushPending();

              const finalObject = await result.object;

              const existingIds = new Set(
                interview.modules.revisionTopics.map((t) => t.id)
              );
              const uniqueItems = finalObject.topics.filter(
                (t: RevisionTopic) => !existingIds.has(t.id)
              );

              await interviewRepository.appendToModule(
                interviewId,
                "revisionTopics",
                uniqueItems
              );
              responseText = JSON.stringify(uniqueItems);

              const usage = await result.usage;
              const modelId = result.modelId;
              await logAIRequest({
                interviewId,
                userId: user._id,
                action: "GENERATE_TOPICS",
                model: modelId,
                prompt: `Add ${effectiveCount} more revision topics for ${interview.jobDetails.title}`,
                response: responseText,
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
                effectiveCount,
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
                  await sendThrottled(partialObject.questions);
                }
              }
              await flushPending();

              const finalObject = await result.object;

              const existingIds = new Set(
                interview.modules.rapidFire.map((q) => q.id)
              );
              const uniqueItems = finalObject.questions.filter(
                (q: RapidFire) => !existingIds.has(q.id)
              );

              await interviewRepository.appendToModule(
                interviewId,
                "rapidFire",
                uniqueItems
              );
              responseText = JSON.stringify(uniqueItems);

              const usage = await result.usage;
              const modelId = result.modelId;
              await logAIRequest({
                interviewId,
                userId: user._id,
                action: "GENERATE_RAPID_FIRE",
                model: modelId,
                prompt: `Add ${effectiveCount} more rapid fire questions for ${interview.jobDetails.title}`,
                response: responseText,
                tokenUsage: extractTokenUsage(usage),
                latencyMs: loggerCtx.getLatencyMs(),
                timeToFirstToken: loggerCtx.getTimeToFirstToken(),
                metadata: loggerCtx.metadata,
              });
              break;
            }
          }

          // Mark stream as completed (do this before checking disconnect so resumption works)
          after(async () => {
            await updateStreamStatus(interviewId, moduleKey, "completed");
          });

          // If client disconnected, close stream but generation is complete
          if (clientDisconnected) {
            controller.close();
            return;
          }

          // Send done event
          safeEnqueue(`data: ${JSON.stringify({ type: "done", module })}\n\n`);
          controller.close();
        } catch (error) {
          // Ignore abort errors from client disconnect
          if (clientDisconnected || (error instanceof Error && error.name === "AbortError")) {
            // Still mark as completed if we got this far
            after(async () => {
              await updateStreamStatus(interviewId, moduleKey, "completed");
            });
            controller.close();
            return;
          }
          
          console.error("Stream error:", error);
          const errorData = JSON.stringify({
            type: "error",
            error: "Failed to add more content",
            module,
          });
          safeEnqueue(`data: ${errorData}\n\n`);
          controller.close();

          // Mark stream as error
          after(async () => {
            await updateStreamStatus(interviewId, moduleKey, "error");
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
    console.error("Add more content error:", error);
    return NextResponse.json(
      { error: "Failed to add more content" },
      { status: 500 }
    );
  }
}
