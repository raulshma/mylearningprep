'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Play, RotateCcw, Clock, Zap, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for event loop visualization
export interface Task {
  id: string;
  type: 'sync' | 'microtask' | 'macrotask';
  label: string;
  code: string;
  timing?: number;
}

export interface EventLoopStep {
  stepNumber: number;
  description: string;
  callStack: Task[];
  microtaskQueue: Task[];
  macrotaskQueue: Task[];
  currentTask: Task | null;
  output: string[];
}

export interface EventLoopVisualizerProps {
  /** Code to analyze (optional - uses default example) */
  code?: string;
  /** Whether to auto-play the animation */
  autoPlay?: boolean;
  /** Animation speed */
  speed?: AnimationSpeed;
  /** Whether to show microtask queue */
  showMicrotasks?: boolean;
}

// Default code example demonstrating event loop behavior
const defaultCode = `console.log('1: Start');

setTimeout(() => {
  console.log('2: Timeout');
}, 0);

Promise.resolve()
  .then(() => console.log('3: Promise 1'))
  .then(() => console.log('4: Promise 2'));

console.log('5: End');`;

// Parse code to generate event loop steps
export function generateEventLoopSteps(code: string): EventLoopStep[] {
  // For demonstration, we'll use a predefined sequence based on the default code
  // In a real implementation, this would parse and analyze the code
  
  const steps: EventLoopStep[] = [];
  let stepNumber = 0;
  
  // Initial state
  steps.push({
    stepNumber: stepNumber++,
    description: 'Initial state - code starts executing',
    callStack: [{ id: 'main', type: 'sync', label: 'main()', code: 'Script execution' }],
    microtaskQueue: [],
    macrotaskQueue: [],
    currentTask: null,
    output: [],
  });
  
  // Execute console.log('1: Start')
  steps.push({
    stepNumber: stepNumber++,
    description: 'Execute synchronous code: console.log("1: Start")',
    callStack: [
      { id: 'main', type: 'sync', label: 'main()', code: 'Script execution' },
      { id: 'log1', type: 'sync', label: 'console.log()', code: 'console.log("1: Start")' },
    ],
    microtaskQueue: [],
    macrotaskQueue: [],
    currentTask: { id: 'log1', type: 'sync', label: 'console.log()', code: 'console.log("1: Start")' },
    output: ['1: Start'],
  });
  
  // setTimeout schedules macrotask
  steps.push({
    stepNumber: stepNumber++,
    description: 'setTimeout() schedules callback to macrotask queue (even with 0ms delay)',
    callStack: [{ id: 'main', type: 'sync', label: 'main()', code: 'Script execution' }],
    microtaskQueue: [],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: null,
    output: ['1: Start'],
  });
  
  // Promise.resolve().then() schedules microtask
  steps.push({
    stepNumber: stepNumber++,
    description: 'Promise.resolve().then() schedules callback to microtask queue',
    callStack: [{ id: 'main', type: 'sync', label: 'main()', code: 'Script execution' }],
    microtaskQueue: [{ id: 'promise1', type: 'microtask', label: 'Promise.then()', code: 'console.log("3: Promise 1")' }],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: null,
    output: ['1: Start'],
  });
  
  // Execute console.log('5: End')
  steps.push({
    stepNumber: stepNumber++,
    description: 'Execute synchronous code: console.log("5: End")',
    callStack: [
      { id: 'main', type: 'sync', label: 'main()', code: 'Script execution' },
      { id: 'log5', type: 'sync', label: 'console.log()', code: 'console.log("5: End")' },
    ],
    microtaskQueue: [{ id: 'promise1', type: 'microtask', label: 'Promise.then()', code: 'console.log("3: Promise 1")' }],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: { id: 'log5', type: 'sync', label: 'console.log()', code: 'console.log("5: End")' },
    output: ['1: Start', '5: End'],
  });
  
  // Call stack empty, process microtask queue
  steps.push({
    stepNumber: stepNumber++,
    description: 'Call stack empty! Process microtask queue first (before macrotasks)',
    callStack: [],
    microtaskQueue: [{ id: 'promise1', type: 'microtask', label: 'Promise.then()', code: 'console.log("3: Promise 1")' }],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: null,
    output: ['1: Start', '5: End'],
  });
  
  // Execute first microtask
  steps.push({
    stepNumber: stepNumber++,
    description: 'Execute microtask: Promise 1 callback',
    callStack: [{ id: 'promise1-exec', type: 'microtask', label: 'Promise.then()', code: 'console.log("3: Promise 1")' }],
    microtaskQueue: [],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: { id: 'promise1', type: 'microtask', label: 'Promise.then()', code: 'console.log("3: Promise 1")' },
    output: ['1: Start', '5: End', '3: Promise 1'],
  });
  
  // Second .then() schedules another microtask
  steps.push({
    stepNumber: stepNumber++,
    description: 'Second .then() schedules another microtask',
    callStack: [],
    microtaskQueue: [{ id: 'promise2', type: 'microtask', label: 'Promise.then()', code: 'console.log("4: Promise 2")' }],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: null,
    output: ['1: Start', '5: End', '3: Promise 1'],
  });
  
  // Execute second microtask
  steps.push({
    stepNumber: stepNumber++,
    description: 'Execute microtask: Promise 2 callback (microtasks drain before macrotasks)',
    callStack: [{ id: 'promise2-exec', type: 'microtask', label: 'Promise.then()', code: 'console.log("4: Promise 2")' }],
    microtaskQueue: [],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: { id: 'promise2', type: 'microtask', label: 'Promise.then()', code: 'console.log("4: Promise 2")' },
    output: ['1: Start', '5: End', '3: Promise 1', '4: Promise 2'],
  });
  
  // Microtask queue empty, now process macrotask
  steps.push({
    stepNumber: stepNumber++,
    description: 'Microtask queue empty! Now process macrotask queue',
    callStack: [],
    microtaskQueue: [],
    macrotaskQueue: [{ id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")', timing: 0 }],
    currentTask: null,
    output: ['1: Start', '5: End', '3: Promise 1', '4: Promise 2'],
  });
  
  // Execute macrotask (setTimeout callback)
  steps.push({
    stepNumber: stepNumber++,
    description: 'Execute macrotask: setTimeout callback',
    callStack: [{ id: 'timeout-exec', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")' }],
    microtaskQueue: [],
    macrotaskQueue: [],
    currentTask: { id: 'timeout', type: 'macrotask', label: 'setTimeout callback', code: 'console.log("2: Timeout")' },
    output: ['1: Start', '5: End', '3: Promise 1', '4: Promise 2', '2: Timeout'],
  });
  
  // Final state
  steps.push({
    stepNumber: stepNumber++,
    description: 'All queues empty - event loop complete!',
    callStack: [],
    microtaskQueue: [],
    macrotaskQueue: [],
    currentTask: null,
    output: ['1: Start', '5: End', '3: Promise 1', '4: Promise 2', '2: Timeout'],
  });
  
  return steps;
}

// Queue colors
const queueColors = {
  callStack: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400', icon: Layers },
  microtask: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400', icon: Zap },
  macrotask: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400', icon: Timer },
};

/**
 * EventLoopVisualizer Component
 * Animated visualization of JavaScript event loop, call stack, and task queues
 * Requirements: 6.5
 */
export function EventLoopVisualizer({
  code = defaultCode,
  autoPlay = false,
  showMicrotasks = true,
}: EventLoopVisualizerProps) {
  const steps = useMemo(() => generateEventLoopSteps(code), [code]);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];
  const baseDuration = 1500;
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    if (currentStepIndex >= steps.length - 1) {
      queueMicrotask(() => setIsPlaying(false));
      return;
    }

    intervalRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps.length, duration]);

  const handlePlayPause = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      // Reset and play from beginning
      setCurrentStepIndex(0);
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentStepIndex, steps.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleStepClick = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(index);
  }, []);

  return (
    <Card className="w-full max-w-5xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Event Loop Visualizer</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Watch how JavaScript handles synchronous code, promises, and setTimeout
        </p>
      </div>

      {/* Step Progress */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <button
              key={step.stepNumber}
              onClick={() => handleStepClick(index)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all shrink-0',
                index === currentStepIndex
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : index < currentStepIndex
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-0">
        {/* Call Stack */}
        <QueuePanel
          title="Call Stack"
          subtitle="LIFO - Last In, First Out"
          items={currentStep.callStack}
          colors={queueColors.callStack}
          currentTask={currentStep.currentTask}
          emptyMessage="Stack is empty"
        />

        {/* Microtask Queue */}
        {showMicrotasks && (
          <QueuePanel
            title="Microtask Queue"
            subtitle="Promises, queueMicrotask"
            items={currentStep.microtaskQueue}
            colors={queueColors.microtask}
            currentTask={currentStep.currentTask}
            emptyMessage="Queue is empty"
          />
        )}

        {/* Macrotask Queue */}
        <QueuePanel
          title="Macrotask Queue"
          subtitle="setTimeout, setInterval, I/O"
          items={currentStep.macrotaskQueue}
          colors={queueColors.macrotask}
          currentTask={currentStep.currentTask}
          emptyMessage="Queue is empty"
        />
      </div>

      {/* Current Step Description */}
      <div className="px-6 py-4 border-t border-border bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{currentStepIndex + 1}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{currentStep.description}</p>
            {currentStep.currentTask && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {currentStep.currentTask.code}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="px-6 py-4 border-t border-border bg-black/20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Console Output
          </span>
        </div>
        <div className="font-mono text-sm space-y-1 min-h-[80px]">
          <AnimatePresence mode="popLayout">
            {currentStep.output.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-muted-foreground text-xs"
              >
                {/* Output will appear here... */}
              </motion.div>
            ) : (
              currentStep.output.map((line, index) => (
                <motion.div
                  key={`${line}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-green-400"
                >
                  <span className="text-muted-foreground mr-2">&gt;</span>
                  {line}
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
        label="Animation Controls"
      />
    </Card>
  );
}

/**
 * Queue panel component for displaying call stack or task queues
 */
interface QueuePanelProps {
  title: string;
  subtitle: string;
  items: Task[];
  colors: { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> };
  currentTask: Task | null;
  emptyMessage: string;
}

function QueuePanel({
  title,
  subtitle,
  items,
  colors,
  currentTask,
  emptyMessage,
}: QueuePanelProps) {
  const Icon = colors.icon;
  
  return (
    <div className="p-4 border-r border-border last:border-r-0">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('w-4 h-4', colors.text)} />
        <span className={cn('text-sm font-medium', colors.text)}>{title}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      
      <div className="space-y-2 min-h-[150px]">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground text-center py-8"
            >
              {emptyMessage}
            </motion.div>
          ) : (
            items.map((item, index) => (
              <TaskItem
                key={item.id}
                task={item}
                isActive={currentTask?.id === item.id}
                colors={colors}
                index={index}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Task item component
 */
interface TaskItemProps {
  task: Task;
  isActive: boolean;
  colors: { bg: string; border: string; text: string };
  index: number;
}

function TaskItem({ task, isActive, colors, index }: TaskItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ 
        opacity: 1, 
        scale: isActive ? 1.02 : 1, 
        y: 0,
      }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'px-3 py-2 rounded-lg border text-xs font-mono transition-all',
        colors.bg,
        colors.border,
        isActive && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
      )}
    >
      <div className={cn('font-medium', colors.text)}>{task.label}</div>
      <div className="text-muted-foreground truncate mt-0.5">{task.code}</div>
      {task.timing !== undefined && (
        <div className="text-muted-foreground mt-1 flex items-center gap-1">
          <Timer className="w-3 h-3" />
          <span>{task.timing}ms</span>
        </div>
      )}
    </motion.div>
  );
}

// Export for testing
export { defaultCode };
export default EventLoopVisualizer;
