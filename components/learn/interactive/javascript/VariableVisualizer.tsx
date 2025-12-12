'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, ArrowRight, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for variable visualization
export interface VariableState {
  name: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'undefined' | 'null' | 'object' | 'array';
  declarationType: 'var' | 'let' | 'const';
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

export interface VariableStep {
  id: string;
  action: 'declare' | 'assign' | 'modify' | 'delete';
  description: string;
  code: string;
  variables: VariableState[];
}

export interface VariableVisualizerProps {
  /** Custom code to visualize (optional) */
  code?: string;
  /** Whether to auto-play the animation */
  autoPlay?: boolean;
  /** Animation speed */
  speed?: AnimationSpeed;
  /** Whether to show memory addresses (simplified) */
  showMemoryAddresses?: boolean;
  /** Custom steps to visualize */
  steps?: VariableStep[];
}

// Default demonstration steps
const defaultSteps: VariableStep[] = [
  {
    id: 'step-1',
    action: 'declare',
    description: 'Declare a variable called "name" with let',
    code: 'let name;',
    variables: [
      { name: 'name', value: undefined, type: 'undefined', declarationType: 'let', isNew: true },
    ],
  },
  {
    id: 'step-2',
    action: 'assign',
    description: 'Assign the string "Alice" to name',
    code: 'name = "Alice";',
    variables: [
      { name: 'name', value: 'Alice', type: 'string', declarationType: 'let', isModified: true },
    ],
  },
  {
    id: 'step-3',
    action: 'declare',
    description: 'Declare and initialize age with const',
    code: 'const age = 25;',
    variables: [
      { name: 'name', value: 'Alice', type: 'string', declarationType: 'let' },
      { name: 'age', value: 25, type: 'number', declarationType: 'const', isNew: true },
    ],
  },
  {
    id: 'step-4',
    action: 'declare',
    description: 'Declare isStudent with var',
    code: 'var isStudent = true;',
    variables: [
      { name: 'name', value: 'Alice', type: 'string', declarationType: 'let' },
      { name: 'age', value: 25, type: 'number', declarationType: 'const' },
      { name: 'isStudent', value: true, type: 'boolean', declarationType: 'var', isNew: true },
    ],
  },
  {
    id: 'step-5',
    action: 'modify',
    description: 'Change name to "Bob"',
    code: 'name = "Bob";',
    variables: [
      { name: 'name', value: 'Bob', type: 'string', declarationType: 'let', isModified: true },
      { name: 'age', value: 25, type: 'number', declarationType: 'const' },
      { name: 'isStudent', value: true, type: 'boolean', declarationType: 'var' },
    ],
  },
];

// Color mapping for variable types
const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  string: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  number: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  boolean: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  undefined: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/30' },
  null: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/30' },
  object: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  array: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
};

// Declaration type badges
const declarationBadges: Record<string, { bg: string; text: string }> = {
  var: { bg: 'bg-yellow-500/20', text: 'text-yellow-600' },
  let: { bg: 'bg-blue-500/20', text: 'text-blue-600' },
  const: { bg: 'bg-purple-500/20', text: 'text-purple-600' },
};

/**
 * Format value for display
 */
function formatValue(value: unknown, type: string): string {
  if (type === 'undefined') return 'undefined';
  if (type === 'null') return 'null';
  if (type === 'string') return `"${value}"`;
  if (type === 'boolean') return String(value);
  if (type === 'number') return String(value);
  if (type === 'array') return JSON.stringify(value);
  if (type === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Generate a simple memory address for visualization
 */
function generateMemoryAddress(name: string, index: number): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `0x${((hash * 1000 + index * 100) % 0xFFFF).toString(16).padStart(4, '0').toUpperCase()}`;
}


/**
 * VariableVisualizer Component
 * Animated visualization of JavaScript variable creation, assignment, and modification
 * Requirements: 1.7, 23.1
 */
export function VariableVisualizer({
  autoPlay = false,
  speed: initialSpeed = 'normal',
  showMemoryAddresses = false,
  steps = defaultSteps,
}: VariableVisualizerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>(initialSpeed);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];
  const baseDuration = 2000; // Base duration in ms
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;
    
    if (currentStepIndex >= steps.length - 1) {
      // Use a microtask to avoid synchronous setState in effect
      queueMicrotask(() => setIsPlaying(false));
      return;
    }

    intervalRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
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
      setIsPlaying(true);
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

  return (
    <Card className="w-full max-w-3xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Variable Visualizer</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Watch how JavaScript creates and modifies variables in memory
        </p>
      </div>

      {/* Code Display */}
      <div className="px-6 py-4 bg-zinc-900 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-zinc-500 font-mono">Current Code:</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.pre
            key={currentStep.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="font-mono text-sm text-green-400"
          >
            {currentStep.code}
          </motion.pre>
        </AnimatePresence>
        <p className="text-xs text-zinc-400 mt-2">{currentStep.description}</p>
      </div>

      {/* Memory Visualization */}
      <div className="p-6 min-h-[200px]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Memory (Variables)
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {currentStep.variables.map((variable, index) => (
              <VariableBox
                key={variable.name}
                variable={variable}
                index={index}
                showMemoryAddress={showMemoryAddresses}
              />
            ))}
          </AnimatePresence>

          {currentStep.variables.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground text-sm"
            >
              No variables declared yet
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-2 border-t border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(index);
              }}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentStepIndex
                  ? 'bg-primary w-4'
                  : index < currentStepIndex
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
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
 * Individual variable box component
 */
function VariableBox({
  variable,
  index,
  showMemoryAddress,
}: {
  variable: VariableState;
  index: number;
  showMemoryAddress: boolean;
}) {
  const colors = typeColors[variable.type] || typeColors.undefined;
  const badge = declarationBadges[variable.declarationType];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, x: -20 }}
      animate={{
        opacity: variable.isDeleted ? 0.3 : 1,
        scale: 1,
        x: 0,
      }}
      exit={{ opacity: 0, scale: 0.8, x: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative flex items-stretch rounded-lg border-2 overflow-hidden',
        colors.border,
        variable.isNew && 'ring-2 ring-green-500/50 ring-offset-2 ring-offset-background',
        variable.isModified && 'ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-background',
        variable.isDeleted && 'opacity-50 line-through'
      )}
    >
      {/* Variable Name (Label) */}
      <div className="flex flex-col justify-center px-4 py-3 bg-secondary/50 border-r border-border min-w-[120px]">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono', badge.bg, badge.text)}>
            {variable.declarationType}
          </span>
        </div>
        <span className="font-mono font-semibold mt-1">{variable.name}</span>
        {showMemoryAddress && (
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {generateMemoryAddress(variable.name, index)}
          </span>
        )}
      </div>

      {/* Arrow */}
      <div className="flex items-center px-2 bg-secondary/30">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Value Box */}
      <div className={cn('flex-1 flex items-center px-4 py-3', colors.bg)}>
        <div className="flex flex-col">
          <span className={cn('font-mono text-lg', colors.text)}>
            {formatValue(variable.value, variable.type)}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">
            type: {variable.type}
          </span>
        </div>
      </div>

      {/* Status Indicators */}
      <AnimatePresence>
        {variable.isNew && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          >
            NEW
          </motion.div>
        )}
        {variable.isModified && !variable.isNew && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          >
            UPDATED
          </motion.div>
        )}
        {variable.isDeleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Trash2 className="w-6 h-6 text-red-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default VariableVisualizer;
