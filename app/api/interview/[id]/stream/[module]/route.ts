import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import {
  getActiveStream,
  getStreamContent,
} from "@/lib/services/stream-store";

// SSE headers for stream resumption
const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/**
 * GET /api/interview/[id]/stream/[module]
 * Resume an active stream by replaying buffered content
 * Returns 204 if no active stream exists
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; module: string }> }
) {
  const { id: interviewId, module } = await params;

  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return new Response(null, { status: 401 });
    }

    if (!interview) {
      return new Response(null, { status: 404 });
    }

    // Verify ownership
    if (interview.userId !== user._id) {
      return new Response(null, { status: 403 });
    }

    // Check for active stream
    const activeStream = await getActiveStream(interviewId, module);

    if (!activeStream) {
      // Check if there's buffered content even without active stream record
      // This handles the case where stream completed but record expired
      const bufferedContent = await getStreamContent(interviewId, module);
      if (bufferedContent) {
        // There's content - stream likely completed, replay it
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(bufferedContent));
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done", module })}\n\n`)
            );
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            ...STREAM_HEADERS,
            "X-Stream-Resumed": "true",
          },
        });
      }
      
      // No active stream and no buffered content - return 204 No Content
      return new Response(null, { status: 204 });
    }

    // If stream is completed or errored, return the final status
    if (activeStream.status === "completed") {
      // Get buffered content and send it with done event
      const bufferedContent = await getStreamContent(interviewId, module);
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send buffered content if available
          if (bufferedContent) {
            controller.enqueue(encoder.encode(bufferedContent));
          }
          // Send done event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", module })}\n\n`)
          );
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...STREAM_HEADERS,
          "X-Stream-Id": activeStream.streamId,
          "X-Stream-Resumed": "true",
        },
      });
    }

    if (activeStream.status === "error") {
      // Return error status
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: "Stream failed",
                module,
              })}\n\n`
            )
          );
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...STREAM_HEADERS,
          "X-Stream-Id": activeStream.streamId,
          "X-Stream-Resumed": "true",
        },
      });
    }

    // Stream is still active - return buffered content and poll for more
    const bufferedContent = await getStreamContent(interviewId, module);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send buffered content first
        if (bufferedContent) {
          controller.enqueue(encoder.encode(bufferedContent));
        }

        // Poll for new content until stream completes
        let lastContentLength = bufferedContent?.length || 0;
        const pollInterval = 200; // ms
        const maxPollTime = 5 * 60 * 1000; // 5 minutes max
        const startTime = Date.now();

        while (Date.now() - startTime < maxPollTime) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          // Check if stream is still active
          const currentStream = await getActiveStream(interviewId, module);
          if (!currentStream || currentStream.status !== "active") {
            // Stream finished - get final content
            const finalContent = await getStreamContent(interviewId, module);
            if (finalContent && finalContent.length > lastContentLength) {
              // Send new content
              const newContent = finalContent.slice(lastContentLength);
              controller.enqueue(encoder.encode(newContent));
            }

            // Send appropriate final event
            if (currentStream?.status === "completed") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", module })}\n\n`)
              );
            } else if (currentStream?.status === "error") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: "Stream failed",
                    module,
                  })}\n\n`
                )
              );
            }
            break;
          }

          // Get new content
          const currentContent = await getStreamContent(interviewId, module);
          if (currentContent && currentContent.length > lastContentLength) {
            const newContent = currentContent.slice(lastContentLength);
            controller.enqueue(encoder.encode(newContent));
            lastContentLength = currentContent.length;
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...STREAM_HEADERS,
        "X-Stream-Id": activeStream.streamId,
        "X-Stream-Resumed": "true",
      },
    });
  } catch (error) {
    console.error("Resume stream error:", error);
    return new Response(null, { status: 500 });
  }
}
