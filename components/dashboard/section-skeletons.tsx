import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for StatsSection
 */
export function StatsSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 h-full flex flex-col justify-between animate-pulse">
      <div className="relative z-10 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <Skeleton className="h-6 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for LearningPathSection
 */
export function LearningPathSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 h-full flex flex-col justify-between animate-pulse">
      <div className="relative z-10 w-full space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 w-full">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 p-2 rounded-lg border border-border/50">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-6 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-4 mt-6 w-full">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-8 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for JourneySection
 */
export function JourneySkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 h-full flex flex-col justify-between animate-pulse">
      <div className="relative z-10 w-full space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 w-full">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 p-2 rounded-lg border border-border/50">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
        </div>
      </div>
      <div className="relative z-10 space-y-4 mt-4 w-full">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-8 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for InterviewsSection
 */
export function InterviewsSkeleton() {
  return (
    <div className="min-h-[50vh] space-y-8 animate-pulse">
      {/* Search & Filters Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-10 bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-border/50 shadow-sm">
        <Skeleton className="h-11 w-full sm:max-w-md rounded-xl" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Masonry Grid Skeleton */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {/* New Interview Card Skeleton */}
        <div className="break-inside-avoid mb-6 w-full">
          <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 min-h-[300px] flex flex-col items-center justify-center p-6">
            <Skeleton className="w-16 h-16 rounded-full mb-6" />
            <div className="text-center w-full flex flex-col items-center space-y-2">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
          </div>
        </div>
        
        {/* Interview Cards Skeletons */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="break-inside-avoid mb-6 w-full">
            <div className="flex flex-col bg-card/50 backdrop-blur-md rounded-3xl border border-border/50 shadow-sm overflow-hidden w-full">
              <div className="p-6 flex flex-col h-full space-y-6">
                <div className="flex items-start justify-between">
                  <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-7 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-14 rounded-md" />
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-3 w-8 rounded" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <div className="pt-4 border-t border-border/10 flex justify-between items-center">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
