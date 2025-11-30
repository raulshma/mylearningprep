import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { generateId } from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { createResumableStreamContext } from "resumable-stream";
import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import {
  aiEngine,
  type GenerationContext,
  type BYOKTierConfig,
} from "@/lib/services/ai-engine";
import {
  logAIRequest,
  createLoggerContext,
  extractTokenUsage,
} from "@/lib/services/ai-logger";
import {
  saveActiveStream,
  updateStreamStatus,
  clearStreamContent,
  updateResumableStreamId,
} from "@/lib/services/stream-store";
import type {
  ModuleType,
  OpeningBrief,
  RevisionTopic,
  MCQ,
  RapidFire,
} from "@/lib/db/schemas/interview";

/**
 * POST /api/interview/[id]/generate
 * Generate a module for an interview with streaming + resumable support
 * Uses Vercel AI SDK's data stream protocol for proper client integration
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

    // Build generation context
    const customInstructions = interview.customInstructions || instructions;

    const ctx: GenerationContext = {
      resumeText: interview.resumeContext,
      jobDescription: interview.jobDetails.description,
      jobTitle: interview.jobDetails.title,
      company: interview.jobDetails.company,
      customInstructions,
      planContext: {
        plan: user.plan,
      },
    };

    // Create logger context with metadata
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Create stream ID for resumability
    const streamId = generateId();

    // Clear any previous stream content and save new active stream record
    await clearStreamContent(interviewId, module);
    await saveActiveStream({
      streamId,
      interviewId,
      module,
      userId: user._id,
      createdAt: Date.now(),
    });

    // Throttle interval to prevent excessive network usage
    const THROTTLE_MS = 150;

    // Use createUIMessageStream for proper AI SDK streaming with custom data parts
    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        let responseText = "";
        let firstTokenMarked = false;
        let lastSentTime = 0;
        let lastSentData: string | null = null;
        let pendingData: unknown = null;

        // Helper to send data with throttling
        const sendThrottled = (data: unknown, force = false) => {
          const now = Date.now();
          const dataStr = JSON.stringify(data);
          
          // Skip if data hasn't changed
          if (dataStr === lastSentData && !force) return;
          
          pendingData = data;
          
          if (force || now - lastSentTime >= THROTTLE_MS) {
            writer.write({
              type: "data-partial",
              data: {
                type: "partial",
                module,
                data: pendingData,
              },
            });
            lastSentTime = now;
            lastSentData = dataStr;
            pendingData = null;
          }
        };

        // Flush any pending data
        const flushPending = () => {
          if (pendingData !== null) {
            writer.write({
              type: "data-partial",
              data: {
                type: "partial",
                module,
                data: pendingData,
              },
            });
            pendingData = null;
          }
        };

        try {
          // Get the appropriate streamObject result based on module type
          const result = await getModuleStream(
            module,
            ctx,
            apiKey ?? undefined,
            byokTierConfig ?? undefined
          );

          // Stream partial objects as custom data parts with throttling
          for await (const partialObject of result.partialObjectStream) {
            if (!firstTokenMarked) {
              loggerCtx.markFirstToken();
              firstTokenMarked = true;
            }

            // Write partial object with throttling
            const partialData = extractPartialData(module, partialObject);
            if (partialData !== undefined) {
              sendThrottled(partialData);
            }
          }

          // Flush any remaining pending data
          flushPending();

          // Get the final object
          const finalObject = await result.object;
          responseText = JSON.stringify(finalObject);

          // Save to database
          await saveModuleContent(interviewId, module, finalObject);

          // Write the final complete object as custom data part
          writer.write({
            type: "data-complete",
            data: {
              type: "complete",
              module,
              data: extractFinalData(module, finalObject),
            },
          });

          // Update stream status to completed
          after(async () => {
            await updateStreamStatus(interviewId, module, "completed");
          });

          // Log the AI request
          const usage = await result.usage;
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: getActionForModule(module),
            model: result.modelId,
            prompt: `Generate ${module} for ${interview.jobDetails.title} at ${interview.jobDetails.company}`,
            response: responseText,
            toolsUsed: loggerCtx.toolsUsed,
            searchQueries: loggerCtx.searchQueries,
            searchResults: loggerCtx.searchResults,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
        } catch (error) {
          console.error("Stream error:", error);

          // Write error as custom data part
          writer.write({
            type: "data-error",
            data: {
              type: "error",
              module,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to generate content",
            },
          });

          // Update stream status to error
          after(async () => {
            await updateStreamStatus(interviewId, module, "error");
          });
        }
      },
      onError: (error: unknown) => {
        console.error("UI stream error:", error);
        return error instanceof Error ? error.message : "Stream error occurred";
      },
    });

    // Create resumable stream ID for this generation
    const resumableStreamId = generateId();

    // Use createUIMessageStreamResponse with consumeSseStream callback for resumable streams
    // This is the official pattern from Vercel AI SDK docs
    return createUIMessageStreamResponse({
      stream: uiStream,
      headers: {
        "X-Stream-Id": streamId,
        "X-Resumable-Stream-Id": resumableStreamId,
        "X-Interview-Id": interviewId,
        "X-Module": module,
      },
      // consumeSseStream receives the SSE stream as a ReadableStream<string>
      // which is exactly what resumable-stream expects
      async consumeSseStream({ stream: sseStream }) {
        // Create a resumable stream context with waitUntil for background work
        const streamContext = createResumableStreamContext({ waitUntil: after });
        
        // Create the resumable stream from the SSE stream
        await streamContext.createNewResumableStream(resumableStreamId, () => sseStream);
        
        // Store the resumable stream ID for later resumption
        await updateResumableStreamId(interviewId, module, resumableStreamId);
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

/**
 * Get the appropriate stream result for the module type
 */
