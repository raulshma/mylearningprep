import { Suspense } from 'react';
import { getDashboardData, type DashboardInterviewData } from '@/lib/actions/dashboard';
import { DashboardPageContent } from '@/components/dashboard/dashboard-page-content';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

// Re-export for backward compatibility with components
export type InterviewWithMeta = DashboardInterviewData;

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
