'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressTrackerProps {
  sections: string[];
  completedSections: string[];
  currentSection?: string;
}

export function ProgressTracker({ 
  sections, 
  completedSections,
  currentSection,
}: ProgressTrackerProps) {
  const completedCount = completedSections.length;
  const totalCount = sections.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Lesson Progress
        </span>
        <span className="text-sm text-muted-foreground">
          {completedCount} / {totalCount} sections
        </span>
      </div>
      
      <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Section indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {sections.map((section, i) => {
          const isCompleted = completedSections.includes(section);
          const isCurrent = section === currentSection;

          return (
            <motion.div
              key={section}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0',
                isCompleted && 'bg-green-500/10 text-green-500',
                isCurrent && !isCompleted && 'bg-primary/10 text-primary',
                !isCompleted && !isCurrent && 'bg-secondary/50 text-muted-foreground'
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Circle className={cn(
                  'w-3 h-3',
                  isCurrent && 'fill-current'
                )} />
              )}
              <span className="capitalize">
                {section.replace(/-/g, ' ')}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