async function getModuleStream(
  module: ModuleType,
  ctx: GenerationContext,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  switch (module) {
    case "openingBrief":
      return aiEngine.generateOpeningBrief(ctx, {}, apiKey, byokTierConfig);
    case "revisionTopics":
      return aiEngine.generateTopics(ctx, 8, {}, apiKey, byokTierConfig);
    case "mcqs":
      return aiEngine.generateMCQs(ctx, 10, {}, apiKey, byokTierConfig);
    case "rapidFire":
      return aiEngine.generateRapidFire(ctx, 20, {}, apiKey, byokTierConfig);
    default:
      throw new Error(`Unknown module type: ${module}`);
  }
}

/**
 * Extract partial data from the streaming object based on module type
 */
function extractPartialData(
  module: ModuleType,
  partialObject: Record<string, unknown>
): unknown {
  switch (module) {
    case "openingBrief":
      return partialObject.content ?? partialObject;
    case "revisionTopics":
      return partialObject.topics;
    case "mcqs":
      return partialObject.mcqs;
    case "rapidFire":
      return partialObject.questions;
    default:
      return partialObject;
  }
}

/**
 * Extract final data from the complete object based on module type
 */
function extractFinalData(
  module: ModuleType,
  finalObject: Record<string, unknown>
): unknown {
  switch (module) {
    case "openingBrief":
      return finalObject;
    case "revisionTopics":
      return finalObject.topics;
    case "mcqs":
      return finalObject.mcqs;
    case "rapidFire":
      return finalObject.questions;
    default:
      return finalObject;
  }
}

/**
 * Save the generated content to the database
 */
async function saveModuleContent(
  interviewId: string,
  module: ModuleType,
  object: Record<string, unknown>
) {
  switch (module) {
    case "openingBrief":
      await interviewRepository.updateModule(
        interviewId,
        "openingBrief",
        object as unknown as OpeningBrief
      );
      break;
    case "revisionTopics":
      await interviewRepository.updateModule(
        interviewId,
        "revisionTopics",
        object.topics as RevisionTopic[]
      );
      break;
    case "mcqs":
      await interviewRepository.updateModule(
        interviewId,
        "mcqs",
        object.mcqs as MCQ[]
      );
      break;
    case "rapidFire":
      await interviewRepository.updateModule(
        interviewId,
        "rapidFire",
        object.questions as RapidFire[]
      );
      break;
  }
}

/**
 * Get the action name for logging
 */
function getActionForModule(module: ModuleType) {
  const actionMap = {
    openingBrief: "GENERATE_BRIEF" as const,
    revisionTopics: "GENERATE_TOPICS" as const,
    mcqs: "GENERATE_MCQ" as const,
    rapidFire: "GENERATE_RAPID_FIRE" as const,
  };
  return actionMap[module];
}
