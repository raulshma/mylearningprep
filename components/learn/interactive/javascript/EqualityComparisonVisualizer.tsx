'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Scale, 
  Zap, 
  Play,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Equal,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

export interface EqualityComparisonVisualizerProps {
  /** Mode: 'loose' | 'strict' | 'object-is' | 'comparison' */
  mode?: 'loose' | 'strict' | 'object-is' | 'comparison';
  /** Show detailed explanations */
  showExplanations?: boolean;
  /** Auto-play animation */
  autoPlay?: boolean;
}

interface ComparisonExample {
  id: string;
  left: string;
  leftType: string;
  right: string;
  rightType: string;
  looseResult: boolean;
  strictResult: boolean;
  objectIsResult: boolean;
  explanation: string;
  gotcha?: string;
  coercionSteps?: string[];
}

// Comprehensive comparison examples
const comparisonExamples: ComparisonExample[] = [
  {
    id: 'string-number',
    left: '"5"',
    leftType: 'string',
    right: '5',
    rightType: 'number',
    looseResult: true,
    strictResult: false,
    objectIsResult: false,
    explanation: 'Loose equality converts "5" to number 5, then compares. Strict equality sees different types immediately.',
    coercionSteps: ['"5" → Number("5") → 5', '5 == 5 → true'],
    gotcha: 'This is why form inputs (always strings) can cause bugs!',
  },
  {
    id: 'zero-false',
    left: '0',
    leftType: 'number',
    right: 'false',
    rightType: 'boolean',
    looseResult: true,
    strictResult: false,
    objectIsResult: false,
    explanation: 'Loose equality converts false to 0, then compares. Both become 0, so they\'re "equal".',
    coercionSteps: ['false → Number(false) → 0', '0 == 0 → true'],
    gotcha: 'Empty arrays, empty strings, and 0 are all loosely equal to false!',
  },
  {
    id: 'empty-string-false',
    left: '""',
    leftType: 'string',
    right: 'false',
    rightType: 'boolean',
    looseResult: true,
    strictResult: false,
    objectIsResult: false,
    explanation: 'Empty string converts to 0, false converts to 0. Both are 0, so loosely equal.',
    coercionSteps: ['"" → Number("") → 0', 'false → Number(false) → 0', '0 == 0 → true'],
  },
  {
    id: 'null-undefined',
    left: 'null',
    leftType: 'null',
    right: 'undefined',
    rightType: 'undefined',
    looseResult: true,
    strictResult: false,
    objectIsResult: false,
    explanation: 'Special case: null and undefined are loosely equal to each other (and nothing else).',
    gotcha: 'This is the ONE case where == is sometimes preferred over ===',
  },
  {
    id: 'nan-nan',
    left: 'NaN',
    leftType: 'number',
    right: 'NaN',
    rightType: 'number',
    looseResult: false,
    strictResult: false,
    objectIsResult: true,
    explanation: 'NaN is the only value not equal to itself! Object.is() fixes this quirk.',
    gotcha: 'Use Number.isNaN() or Object.is() to check for NaN!',
  },
  {
    id: 'positive-negative-zero',
    left: '+0',
    leftType: 'number',
    right: '-0',
    rightType: 'number',
    looseResult: true,
    strictResult: true,
    objectIsResult: false,
    explanation: '+0 and -0 are equal with == and ===, but Object.is() distinguishes them.',
    gotcha: 'Signed zeros matter in some math operations like 1/+0 vs 1/-0',
  },
  {
    id: 'object-object',
    left: '{ a: 1 }',
    leftType: 'object',
    right: '{ a: 1 }',
    rightType: 'object',
    looseResult: false,
    strictResult: false,
    objectIsResult: false,
    explanation: 'Objects are compared by reference, not by value. Two different objects are never equal.',
    gotcha: 'Use JSON.stringify() or deep comparison for object value equality',
  },
  {
    id: 'array-string',
    left: '[1, 2]',
    leftType: 'array',
    right: '"1,2"',
    rightType: 'string',
    looseResult: true,
    strictResult: false,
    objectIsResult: false,
    explanation: 'Arrays convert to strings via .toString(), so [1,2] becomes "1,2".',
    coercionSteps: ['[1, 2].toString() → "1,2"', '"1,2" == "1,2" → true'],
  },
  {
    id: 'string-string',
    left: '"hello"',
    leftType: 'string',
    right: '"hello"',
    rightType: 'string',
    looseResult: true,
    strictResult: true,
    objectIsResult: true,
    explanation: 'Same type, same value — all three methods agree!',
  },
  {
    id: 'number-number',
    left: '42',
    leftType: 'number',
    right: '42',
    rightType: 'number',
    looseResult: true,
    strictResult: true,
    objectIsResult: true,
    explanation: 'Same type, same value — all three methods agree!',
  },
  {
    id: 'true-one',
    left: 'true',
    leftType: 'boolean',
    right: '1',
    rightType: 'number',
    looseResult: true,
    strictResult: false,
    objectIsResult: false,
    explanation: 'true converts to 1 in numeric context. Loose equality sees them as equal.',
    coercionSteps: ['true → Number(true) → 1', '1 == 1 → true'],
  },
  {
    id: 'string-object',
    left: '"foo"',
    leftType: 'string',
    right: 'new String("foo")',
    rightType: 'object',
    looseResult: true,
    strictResult: false,
    objectIsResult: false,
    explanation: 'String object is coerced to primitive "foo" for loose comparison.',
    gotcha: 'Avoid new String(), new Number(), new Boolean() — they create objects!',
  },
];

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  string: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  number: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  boolean: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  null: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  undefined: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  object: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  array: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
};


