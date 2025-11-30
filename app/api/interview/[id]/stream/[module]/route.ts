import { NextRequest } from "next/server";
import { after } from "next/server";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { createResumableStreamContext } from "resumable-stream";
import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { getActiveStream } from "@/lib/services/stream-store";

/**
 * GET /api/interview/[id]/stream/[module]
 * Resume an active stream using Vercel AI SDK's resumable-stream
 * Returns the SSE stream directly - the stream is already in SSE format
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

    // Check for active stream with resumable stream ID
    const activeStream = await getActiveStream(interviewId, module);

    if (!activeStream) {
      // No active stream - return 204 No Content
      return new Response(null, { status: 204 });
    }

    // If stream is completed or errored, return appropriate status
    if (activeStream.status === "completed") {
      // Stream already completed - return 204 to indicate no active stream to resume
      return new Response(null, { status: 204 });
    }

    if (activeStream.status === "error") {
      // Stream errored - return error response
      return new Response(JSON.stringify({ error: "Stream failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream is still active - try to resume using resumable-stream
    if (!activeStream.resumableStreamId) {
      // No resumable stream ID stored - cannot resume
      return new Response(null, { status: 204 });
    }

    try {
      // Create stream context and resume the existing stream
      // The resumed stream is already in SSE format (ReadableStream<string>)
      const streamContext = createResumableStreamContext({ waitUntil: after });
      const resumedStream = await streamContext.resumeExistingStream(
        activeStream.resumableStreamId
      );

      if (!resumedStream) {
        // Stream not found or expired - return 204
        return new Response(null, { status: 204 });
      }

      // The resumable-stream returns a ReadableStream<string> in SSE format
      // We need to convert it back to bytes for the Response
      const encoder = new TextEncoder();
      const byteStream = resumedStream.pipeThrough(
        new TransformStream<string, Uint8Array>({
          transform(chunk, controller) {
            controller.enqueue(encoder.encode(chunk));
          },
        })
      );

      return new Response(byteStream, {
        headers: {
          ...UI_MESSAGE_STREAM_HEADERS,
          "X-Stream-Id": activeStream.streamId,
          "X-Resumable-Stream-Id": activeStream.resumableStreamId,
          "X-Stream-Resumed": "true",
        },
      });
    } catch (resumeError) {
      console.error("Failed to resume stream:", resumeError);
      // Failed to resume - return 204 to indicate no active stream
      return new Response(null, { status: 204 });
    }
  } catch (error) {
    console.error("Resume stream error:", error);
    return new Response(null, { status: 500 });
  }
}
