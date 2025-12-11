'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressCheckpointProps {
  section: string;
  onComplete?: (section: string) => void;
  /** Whether this section is already completed (external state) */
  isCompleted?: boolean;
  /** Minimum time visible before marking complete (ms) */
  minVisibleTime?: number;
  /** XP reward to display */
  xpReward?: number;
}

/**
 * Progress Checkpoint Component
 * Marks section completion when user scrolls past it using IntersectionObserver
 * Supports both internal and external completion state management
 */
export function ProgressCheckpoint({ 
  section, 
  onComplete,
  isCompleted: externalIsCompleted,
  minVisibleTime = 1500,
  xpReward = 10,
}: ProgressCheckpointProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [internalCompleted, setInternalCompleted] = useState(false);
  const visibleTimeRef = useRef<number>(0);
  const lastVisibleRef = useRef<number | null>(null);
  
  // Use external state if provided, otherwise internal
  const isCompleted = externalIsCompleted ?? internalCompleted;

  useEffect(() => {
    if (isCompleted || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Started being visible
            lastVisibleRef.current = Date.now();
          } else if (lastVisibleRef.current) {
            // Stopped being visible, accumulate time
            visibleTimeRef.current += Date.now() - lastVisibleRef.current;
            lastVisibleRef.current = null;

            // Check if we've hit the threshold
            if (visibleTimeRef.current >= minVisibleTime) {
              setInternalCompleted(true);
              onComplete?.(section);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(elementRef.current);

    // Also check periodically while visible
    const interval = setInterval(() => {
      if (lastVisibleRef.current && !isCompleted) {
        const totalTime = visibleTimeRef.current + (Date.now() - lastVisibleRef.current);
        if (totalTime >= minVisibleTime) {
          setInternalCompleted(true);
          onComplete?.(section);
        }
      }
    }, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [section, isCompleted, minVisibleTime, onComplete]);

  return (
    <motion.div
      ref={elementRef}
      data-section={section}
      data-completed={isCompleted}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      className="my-8 flex items-center gap-4"
    >
      <div className="flex-1 h-px bg-linear-to-r from-transparent via-border to-transparent" />
      
      {isCompleted ? (
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30"
        >
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs font-medium text-green-500">Section Complete</span>
          <Sparkles className="w-3 h-3 text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">+{xpReward} XP</span>
        </motion.div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border">
          <Circle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Reading...
          </span>
        </div>
      )}
      
      <div className="flex-1 h-px bg-linear-to-l from-transparent via-border to-transparent" />
    </motion.div>
  );
}
