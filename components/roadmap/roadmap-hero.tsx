'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Flame,
  Zap,
  Target,
  Rocket
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { UserGamification } from '@/lib/db/schemas/user';
import type { UserRoadmapProgress } from '@/lib/db/schemas/user-roadmap-progress';

interface RoadmapHeroProps {
  gamification: UserGamification | null;
  progressMap: Record<string, UserRoadmapProgress>;
  firstName?: string | null;
}

export function RoadmapHero({ gamification, progressMap, firstName }: RoadmapHeroProps) {
  const stats = useMemo(() => {
    const progressValues = Object.values(progressMap);
    const roadmapsStarted = progressValues.length;
    const roadmapsCompleted = progressValues.filter(p => p.overallProgress === 100).length;
    
    return {
      roadmapsStarted,
      roadmapsCompleted,
      totalXp: gamification?.totalXp || 0,
      level: gamification?.level || 1,
      currentStreak: gamification?.currentStreak || 0,
    };
  }, [progressMap, gamification]);

  const xpForNextLevel = stats.level * 100;
  const xpProgress = Math.min((stats.totalXp % xpForNextLevel) / xpForNextLevel * 100, 100);

  return (
    <div className="relative w-full mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-background to-secondary/20 border border-border/40">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        {/* Welcome Section */}
        <div className="max-w-xl space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5" />
                Level {stats.level} Scholar
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                {stats.currentStreak} Day Streak
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Welcome back{firstName ? `, ${firstName}` : ''}!
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Ready to continue your journey? You've earned <span className="text-primary font-semibold">{stats.totalXp.toLocaleString()} XP</span> so far. 
              Let's reach the next milestone together.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4 pt-2"
          >
           <div className="flex-1 max-w-xs space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Progress to Level {stats.level + 1}</span>
                <span className="text-primary">{(stats.totalXp % xpForNextLevel)} / {xpForNextLevel} XP</span>
              </div>
              <Progress value={xpProgress} className="h-2 bg-secondary" />
           </div>
          </motion.div>
        </div>

        {/* Quick Stats Grid */}
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0 grid grid-cols-2 gap-4 w-full md:w-auto"
        >
          <div className="p-4 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm hover:bg-background/80 transition-colors">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold">{stats.roadmapsStarted}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Active Roadmaps</p>
          </div>

          <div className="p-4 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm hover:bg-background/80 transition-colors">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold">{stats.totalXp > 999 ? (stats.totalXp/1000).toFixed(1) + 'k' : stats.totalXp}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Total XP Earned</p>
          </div>
          
           <div className="p-4 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm hover:bg-background/80 transition-colors col-span-2">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                    <Trophy className="w-5 h-5" />
                  </div>
                   <div>
                     <p className="text-sm font-bold text-foreground">Level {stats.level}</p>
                     <p className="text-xs text-muted-foreground">Keep learning!</p>
                   </div>
                </div>
                 <div className="text-right">
                    <span className="text-xl font-bold text-foreground">{stats.roadmapsCompleted}</span>
                    <p className="text-xs text-muted-foreground">Completed</p>
                 </div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
