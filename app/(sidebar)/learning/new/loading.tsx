import { Skeleton } from '@/components/ui/skeleton';

export default function NewLearningPathLoading() {
  return (
    <div className="max-w-full px-4 md:px-0">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        {/* Main form area */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          {/* Goal Input Card Skeleton */}
          <div className="bg-card border border-border p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="w-10 h-10" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-[140px] w-full" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>

          {/* Example Goals Skeleton */}
          <div className="bg-card border border-border p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-48" />
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="w-4 h-4 mt-0.5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
