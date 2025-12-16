'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play,
  RefreshCw,
  Calculator,
  Binary,
  GitCompare,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

export interface OperatorVisualizerProps {
  /** Scenario to visualize */
  scenario?: 
    | 'assignment-basic' 
    | 'assignment-compound' 
    | 'comparison-equality' 
    | 'comparison-relational'
    | 'arithmetic-basic'
    | 'arithmetic-advanced'
    | 'logical-and-or'
    | 'logical-nullish'
    | 'bitwise-basic'
    | 'bitwise-shift'
    | 'string-concat'
    | 'string-template'
    | 'ternary-basic'
    | 'ternary-nested'
    | 'comma-operator'
    | 'unary-basic'
    | 'unary-typeof'
    | 'relational-in'
    | 'relational-instanceof';
  /** Auto-play animation */
  autoPlay?: boolean;
}

interface OperatorStep {
  id: string;
  type: 'expression' | 'evaluation' | 'result' | 'memory';
  label: string;
  code?: string;
  value?: string;
  highlight?: 'success' | 'error' | 'warning' | 'info';
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  code: string;
  steps: OperatorStep[];
  variables?: Record<string, string | number | boolean>;
}

const scenarios: Record<string, Scenario> = {
  'assignment-basic': {
    id: 'assignment-basic',
    title: 'Basic Assignment (=)',
    description: 'The assignment operator stores a value in a variable.',
    icon: <ArrowRight className="w-5 h-5" />,
    code: `let x = 5;
let y = x;
let z = x + y;`,
    variables: { x: 5, y: 5, z: 10 },
    steps: [
      { id: '1', type: 'expression', label: 'Declare and assign', code: 'let x = 5', highlight: 'info' },
      { id: '2', type: 'memory', label: 'Store in memory', code: 'x → 5', value: '5', highlight: 'success' },
      { id: '3', type: 'expression', label: 'Copy value', code: 'let y = x', highlight: 'info' },
      { id: '4', type: 'evaluation', label: 'Read x value', code: 'x evaluates to 5', value: '5' },
      { id: '5', type: 'memory', label: 'Store in y', code: 'y → 5', value: '5', highlight: 'success' },
      { id: '6', type: 'expression', label: 'Compute and assign', code: 'let z = x + y', highlight: 'info' },
      { id: '7', type: 'evaluation', label: 'Evaluate expression', code: '5 + 5 = 10', value: '10' },
      { id: '8', type: 'result', label: 'Final values', code: 'x=5, y=5, z=10', highlight: 'success' },
    ],
  },
  'assignment-compound': {
    id: 'assignment-compound',
    title: 'Compound Assignment (+=, -=, *=)',
    description: 'Compound operators combine operation and assignment.',
    icon: <Calculator className="w-5 h-5" />,
    code: `let score = 100;
score += 50;  // score = score + 50
score -= 25;  // score = score - 25
score *= 2;   // score = score * 2`,
    variables: { score: 250 },
    steps: [
      { id: '1', type: 'expression', label: 'Initialize', code: 'let score = 100', highlight: 'info' },
      { id: '2', type: 'memory', label: 'score = 100', value: '100', highlight: 'success' },
      { id: '3', type: 'expression', label: 'Add and assign', code: 'score += 50', highlight: 'info' },
      { id: '4', type: 'evaluation', label: 'Expand operation', code: 'score = 100 + 50', value: '150' },
      { id: '5', type: 'expression', label: 'Subtract and assign', code: 'score -= 25', highlight: 'info' },
      { id: '6', type: 'evaluation', label: 'Expand operation', code: 'score = 150 - 25', value: '125' },
      { id: '7', type: 'expression', label: 'Multiply and assign', code: 'score *= 2', highlight: 'info' },
      { id: '8', type: 'evaluation', label: 'Expand operation', code: 'score = 125 * 2', value: '250' },
      { id: '9', type: 'result', label: 'Final value', code: 'score = 250', highlight: 'success' },
    ],
  },
  'comparison-equality': {
    id: 'comparison-equality',
    title: 'Equality Comparison (==, ===)',
    description: 'Compare values with loose (==) or strict (===) equality.',
    icon: <GitCompare className="w-5 h-5" />,
    code: `5 == "5"   // true (type coercion)
5 === "5"  // false (strict)
null == undefined  // true
null === undefined // false`,
    steps: [
      { id: '1', type: 'expression', label: 'Loose equality', code: '5 == "5"', highlight: 'info' },
      { id: '2', type: 'evaluation', label: 'Type coercion', code: '"5" → 5', value: '5' },
      { id: '3', type: 'result', label: 'Compare values', code: '5 == 5 → true', highlight: 'success' },
      { id: '4', type: 'expression', label: 'Strict equality', code: '5 === "5"', highlight: 'info' },
      { id: '5', type: 'evaluation', label: 'Check types first', code: 'number !== string', highlight: 'warning' },
      { id: '6', type: 'result', label: 'Types differ', code: 'false', highlight: 'error' },
      { id: '7', type: 'expression', label: 'Special case', code: 'null == undefined', highlight: 'info' },
      { id: '8', type: 'result', label: 'Spec-defined equal', code: 'true', highlight: 'success' },
    ],
  },
  'arithmetic-basic': {
    id: 'arithmetic-basic',
    title: 'Basic Arithmetic (+, -, *, /)',
    description: 'Standard mathematical operations in JavaScript.',
    icon: <Calculator className="w-5 h-5" />,
    code: `10 + 3   // 13 (addition)
10 - 3   // 7  (subtraction)
10 * 3   // 30 (multiplication)
10 / 3   // 3.333... (division)`,
    steps: [
      { id: '1', type: 'expression', label: 'Addition', code: '10 + 3', highlight: 'info' },
      { id: '2', type: 'result', label: 'Sum', code: '= 13', value: '13', highlight: 'success' },
      { id: '3', type: 'expression', label: 'Subtraction', code: '10 - 3', highlight: 'info' },
      { id: '4', type: 'result', label: 'Difference', code: '= 7', value: '7', highlight: 'success' },
      { id: '5', type: 'expression', label: 'Multiplication', code: '10 * 3', highlight: 'info' },
      { id: '6', type: 'result', label: 'Product', code: '= 30', value: '30', highlight: 'success' },
      { id: '7', type: 'expression', label: 'Division', code: '10 / 3', highlight: 'info' },
      { id: '8', type: 'result', label: 'Quotient', code: '= 3.333...', value: '3.33', highlight: 'success' },
    ],
  },
  'arithmetic-advanced': {
    id: 'arithmetic-advanced',
    title: 'Advanced Arithmetic (%, **)',
    description: 'Modulo (remainder) and exponentiation operators.',
    icon: <Calculator className="w-5 h-5" />,
    code: `10 % 3   // 1 (remainder)
2 ** 8   // 256 (exponent)
-5 % 3   // -2 (sign follows dividend)`,
    steps: [
      { id: '1', type: 'expression', label: 'Modulo', code: '10 % 3', highlight: 'info' },
      { id: '2', type: 'evaluation', label: 'Division', code: '10 ÷ 3 = 3 remainder 1' },
      { id: '3', type: 'result', label: 'Remainder', code: '= 1', value: '1', highlight: 'success' },
      { id: '4', type: 'expression', label: 'Exponentiation', code: '2 ** 8', highlight: 'info' },
      { id: '5', type: 'evaluation', label: 'Power', code: '2 × 2 × 2 × 2 × 2 × 2 × 2 × 2' },
      { id: '6', type: 'result', label: 'Result', code: '= 256', value: '256', highlight: 'success' },
      { id: '7', type: 'expression', label: 'Negative modulo', code: '-5 % 3', highlight: 'warning' },
      { id: '8', type: 'result', label: 'Sign from dividend', code: '= -2', value: '-2', highlight: 'success' },
    ],
  },
  'logical-and-or': {
    id: 'logical-and-or',
    title: 'Logical AND (&&) and OR (||)',
    description: 'Short-circuit evaluation with logical operators.',
    icon: <Zap className="w-5 h-5" />,
    code: `true && "hello"   // "hello"
false && "hello"  // false
false || "default" // "default"
"value" || "default" // "value"`,
    steps: [
      { id: '1', type: 'expression', label: 'AND with true', code: 'true && "hello"', highlight: 'info' },
      { id: '2', type: 'evaluation', label: 'First is truthy', code: 'Continue to second operand' },
      { id: '3', type: 'result', label: 'Return second', code: '"hello"', highlight: 'success' },
      { id: '4', type: 'expression', label: 'AND with false', code: 'false && "hello"', highlight: 'info' },
      { id: '5', type: 'evaluation', label: 'First is falsy', code: 'Short-circuit!', highlight: 'warning' },
      { id: '6', type: 'result', label: 'Return first', code: 'false', highlight: 'error' },
      { id: '7', type: 'expression', label: 'OR with false', code: 'false || "default"', highlight: 'info' },
      { id: '8', type: 'result', label: 'Return truthy', code: '"default"', highlight: 'success' },
    ],
  },
  'logical-nullish': {
    id: 'logical-nullish',
    title: 'Nullish Coalescing (??)',
    description: 'Returns right operand only for null/undefined.',
    icon: <Zap className="w-5 h-5" />,
    code: `null ?? "default"     // "default"
undefined ?? "default" // "default"
0 ?? "default"        // 0
"" ?? "default"       // ""`,
    steps: [
      { id: '1', type: 'expression', label: 'null check', code: 'null ?? "default"', highlight: 'info' },
      { id: '2', type: 'evaluation', label: 'Is nullish?', code: 'null is nullish', highlight: 'warning' },
      { id: '3', type: 'result', label: 'Use default', code: '"default"', highlight: 'success' },
      { id: '4', type: 'expression', label: 'Zero check', code: '0 ?? "default"', highlight: 'info' },
      { id: '5', type: 'evaluation', label: 'Is nullish?', code: '0 is NOT nullish' },
      { id: '6', type: 'result', label: 'Keep value', code: '0', highlight: 'success' },
      { id: '7', type: 'expression', label: 'Empty string', code: '"" ?? "default"', highlight: 'info' },
      { id: '8', type: 'result', label: 'Keep value', code: '""', highlight: 'success' },
    ],
  },
  'bitwise-basic': {
    id: 'bitwise-basic',
    title: 'Bitwise AND (&), OR (|), XOR (^)',
    description: 'Operate on individual bits of numbers.',
    icon: <Binary className="w-5 h-5" />,
    code: `5 & 3   // 1  (AND)
5 | 3   // 7  (OR)
5 ^ 3   // 6  (XOR)
~5      // -6 (NOT)`,
    steps: [
      { id: '1', type: 'expression', label: 'Bitwise AND', code: '5 & 3', highlight: 'info' },
      { id: '2', type: 'evaluation', label: 'Binary', code: '101 & 011' },
      { id: '3', type: 'result', label: 'Result', code: '001 = 1', value: '1', highlight: 'success' },
      { id: '4', type: 'expression', label: 'Bitwise OR', code: '5 | 3', highlight: 'info' },
      { id: '5', type: 'evaluation', label: 'Binary', code: '101 | 011' },
      { id: '6', type: 'result', label: 'Result', code: '111 = 7', value: '7', highlight: 'success' },
      { id: '7', type: 'expression', label: 'Bitwise XOR', code: '5 ^ 3', highlight: 'info' },
      { id: '8', type: 'result', label: 'Result', code: '110 = 6', value: '6', highlight: 'success' },
    ],
  },
  'ternary-basic': {
    id: 'ternary-basic',
    title: 'Ternary Operator (? :)',
    description: 'Inline conditional expression.',
    icon: <GitCompare className="w-5 h-5" />,
    code: `const age = 20;
const status = age >= 18 ? "adult" : "minor";
// status = "adult"`,
    variables: { age: 20, status: 'adult' },
    steps: [
      { id: '1', type: 'expression', label: 'Evaluate condition', code: 'age >= 18', highlight: 'info' },
      { id: '2', type: 'evaluation', label: 'Check', code: '20 >= 18', value: 'true' },
      { id: '3', type: 'result', label: 'Condition is TRUE', code: 'Return first value', highlight: 'success' },
      { id: '4', type: 'memory', label: 'Assign result', code: 'status = "adult"', highlight: 'success' },
    ],
  },
  'unary-basic': {
    id: 'unary-basic',
    title: 'Unary Operators (++, --, +, -)',
    description: 'Operators that work on a single operand.',
    icon: <Zap className="w-5 h-5" />,
    code: `let x = 5;
x++;    // 5 (returns, then increments)
++x;    // 7 (increments, then returns)
-x;     // -7 (negation)`,
    variables: { x: 7 },
    steps: [
      { id: '1', type: 'expression', label: 'Initialize', code: 'let x = 5', highlight: 'info' },
      { id: '2', type: 'expression', label: 'Post-increment', code: 'x++', highlight: 'info' },
      { id: '3', type: 'evaluation', label: 'Return then add', code: 'returns 5, x becomes 6' },
      { id: '4', type: 'expression', label: 'Pre-increment', code: '++x', highlight: 'info' },
      { id: '5', type: 'evaluation', label: 'Add then return', code: 'x becomes 7, returns 7' },
      { id: '6', type: 'expression', label: 'Negation', code: '-x', highlight: 'info' },
      { id: '7', type: 'result', label: 'Negate value', code: '-7', value: '-7', highlight: 'success' },
    ],
  },
  'relational-in': {
    id: 'relational-in',
    title: 'Relational: in & instanceof',
    description: 'Check property existence and object types.',
    icon: <GitCompare className="w-5 h-5" />,
    code: `const obj = { name: "Alice" };
"name" in obj      // true
"age" in obj       // false
[] instanceof Array // true`,
    steps: [
      { id: '1', type: 'expression', label: 'Check property', code: '"name" in obj', highlight: 'info' },
      { id: '2', type: 'evaluation', label: 'Property exists?', code: 'obj.name exists' },
      { id: '3', type: 'result', label: 'Found', code: 'true', highlight: 'success' },
      { id: '4', type: 'expression', label: 'Check missing', code: '"age" in obj', highlight: 'info' },
      { id: '5', type: 'result', label: 'Not found', code: 'false', highlight: 'error' },
      { id: '6', type: 'expression', label: 'Check type', code: '[] instanceof Array', highlight: 'info' },
      { id: '7', type: 'evaluation', label: 'Prototype chain', code: 'Array in prototype chain' },
      { id: '8', type: 'result', label: 'Match', code: 'true', highlight: 'success' },
    ],
  },
};

