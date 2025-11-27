import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { learningPathRepository } from "@/lib/db/repositories/learning-path-repository";
import {
  getLearningPathStream,
  getLearningPathStreamContent,
} from "@/lib/services/stream-store";

/**
 * Stream status response type
 */
interface StreamStatusResponse {
  status: "none" | "active" | "completed" | "error";
  streamId?: string;
  activityType?: string;
  content?: string;
  createdAt?: number;
}

/**
 * GET /api/learning-path/[id]/activity/stream/status
 * Check stream status for a learning path activity generation
 * 
 * Requirements: 5.2
 * - Authenticate user and verify learning path ownership
 * - Check Stream_Store for active stream
 * - Return stream status (none, active, completed, error)
 * - Include buffered content if available for resumption
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pathId } = await params;

  try {
    // Authenticate user
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

    // Check Stream_Store for active stream
    const streamRecord = await getLearningPathStream(pathId);

    // No active stream found
    if (!streamRecord) {
      const response: StreamStatusResponse = { status: "none" };
      return NextResponse.json(response);
    }

    // Build response based on stream status
    const response: StreamStatusResponse = {
      status: streamRecord.status,
      streamId: streamRecord.streamId,
      activityType: streamRecord.activityType,
      createdAt: streamRecord.createdAt,
    };

    // Include buffered content if stream is active (for resumption)
    if (streamRecord.status === "active") {
      const bufferedContent = await getLearningPathStreamContent(pathId);
      if (bufferedContent) {
        response.content = bufferedContent;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Stream status error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get stream status";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
