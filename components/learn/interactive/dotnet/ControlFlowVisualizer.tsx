'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, StepForward, GitBranch, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for control flow visualization
interface FlowState {
  variables: Record<string, string | number | boolean>;
  currentBranch: string;
  condition: string;
  conditionResult: boolean;
  output: string[];
  phase: 'init' | 'condition' | 'branch' | 'complete';
}

interface FlowStep {
  stepNumber: number;
  description: string;
  state: FlowState;
  highlight?: 'condition' | 'if' | 'else' | 'case' | 'default';
}

type FlowType = 'if-else' | 'if-else-if' | 'switch' | 'pattern-match';

interface ControlFlowVisualizerProps {
  type?: FlowType;
  code?: string;
  testValue?: number | string;
  autoPlay?: boolean;
  speed?: AnimationSpeed;
  showVariables?: boolean;
  showOutput?: boolean;
}

// Default examples for each flow type
const defaultExamples: Record<FlowType, { code: string; testValue: number | string }> = {
  'if-else': {
    code: `int score = 75;

if (score >= 60)
{
    Console.WriteLine("You passed!");
}
else
{
    Console.WriteLine("Try again.");
}`,
    testValue: 75,
  },
  'if-else-if': {
    code: `int score = 85;

if (score >= 90)
{
    Console.WriteLine("Grade: A");
}
else if (score >= 80)
{
    Console.WriteLine("Grade: B");
}
else if (score >= 70)
{
    Console.WriteLine("Grade: C");
}
else
{
    Console.WriteLine("Grade: F");
}`,
    testValue: 85,
  },
  'switch': {
    code: `int dayNumber = 3;

switch (dayNumber)
{
    case 1:
        Console.WriteLine("Monday");
        break;
    case 2:
        Console.WriteLine("Tuesday");
        break;
    case 3:
        Console.WriteLine("Wednesday");
        break;
    default:
        Console.WriteLine("Other day");
        break;
}`,
    testValue: 3,
  },
  'pattern-match': {
    code: `double measurement = 25.5;

string result = measurement switch
{
    < 0.0 => "Too low",
    > 100.0 => "Too high",
    double.NaN => "Invalid",
    _ => "Normal"
};

Console.WriteLine(result);`,
    testValue: 25.5,
  },
};

