'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowDown,
  Play,
  RefreshCw,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Zap,
  Shield
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

export interface ControlFlowVisualizerProps {
  /** Scenario to visualize */
  scenario?: 'basic-if' | 'else-if-chain' | 'switch-basic' | 'switch-fallthrough' | 'ternary-basic' | 'try-catch-basic' | 'try-catch-finally';
  /** Auto-play animation */
  autoPlay?: boolean;
}

interface FlowStep {
  id: string;
  type: 'condition' | 'block' | 'result' | 'error' | 'finally';
  label: string;
  code?: string;
  active?: boolean;
  result?: boolean | string;
  highlight?: 'success' | 'error' | 'warning' | 'info';
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  code: string;
  steps: FlowStep[];
  variables?: Record<string, string | number | boolean>;
}

const scenarios: Record<string, Scenario> = {
  'basic-if': {
    id: 'basic-if',
    title: 'Basic if...else',
    description: 'See how JavaScript evaluates conditions and chooses which code block to execute.',
    code: `const age = 20;

if (age >= 18) {
  console.log("Adult ✓");
} else {
  console.log("Minor");
}`,
    variables: { age: 20 },
    steps: [
      { id: '1', type: 'condition', label: 'Evaluate condition', code: 'age >= 18', result: true },
      { id: '2', type: 'block', label: 'Condition is TRUE', code: 'console.log("Adult ✓")', highlight: 'success' },
      { id: '3', type: 'result', label: 'Output', code: '"Adult ✓"', highlight: 'success' },
    ],
  },
  'else-if-chain': {
    id: 'else-if-chain',
    title: 'else if Chain',
    description: 'Watch how JavaScript checks conditions in order until one matches.',
    code: `const score = 85;

if (score >= 90) {
  grade = "A";
} else if (score >= 80) {
  grade = "B";
} else if (score >= 70) {
  grade = "C";
} else {
  grade = "F";
}`,
    variables: { score: 85 },
    steps: [
      { id: '1', type: 'condition', label: 'Check first condition', code: 'score >= 90 (85 >= 90)', result: false },
      { id: '2', type: 'condition', label: 'Check second condition', code: 'score >= 80 (85 >= 80)', result: true },
      { id: '3', type: 'block', label: 'Execute matching block', code: 'grade = "B"', highlight: 'success' },
      { id: '4', type: 'result', label: 'Skip remaining conditions', code: 'grade = "B"', highlight: 'info' },
    ],
  },
  'switch-basic': {
    id: 'switch-basic',
    title: 'switch Statement',
    description: 'See how switch compares a value against multiple cases.',
    code: `const day = "Monday";

switch (day) {
  case "Monday":
    console.log("Start of week");
    break;
  case "Friday":
    console.log("TGIF!");
    break;
  default:
    console.log("Regular day");
}`,
    variables: { day: 'Monday' },
    steps: [
      { id: '1', type: 'condition', label: 'Evaluate expression', code: 'day = "Monday"' },
      { id: '2', type: 'condition', label: 'Check case "Monday"', code: '"Monday" === "Monday"', result: true },
      { id: '3', type: 'block', label: 'Execute case block', code: 'console.log("Start of week")', highlight: 'success' },
      { id: '4', type: 'result', label: 'break exits switch', code: 'break;', highlight: 'info' },
    ],
  },
  'switch-fallthrough': {
    id: 'switch-fallthrough',
    title: 'switch Fall-through',
    description: 'Without break, execution "falls through" to the next case.',
    code: `const grade = "B";

switch (grade) {
  case "A":
    console.log("Excellent!");
  case "B":
    console.log("Good job!");
  case "C":
    console.log("You passed");
  default:
    console.log("Keep trying");
}`,
    variables: { grade: 'B' },
    steps: [
      { id: '1', type: 'condition', label: 'Check case "A"', code: '"B" === "A"', result: false },
      { id: '2', type: 'condition', label: 'Check case "B"', code: '"B" === "B"', result: true },
      { id: '3', type: 'block', label: 'Execute "B" block', code: 'console.log("Good job!")', highlight: 'success' },
      { id: '4', type: 'block', label: 'Fall through to "C"', code: 'console.log("You passed")', highlight: 'warning' },
      { id: '5', type: 'block', label: 'Fall through to default', code: 'console.log("Keep trying")', highlight: 'warning' },
      { id: '6', type: 'result', label: 'All three outputs printed!', code: '⚠️ Missing break statements', highlight: 'error' },
    ],
  },
  'ternary-basic': {
    id: 'ternary-basic',
    title: 'Ternary Operator',
    description: 'A compact way to write simple if...else as an expression.',
    code: `const age = 20;
const status = age >= 18 ? "adult" : "minor";
// status = "adult"`,
    variables: { age: 20 },
    steps: [
      { id: '1', type: 'condition', label: 'Evaluate condition', code: 'age >= 18 (20 >= 18)', result: true },
      { id: '2', type: 'block', label: 'Condition is TRUE', code: 'Return first value: "adult"', highlight: 'success' },
      { id: '3', type: 'result', label: 'Assignment complete', code: 'status = "adult"', highlight: 'success' },
    ],
  },
  'try-catch-basic': {
    id: 'try-catch-basic',
    title: 'try...catch',
    description: 'See how errors are caught and handled gracefully.',
    code: `try {
  JSON.parse("invalid json");
} catch (error) {
  console.log("Error:", error.message);
}
console.log("Program continues!");`,
    steps: [
      { id: '1', type: 'block', label: 'Enter try block', code: 'try { ... }' },
      { id: '2', type: 'error', label: 'Error thrown!', code: 'JSON.parse("invalid json")', highlight: 'error' },
      { id: '3', type: 'block', label: 'Jump to catch block', code: 'catch (error) { ... }', highlight: 'warning' },
      { id: '4', type: 'block', label: 'Handle error', code: 'console.log("Error:", error.message)', highlight: 'success' },
      { id: '5', type: 'result', label: 'Program continues', code: 'console.log("Program continues!")', highlight: 'success' },
    ],
  },
  'try-catch-finally': {
    id: 'try-catch-finally',
    title: 'try...catch...finally',
    description: 'The finally block always runs, whether an error occurred or not.',
    code: `let file = null;
try {
  file = openFile("data.txt");
  processFile(file);
} catch (error) {
  console.log("Error:", error.message);
} finally {
  if (file) file.close();
  console.log("Cleanup complete");
}`,
    steps: [
      { id: '1', type: 'block', label: 'Enter try block', code: 'try { ... }' },
      { id: '2', type: 'block', label: 'Open file', code: 'file = openFile("data.txt")', highlight: 'success' },
      { id: '3', type: 'error', label: 'Error in processFile!', code: 'processFile(file) throws', highlight: 'error' },
      { id: '4', type: 'block', label: 'Jump to catch', code: 'catch (error) { ... }', highlight: 'warning' },
      { id: '5', type: 'finally', label: 'finally ALWAYS runs', code: 'finally { ... }', highlight: 'info' },
      { id: '6', type: 'block', label: 'Cleanup resources', code: 'file.close()', highlight: 'success' },
      { id: '7', type: 'result', label: 'Cleanup complete', code: '"Cleanup complete"', highlight: 'success' },
    ],
  },
};

