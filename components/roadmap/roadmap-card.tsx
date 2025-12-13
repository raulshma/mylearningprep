'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Map, Clock, TrendingUp, ArrowRight, Loader2, Sparkles, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RoadmapCardProps {
  roadmap: {
    _id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    estimatedHours: number;
    nodes: unknown[];
  };
  progressPercent: number;
  isStarted: boolean;
}

export function RoadmapCard({ roadmap, progressPercent, isStarted }: RoadmapCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      router.push(`/roadmaps/${roadmap.slug}`);
    });
  };

  return (
    <article 
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col h-full bg-card hover:bg-gradient-to-br hover:from-card hover:to-accent/5 rounded-3xl border border-border/60 hover:border-primary/20 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        isPending && "opacity-75 pointer-events-none"
      )}
    >
      {/* Decorative gradient blob */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="p-6 flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
            <div className={cn(
            "p-3 rounded-2xl transition-colors duration-300",
            isStarted ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
            isPending && "animate-pulse"
            )}>
                {isStarted ? <Trophy className="w-6 h-6" /> : <Map className="w-6 h-6" />}
            </div>
            {isStarted && <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200 uppercase text-[10px] tracking-wider font-bold shadow-none">Active</Badge>} 
             {!isStarted && <Badge variant="secondary" className="bg-secondary/50 uppercase text-[10px] tracking-wider font-bold text-muted-foreground/80">
                {roadmap.category}
            </Badge>}
        </div>
        
        {/* Title & Description */}
        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-1">
            {roadmap.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1">
            {roadmap.description}
        </p>
        
        {/* Stats */}
        <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground mb-6">
            <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span>{roadmap.nodes.length} topics</span>
            </div>
            <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{roadmap.estimatedHours}h</span>
            </div>
        </div>
        
        {/* Progress or Actions */}
        <div className="mt-auto">
             {isStarted ? (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-primary">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2 bg-secondary/50" />
                </div>
            ) : (
                 <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/20 w-0 group-hover:w-full transition-all duration-500 ease-out" />
                 </div>
            )}
        </div>
      </div>

       {/* Bottom Action Bar (visible on hover or always nice) */}
      <div className="p-4 bg-secondary/20 border-t border-border/50 group-hover:bg-secondary/30 transition-colors">
          <Button 
            variant={isStarted ? 'default' : 'ghost'} 
            className={cn(
                "w-full justify-between group/btn",
                !isStarted && "hover:bg-background hover:text-foreground text-muted-foreground"
            )}
            disabled={isPending}
        >
            {isPending ? (
            <div className="flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
            </div>
            ) : (
            <div className="flex items-center w-full justify-between">
                <span className="font-semibold">{isStarted ? 'Continue Learning' : 'Start Journey'}</span>
                 <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </div>
            )}
        </Button>
      </div>
    </article>
  );
}
