import 'server-only';

import { Suspense } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { getJourneys, getUserProgressMap, getCurrentUserId } from '@/lib/data/journeys';
import { getUserGamificationAction } from '@/lib/actions/gamification';
import { JourneyHero } from './journey-hero';
import { JourneyList } from './journey-list';
import { JourneyCardSkeleton } from './journey-skeleton';
import type { UserJourneyProgressSummary } from '@/lib/db/schemas/user-journey-progress';

// Hero section skeleton
function HeroSkeleton() {
  return (
    <div className="relative w-full mb-10 overflow-hidden rounded-3xl border border-border/40 bg-card animate-pulse">
      <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        <div className="max-w-xl space-y-4 w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-6 w-24 rounded-full bg-secondary" />
            <div className="h-6 w-24 rounded-full bg-secondary" />
          </div>
          <div className="h-10 w-3/4 md:w-[400px] rounded-lg bg-secondary" />
          <div className="space-y-2">
            <div className="h-5 w-full md:w-[500px] bg-secondary rounded" />
            <div className="h-5 w-2/3 md:w-[350px] bg-secondary rounded" />
          </div>
        </div>
        <div className="shrink-0 grid grid-cols-2 gap-4 w-full md:w-auto">
          <div className="p-4 rounded-2xl border border-border/50 bg-background/50 h-[84px] w-[140px] md:w-[160px]" />
          <div className="p-4 rounded-2xl border border-border/50 bg-background/50 h-[84px] w-[140px] md:w-[160px]" />
          <div className="col-span-2 p-4 rounded-2xl border border-border/50 bg-background/50 h-[76px]" />
        </div>
      </div>
    </div>
  );
}

// Journey cards skeleton
function JourneyListSkeleton() {
  return (
    <div className="flex-1 space-y-12 pb-12">
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 rounded-full bg-secondary" />
          <div className="h-8 w-48 rounded-lg bg-secondary" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <JourneyCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

// Async component for hero section
async function JourneyHeroSection() {
  const [userId, user] = await Promise.all([
    getCurrentUserId(),
    currentUser(),
  ]);

  if (!userId) {
    return null;
  }

  const [gamification, progressMap] = await Promise.all([
    getUserGamificationAction(),
    getUserProgressMap(userId),
  ]);

  return (
    <JourneyHero
      gamification={gamification}
      progressMap={progressMap}
      firstName={user?.firstName}
    />
  );
}

// Async component for journey list
async function JourneyListSection() {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return (
      <div className="text-center py-24 bg-card/50 rounded-3xl border border-dashed border-border">
        <p className="text-muted-foreground">Please sign in to view journeys</p>
      </div>
    );
  }

  const [journeys, progressMap] = await Promise.all([
    getJourneys(),
    getUserProgressMap(userId),
  ]);

  return <JourneyList journeys={journeys} progressMap={progressMap} />;
}

// Main content component with granular Suspense boundaries
export function JourneysContent() {
  return (
    <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
      {/* Hero streams first */}
      <Suspense fallback={<HeroSkeleton />}>
        <JourneyHeroSection />
      </Suspense>

      {/* Journey list streams independently */}
      <div className="flex-1 space-y-12 pb-12">
        <Suspense fallback={<JourneyListSkeleton />}>
          <JourneyListSection />
        </Suspense>
      </div>
    </div>
  );
}
