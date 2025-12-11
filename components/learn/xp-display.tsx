'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { xpToNextLevel, calculateLevel } from '@/lib/gamification';

interface XPDisplayProps {
  totalXp: number;
  currentStreak?: number;
  showProgress?: boolean;
  compact?: boolean;
}

export function XPDisplay({ 
  totalXp, 
  currentStreak = 0,
  showProgress = true,
  compact = false,
}: XPDisplayProps) {
  const level = calculateLevel(totalXp);
  const { current, required, percentage } = xpToNextLevel(totalXp);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-foreground">{totalXp.toLocaleString()}</span>
          <span className="text-muted-foreground">XP</span>
        </div>
        {currentStreak > 0 && (
          <div className="flex items-center gap-1 text-sm text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="font-medium">{currentStreak}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 border border-border"
    >
      {/* Level badge */}
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
          <span className="text-lg font-bold text-yellow-500">{level}</span>
        </div>
        <TrendingUp className="absolute -bottom-1 -right-1 w-4 h-4 text-green-500" />
      </div>

      {/* XP Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">Level {level}</span>
          <div className="flex items-center gap-1 text-sm">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span className="font-bold text-yellow-500">{totalXp.toLocaleString()}</span>
            <span className="text-muted-foreground">XP</span>
          </div>
        </div>

        {showProgress && (
          <>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{current} / {required} XP</span>
              <span>Level {level + 1}</span>
            </div>
          </>
        )}
      </div>

      {/* Streak */}
      {currentStreak > 0 && (
        <div className="flex flex-col items-center gap-0.5 px-3 border-l border-border">
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-lg font-bold text-orange-500">{currentStreak}</span>
          </div>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
      )}
    </motion.div>
  );
}
