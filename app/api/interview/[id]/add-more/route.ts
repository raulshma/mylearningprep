import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { generateId } from "ai";
import { getAuthUserId, getByokApiKey, hasByokApiKey } from "@/lib/auth/get-user";
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
    const { module, count = 5, instructions } = body as {
      module: AddMoreModule;
      count?: number;
      instructions?: string;
    };

    if (!module || !["mcqs", "rapidFire", "revisionTopics"].includes(module)) {
      return NextResponse.json(
        { error: "Valid module type is required (mcqs, rapidFire, revisionTopics)" },
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

    // Get BYOK API key if available
    const apiKey = await getByokApiKey();

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

    // Save active stream record before starting
    await saveActiveStream({
      streamId,
      interviewId,
      module: `addMore_${module}`,
      userId: user._id,
      createdAt: Date.now(),
    });

    const encoder = new TextEncoder();
    let responseText = "";

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
          if (pendingData !== null) {
            const jsonData = JSON.stringify({
              type: "content",
              data: pendingData,
              module,
            });
            controller.enqueue(encoder.encode(`data: ${jsonData}\n\n`));
            pendingData = null;
          }
        };

        try {
          switch (module) {
            case "mcqs": {
              const result = await aiEngine.generateMCQs(
                ctx,
                count,
                {},
                apiKey ?? undefined
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
                prompt: `Add ${count} more MCQs for ${interview.jobDetails.title}`,
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
                count,
                {},
                apiKey ?? undefined
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
                prompt: `Add ${count} more revision topics for ${interview.jobDetails.title}`,
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
                count,
                {},
                apiKey ?? undefined
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
                prompt: `Add ${count} more rapid fire questions for ${interview.jobDetails.title}`,
                response: responseText,
                tokenUsage: extractTokenUsage(usage),
                latencyMs: loggerCtx.getLatencyMs(),
                timeToFirstToken: loggerCtx.getTimeToFirstToken(),
                metadata: loggerCtx.metadata,
              });
              break;
            }
          }

          // Send done event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", module })}\n\n`)
          );
          controller.close();

          // Mark stream as completed
          after(async () => {
            await updateStreamStatus(interviewId, `addMore_${module}`, "completed");
          });
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = JSON.stringify({
            type: "error",
            error: "Failed to add more content",
            module,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();

          // Mark stream as error
          after(async () => {
            await updateStreamStatus(interviewId, `addMore_${module}`, "error");
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
