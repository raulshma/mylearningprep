import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  generateId,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { getResumableStreamContext } from "@/lib/services/resumable-stream-context";
import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { aiEngine, type GenerationContext } from "@/lib/services/ai-engine";
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
import type { RevisionTopic } from "@/lib/db/schemas/interview";

// Infer style type from schema
type AnalogyStyle = RevisionTopic["style"];

/**
 * POST /api/interview/[id]/topic/[topicId]/regenerate
 * Regenerate a topic's explanation with a different analogy style
 * Uses Vercel AI SDK's createUIMessageStream for proper streaming
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  const { id: interviewId, topicId } = await params;

  try {
    // Parse request body
    const body = await request.json();
    const { style, instructions } = body as {
      style: AnalogyStyle;
      instructions?: string;
    };

    if (!style || !["professional", "construction", "simple"].includes(style)) {
      return NextResponse.json(
        {
          error: "Valid style is required (professional, construction, simple)",
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

    // Find the topic
    const topic = interview.modules.revisionTopics.find(
      (t) => t.id === topicId
    );
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
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

    // Build generation context
    // Use interview's stored custom instructions if available, otherwise use request body instructions
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
    const moduleKey = `topic_${topicId}`;

    // Clear any previous stream content and save new active stream record
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

    // Use createUIMessageStream for proper AI SDK v5 streaming
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        let responseText = "";
        let firstTokenMarked = false;
        let lastSentTime = 0;
        let lastSentData: string | null = null;
        let pendingData: string | null = null;

        // Helper to send data with throttling
        const sendThrottled = (data: string, force = false) => {
          const now = Date.now();
          
          // Skip if data hasn't changed
          if (data === lastSentData && !force) return;
          
          pendingData = data;
          
          if (force || now - lastSentTime >= THROTTLE_MS) {
            writer.write({
              type: "data-partial",
              data: {
                type: "partial",
                topicId,
                data: pendingData,
              },
            });
            lastSentTime = now;
            lastSentData = data;
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
                topicId,
                data: pendingData,
              },
            });
            pendingData = null;
          }
        };

        try {
          const result = await aiEngine.regenerateTopicAnalogy(
            topic,
            style,
            ctx,
            {},
            apiKey ?? undefined,
            byokTierConfig ?? undefined
          );

          // Stream partial content with throttling
          for await (const partialObject of result.partialObjectStream) {
            if (partialObject.content) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }

              // Write partial content with throttling
              sendThrottled(partialObject.content);
              responseText = partialObject.content;
            }
          }

          // Flush any remaining pending data
          flushPending();

          // Get the final object
          const finalObject = await result.object;

          // Update only content and style, preserving ID, title, and reason
          await interviewRepository.updateTopicStyle(
            interviewId,
            topicId,
            finalObject.content,
            style
          );

          // Also cache the content for this style so switching back is instant
          await interviewRepository.updateTopicStyleCache(
            interviewId,
            topicId,
            style,
            finalObject.content
          );

          // Write the final complete content
          writer.write({
            type: "data-complete",
            data: {
              type: "complete",
              topicId,
              style,
              data: finalObject.content,
            },
          });

          // Update stream status to completed
          after(async () => {
            await updateStreamStatus(interviewId, moduleKey, "completed");
          });

          // Log the AI request
          const usage = await result.usage;
          const modelId = result.modelId;
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "REGENERATE_ANALOGY",
            status: "success",
            model: modelId,
            prompt: `Regenerate topic "${topic.title}" with ${style} style`,
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
              topicId,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to regenerate analogy",
            },
          });

          // Update stream status to error
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
      stream,
      headers: {
        "X-Stream-Id": streamId,
        "X-Resumable-Stream-Id": resumableStreamId,
        "X-Interview-Id": interviewId,
        "X-Topic-Id": topicId,
      },
      async consumeSseStream({ stream: sseStream }) {
        const streamContext = getResumableStreamContext();
        await streamContext.createNewResumableStream(resumableStreamId, () => sseStream);
        await updateResumableStreamId(interviewId, moduleKey, resumableStreamId);
      },
    });
  } catch (error) {
    console.error("Regenerate topic error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate topic" },
      { status: 500 }
    );
  }
}
