import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { learningPathRepository } from '@/lib/db/repositories/learning-path-repository';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { LearningWorkspace } from '@/components/learning/learning-workspace';
import type { LearningPath } from '@/lib/db/schemas/learning-path';

interface LearningPageProps {
  params: Promise<{ id: string }>;
}

async function getLearningPathData(pathId: string): Promise<LearningPath | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/login');
  }

  const user = await userRepository.findByClerkId(clerkId);
  if (!user) {
    redirect('/onboarding');
  }

  const learningPath = await learningPathRepository.findById(pathId);
  if (!learningPath) {
    return null;
  }

  // Verify ownership
  if (learningPath.userId !== user._id) {
    return null;
  }

  return learningPath;
}

export default async function LearningPage({ params }: LearningPageProps) {
  const { id } = await params;
  const learningPath = await getLearningPathData(id);

  if (!learningPath) {
    notFound();
  }

  return <LearningWorkspace learningPath={learningPath} />;
}
