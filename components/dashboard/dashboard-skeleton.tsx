import {
  StatsSkeleton,
  LearningPathSkeleton,
  JourneySkeleton,
  InterviewsSkeleton,
} from "./section-skeletons";

/**
 * Full page skeleton for initial page load
 * Composes individual section skeletons for consistency
 */
export function DashboardSkeleton() {
  return (
    <div className="w-full min-h-screen p-0 space-y-12 pb-24">
      {/* Top Section: Overview Widgets Mosaic */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="min-h-[240px]">
          <StatsSkeleton />
        </div>
        <div className="min-h-[240px]">
          <LearningPathSkeleton />
        </div>
        <div className="min-h-[240px]">
          <JourneySkeleton />
        </div>
      </div>

      {/* Main Content: Interview Mosaic */}
      <div className="space-y-6">
        <div className="flex items-end justify-between px-1">
          <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        </div>
        <InterviewsSkeleton />
      </div>
    </div>
  );
}