export function OperatorVisualizer({
  scenario: scenarioKey = 'assignment-basic',
  autoPlay = false,
}: OperatorVisualizerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scenario = scenarios[scenarioKey] || scenarios['assignment-basic'];
  const steps = scenario.steps;
  const baseDuration = 1500;
  const duration = baseDuration * speedMultipliers[speed];

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

  const getStepIcon = (step: OperatorStep, isActive: boolean) => {
    if (step.type === 'expression') {
      return <Calculator className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />;
    }
    if (step.type === 'evaluation') {
      return <Zap className={cn('w-4 h-4', isActive ? 'text-yellow-500' : 'text-muted-foreground')} />;
    }
    if (step.type === 'memory') {
      return <Binary className={cn('w-4 h-4', isActive ? 'text-blue-500' : 'text-muted-foreground')} />;
    }
    return <CheckCircle2 className={cn('w-4 h-4', isActive ? 'text-green-500' : 'text-muted-foreground')} />;
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
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {scenario.icon}
          </div>
          <div>
            <h3 className="font-semibold">{scenario.title}</h3>
            <p className="text-sm text-muted-foreground">{scenario.description}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-6 border-r border-border bg-zinc-950">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Code</h4>
          <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {scenario.code}
          </pre>
          
          {scenario.variables && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Final Values</h4>
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

        <div className="p-6 bg-secondary/20">
          <h4 className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Evaluation Steps</h4>
          
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
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
                    isActive ? 'bg-primary/20' : 'bg-muted'
                  )}>
                    {getStepIcon(step, isActive)}
                  </div>

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

                  {step.value && isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-2 py-1 rounded text-xs font-mono shrink-0 bg-primary/20 text-primary"
                    >
                      {step.value}
                    </motion.div>
                  )}

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

      <AnimatedControls
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        onReset={handleReset}
        label="Operator Visualizer Controls"
      />
    </Card>
  );
}

export default OperatorVisualizer;
