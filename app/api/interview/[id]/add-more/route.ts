import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { generateId } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { getResumableStreamContext } from "@/lib/services/resumable-stream-context";
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
import { ITERATION_COSTS } from "@/lib/pricing-data";
import {
  saveActiveStream,
  updateStreamStatus,
  clearStreamContent,
  updateResumableStreamId,
} from "@/lib/services/stream-store";
import type { MCQ, RevisionTopic, RapidFire } from "@/lib/db/schemas/interview";

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
        {
          error:
            "Valid module type is required (mcqs, rapidFire, revisionTopics)",
        },
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
      await userRepository.incrementIteration(clerkId, ITERATION_COSTS.FULL_GENERATION);
    }

    // Get BYOK API key and tier config if available
    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Build generation context with existing content for duplicate prevention
    const existingContent = getExistingContentIds(interview, module);

    // Use interview's stored custom instructions if available, otherwise use request body instructions
    const customInstructions = interview.customInstructions || instructions;

    const ctx: GenerationContext = {
      resumeText: interview.resumeContext,
      jobDescription: interview.jobDetails.description,
      jobTitle: interview.jobDetails.title,
      company: interview.jobDetails.company,
      existingContent,
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
    const moduleKey = `addMore_${module}`;
    await clearStreamContent(interviewId, moduleKey);
    await saveActiveStream({
      streamId,
      interviewId,
      module: moduleKey,
      userId: user._id,
      createdAt: Date.now(),
    });

    // Throttle interval to prevent excessive network usage
    const THROTTLE_MS = 150;

    // Use createUIMessageStream for proper AI SDK streaming with custom data parts
    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
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
          // Get the appropriate stream based on module type
          const result = await getAddMoreStream(
            module,
            ctx,
            effectiveCount,
            apiKey ?? undefined,
            byokTierConfig ?? undefined
          );

          // Stream partial objects as custom data parts with throttling
          for await (const partialObject of result.partialObjectStream) {
            if (!firstTokenMarked) {
              loggerCtx.markFirstToken();
              firstTokenMarked = true;
            }

            const partialData = extractAddMorePartialData(
              module,
              partialObject
            );
            if (partialData !== undefined) {
              sendThrottled(partialData);
            }
          }

          // Flush any remaining pending data
          flushPending();

          // Get the final object
          const finalObject = await result.object;
          const newItems = extractAddMoreFinalData(module, finalObject);

          // Filter out duplicates
          const existingIds = new Set(existingContent);
          const uniqueItems = (newItems as { id: string }[]).filter(
            (item) => !existingIds.has(item.id)
          );

          // Append to database with proper type handling
          await appendToModuleTyped(interviewId, module, uniqueItems);

          // Write the final complete data as custom data part
          writer.write({
            type: "data-complete",
            data: {
              type: "complete",
              module,
              data: uniqueItems,
            },
          });

          // Update stream status
          after(async () => {
            await updateStreamStatus(interviewId, moduleKey, "completed");
          });

          // Log the AI request
          const usage = await result.usage;
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: getAddMoreAction(module),
            status: "success",
            model: result.modelId,
            prompt: `Add ${effectiveCount} more ${module} for ${interview.jobDetails.title}`,
            response: JSON.stringify(uniqueItems),
            toolsUsed: loggerCtx.toolsUsed,
            searchQueries: loggerCtx.searchQueries,
            searchResults: loggerCtx.searchResults,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
        } catch (error) {
          console.error("Add more stream error:", error);

          writer.write({
            type: "data-error",
            data: {
              type: "error",
              module,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to add more content",
            },
          });

          after(async () => {
            await updateStreamStatus(interviewId, moduleKey, "error");
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
    return createUIMessageStreamResponse({
      stream: uiStream,
      headers: {
        "X-Stream-Id": streamId,
        "X-Resumable-Stream-Id": resumableStreamId,
        "X-Interview-Id": interviewId,
        "X-Module": module,
      },
      async consumeSseStream({ stream: sseStream }) {
        const streamContext = getResumableStreamContext();
        await streamContext.createNewResumableStream(resumableStreamId, () => sseStream);
        await updateResumableStreamId(interviewId, moduleKey, resumableStreamId);
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

/**
 * Append items to module with proper type handling
 */
async function appendToModuleTyped(
  interviewId: string,
  module: AddMoreModule,
  items: { id: string }[]
) {
  switch (module) {
    case "revisionTopics":
      await interviewRepository.appendToModule(
        interviewId,
        "revisionTopics",
        items as RevisionTopic[]
      );
      break;
    case "mcqs":
      await interviewRepository.appendToModule(
        interviewId,
        "mcqs",
        items as MCQ[]
      );
      break;
    case "rapidFire":
      await interviewRepository.appendToModule(
        interviewId,
        "rapidFire",
        items as RapidFire[]
      );
      break;
  }
}

/**
 * Get the appropriate stream for adding more content
 */
async function getAddMoreStream(
  module: AddMoreModule,
  ctx: GenerationContext,
  count: number,
  apiKey?: string,
  byokTierConfig?: BYOKTierConfig
) {
  switch (module) {
    case "revisionTopics":
      return aiEngine.generateTopics(ctx, count, {}, apiKey, byokTierConfig);
    case "mcqs":
      return aiEngine.generateMCQs(ctx, count, {}, apiKey, byokTierConfig);
    case "rapidFire":
      return aiEngine.generateRapidFire(ctx, count, {}, apiKey, byokTierConfig);
    default:
      throw new Error(`Unknown module type: ${module}`);
  }
}

/**
 * Extract partial data from streaming object
 */
function extractAddMorePartialData(
  module: AddMoreModule,
  partialObject: Record<string, unknown>
): unknown {
  switch (module) {
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
 * Extract final data from complete object
 */
function extractAddMoreFinalData(
  module: AddMoreModule,
  finalObject: Record<string, unknown>
): unknown[] {
  switch (module) {
    case "revisionTopics":
      return finalObject.topics as RevisionTopic[];
    case "mcqs":
      return finalObject.mcqs as MCQ[];
    case "rapidFire":
      return finalObject.questions as RapidFire[];
    default:
      return [];
  }
}

/**
 * Get the action name for logging
 */
function getAddMoreAction(module: AddMoreModule) {
  const actionMap = {
    revisionTopics: "GENERATE_TOPICS" as const,
    mcqs: "GENERATE_MCQ" as const,
    rapidFire: "GENERATE_RAPID_FIRE" as const,
  };
  return actionMap[module];
}
