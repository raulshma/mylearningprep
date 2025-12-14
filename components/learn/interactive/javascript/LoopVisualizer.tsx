'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, StepForward, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for loop visualization
interface LoopState {
  variables: Record<string, string | number | boolean>;
  currentIndex: number;
  condition: string;
  conditionResult: boolean;
  output: string[];
  phase: 'init' | 'condition' | 'body' | 'update' | 'complete';
}

interface LoopStep {
  stepNumber: number;
  description: string;
  state: LoopState;
  highlight?: 'init' | 'condition' | 'body' | 'update';
}

type LoopType = 'for' | 'while' | 'do-while' | 'for-in' | 'for-of';

interface LoopVisualizerProps {
  type?: LoopType;
  code?: string;
  iterableData?: string[] | number[] | Record<string, unknown>;
  autoPlay?: boolean;
  speed?: AnimationSpeed;
  showVariables?: boolean;
  showOutput?: boolean;
}

// Default examples for each loop type
const defaultExamples: Record<LoopType, { code: string; data: string[] | number[] | Record<string, unknown> | null }> = {
  'for': {
    code: `for (let i = 0; i < 5; i++) {
  console.log(i);
}`,
    data: null,
  },
  'while': {
    code: `let count = 0;
while (count < 3) {
  console.log(count);
  count++;
}`,
    data: null,
  },
  'do-while': {
    code: `let num = 0;
do {
  console.log(num);
  num++;
} while (num < 3);`,
    data: null,
  },
  'for-in': {
    code: `const obj = { a: 1, b: 2, c: 3 };
for (const key in obj) {
  console.log(key);
}`,
    data: { a: 1, b: 2, c: 3 },
  },
  'for-of': {
    code: `const arr = ['apple', 'banana', 'cherry'];
for (const item of arr) {
  console.log(item);
}`,
    data: ['apple', 'banana', 'cherry'],
  },
};

