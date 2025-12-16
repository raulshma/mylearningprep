'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Shuffle, 
  Zap, 
  Eye,
  EyeOff,
  Play,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

export interface TypeCastingVisualizerProps {
  /** Mode: 'conversion-vs-coercion' | 'explicit' | 'implicit' */
  mode?: 'conversion-vs-coercion' | 'explicit' | 'implicit';
  /** Show detailed explanations */
  showExplanations?: boolean;
  /** Auto-play animation */
  autoPlay?: boolean;
}

interface ConversionExample {
  id: string;
  input: string;
  inputType: string;
  output: string;
  outputType: string;
  method: string;
  explanation: string;
  isExplicit: boolean;
  gotcha?: string;
}

// Explicit conversion examples
const explicitConversions: ConversionExample[] = [
  {
    id: 'string-to-number-1',
    input: '"42"',
    inputType: 'string',
    output: '42',
    outputType: 'number',
    method: 'Number("42")',
    explanation: 'Number() converts a string to a number. Clean numeric strings convert perfectly.',
    isExplicit: true,
  },
  {
    id: 'string-to-number-2',
    input: '"3.14"',
    inputType: 'string',
    output: '3.14',
    outputType: 'number',
    method: 'parseFloat("3.14")',
    explanation: 'parseFloat() parses a string and returns a floating-point number.',
    isExplicit: true,
  },
  {
    id: 'string-to-number-3',
    input: '"42px"',
    inputType: 'string',
    output: '42',
    outputType: 'number',
    method: 'parseInt("42px")',
    explanation: 'parseInt() extracts the leading integer, ignoring trailing non-numeric characters.',
    isExplicit: true,
  },
  {
    id: 'number-to-string-1',
    input: '42',
    inputType: 'number',
    output: '"42"',
    outputType: 'string',
    method: 'String(42)',
    explanation: 'String() converts any value to its string representation.',
    isExplicit: true,
  },
  {
    id: 'number-to-string-2',
    input: '42',
    inputType: 'number',
    output: '"42"',
    outputType: 'string',
    method: '(42).toString()',
    explanation: '.toString() method converts a number to a string. Can also specify radix for base conversion.',
    isExplicit: true,
  },
  {
    id: 'to-boolean-1',
    input: '"hello"',
    inputType: 'string',
    output: 'true',
    outputType: 'boolean',
    method: 'Boolean("hello")',
    explanation: 'Non-empty strings are truthy, so Boolean() returns true.',
    isExplicit: true,
  },
  {
    id: 'to-boolean-2',
    input: '0',
    inputType: 'number',
    output: 'false',
    outputType: 'boolean',
    method: 'Boolean(0)',
    explanation: '0 is a falsy value, so Boolean(0) returns false.',
    isExplicit: true,
    gotcha: '0, "", null, undefined, NaN are all falsy!',
  },
  {
    id: 'double-not',
    input: '"hello"',
    inputType: 'string',
    output: 'true',
    outputType: 'boolean',
    method: '!!"hello"',
    explanation: 'Double NOT (!!) is a shorthand for Boolean(). First ! converts to boolean and negates, second ! negates back.',
    isExplicit: true,
  },
];

