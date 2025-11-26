import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { getActiveStream } from "@/lib/services/stream-store";

/**
 * GET /api/interview/[id]/stream/[module]
 * Check if there's an active generation for a specific module
 * Returns the stream status so the client can poll for completion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; module: string }> }
) {
  const { id: interviewId, module } = await params;

  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get interview to verify ownership
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

    // Check for active stream
    const activeStream = await getActiveStream(interviewId, module);

    if (!activeStream) {
      // No active stream
      return NextResponse.json({ status: "none" });
    }

    // Return stream status
    return NextResponse.json({
      status: activeStream.status,
      streamId: activeStream.streamId,
      createdAt: activeStream.createdAt,
    });
  } catch (error) {
    console.error("Check stream status error:", error);
    return NextResponse.json(
      { error: "Failed to check stream status" },
      { status: 500 }
    );
  }
}
