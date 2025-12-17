import { Skeleton } from '@/components/ui/skeleton';

function PricingCardSkeleton() {
  return (
    <div className="rounded-4xl p-8 border border-white/10 bg-card/30">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      
      <div className="flex items-baseline gap-1 mb-8">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      
      <div className="space-y-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

export default function UpgradeLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Warning skeleton */}
      <Skeleton className="h-20 w-full rounded-2xl mb-8" />
      
      {/* Pricing grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <PricingCardSkeleton />
        <PricingCardSkeleton />
        <PricingCardSkeleton />
      </div>
      
      {/* Comparison table skeleton */}
      <div className="mt-16">
        <Skeleton className="h-96 w-full rounded-4xl" />
      </div>
    </div>
  );
}
