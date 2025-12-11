import { Suspense } from 'react';
import { Map, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getRoadmaps } from '@/lib/actions/roadmap';
import { checkAndSeedRoadmaps } from '@/lib/actions/seed-roadmaps';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export default async function RoadmapsPage() {
  // Auto-seed roadmaps if none exist
  await checkAndSeedRoadmaps();
  
  const { roadmaps, progressMap } = await getRoadmaps();
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <Badge variant="outline" className="mb-4">
            <Map className="w-3 h-3 mr-1.5" />
            Learning Roadmaps
          </Badge>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Visual Learning Paths
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Follow structured, interactive roadmaps to master new skills. 
            Each roadmap contains topics with learning objectives, resources, and progress tracking.
          </p>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {roadmaps.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-3xl bg-secondary/30 flex items-center justify-center mx-auto mb-6">
                <Map className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No roadmaps available</h2>
              <p className="text-muted-foreground">Check back soon for new learning paths!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {roadmaps.map((roadmap) => {
                const progress = progressMap[roadmap.slug];
                const progressPercent = progress?.overallProgress || 0;
                const isStarted = !!progress;
                
                return (
                  <Link
                    key={roadmap._id}
                    href={`/roadmaps/${roadmap.slug}`}
                    className="group block"
                  >
                    <article className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <Map className="w-6 h-6" />
                        </div>
                        <Badge variant="secondary">
                          {roadmap.category}
                        </Badge>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {roadmap.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {roadmap.description}
                      </p>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" />
                          <span>{roadmap.nodes.length} topics</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{roadmap.estimatedHours}h</span>
                        </div>
                      </div>
                      
                      {/* Progress */}
                      {isStarted ? (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>Progress</span>
                            <span className="font-medium text-primary">{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      ) : (
                        <div className="h-[30px] mb-4" />
                      )}
                      
                      {/* Action */}
                      <Button 
                        variant={isStarted ? 'default' : 'outline'} 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        {isStarted ? 'Continue Learning' : 'Start Learning'}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
