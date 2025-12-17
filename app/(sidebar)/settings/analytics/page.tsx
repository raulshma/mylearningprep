import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthUserId } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { AnalyticsPageContent } from '@/components/settings/analytics-page-content';
import { AnalyticsUpgradePrompt } from '@/components/settings/analytics-upgrade-prompt';
import {
  AnalyticsStatsSection,
  AnalyticsJourneyStatsSection,
  AnalyticsInterviewChartSection,
  AnalyticsProgressChartsSection,
  AnalyticsJourneyChartsSection,
  AnalyticsListsSection,
  AnalyticsJourneyListSection,
} from '@/components/settings/analytics-sections';
import {
  StatsGridSkeleton,
  JourneyStatsSkeleton,
  ChartSkeleton,
  DonutChartsSkeleton,
  ListsSkeleton,
} from '@/components/settings/analytics-skeletons';

export default async function AnalyticsPage() {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);

  if (!user) {
    redirect('/dashboard');
  }

  if (user.plan === 'FREE') {
    return <AnalyticsUpgradePrompt />;
  }

  return (
    <AnalyticsPageContent>
      <div className="space-y-8">
        {/* Stats Grid - loads first, most important */}
        <Suspense fallback={<StatsGridSkeleton />}>
          <AnalyticsStatsSection />
        </Suspense>

        {/* Journey Stats */}
        <Suspense fallback={<JourneyStatsSkeleton />}>
          <AnalyticsJourneyStatsSection />
        </Suspense>

        {/* Interview Activity Chart */}
        <Suspense fallback={<ChartSkeleton title="Interview Activity" />}>
          <AnalyticsInterviewChartSection />
        </Suspense>

        {/* Progress Donut Charts */}
        <Suspense fallback={<DonutChartsSkeleton />}>
          <AnalyticsProgressChartsSection />
        </Suspense>

        {/* Journey Charts */}
        <Suspense fallback={<DonutChartsSkeleton />}>
          <AnalyticsJourneyChartsSection />
        </Suspense>

        {/* Company & Skills Lists */}
        <Suspense fallback={<ListsSkeleton />}>
          <AnalyticsListsSection />
        </Suspense>

        {/* Top Journeys List */}
        <Suspense fallback={<ListsSkeleton count={1} />}>
          <AnalyticsJourneyListSection />
        </Suspense>
      </div>
    </AnalyticsPageContent>
  );
}