// Generate steps based on loop type
function generateLoopSteps(type: LoopType, data?: unknown): LoopStep[] {
  const steps: LoopStep[] = [];

  switch (type) {
    case 'for': {
      // for (let i = 0; i < 5; i++)
      steps.push({
        stepNumber: 0,
        description: 'Initialize loop variable: let i = 0',
        state: {
          variables: { i: 0 },
          currentIndex: 0,
          condition: 'i < 5',
          conditionResult: true,
          output: [],
          phase: 'init',
        },
        highlight: 'init',
      });

      for (let i = 0; i < 5; i++) {
        // Check condition
        steps.push({
          stepNumber: steps.length,
          description: `Check condition: ${i} < 5 → ${i < 5 ? 'true' : 'false'}`,
          state: {
            variables: { i },
            currentIndex: i,
            condition: `${i} < 5`,
            conditionResult: i < 5,
            output: steps[steps.length - 1]?.state.output || [],
            phase: 'condition',
          },
          highlight: 'condition',
        });

        if (i < 5) {
          // Execute body
          const newOutput = [...(steps[steps.length - 1]?.state.output || []), String(i)];
          steps.push({
            stepNumber: steps.length,
            description: `Execute body: console.log(${i})`,
            state: {
              variables: { i },
              currentIndex: i,
              condition: `${i} < 5`,
              conditionResult: true,
              output: newOutput,
              phase: 'body',
            },
            highlight: 'body',
          });

          // Update
          if (i < 4) {
            steps.push({
              stepNumber: steps.length,
              description: `Update: i++ → i = ${i + 1}`,
              state: {
                variables: { i: i + 1 },
                currentIndex: i + 1,
                condition: `${i + 1} < 5`,
                conditionResult: i + 1 < 5,
                output: newOutput,
                phase: 'update',
              },
              highlight: 'update',
            });
          }
        }
      }

      // Final condition check (false)
      steps.push({
        stepNumber: steps.length,
        description: 'Check condition: 5 < 5 → false. Loop ends.',
        state: {
          variables: { i: 5 },
          currentIndex: 5,
          condition: '5 < 5',
          conditionResult: false,
          output: steps[steps.length - 1]?.state.output || [],
          phase: 'complete',
        },
        highlight: 'condition',
      });
      break;
    }

    case 'while': {
      let count = 0;
      steps.push({
        stepNumber: 0,
        description: 'Initialize variable: let count = 0',
        state: {
          variables: { count: 0 },
          currentIndex: 0,
          condition: 'count < 3',
          conditionResult: true,
          output: [],
          phase: 'init',
        },
        highlight: 'init',
      });

      while (count < 3) {
        steps.push({
          stepNumber: steps.length,
          description: `Check condition: ${count} < 3 → true`,
          state: {
            variables: { count },
            currentIndex: count,
            condition: `${count} < 3`,
            conditionResult: true,
            output: steps[steps.length - 1]?.state.output || [],
            phase: 'condition',
          },
          highlight: 'condition',
        });

        const newOutput = [...(steps[steps.length - 1]?.state.output || []), String(count)];
        steps.push({
          stepNumber: steps.length,
          description: `Execute body: console.log(${count}), count++`,
          state: {
            variables: { count: count + 1 },
            currentIndex: count,
            condition: `${count} < 3`,
            conditionResult: true,
            output: newOutput,
            phase: 'body',
          },
          highlight: 'body',
        });

        count++;
      }

      steps.push({
        stepNumber: steps.length,
        description: 'Check condition: 3 < 3 → false. Loop ends.',
        state: {
          variables: { count: 3 },
          currentIndex: 3,
          condition: '3 < 3',
          conditionResult: false,
          output: steps[steps.length - 1]?.state.output || [],
          phase: 'complete',
        },
        highlight: 'condition',
      });
      break;
    }

    case 'do-while': {
      let num = 0;
      steps.push({
        stepNumber: 0,
        description: 'Initialize variable: let num = 0',
        state: {
          variables: { num: 0 },
          currentIndex: 0,
          condition: 'num < 3',
          conditionResult: true,
          output: [],
          phase: 'init',
        },
        highlight: 'init',
      });

      do {
        const newOutput = [...(steps[steps.length - 1]?.state.output || []), String(num)];
        steps.push({
          stepNumber: steps.length,
          description: `Execute body FIRST: console.log(${num}), num++`,
          state: {
            variables: { num: num + 1 },
            currentIndex: num,
            condition: `${num + 1} < 3`,
            conditionResult: num + 1 < 3,
            output: newOutput,
            phase: 'body',
          },
          highlight: 'body',
        });

        num++;

        steps.push({
          stepNumber: steps.length,
          description: `Check condition AFTER: ${num} < 3 → ${num < 3}`,
          state: {
            variables: { num },
            currentIndex: num,
            condition: `${num} < 3`,
            conditionResult: num < 3,
            output: newOutput,
            phase: 'condition',
          },
          highlight: 'condition',
        });
      } while (num < 3);

      steps.push({
        stepNumber: steps.length,
        description: 'Condition is false. Loop ends.',
        state: {
          variables: { num: 3 },
          currentIndex: 3,
          condition: '3 < 3',
          conditionResult: false,
          output: steps[steps.length - 1]?.state.output || [],
          phase: 'complete',
        },
      });
      break;
    }

    case 'for-in': {
      const obj = (data as Record<string, unknown>) || { a: 1, b: 2, c: 3 };
      const keys = Object.keys(obj);

      steps.push({
        stepNumber: 0,
        description: 'Begin iterating over object properties',
        state: {
          variables: { key: '(none)' },
          currentIndex: -1,
          condition: 'has more properties?',
          conditionResult: true,
          output: [],
          phase: 'init',
        },
        highlight: 'init',
      });

      keys.forEach((key, index) => {
        steps.push({
          stepNumber: steps.length,
          description: `Get next property key: "${key}"`,
          state: {
            variables: { key, value: obj[key] as string | number },
            currentIndex: index,
            condition: `property ${index + 1}/${keys.length}`,
            conditionResult: true,
            output: steps[steps.length - 1]?.state.output || [],
            phase: 'condition',
          },
          highlight: 'condition',
        });

        const newOutput = [...(steps[steps.length - 1]?.state.output || []), key];
        steps.push({
          stepNumber: steps.length,
          description: `Execute body: console.log("${key}")`,
          state: {
            variables: { key, value: obj[key] as string | number },
            currentIndex: index,
            condition: `property ${index + 1}/${keys.length}`,
            conditionResult: true,
            output: newOutput,
            phase: 'body',
          },
          highlight: 'body',
        });
      });

      steps.push({
        stepNumber: steps.length,
        description: 'No more properties. Loop ends.',
        state: {
          variables: { key: '(done)' },
          currentIndex: keys.length,
          condition: 'no more properties',
          conditionResult: false,
          output: steps[steps.length - 1]?.state.output || [],
          phase: 'complete',
        },
      });
      break;
    }

    case 'for-of': {
      const arr = (data as (string | number)[]) || ['apple', 'banana', 'cherry'];

      steps.push({
        stepNumber: 0,
        description: 'Begin iterating over array values',
        state: {
          variables: { item: '(none)', index: 0 },
          currentIndex: -1,
          condition: 'has more values?',
          conditionResult: true,
          output: [],
          phase: 'init',
        },
        highlight: 'init',
      });

      arr.forEach((item, index) => {
        steps.push({
          stepNumber: steps.length,
          description: `Get next value: "${item}"`,
          state: {
            variables: { item, index },
            currentIndex: index,
            condition: `value ${index + 1}/${arr.length}`,
            conditionResult: true,
            output: steps[steps.length - 1]?.state.output || [],
            phase: 'condition',
          },
          highlight: 'condition',
        });

        const newOutput = [...(steps[steps.length - 1]?.state.output || []), String(item)];
        steps.push({
          stepNumber: steps.length,
          description: `Execute body: console.log("${item}")`,
          state: {
            variables: { item, index },
            currentIndex: index,
            condition: `value ${index + 1}/${arr.length}`,
            conditionResult: true,
            output: newOutput,
            phase: 'body',
          },
          highlight: 'body',
        });
      });

      steps.push({
        stepNumber: steps.length,
        description: 'No more values. Loop ends.',
        state: {
          variables: { item: '(done)' },
          currentIndex: arr.length,
          condition: 'no more values',
          conditionResult: false,
          output: steps[steps.length - 1]?.state.output || [],
          phase: 'complete',
        },
      });
      break;
    }
  }

  return steps;
}

