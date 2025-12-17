import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSectionSkeleton() {
  return (
    <div className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function ProfileSectionSkeleton() {
  return (
    <div className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl animate-pulse">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  );
}

export function SubscriptionSectionSkeleton() {
  return (
    <div className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}
