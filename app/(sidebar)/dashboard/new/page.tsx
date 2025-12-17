import { Suspense } from 'react';
import { getIterationStatus } from '@/lib/actions/user';
import { NewInterviewForm } from '@/components/interview/new-interview-form';
import type { UserPlan } from '@/lib/db/schemas/user';

// Preload function - starts fetching before component renders
function preload() {
  void getIterationStatus();
}

/**
 * New Interview Page
 * 
 * Performance optimizations:
 * 1. preload() starts data fetching immediately
 * 2. getIterationStatus() uses React cache() - deduped with sidebar
 * 3. Suspense boundary allows shell to render while data loads
 */
export default function NewInterviewPage() {
  // Start fetching immediately
  preload();
  
  return (
    <Suspense fallback={<NewInterviewFormSkeleton />}>
      <NewInterviewFormLoader />
    </Suspense>
  );
}

// Async component that fetches and renders the form
async function NewInterviewFormLoader() {
  const result = await getIterationStatus();
  
  const usageData = result.success
    ? {
        interviews: {
          count: result.data.interviews.count,
          limit: result.data.interviews.limit,
        },
        plan: result.data.plan as UserPlan,
        isByok: result.data.isByok,
      }
    : {
        interviews: { count: 0, limit: 3 },
        plan: 'FREE' as UserPlan,
        isByok: false,
      };

  return <NewInterviewForm usageData={usageData} />;
}

// Inline skeleton for faster initial paint
function NewInterviewFormSkeleton() {
  return (
    <div className="max-w-full px-4 md:px-0 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Start skeleton */}
          <div className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="h-40 bg-muted/50 rounded-2xl animate-pulse" />
            <div className="flex justify-end mt-4">
              <div className="h-11 w-32 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-border/50" />
            <div className="h-4 w-6 bg-muted rounded animate-pulse" />
            <div className="flex-1 h-px bg-border/50" />
          </div>
          {/* Toggle skeleton */}
          <div className="h-16 bg-muted/30 rounded-2xl animate-pulse" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl h-48 animate-pulse" />
          <div className="bg-primary/5 border border-white/10 p-6 rounded-3xl h-56 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
