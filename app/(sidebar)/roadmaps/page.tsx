import { Map } from 'lucide-react';
import { currentUser } from '@clerk/nextjs/server';
import { getRoadmaps } from '@/lib/actions/roadmap';
import { checkAndSeedRoadmaps } from '@/lib/actions/seed-roadmaps';
import { getUserGamificationAction } from '@/lib/actions/gamification';
import { RoadmapsPageClient } from '@/components/roadmap/roadmaps-page-client';
import { RoadmapCard } from '@/components/roadmap/roadmap-card';
import { RoadmapHero } from '@/components/roadmap/roadmap-hero';

export default async function RoadmapsPage() {
  // Auto-seed roadmaps if none exist
  await checkAndSeedRoadmaps();

  const [{ roadmaps, progressMap }, gamification, user] = await Promise.all([
    getRoadmaps(),
    getUserGamificationAction(),
    currentUser(),
  ]);

  const inProgressRoadmaps = roadmaps.filter(roadmap => {
    const progress = progressMap[roadmap.slug];
    return progress && progress.overallProgress > 0 && progress.overallProgress < 100;
  });

  const otherRoadmaps = roadmaps.filter(roadmap => {
    const progress = progressMap[roadmap.slug];
    return !progress || progress.overallProgress === 0 || progress.overallProgress === 100;
  });

  return (
    <RoadmapsPageClient>
      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
        {/* Welcome Hero & Stats */}
        <RoadmapHero
          gamification={gamification}
          progressMap={progressMap}
          firstName={user?.firstName}
        />

        {/* Content */}
        <div className="flex-1 space-y-12 pb-12">
          {roadmaps.length === 0 ? (
            <div className="text-center py-24 bg-card/50 rounded-3xl border border-dashed border-border">
              <div className="w-20 h-20 rounded-3xl bg-secondary/30 flex items-center justify-center mx-auto mb-6">
                <Map className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No roadmaps available</h2>
              <p className="text-muted-foreground">Check back soon for new learning paths!</p>
            </div>
          ) : (
            <>
              {/* Continue Learning Section */}
              {inProgressRoadmaps.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                     <span className="w-1.5 h-6 rounded-full bg-primary" />
                     <h2 className="text-2xl font-bold tracking-tight">Continue Learning</h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    {inProgressRoadmaps.map((roadmap) => {
                      const progress = progressMap[roadmap.slug];
                      const progressPercent = progress?.overallProgress || 0;
                      
                      return (
                        <RoadmapCard
                          key={roadmap._id}
                          roadmap={roadmap}
                          progressPercent={progressPercent}
                          isStarted={true}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* All Roadmaps Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-6 rounded-full bg-indigo-500" />
                    <h2 className="text-2xl font-bold tracking-tight">
                        {inProgressRoadmaps.length > 0 ? "Explore More" : "All Roadmaps"}
                    </h2>
                </div>
                {otherRoadmaps.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    {otherRoadmaps.map((roadmap) => {
                        const progress = progressMap[roadmap.slug];
                        const progressPercent = progress?.overallProgress || 0;
                        const isStarted = !!progress;

                        return (
                        <RoadmapCard
                            key={roadmap._id}
                            roadmap={roadmap}
                            progressPercent={progressPercent}
                            isStarted={isStarted}
                        />
                        );
                    })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
                        <p>You&apos;ve started every available roadmap! Amazing work!</p>
                    </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </RoadmapsPageClient>
  );
}
