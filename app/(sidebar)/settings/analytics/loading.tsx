import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AnalyticsLoading() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-lg rounded-3xl">
              <CardContent className="p-6">
                <Skeleton className="w-10 h-10 rounded-2xl mb-4" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Card className="border-0 shadow-xl rounded-3xl">
          <CardHeader className="p-6 md:p-8 border-b border-border/50">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <Skeleton className="h-[250px] w-full rounded-2xl" />
          </CardContent>
        </Card>

        {/* Donut Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-xl rounded-3xl">
              <CardHeader className="p-6 md:p-8 border-b border-border/50">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-8">
                  <Skeleton className="w-48 h-48 rounded-full" />
                  <div className="flex-1 space-y-4">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
