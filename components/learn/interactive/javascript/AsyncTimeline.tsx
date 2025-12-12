'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Timer, Zap, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for async timeline visualization
export interface AsyncOperation {
  id: string;
  type: 'sync' | 'promise' | 'setTimeout' | 'fetch' | 'microtask';
  label: string;
  startTime: number;
  endTime: number;
  output?: string;
}

export interface TimelineEvent {
  time: number;
  operationId: string;
  event: 'start' | 'end' | 'callback';
  description: string;
}

export interface AsyncTimelineProps {
  /** Code to analyze (optional - uses default example) */
  code?: string;
  /** Whether to auto-play the animation */
  autoPlay?: boolean;
  /** Animation speed */
  speed?: AnimationSpeed;
}

// Default async operations for demonstration
const defaultOperations: AsyncOperation[] = [
  { id: 'sync1', type: 'sync', label: 'console.log("Start")', startTime: 0, endTime: 50, output: 'Start' },
  { id: 'timeout1', type: 'setTimeout', label: 'setTimeout(cb, 100)', startTime: 50, endTime: 150, output: 'Timeout!' },
  { id: 'promise1', type: 'promise', label: 'Promise.resolve()', startTime: 100, endTime: 120, output: 'Promise 1' },
  { id: 'promise2', type: 'promise', label: '.then() callback', startTime: 120, endTime: 140, output: 'Promise 2' },
  { id: 'sync2', type: 'sync', label: 'console.log("End")', startTime: 150, endTime: 200, output: 'End' },
];

