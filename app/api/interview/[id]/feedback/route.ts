import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/get-user";
import { feedbackRepository } from "@/lib/db/repositories/feedback-repository";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { CreateFeedbackInputSchema } from "@/lib/schemas/feedback-input";

/**
 * POST /api/interview/[id]/feedback
 * Create a new feedback entry for an interview
 * Requirements: 1.2
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: interviewId } = await params;

  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (interview.userId !== user._id) {
      return NextResponse.json(
        { error: "Not authorized to add feedback to this interview" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateFeedbackInputSchema.safeParse({
      ...body,
      interviewId,
    });

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      return NextResponse.json(
        {
          error: firstError
            ? `${firstError[0]}: ${firstError[1]?.[0]}`
            : "Invalid input",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    // Create feedback entry
    const feedbackEntry = await feedbackRepository.create({
      interviewId,
      userId: user._id,
      question: validationResult.data.question.trim(),
      attemptedAnswer: validationResult.data.attemptedAnswer?.trim(),
      difficultyRating: validationResult.data.difficultyRating,
      topicHints: validationResult.data.topicHints,
    });

    return NextResponse.json(feedbackEntry, { status: 201 });
  } catch (error) {
    console.error("Create feedback error:", error);
    return NextResponse.json(
      { error: "Failed to create feedback entry" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interview/[id]/feedback
 * Get all feedback entries for an interview
 * Requirements: 1.4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: interviewId } = await params;

  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (interview.userId !== user._id && !interview.isPublic) {
      return NextResponse.json(
        { error: "Not authorized to view feedback for this interview" },
        { status: 403 }
      );
    }

    // Get feedback entries (sorted chronologically by repository)
    const feedbackEntries = await feedbackRepository.findByInterviewId(interviewId);

    return NextResponse.json(feedbackEntries);
  } catch (error) {
    console.error("Get feedback error:", error);
    return NextResponse.json(
      { error: "Failed to get feedback entries" },
      { status: 500 }
    );
  }
}