// Generate steps based on flow type
function generateFlowSteps(type: FlowType, testValue: number | string): FlowStep[] {
  const steps: FlowStep[] = [];

  switch (type) {
    case 'if-else': {
      const score = typeof testValue === 'number' ? testValue : 75;
      const passed = score >= 60;

      steps.push({
        stepNumber: 0,
        description: `Initialize variable: score = ${score}`,
        state: {
          variables: { score },
          currentBranch: '',
          condition: 'score >= 60',
          conditionResult: passed,
          output: [],
          phase: 'init',
        },
      });

      steps.push({
        stepNumber: 1,
        description: `Evaluate condition: ${score} >= 60 → ${passed}`,
        state: {
          variables: { score },
          currentBranch: '',
          condition: `${score} >= 60`,
          conditionResult: passed,
          output: [],
          phase: 'condition',
        },
        highlight: 'condition',
      });

      steps.push({
        stepNumber: 2,
        description: passed ? 'Condition is TRUE - enter IF block' : 'Condition is FALSE - enter ELSE block',
        state: {
          variables: { score },
          currentBranch: passed ? 'if' : 'else',
          condition: `${score} >= 60`,
          conditionResult: passed,
          output: [passed ? 'You passed!' : 'Try again.'],
          phase: 'branch',
        },
        highlight: passed ? 'if' : 'else',
      });

      steps.push({
        stepNumber: 3,
        description: 'Control flow complete',
        state: {
          variables: { score },
          currentBranch: passed ? 'if' : 'else',
          condition: `${score} >= 60`,
          conditionResult: passed,
          output: [passed ? 'You passed!' : 'Try again.'],
          phase: 'complete',
        },
      });
      break;
    }

    case 'if-else-if': {
      const score = typeof testValue === 'number' ? testValue : 85;
      let grade = 'F';
      let branch = 'else';
      
      if (score >= 90) { grade = 'A'; branch = 'if'; }
      else if (score >= 80) { grade = 'B'; branch = 'else-if-1'; }
      else if (score >= 70) { grade = 'C'; branch = 'else-if-2'; }

      steps.push({
        stepNumber: 0,
        description: `Initialize variable: score = ${score}`,
        state: {
          variables: { score },
          currentBranch: '',
          condition: '',
          conditionResult: false,
          output: [],
          phase: 'init',
        },
      });

      // Check first condition
      steps.push({
        stepNumber: 1,
        description: `Check: ${score} >= 90 → ${score >= 90}`,
        state: {
          variables: { score },
          currentBranch: '',
          condition: `${score} >= 90`,
          conditionResult: score >= 90,
          output: [],
          phase: 'condition',
        },
        highlight: 'condition',
      });

      if (score >= 90) {
        steps.push({
          stepNumber: 2,
          description: 'First condition TRUE - Grade: A',
          state: {
            variables: { score, grade: 'A' },
            currentBranch: 'if',
            condition: `${score} >= 90`,
            conditionResult: true,
            output: ['Grade: A'],
            phase: 'branch',
          },
          highlight: 'if',
        });
      } else {
        // Check second condition
        steps.push({
          stepNumber: 2,
          description: `Check: ${score} >= 80 → ${score >= 80}`,
          state: {
            variables: { score },
            currentBranch: '',
            condition: `${score} >= 80`,
            conditionResult: score >= 80,
            output: [],
            phase: 'condition',
          },
          highlight: 'condition',
        });

        if (score >= 80) {
          steps.push({
            stepNumber: 3,
            description: 'Second condition TRUE - Grade: B',
            state: {
              variables: { score, grade: 'B' },
              currentBranch: 'else-if-1',
              condition: `${score} >= 80`,
              conditionResult: true,
              output: ['Grade: B'],
              phase: 'branch',
            },
            highlight: 'if',
          });
        } else {
          steps.push({
            stepNumber: 3,
            description: `Check: ${score} >= 70 → ${score >= 70}`,
            state: {
              variables: { score },
              currentBranch: '',
              condition: `${score} >= 70`,
              conditionResult: score >= 70,
              output: [],
              phase: 'condition',
            },
            highlight: 'condition',
          });

          if (score >= 70) {
            steps.push({
              stepNumber: 4,
              description: 'Third condition TRUE - Grade: C',
              state: {
                variables: { score, grade: 'C' },
                currentBranch: 'else-if-2',
                condition: `${score} >= 70`,
                conditionResult: true,
                output: ['Grade: C'],
                phase: 'branch',
              },
              highlight: 'if',
            });
          } else {
            steps.push({
              stepNumber: 4,
              description: 'All conditions FALSE - Grade: F',
              state: {
                variables: { score, grade: 'F' },
                currentBranch: 'else',
                condition: 'none matched',
                conditionResult: false,
                output: ['Grade: F'],
                phase: 'branch',
              },
              highlight: 'else',
            });
          }
        }
      }

      steps.push({
        stepNumber: steps.length,
        description: 'Control flow complete',
        state: {
          variables: { score, grade },
          currentBranch: branch,
          condition: 'complete',
          conditionResult: true,
          output: [`Grade: ${grade}`],
          phase: 'complete',
        },
      });
      break;
    }

    case 'switch': {
      const dayNumber = typeof testValue === 'number' ? testValue : 3;
      const days: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday' };
      const dayName = days[dayNumber] || 'Other day';
      const isDefault = !days[dayNumber];

      steps.push({
        stepNumber: 0,
        description: `Initialize variable: dayNumber = ${dayNumber}`,
        state: {
          variables: { dayNumber },
          currentBranch: '',
          condition: `switch(${dayNumber})`,
          conditionResult: false,
          output: [],
          phase: 'init',
        },
      });

      // Check each case
      for (let i = 1; i <= 3; i++) {
        const isMatch = dayNumber === i;
        steps.push({
          stepNumber: steps.length,
          description: `Check case ${i}: ${dayNumber} == ${i} → ${isMatch}`,
          state: {
            variables: { dayNumber },
            currentBranch: '',
            condition: `case ${i}`,
            conditionResult: isMatch,
            output: [],
            phase: 'condition',
          },
          highlight: 'condition',
        });

        if (isMatch) {
          steps.push({
            stepNumber: steps.length,
            description: `Case ${i} matched! Output: "${days[i]}"`,
            state: {
              variables: { dayNumber, dayName: days[i] },
              currentBranch: `case-${i}`,
              condition: `case ${i}`,
              conditionResult: true,
              output: [days[i]],
              phase: 'branch',
            },
            highlight: 'case',
          });
          break;
        }
      }

      if (isDefault) {
        steps.push({
          stepNumber: steps.length,
          description: 'No case matched - using default',
          state: {
            variables: { dayNumber, dayName: 'Other day' },
            currentBranch: 'default',
            condition: 'default',
            conditionResult: true,
            output: ['Other day'],
            phase: 'branch',
          },
          highlight: 'default',
        });
      }

      steps.push({
        stepNumber: steps.length,
        description: 'Switch complete - break exits the block',
        state: {
          variables: { dayNumber, dayName },
          currentBranch: isDefault ? 'default' : `case-${dayNumber}`,
          condition: 'complete',
          conditionResult: true,
          output: [dayName],
          phase: 'complete',
        },
      });
      break;
    }

    case 'pattern-match': {
      const measurement = typeof testValue === 'number' ? testValue : 25.5;
      let result = 'Normal';
      let pattern = '_';

      if (Number.isNaN(measurement)) { result = 'Invalid'; pattern = 'double.NaN'; }
      else if (measurement < 0) { result = 'Too low'; pattern = '< 0.0'; }
      else if (measurement > 100) { result = 'Too high'; pattern = '> 100.0'; }

      steps.push({
        stepNumber: 0,
        description: `Initialize variable: measurement = ${measurement}`,
        state: {
          variables: { measurement },
          currentBranch: '',
          condition: 'switch expression',
          conditionResult: false,
          output: [],
          phase: 'init',
        },
      });

      steps.push({
        stepNumber: 1,
        description: `Check pattern: ${measurement} < 0.0 → ${measurement < 0}`,
        state: {
          variables: { measurement },
          currentBranch: '',
          condition: '< 0.0',
          conditionResult: measurement < 0,
          output: [],
          phase: 'condition',
        },
        highlight: 'condition',
      });

      if (measurement < 0) {
        steps.push({
          stepNumber: 2,
          description: 'Pattern matched! Result: "Too low"',
          state: {
            variables: { measurement, result: 'Too low' },
            currentBranch: '< 0.0',
            condition: '< 0.0',
            conditionResult: true,
            output: ['Too low'],
            phase: 'branch',
          },
          highlight: 'case',
        });
      } else {
        steps.push({
          stepNumber: 2,
          description: `Check pattern: ${measurement} > 100.0 → ${measurement > 100}`,
          state: {
            variables: { measurement },
            currentBranch: '',
            condition: '> 100.0',
            conditionResult: measurement > 100,
            output: [],
            phase: 'condition',
          },
          highlight: 'condition',
        });

        if (measurement > 100) {
          steps.push({
            stepNumber: 3,
            description: 'Pattern matched! Result: "Too high"',
            state: {
              variables: { measurement, result: 'Too high' },
              currentBranch: '> 100.0',
              condition: '> 100.0',
              conditionResult: true,
              output: ['Too high'],
              phase: 'branch',
            },
            highlight: 'case',
          });
        } else {
          steps.push({
            stepNumber: 3,
            description: 'Default pattern (_) matched! Result: "Normal"',
            state: {
              variables: { measurement, result: 'Normal' },
              currentBranch: '_',
              condition: '_',
              conditionResult: true,
              output: ['Normal'],
              phase: 'branch',
            },
            highlight: 'default',
          });
        }
      }

      steps.push({
        stepNumber: steps.length,
        description: 'Switch expression complete',
        state: {
          variables: { measurement, result },
          currentBranch: pattern,
          condition: 'complete',
          conditionResult: true,
          output: [result],
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
  branch: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  complete: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400' },
};

// Flow type labels
const flowTypeLabels: Record<FlowType, string> = {
  'if-else': 'if/else Statement',
  'if-else-if': 'if/else-if Chain',
  'switch': 'switch Statement',
  'pattern-match': 'Switch Expression (C# 8+)',
};

/**
 * ControlFlowVisualizer Component
 * Animated visualization of C# control flow statements showing:
 * - Current step and phase
 * - Variable states
 * - Condition evaluation
 * - Branch selection
 */
export function ControlFlowVisualizer({
  type = 'if-else',
  code,
  testValue,
  autoPlay = false,
  speed: initialSpeed = 'normal',
  showVariables = true,
  showOutput = true,
}: ControlFlowVisualizerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>(initialSpeed);
  const [customValue, setCustomValue] = useState(testValue ?? defaultExamples[type].testValue);

  const displayCode = code || defaultExamples[type].code;
  const steps = useMemo(() => generateFlowSteps(type, customValue), [type, customValue]);
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
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{flowTypeLabels[type]}</h3>
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

      {/* Value Input */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Test Value:</label>
        <input
          type="number"
          value={customValue as number}
          onChange={(e) => {
            setCustomValue(Number(e.target.value));
            setCurrentStepIndex(0);
            setIsPlaying(false);
          }}
          className="w-20 px-2 py-1 text-sm bg-secondary/50 rounded border border-border"
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

      {/* Flow Diagram */}
      <div className="mb-4 p-4 bg-secondary/30 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Execution Flow
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          {type === 'if-else' && (
            <>
              <div className={cn(
                'px-3 py-2 rounded border-2 transition-all',
                currentStep?.state.phase === 'condition' ? 'border-yellow-500 bg-yellow-500/20' : 'border-border'
              )}>
                condition?
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className={cn(
                'px-3 py-2 rounded border-2 transition-all',
                currentStep?.state.currentBranch === 'if' ? 'border-green-500 bg-green-500/20' : 'border-border'
              )}>
                if block
              </div>
              <span className="text-muted-foreground mx-2">or</span>
              <div className={cn(
                'px-3 py-2 rounded border-2 transition-all',
                currentStep?.state.currentBranch === 'else' ? 'border-red-500 bg-red-500/20' : 'border-border'
              )}>
                else block
              </div>
            </>
          )}
          {type === 'switch' && (
            <>
              <div className={cn(
                'px-3 py-2 rounded border-2 transition-all',
                currentStep?.state.phase === 'init' ? 'border-primary bg-primary/20' : 'border-border'
              )}>
                switch(value)
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={cn(
                    'px-3 py-2 rounded border-2 transition-all',
                    currentStep?.state.currentBranch === `case-${n}` ? 'border-green-500 bg-green-500/20' : 'border-border'
                  )}
                >
                  case {n}
                </div>
              ))}
              <div className={cn(
                'px-3 py-2 rounded border-2 transition-all',
                currentStep?.state.currentBranch === 'default' ? 'border-orange-500 bg-orange-500/20' : 'border-border'
              )}>
                default
              </div>
            </>
          )}
        </div>
      </div>

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
    </Card>
  );
}

export type { ControlFlowVisualizerProps, FlowType, FlowStep, FlowState };
export default ControlFlowVisualizer;
