'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getBadgeInfo, BADGES } from '@/lib/gamification';

interface BadgeDisplayProps {
  earnedBadges: { id: string; earnedAt: Date }[];
  showRecent?: number;
  compact?: boolean;
}

export function BadgeDisplay({ 
  earnedBadges, 
  showRecent = 5,
  compact = false,
}: BadgeDisplayProps) {
  const displayBadges = earnedBadges.slice(-showRecent).reverse();

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {displayBadges.slice(0, 3).map((badge) => {
          const info = getBadgeInfo(badge.id);
          if (!info) return null;
          return (
            <div
              key={badge.id}
              className="text-lg"
              title={info.name}
            >
              {info.icon}
            </div>
          );
        })}
        {earnedBadges.length > 3 && (
          <span className="text-xs text-muted-foreground">
            +{earnedBadges.length - 3}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Recent Badges</h4>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {displayBadges.map((badge, i) => {
            const info = getBadgeInfo(badge.id);
            if (!info) return null;
            
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ delay: i * 0.1 }}
                className="group relative"
              >
                <div className="p-2 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-colors cursor-default">
                  <span className="text-2xl">{info.icon}</span>
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="px-3 py-2 rounded-lg bg-popover border border-border shadow-lg whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {info.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {info.description}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface BadgeUnlockAnimationProps {
  badge: { id: string; earnedAt: Date } | null;
  onComplete?: () => void;
}

export function BadgeUnlockAnimation({ badge, onComplete }: BadgeUnlockAnimationProps) {
  if (!badge) return null;

  const info = getBadgeInfo(badge.id);
  if (!info) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onComplete}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-center"
        >
          <motion.div
            className="text-8xl mb-4"
            animate={{ 
              y: [0, -20, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              duration: 0.6, 
              repeat: 2,
              ease: 'easeInOut',
            }}
          >
            {info.icon}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Badge Unlocked!
            </h2>
            <p className="text-xl font-semibold text-primary mb-1">
              {info.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {info.description}
            </p>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-muted-foreground mt-6"
          >
            Click anywhere to continue
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