// Implicit coercion examples
const implicitCoercions: ConversionExample[] = [
  {
    id: 'string-concat',
    input: '"5" + 9',
    inputType: 'string + number',
    output: '"59"',
    outputType: 'string',
    method: '+ operator with string',
    explanation: 'When + has a string operand, JavaScript converts the other operand to string and concatenates.',
    isExplicit: false,
    gotcha: 'This is why "5" + 9 = "59" not 14!',
  },
  {
    id: 'math-ops',
    input: '"6" - 2',
    inputType: 'string - number',
    output: '4',
    outputType: 'number',
    method: '- operator',
    explanation: 'Math operators (-, *, /, %) convert strings to numbers. Only + does concatenation.',
    isExplicit: false,
  },
  {
    id: 'loose-equality-1',
    input: '"5" == 5',
    inputType: 'string == number',
    output: 'true',
    outputType: 'boolean',
    method: '== operator',
    explanation: 'Loose equality (==) converts types before comparing. "5" becomes 5, then 5 == 5 is true.',
    isExplicit: false,
    gotcha: 'Use === to avoid unexpected coercion!',
  },
  {
    id: 'loose-equality-2',
    input: '0 == false',
    inputType: 'number == boolean',
    output: 'true',
    outputType: 'boolean',
    method: '== operator',
    explanation: 'false converts to 0, then 0 == 0 is true.',
    isExplicit: false,
  },
  {
    id: 'loose-equality-3',
    input: 'null == undefined',
    inputType: 'null == undefined',
    output: 'true',
    outputType: 'boolean',
    method: '== operator',
    explanation: 'null and undefined are loosely equal to each other (and nothing else).',
    isExplicit: false,
  },
  {
    id: 'if-coercion',
    input: 'if ("hello")',
    inputType: 'string in condition',
    output: 'true (truthy)',
    outputType: 'boolean',
    method: 'Boolean context',
    explanation: 'Conditions implicitly convert values to boolean. Non-empty strings are truthy.',
    isExplicit: false,
  },
  {
    id: 'logical-or',
    input: '"" || "default"',
    inputType: 'string || string',
    output: '"default"',
    outputType: 'string',
    method: '|| operator',
    explanation: 'Logical OR returns the first truthy value. Empty string is falsy, so "default" is returned.',
    isExplicit: false,
  },
  {
    id: 'unary-plus',
    input: '+"42"',
    inputType: '+string',
    output: '42',
    outputType: 'number',
    method: 'Unary + operator',
    explanation: 'Unary + converts its operand to a number. Shorthand for Number().',
    isExplicit: false,
    gotcha: 'Technically explicit intent, but uses implicit mechanism.',
  },
];

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  string: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  number: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  boolean: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  'string + number': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  'string - number': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  'string == number': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  'number == boolean': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  'null == undefined': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  'string in condition': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  'string || string': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  '+string': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
};


/**
 * TypeCastingVisualizer Component
 * Interactive visualization of JavaScript type conversion and coercion
 */
