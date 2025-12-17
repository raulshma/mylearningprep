import { Map } from 'lucide-react';
import { JourneyCard } from './journey-card';
import type { Journey } from '@/lib/db/schemas/journey';
import type { UserJourneyProgressSummary } from '@/lib/db/schemas/user-journey-progress';

interface JourneyListProps {
  journeys: Journey[];
  progressMap: Record<string, UserJourneyProgressSummary>;
}

export function JourneyList({ journeys, progressMap }: JourneyListProps) {
  const inProgressJourneys = journeys.filter(journey => {
    const progress = progressMap[journey.slug];
    return progress && progress.overallProgress > 0 && progress.overallProgress < 100;
  });

  const otherJourneys = journeys.filter(journey => {
    const progress = progressMap[journey.slug];
    return !progress || progress.overallProgress === 0 || progress.overallProgress === 100;
  });

  if (journeys.length === 0) {
    return (
      <div className="text-center py-24 bg-card/50 rounded-3xl border border-dashed border-border">
        <div className="w-20 h-20 rounded-3xl bg-secondary/30 flex items-center justify-center mx-auto mb-6">
          <Map className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No journeys available</h2>
        <p className="text-muted-foreground">Check back soon for new learning paths!</p>
      </div>
    );
  }

  return (
    <>
      {/* Continue Learning Section */}
      {inProgressJourneys.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 rounded-full bg-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Continue Learning</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {inProgressJourneys.map((journey) => {
              const progress = progressMap[journey.slug];
              const progressPercent = progress?.overallProgress || 0;
              
              return (
                <JourneyCard
                  key={journey._id}
                  journey={journey}
                  progressPercent={progressPercent}
                  isStarted={true}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* All Journeys Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 rounded-full bg-indigo-500" />
          <h2 className="text-2xl font-bold tracking-tight">
            {inProgressJourneys.length > 0 ? "Explore More" : "All Journeys"}
          </h2>
        </div>
        {otherJourneys.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {otherJourneys.map((journey) => {
              const progress = progressMap[journey.slug];
              const progressPercent = progress?.overallProgress || 0;
              const isStarted = !!progress;

              return (
                <JourneyCard
                  key={journey._id}
                  journey={journey}
                  progressPercent={progressPercent}
                  isStarted={isStarted}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
            <p>You&apos;ve started every available journey! Amazing work!</p>
          </div>
        )}
      </section>
    </>
  );
}
