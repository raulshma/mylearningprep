import { Suspense } from 'react';
import { getAuthUserId } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { interviewRepository } from '@/lib/db/repositories/interview-repository';
import { DashboardPageContent } from '@/components/dashboard/dashboard-page-content';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import type { Interview } from '@/lib/db/schemas/interview';

export interface InterviewWithMeta extends Interview {
  status: 'upcoming' | 'active' | 'completed';
  progress: number;
  topics: string[];
}

function getInterviewStatus(interview: Interview): 'upcoming' | 'active' | 'completed' {
  const hasOpeningBrief = !!interview.modules.openingBrief;
  const hasTopics = interview.modules.revisionTopics.length > 0;
  const hasMcqs = interview.modules.mcqs.length > 0;
  const hasRapidFire = interview.modules.rapidFire.length > 0;

  const moduleCount = [hasOpeningBrief, hasTopics, hasMcqs, hasRapidFire].filter(Boolean).length;

  if (moduleCount === 4) return 'completed';
  if (moduleCount > 0) return 'active';
  return 'upcoming';
}

function getInterviewProgress(interview: Interview): number {
  const hasOpeningBrief = !!interview.modules.openingBrief;
  const hasTopics = interview.modules.revisionTopics.length > 0;
  const hasMcqs = interview.modules.mcqs.length > 0;
  const hasRapidFire = interview.modules.rapidFire.length > 0;

  const moduleCount = [hasOpeningBrief, hasTopics, hasMcqs, hasRapidFire].filter(Boolean).length;
  return Math.round((moduleCount / 4) * 100);
}

function extractTopics(interview: Interview): string[] {
  const topics: string[] = [];
  interview.modules.revisionTopics.slice(0, 4).forEach((topic) => {
    topics.push(topic.title);
  });
  if (topics.length === 0 && interview.modules.openingBrief?.keySkills) {
    topics.push(...interview.modules.openingBrief.keySkills.slice(0, 4));
  }
  return topics;
}

async function getDashboardData() {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);

  if (!user) {
    throw new Error('User not found');
  }

  const interviews = await interviewRepository.findByUserId(user._id);

  const interviewsWithMeta: InterviewWithMeta[] = interviews.map((interview) => ({
    ...interview,
    status: getInterviewStatus(interview),
    progress: getInterviewProgress(interview),
    topics: extractTopics(interview),
  }));

  const stats = {
    total: interviews.length,
    active: interviewsWithMeta.filter((i) => i.status === 'active' || i.status === 'upcoming').length,
    completed: interviewsWithMeta.filter((i) => i.status === 'completed').length,
  };

  return { interviews: interviewsWithMeta, stats };
}

export default async function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardDataLoader />
    </Suspense>
  );
}

async function DashboardDataLoader() {
  const { interviews, stats } = await getDashboardData();
  return <DashboardPageContent interviews={interviews} stats={stats} />;
}