/**
 * EqualityComparisonVisualizer Component
 * Interactive visualization of JavaScript equality comparisons
 */
export function EqualityComparisonVisualizer({
  mode = 'comparison',
  showExplanations = true,
  autoPlay = false,
}: EqualityComparisonVisualizerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [showResult, setShowResult] = useState(false);
  const [showCoercion, setShowCoercion] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter examples based on mode
  const examples = mode === 'comparison' 
    ? comparisonExamples 
    : mode === 'loose'
      ? comparisonExamples.filter(e => e.looseResult !== e.strictResult || e.coercionSteps)
      : mode === 'strict'
        ? comparisonExamples.filter(e => e.strictResult === e.objectIsResult || !e.coercionSteps)
        : comparisonExamples.filter(e => e.objectIsResult !== e.strictResult);

  const currentExample = examples[currentIndex];
  const baseDuration = 2500;
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    intervalRef.current = setTimeout(() => {
      if (!showResult) {
        setShowResult(true);
      } else if (!showCoercion && currentExample.coercionSteps && mode === 'loose') {
        setShowCoercion(true);
      } else {
        setShowResult(false);
        setShowCoercion(false);
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
  }, [isPlaying, currentIndex, showResult, showCoercion, examples.length, duration, currentExample.coercionSteps, mode]);

  const handlePlayPause = useCallback(() => {
    if (currentIndex >= examples.length - 1 && showResult) {
      setCurrentIndex(0);
      setShowResult(false);
      setShowCoercion(false);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentIndex, examples.length, showResult]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setShowResult(false);
    setShowCoercion(false);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleExampleClick = (index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
    setShowResult(true);
    setShowCoercion(false);
  };

  const getTypeColor = (type: string) => {
    return typeColors[type] || typeColors.string;
  };

  const getResultForMode = (example: ComparisonExample) => {
    switch (mode) {
      case 'loose': return example.looseResult;
      case 'strict': return example.strictResult;
      case 'object-is': return example.objectIsResult;
      default: return example.strictResult;
    }
  };

  const getOperatorForMode = () => {
    switch (mode) {
      case 'loose': return '==';
      case 'strict': return '===';
      case 'object-is': return 'Object.is()';
      default: return '===';
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'loose': return 'Loose Equality (==)';
      case 'strict': return 'Strict Equality (===)';
      case 'object-is': return 'Same-value Equality (Object.is)';
      default: return 'Equality Comparison';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'loose': return 'Compares values after type coercion — can lead to surprising results!';
      case 'strict': return 'Compares values without type coercion — recommended for most cases';
      case 'object-is': return 'Like strict equality, but handles NaN and signed zeros differently';
      default: return 'Compare how different equality operators behave';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {mode === 'loose' ? (
              <Scale className="w-5 h-5 text-primary" />
            ) : mode === 'object-is' ? (
              <Target className="w-5 h-5 text-primary" />
            ) : (
              <Equal className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{getModeTitle()}</h3>
            <p className="text-sm text-muted-foreground">{getModeDescription()}</p>
          </div>
        </div>
      </div>

      {/* Current Example Visualization */}
      <div className="p-6 bg-secondary/20">
        <div className="flex items-center justify-center gap-4 min-h-[140px] flex-wrap">
          {/* Left operand */}
          <motion.div
            key={`left-${currentIndex}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'px-6 py-4 rounded-xl border-2 text-center min-w-[120px]',
              getTypeColor(currentExample.leftType).bg,
              getTypeColor(currentExample.leftType).border
            )}
          >
            <code className="text-lg font-mono font-semibold">{currentExample.left}</code>
            <div className={cn('text-xs mt-1', getTypeColor(currentExample.leftType).text)}>
              {currentExample.leftType}
            </div>
          </motion.div>

          {/* Operator */}
          <div className="flex flex-col items-center gap-2">
            {mode === 'comparison' ? (
              <div className="flex flex-col gap-1">
                <div className={cn(
                  'px-3 py-1 rounded-full text-xs font-mono font-medium',
                  currentExample.looseResult ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                )}>
                  == {currentExample.looseResult ? '✓' : '✗'}
                </div>
                <div className={cn(
                  'px-3 py-1 rounded-full text-xs font-mono font-medium',
                  currentExample.strictResult ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                )}>
                  === {currentExample.strictResult ? '✓' : '✗'}
                </div>
                <div className={cn(
                  'px-3 py-1 rounded-full text-xs font-mono font-medium',
                  currentExample.objectIsResult ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                )}>
                  Object.is {currentExample.objectIsResult ? '✓' : '✗'}
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="px-4 py-2 rounded-lg bg-secondary border border-border"
              >
                <code className="text-lg font-mono font-semibold text-primary">
                  {getOperatorForMode()}
                </code>
              </motion.div>
            )}
          </div>

          {/* Right operand */}
          <motion.div
            key={`right-${currentIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'px-6 py-4 rounded-xl border-2 text-center min-w-[120px]',
              getTypeColor(currentExample.rightType).bg,
              getTypeColor(currentExample.rightType).border
            )}
          >
            <code className="text-lg font-mono font-semibold">{currentExample.right}</code>
            <div className={cn('text-xs mt-1', getTypeColor(currentExample.rightType).text)}>
              {currentExample.rightType}
            </div>
          </motion.div>

          {/* Result (for non-comparison mode) */}
          {mode !== 'comparison' && (
            <AnimatePresence mode="wait">
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <div className={cn(
                    'px-4 py-2 rounded-lg font-mono font-semibold',
                    getResultForMode(currentExample)
                      ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                      : 'bg-red-500/20 text-red-500 border border-red-500/30'
                  )}>
                    {getResultForMode(currentExample) ? 'true' : 'false'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Coercion Steps (for loose equality) */}
        {mode === 'loose' && showCoercion && currentExample.coercionSteps && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-500">Type Coercion Steps</span>
            </div>
            <div className="space-y-1">
              {currentExample.coercionSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className="flex items-center gap-2 text-sm font-mono text-muted-foreground"
                >
                  <span className="text-orange-500">{i + 1}.</span>
                  <code>{step}</code>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Explanation */}
        {showExplanations && showResult && (
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
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Examples</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {examples.map((example, index) => (
            <button
              key={example.id}
              onClick={() => handleExampleClick(index)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all text-sm',
                index === currentIndex
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              )}
            >
              <code className="font-mono text-xs block truncate">
                {example.left} {mode === 'comparison' ? '?' : getOperatorForMode()} {example.right}
              </code>
              {mode === 'comparison' ? (
                <div className="flex items-center gap-1 mt-1">
                  <span className={cn('text-[10px]', example.looseResult ? 'text-green-500' : 'text-red-500')}>==</span>
                  <span className={cn('text-[10px]', example.strictResult ? 'text-green-500' : 'text-red-500')}>===</span>
                  <span className={cn('text-[10px]', example.objectIsResult ? 'text-green-500' : 'text-red-500')}>is</span>
                </div>
              ) : (
                <div className={cn(
                  'text-[10px] mt-1 px-1.5 py-0.5 rounded-full inline-block',
                  getResultForMode(example)
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                )}>
                  {getResultForMode(example) ? 'true' : 'false'}
                </div>
              )}
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
                setShowResult(false);
                setShowCoercion(false);
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
        label="Equality Comparison Visualizer Controls"
      />
    </Card>
  );
}

export default EqualityComparisonVisualizer;
