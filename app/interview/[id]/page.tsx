import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import type { Interview } from "@/lib/db/schemas/interview";

interface InterviewPageProps {
  params: Promise<{ id: string }>;
}

async function getInterviewData(
  interviewId: string
): Promise<Interview | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/login");
  }

  // Parallel fetch: user and interview at the same time
  const [user, interview] = await Promise.all([
    userRepository.findByClerkId(clerkId),
    interviewRepository.findById(interviewId),
  ]);

  if (!user) {
    redirect("/onboarding");
  }

  if (!interview) {
    return null;
  }

  // Verify ownership (unless public)
  if (interview.userId !== user._id && !interview.isPublic) {
    return null;
  }

  return interview;
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;
  const interview = await getInterviewData(id);

  if (!interview) {
    notFound();
  }

  return <InterviewWorkspace interview={interview} />;
}
