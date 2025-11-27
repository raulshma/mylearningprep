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

// Custom streaming headers
const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// Throttle interval in ms - only send updates this often
const STREAM_THROTTLE_MS = 100;

type AnalogyStyle = "professional" | "construction" | "simple";

/**
 * POST /api/interview/[id]/topic/[topicId]/regenerate
 * Regenerate a topic's explanation with a different analogy style
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
        { error: "Valid style is required (professional, construction, simple)" },
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
    const topic = interview.modules.revisionTopics.find((t) => t.id === topicId);
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
              topicId,
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
              topicId,
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
          const result = await aiEngine.regenerateTopicAnalogy(
            topic,
            style,
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
              await sendThrottled(partialObject.content);
              responseText = partialObject.content;
            }
          }
          await flushPending();

          const finalObject = await result.object;

          // Update only content and style, preserving ID, title, and reason
          await interviewRepository.updateTopicStyle(
            interviewId,
            topicId,
            finalObject.content,
            style
          );

          // Log the request with full metadata
          const usage = await result.usage;
          const modelId = result.modelId;
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "REGENERATE_ANALOGY",
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
          safeEnqueue(`data: ${JSON.stringify({ type: "done", topicId, style })}\n\n`);
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
            error: "Failed to regenerate analogy",
            topicId,
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
    console.error("Regenerate topic error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate topic" },
      { status: 500 }
    );
  }
}