/**
 * ControlFlowVisualizer Component
 * Animated visualization of JavaScript control flow statements
 */
export function ControlFlowVisualizer({
  scenario: scenarioKey = 'basic-if',
  autoPlay = false,
}: ControlFlowVisualizerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scenario = scenarios[scenarioKey] || scenarios['basic-if'];
  const steps = scenario.steps;
  const baseDuration = 1500;
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    intervalRef.current = setTimeout(() => {
      if (currentStep >= steps.length - 1) {
        setIsPlaying(false);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStep, steps.length, duration]);

  const handlePlayPause = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentStep, steps.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const getStepIcon = (step: FlowStep, isActive: boolean) => {
    if (step.type === 'condition') {
      return <GitBranch className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />;
    }
    if (step.type === 'error') {
      return <AlertTriangle className={cn('w-4 h-4', isActive ? 'text-red-500' : 'text-muted-foreground')} />;
    }
    if (step.type === 'finally') {
      return <Shield className={cn('w-4 h-4', isActive ? 'text-blue-500' : 'text-muted-foreground')} />;
    }
    if (step.type === 'result') {
      return <CheckCircle2 className={cn('w-4 h-4', isActive ? 'text-green-500' : 'text-muted-foreground')} />;
    }
    return <Zap className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />;
  };

  const getHighlightStyles = (highlight?: string) => {
    switch (highlight) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-500';
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-500';
      case 'warning':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-500';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-500';
      default:
        return 'bg-secondary/50 border-border text-foreground';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{scenario.title}</h3>
            <p className="text-sm text-muted-foreground">{scenario.description}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* Code Panel */}
        <div className="p-6 border-r border-border bg-zinc-950">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Code</h4>
          <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {scenario.code}
          </pre>
          
          {/* Variables */}
          {scenario.variables && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Variables</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(scenario.variables).map(([key, value]) => (
                  <div key={key} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
                    <code className="text-xs">
                      <span className="text-blue-400">{key}</span>
                      <span className="text-zinc-500"> = </span>
                      <span className="text-green-400">
                        {typeof value === 'string' ? `"${value}"` : String(value)}
                      </span>
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Flow Visualization */}
        <div className="p-6 bg-secondary/20">
          <h4 className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Execution Flow</h4>
          
          <div className="space-y-3">
            {steps.map((step, index) => {
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0.3, x: -10 }}
                  animate={{ 
                    opacity: isActive ? 1 : 0.3, 
                    x: isActive ? 0 : -10,
                    scale: isCurrent ? 1.02 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'relative flex items-start gap-3 p-3 rounded-lg border transition-all',
                    isCurrent ? getHighlightStyles(step.highlight) : 'border-transparent',
                    isCurrent && 'ring-2 ring-primary/20'
                  )}
                >
                  {/* Step number and icon */}
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
                    isActive ? 'bg-primary/20' : 'bg-muted'
                  )}>
                    {getStepIcon(step, isActive)}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {step.label}
                    </div>
                    {step.code && (
                      <code className={cn(
                        'text-xs font-mono mt-1 block',
                        isActive ? 'text-muted-foreground' : 'text-muted-foreground/50'
                      )}>
                        {step.code}
                      </code>
                    )}
                  </div>

                  {/* Result indicator */}
                  {step.result !== undefined && isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-mono shrink-0',
                        step.result === true ? 'bg-green-500/20 text-green-500' :
                        step.result === false ? 'bg-red-500/20 text-red-500' :
                        'bg-blue-500/20 text-blue-500'
                      )}
                    >
                      {typeof step.result === 'boolean' ? (step.result ? 'true' : 'false') : step.result}
                    </motion.div>
                  )}

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className={cn(
                      'absolute left-[1.75rem] top-11 w-0.5 h-3',
                      isActive ? 'bg-primary/30' : 'bg-muted'
                    )} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-2 border-t border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStep(index);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === currentStep
                  ? 'bg-primary w-6'
                  : index < currentStep
                    ? 'bg-primary/50 w-3'
                    : 'bg-muted-foreground/30 w-3'
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            Step {currentStep + 1} / {steps.length}
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
        label="Control Flow Visualizer Controls"
      />
    </Card>
  );
}

export default ControlFlowVisualizer;