export function TypeCastingVisualizer({
  mode = 'conversion-vs-coercion',
  showExplanations = true,
  autoPlay = false,
}: TypeCastingVisualizerProps) {
  const [selectedExample, setSelectedExample] = useState<ConversionExample | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [showConversion, setShowConversion] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const examples = mode === 'explicit' 
    ? explicitConversions 
    : mode === 'implicit' 
      ? implicitCoercions 
      : [...explicitConversions.slice(0, 4), ...implicitCoercions.slice(0, 4)];

  const currentExample = examples[currentIndex];
  const baseDuration = 3000;
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    intervalRef.current = setTimeout(() => {
      if (!showConversion) {
        setShowConversion(true);
      } else {
        setShowConversion(false);
        if (currentIndex >= examples.length - 1) {
          setIsPlaying(false);
          setCurrentIndex(0);
        } else {
          setCurrentIndex((prev) => prev + 1);
        }
      }
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, showConversion, examples.length, duration]);

  const handlePlayPause = useCallback(() => {
    if (currentIndex >= examples.length - 1 && showConversion) {
      setCurrentIndex(0);
      setShowConversion(false);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentIndex, examples.length, showConversion]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setShowConversion(false);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleExampleClick = (example: ConversionExample, index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
    setSelectedExample(example);
    setShowConversion(true);
  };

  const getTypeColor = (type: string) => {
    return typeColors[type] || typeColors.string;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {mode === 'explicit' ? (
              <Eye className="w-5 h-5 text-primary" />
            ) : mode === 'implicit' ? (
              <EyeOff className="w-5 h-5 text-primary" />
            ) : (
              <Shuffle className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">
              {mode === 'explicit' && 'Explicit Type Casting'}
              {mode === 'implicit' && 'Implicit Type Coercion'}
              {mode === 'conversion-vs-coercion' && 'Type Conversion vs Coercion'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {mode === 'explicit' && 'You control the conversion with functions like Number(), String(), Boolean()'}
              {mode === 'implicit' && 'JavaScript automatically converts types during operations'}
              {mode === 'conversion-vs-coercion' && 'Compare explicit conversion with implicit coercion'}
            </p>
          </div>
        </div>
      </div>

      {/* Current Example Visualization */}
      <div className="p-6 bg-secondary/20">
        <div className="flex items-center justify-center gap-4 min-h-[120px]">
          {/* Input */}
          <motion.div
            key={`input-${currentIndex}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'px-6 py-4 rounded-xl border-2 text-center min-w-[140px]',
              getTypeColor(currentExample.inputType).bg,
              getTypeColor(currentExample.inputType).border
            )}
          >
            <code className="text-lg font-mono font-semibold">{currentExample.input}</code>
            <div className={cn('text-xs mt-1', getTypeColor(currentExample.inputType).text)}>
              {currentExample.inputType}
            </div>
          </motion.div>

          {/* Arrow with method */}
          <div className="flex flex-col items-center gap-1">
            <AnimatePresence mode="wait">
              {showConversion ? (
                <motion.div
                  key="converting"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center"
                >
                  <div className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium mb-2',
                    currentExample.isExplicit 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-orange-500/20 text-orange-500'
                  )}>
                    {currentExample.isExplicit ? 'Explicit' : 'Implicit'}
                  </div>
                  <code className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {currentExample.method}
                  </code>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <ArrowRight className="w-6 h-6 text-primary mt-2" />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Converting...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Output */}
          <AnimatePresence mode="wait">
            {showConversion && (
              <motion.div
                key={`output-${currentIndex}`}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={cn(
                  'px-6 py-4 rounded-xl border-2 text-center min-w-[140px]',
                  getTypeColor(currentExample.outputType).bg,
                  getTypeColor(currentExample.outputType).border
                )}
              >
                <code className="text-lg font-mono font-semibold">{currentExample.output}</code>
                <div className={cn('text-xs mt-1', getTypeColor(currentExample.outputType).text)}>
                  {currentExample.outputType}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Explanation */}
        {showExplanations && showConversion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">{currentExample.explanation}</p>
                {currentExample.gotcha && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-orange-500">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{currentExample.gotcha}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Examples Grid */}
      <div className="p-6 border-t border-border">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">
          {mode === 'conversion-vs-coercion' ? 'All Examples' : mode === 'explicit' ? 'Explicit Conversions' : 'Implicit Coercions'}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {examples.map((example, index) => (
            <button
              key={example.id}
              onClick={() => handleExampleClick(example, index)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all text-sm',
                index === currentIndex
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              )}
            >
              <code className="font-mono text-xs block truncate">{example.input}</code>
              <div className="flex items-center gap-1 mt-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <code className="font-mono text-xs text-muted-foreground truncate">{example.output}</code>
              </div>
              <div className={cn(
                'text-[10px] mt-1 px-1.5 py-0.5 rounded-full inline-block',
                example.isExplicit 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-orange-500/20 text-orange-500'
              )}>
                {example.isExplicit ? 'Explicit' : 'Implicit'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-2 border-t border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          {examples.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(index);
                setShowConversion(false);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === currentIndex
                  ? 'bg-primary w-6'
                  : index < currentIndex
                    ? 'bg-primary/50 w-3'
                    : 'bg-muted-foreground/30 w-3'
              )}
              aria-label={`Go to example ${index + 1}`}
            />
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {currentIndex + 1} / {examples.length}
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
        label="Type Casting Visualizer Controls"
      />
    </Card>
  );
}

export default TypeCastingVisualizer;