// Phase colors
const phaseColors = {
  init: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  condition: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  body: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  update: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  complete: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400' },
};

// Loop type labels
const loopTypeLabels: Record<LoopType, string> = {
  'for': 'for Loop',
  'while': 'while Loop',
  'do-while': 'do...while Loop',
  'for-in': 'for...in Loop',
  'for-of': 'for...of Loop',
};

/**
 * LoopVisualizer Component
 * Animated visualization of JavaScript loops showing:
 * - Current step and phase
 * - Variable states
 * - Condition evaluation
 * - Console output
 */
export function LoopVisualizer({
  type = 'for',
  code,
  iterableData,
  autoPlay = false,
  speed: initialSpeed = 'normal',
  showVariables = true,
  showOutput = true,
}: LoopVisualizerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>(initialSpeed);

  const displayCode = code || defaultExamples[type].code;
  const displayData = iterableData || defaultExamples[type].data;

  const steps = useMemo(() => generateLoopSteps(type, displayData), [type, displayData]);
  const currentStep = steps[currentStepIndex];

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speedMultipliers[speed]);

    return () => clearInterval(interval);
  }, [isPlaying, speed, steps.length]);

  const handlePlay = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(true);
  }, [currentStepIndex, steps.length]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStep = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  }, []);

  return (
    <Card className="p-6 my-6 bg-linear-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{loopTypeLabels[type]} Visualizer</h3>
            <p className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
        </div>
        <AnimatedControls 
          isPlaying={isPlaying}
          speed={speed} 
          onSpeedChange={setSpeed}
          onPlayPause={() => isPlaying ? handlePause() : handlePlay()}
          onReset={handleReset}
        />
      </div>

      {/* Code Display */}
      <div className="mb-4 p-4 bg-secondary/50 rounded-lg font-mono text-sm overflow-x-auto">
        <pre className="whitespace-pre-wrap">{displayCode}</pre>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        {isPlaying ? (
          <Button variant="outline" size="sm" onClick={handlePause}>
            <Pause className="w-4 h-4 mr-1" />
            <span>Pause</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handlePlay}>
            <Play className="w-4 h-4 mr-1" />
            <span>Play</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleStep} disabled={currentStepIndex >= steps.length - 1}>
          <StepForward className="w-4 h-4 mr-1" />
          <span>Step</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          <span>Reset</span>
        </Button>
        
        {/* Progress bar */}
        <div className="flex-1 ml-4">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Current Step Description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'p-4 rounded-lg border-2 mb-4 transition-colors',
            currentStep && phaseColors[currentStep.state.phase].bg,
            currentStep && phaseColors[currentStep.state.phase].border
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium uppercase',
              currentStep && phaseColors[currentStep.state.phase].text
            )}>
              {currentStep?.state.phase}
            </span>
            {currentStep?.state.phase === 'condition' && (
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                currentStep.state.conditionResult ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              )}>
                {currentStep.state.conditionResult ? 'TRUE' : 'FALSE'}
              </span>
            )}
          </div>
          <p className="text-foreground font-medium">{currentStep?.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Variables and Output Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Variables Panel */}
        {showVariables && currentStep && (
          <div className="p-4 bg-secondary/30 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Variables
            </h4>
            <div className="space-y-2">
              {Object.entries(currentStep.state.variables).map(([name, value]) => (
                <motion.div
                  key={name}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center justify-between p-2 bg-background/50 rounded"
                >
                  <code className="text-sm text-primary">{name}</code>
                  <motion.code
                    key={`${name}-${value}`}
                    initial={{ scale: 1.1, color: '#22c55e' }}
                    animate={{ scale: 1, color: 'inherit' }}
                    className="text-sm font-semibold"
                  >
                    {typeof value === 'string' ? `"${value}"` : String(value)}
                  </motion.code>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Output Panel */}
        {showOutput && currentStep && (
          <div className="p-4 bg-secondary/30 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Console Output
            </h4>
            <div className="font-mono text-sm space-y-1 min-h-[80px] p-2 bg-background/50 rounded">
              <AnimatePresence>
                {currentStep.state.output.map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-muted-foreground"
                  >
                    <span className="text-muted-foreground/50 mr-2">&gt;</span>
                    {line}
                  </motion.div>
                ))}
              </AnimatePresence>
              {currentStep.state.output.length === 0 && (
                <span className="text-muted-foreground/50 italic">No output yet...</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Iteration Visual for for-in/for-of */}
      {(type === 'for-in' || type === 'for-of') && displayData && (
        <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
          <h4 className="font-medium mb-3">
            {type === 'for-in' ? 'Object Properties' : 'Array Values'}
          </h4>
          <div className="flex flex-wrap gap-2">
            {(type === 'for-in' 
              ? Object.keys(displayData as Record<string, unknown>)
              : (displayData as (string | number)[])
            ).map((item, index) => (
              <motion.div
                key={index}
                className={cn(
                  'px-3 py-2 rounded-lg border-2 transition-all',
                  index === currentStep?.state.currentIndex
                    ? 'border-primary bg-primary/20 scale-110'
                    : index < (currentStep?.state.currentIndex ?? -1)
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-border bg-secondary/50'
                )}
                animate={{
                  scale: index === currentStep?.state.currentIndex ? 1.1 : 1,
                }}
              >
                <code className="text-sm">
                  {type === 'for-in' ? String(item) : `"${item}"`}
                </code>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export type { LoopVisualizerProps, LoopType, LoopStep, LoopState };
export default LoopVisualizer;
