import { Suspense } from "react";
import { StatsSection } from "@/components/dashboard/stats-section";
import { LearningPathSection } from "@/components/dashboard/learning-path-section";
import { JourneySection } from "@/components/dashboard/journey-section";
import { InterviewsSection } from "@/components/dashboard/interviews-section";
import {
  StatsSkeleton,
  LearningPathSkeleton,
  JourneySkeleton,
  InterviewsSkeleton,
} from "@/components/dashboard/section-skeletons";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  getDashboardStats,
  getActiveLearningPath,
  getJourneyProgress,
  getDashboardInterviews,
} from "@/lib/actions/dashboard";

// Re-export types for backward compatibility
export type { DashboardInterviewData as InterviewWithMeta } from "@/lib/actions/dashboard";

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Preload all data fetchers - starts fetching before components render
function preloadDashboardData(page: number, search?: string, status?: 'active' | 'completed' | 'all') {
  // Fire all requests in parallel without awaiting
  void getDashboardStats();
  void getActiveLearningPath();
  void getJourneyProgress();
  void getDashboardInterviews(page, search, status);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const search = typeof resolvedSearchParams.search === "string" 
    ? resolvedSearchParams.search 
    : undefined;
  const status = typeof resolvedSearchParams.status === "string" 
    ? (resolvedSearchParams.status as 'active' | 'completed' | 'all') 
    : undefined;

  // Start all data fetching immediately (parallel preload)
  preloadDashboardData(page, search, status);

  // Unique key for interviews section - forces re-render on param change
  const interviewsKey = `interviews-${page}-${search ?? ''}-${status ?? 'all'}`;

  return (
    <>
      <DashboardHeader />
      
      <div className="w-full min-h-screen p-0 space-y-12 pb-24">
        {/* Overview Widgets - Stream independently in parallel */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="min-h-[240px]">
            <Suspense fallback={<StatsSkeleton />}>
              <StatsSection />
            </Suspense>
          </div>

          <div className="min-h-[240px]">
            <Suspense fallback={<LearningPathSkeleton />}>
              <LearningPathSection />
            </Suspense>
          </div>

          <div className="min-h-[240px]">
            <Suspense fallback={<JourneySkeleton />}>
              <JourneySection />
            </Suspense>
          </div>
        </div>

        {/* Interview List */}
        <div className="space-y-6">
          <div className="flex items-end justify-between px-1">
            <h2 className="text-2xl font-bold tracking-tight">Recent Sessions</h2>
          </div>
          
          <div className="min-h-[50vh]">
            <Suspense fallback={<InterviewsSkeleton />} key={interviewsKey}>
              <InterviewsSection page={page} search={search} status={status} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