// Generate timeline events from operations
export function generateTimelineEvents(operations: AsyncOperation[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  for (const op of operations) {
    events.push({
      time: op.startTime,
      operationId: op.id,
      event: 'start',
      description: `${op.label} starts`,
    });
    events.push({
      time: op.endTime,
      operationId: op.id,
      event: 'end',
      description: `${op.label} completes → ${op.output}`,
    });
  }
  
  // Sort by time
  events.sort((a, b) => a.time - b.time);
  
  return events;
}

// Operation type colors
const operationColors = {
  sync: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400', light: 'bg-blue-500/20' },
  promise: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', light: 'bg-purple-500/20' },
  setTimeout: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-400', light: 'bg-orange-500/20' },
  fetch: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-400', light: 'bg-green-500/20' },
  microtask: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-400', light: 'bg-pink-500/20' },
};

// Operation type icons
const operationIcons = {
  sync: Clock,
  promise: Zap,
  setTimeout: Timer,
  fetch: Clock,
  microtask: Zap,
};

/**
 * AsyncTimeline Component
 * Timeline visualization of async operations showing when each starts/completes
 * Requirements: 6.7
 */
export function AsyncTimeline({
  autoPlay = false,
}: AsyncTimelineProps) {
  const operations = useMemo(() => defaultOperations, []);
  const events = useMemo(() => generateTimelineEvents(operations), [operations]);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [completedOutputs, setCompletedOutputs] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const maxTime = Math.max(...operations.map((op) => op.endTime)) + 50;
  const baseDuration = 50; // ms per timeline unit
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    if (currentTime >= maxTime) {
      queueMicrotask(() => setIsPlaying(false));
      return;
    }

    intervalRef.current = setTimeout(() => {
      setCurrentTime((prev) => {
        const next = prev + 10;
        
        // Check for completed operations
        const newlyCompleted = operations.filter(
          (op) => op.endTime <= next && op.endTime > prev && op.output
        );
        if (newlyCompleted.length > 0) {
          setCompletedOutputs((outputs) => [
            ...outputs,
            ...newlyCompleted.map((op) => op.output!),
          ]);
        }
        
        return Math.min(next, maxTime);
      });
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentTime, maxTime, duration, operations]);

  const handlePlayPause = useCallback(() => {
    if (currentTime >= maxTime) {
      // Reset and play from beginning
      setCurrentTime(0);
      setCompletedOutputs([]);
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentTime, maxTime]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCompletedOutputs([]);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const getOperationStatus = (op: AsyncOperation): 'pending' | 'active' | 'completed' => {
    if (currentTime < op.startTime) return 'pending';
    if (currentTime >= op.endTime) return 'completed';
    return 'active';
  };

  const getOperationProgress = (op: AsyncOperation): number => {
    if (currentTime < op.startTime) return 0;
    if (currentTime >= op.endTime) return 100;
    return ((currentTime - op.startTime) / (op.endTime - op.startTime)) * 100;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Async Timeline</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize when async operations start and complete over time
        </p>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap gap-4">
        {Object.entries(operationColors).map(([type, colors]) => {
          const Icon = operationIcons[type as keyof typeof operationIcons];
          return (
            <div key={type} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded', colors.bg)} />
              <Icon className={cn('w-3 h-3', colors.text)} />
              <span className="text-xs text-muted-foreground capitalize">{type}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="p-6">
        {/* Time Ruler */}
        <div className="relative h-8 mb-4 border-b border-border">
          <div className="absolute inset-x-0 flex justify-between text-xs text-muted-foreground">
            {Array.from({ length: Math.ceil(maxTime / 50) + 1 }, (_, i) => (
              <span key={i} className="relative">
                {i * 50}ms
                <span className="absolute left-1/2 top-full h-2 w-px bg-border" />
              </span>
            ))}
          </div>
          {/* Current Time Indicator */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{ left: `${(currentTime / maxTime) * 100}%` }}
            animate={{ left: `${(currentTime / maxTime) * 100}%` }}
            transition={{ type: 'tween', duration: 0.1 }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary" />
          </motion.div>
        </div>

        {/* Operation Bars */}
        <div className="space-y-3">
          {operations.map((op) => {
            const colors = operationColors[op.type];
            const status = getOperationStatus(op);
            const progress = getOperationProgress(op);
            const Icon = operationIcons[op.type];
            
            return (
              <div key={op.id} className="relative">
                {/* Label */}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('w-4 h-4', colors.text)} />
                  <span className={cn('text-xs font-mono', colors.text)}>{op.label}</span>
                  {status === 'completed' && op.output && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs text-green-400 ml-auto"
                    >
                      → {op.output}
                    </motion.span>
                  )}
                </div>
                
                {/* Timeline Bar */}
                <div className="relative h-6 bg-secondary/30 rounded overflow-hidden">
                  {/* Operation Duration Bar */}
                  <div
                    className={cn(
                      'absolute h-full rounded transition-all',
                      colors.light,
                      'border',
                      colors.border
                    )}
                    style={{
                      left: `${(op.startTime / maxTime) * 100}%`,
                      width: `${((op.endTime - op.startTime) / maxTime) * 100}%`,
                    }}
                  >
                    {/* Progress Fill */}
                    <motion.div
                      className={cn('h-full rounded', colors.bg, 'opacity-50')}
                      style={{ width: `${progress}%` }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'tween', duration: 0.1 }}
                    />
                    
                    {/* Active Indicator */}
                    {status === 'active' && (
                      <motion.div
                        className="absolute inset-0 rounded"
                        animate={{
                          boxShadow: [
                            `0 0 0 0 ${colors.bg.replace('bg-', 'rgb(var(--')})`,
                            `0 0 0 4px transparent`,
                          ],
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Time Display */}
      <div className="px-6 py-3 border-t border-border bg-secondary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono">
            Current Time: <span className="text-primary font-bold">{currentTime}ms</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round((currentTime / maxTime) * 100)}% complete
        </div>
      </div>

      {/* Console Output */}
      <div className="px-6 py-4 border-t border-border bg-black/20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Console Output
          </span>
        </div>
        <div className="font-mono text-sm space-y-1 min-h-[60px]">
          <AnimatePresence mode="popLayout">
            {completedOutputs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-muted-foreground text-xs"
              >
                {/* Output will appear as operations complete... */}
              </motion.div>
            ) : (
              completedOutputs.map((output, index) => (
                <motion.div
                  key={`${output}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-green-400"
                >
                  <span className="text-muted-foreground mr-2">&gt;</span>
                  {output}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <AnimatedControls
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        onReset={handleReset}
        label="Playback Controls"
      />
    </Card>
  );
}

// Export for testing
export { defaultOperations };
export default AsyncTimeline;
