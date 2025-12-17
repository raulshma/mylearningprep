import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-lg rounded-3xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
            <Skeleton className="h-12 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function JourneyStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-lg rounded-3xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
            <Skeleton className="h-12 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton(_props: { title?: string }) {
  return (
    <Card className="border-0 shadow-xl rounded-4xl overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-4 w-64 ml-1" />
      </CardHeader>
      <CardContent className="p-8 pt-4">
        <Skeleton className="h-[300px] w-full rounded-2xl" />
      </CardContent>
    </Card>
  );
}


export function DonutChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-xl rounded-4xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48 ml-1" />
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="flex flex-col items-center gap-8">
              <Skeleton className="w-56 h-56 rounded-full" />
              <div className="grid grid-cols-2 gap-3 w-full">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 ${count > 1 ? 'md:grid-cols-2' : ''} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-0 shadow-xl rounded-4xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48 ml-1" />
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
