'use client';

import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Sparkles, 
  Rocket,
  Clock,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';

interface ExperienceSelectorProps {
  currentLevel: ExperienceLevel;
  onLevelChange: (level: ExperienceLevel) => void;
  completedLevels?: ExperienceLevel[];
  disabled?: boolean;
}

const levels: {
  id: ExperienceLevel;
  label: string;
  description: string;
  icon: typeof GraduationCap;
  color: string;
  bgColor: string;
  borderColor: string;
  time: string;
  xp: number;
}[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Simple explanations with visuals and analogies',
    icon: GraduationCap,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    time: '5-10 min',
    xp: 50,
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Technical details and practical examples',
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    time: '10-15 min',
    xp: 100,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Deep dive with implementation details',
    icon: Rocket,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    time: '15-25 min',
    xp: 200,
  },
];

export function ExperienceSelector({ 
  currentLevel, 
  onLevelChange,
  completedLevels = [],
  disabled = false,
}: ExperienceSelectorProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Choose your experience level:
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {levels.map((level) => {
          const isSelected = currentLevel === level.id;
          const isCompleted = completedLevels.includes(level.id);
          const Icon = level.icon;

          return (
            <motion.button
              key={level.id}
              onClick={() => !disabled && onLevelChange(level.id)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              className={cn(
                'relative p-4 rounded-xl border-2 text-left transition-all',
                isSelected
                  ? `${level.bgColor} ${level.borderColor.replace('/30', '')}`
                  : `bg-card border-border hover:border-muted-foreground/30`,
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Completed badge */}
              {isCompleted && (
                <div className="absolute -top-2 -right-2 p-1 rounded-full bg-green-500 shadow-lg">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', level.bgColor)}>
                  <Icon className={cn('w-5 h-5', level.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-semibold',
                      isSelected ? level.color : 'text-foreground'
                    )}>
                      {level.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {level.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {level.time}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-500 font-medium">
                      +{level.xp} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="level-selector"
                  className={cn(
                    'absolute inset-0 rounded-xl border-2',
                    level.borderColor.replace('/30', '')
                  )}
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
