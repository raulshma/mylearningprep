'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronRight, Zap, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IteratorStep {
  value: string | number;
  done: boolean;
  description: string;
}

interface IteratorVisualizerProps {
  title?: string;
  mode?: 'iterator' | 'generator' | 'yield' | 'iterable';
  steps?: IteratorStep[];
  code?: string;
}

const defaultIteratorSteps: IteratorStep[] = [
  { value: 'apple', done: false, description: 'First call to next() returns "apple"' },
  { value: 'banana', done: false, description: 'Second call returns "banana"' },
  { value: 'cherry', done: false, description: 'Third call returns "cherry"' },
  { value: 'undefined', done: true, description: 'No more items, done is true' },
];

const defaultGeneratorSteps: IteratorStep[] = [
  { value: 1, done: false, description: 'Generator pauses at first yield' },
  { value: 2, done: false, description: 'Resumes and pauses at second yield' },
  { value: 3, done: false, description: 'Resumes and pauses at third yield' },
  { value: 'undefined', done: true, description: 'Generator function completes' },
];

export function IteratorGeneratorVisualizer({
  title = 'Iterator Protocol Visualizer',
  mode = 'iterator',
  steps,
  code,
}: IteratorVisualizerProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeSteps = steps || (mode === 'generator' ? defaultGeneratorSteps : defaultIteratorSteps);

  const handleNext = useCallback(() => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, activeSteps.length]);

  const handleReset = useCallback(() => {
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  const handlePlay = useCallback(() => {
    if (currentStep >= activeSteps.length - 1) {
      setCurrentStep(-1);
    }
    setIsPlaying(true);
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= activeSteps.length - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [currentStep, activeSteps.length]);

  const currentResult = currentStep >= 0 ? activeSteps[currentStep] : null;

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="bg-secondary/50 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          {mode === 'generator' ? <Zap className="w-4 h-4 text-yellow-500" /> : <Package className="w-4 h-4 text-blue-500" />}
          {title}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Visual representation */}
        <div className="flex items-center justify-center gap-2 py-4">
          {/* Iterator/Generator object */}
          <motion.div
            className={cn(
              "relative px-4 py-3 rounded-lg border-2 min-w-[120px] text-center",
              mode === 'generator' 
                ? "bg-yellow-500/10 border-yellow-500/50" 
                : "bg-blue-500/10 border-blue-500/50"
            )}
          >
            <div className="text-xs text-muted-foreground mb-1">
              {mode === 'generator' ? 'Generator' : 'Iterator'}
            </div>
            <div className="font-mono text-sm">
              {mode === 'generator' ? 'function*' : '[Symbol.iterator]'}
            </div>
          </motion.div>

          {/* Arrow */}
          <motion.div
            animate={{ x: currentStep >= 0 ? [0, 5, 0] : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </motion.div>

          {/* next() call */}
          <motion.div
            className={cn(
              "px-4 py-3 rounded-lg border-2 transition-colors",
              currentStep >= 0 
                ? "bg-green-500/10 border-green-500/50" 
                : "bg-secondary border-border"
            )}
          >
            <div className="text-xs text-muted-foreground mb-1">Method</div>
            <div className="font-mono text-sm">.next()</div>
          </motion.div>

          {/* Arrow */}
          <motion.div
            animate={{ x: currentStep >= 0 ? [0, 5, 0] : 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </motion.div>

          {/* Result object */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                "px-4 py-3 rounded-lg border-2 min-w-[160px]",
                currentResult?.done 
                  ? "bg-red-500/10 border-red-500/50" 
                  : currentResult 
                    ? "bg-emerald-500/10 border-emerald-500/50"
                    : "bg-secondary border-border"
              )}
            >
              <div className="text-xs text-muted-foreground mb-1">Result</div>
              {currentResult ? (
                <div className="font-mono text-sm space-y-1">
                  <div>
                    value: <span className="text-primary">{JSON.stringify(currentResult.value)}</span>
                  </div>
                  <div>
                    done: <span className={currentResult.done ? "text-red-500" : "text-green-500"}>
                      {String(currentResult.done)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-sm text-muted-foreground">
                  {'{ value, done }'}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-2">
          {activeSteps.map((step, index) => (
            <motion.div
              key={index}
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                index <= currentStep 
                  ? step.done ? "bg-red-500" : "bg-green-500"
                  : "bg-secondary"
              )}
              animate={index === currentStep ? { scale: [1, 1.2, 1] } : {}}
            />
          ))}
        </div>

        {/* Description */}
        <AnimatePresence mode="wait">
          {currentResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3"
            >
              {currentResult.description}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={currentStep < 0}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Auto Play
              </>
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleNext}
            disabled={currentStep >= activeSteps.length - 1 || isPlaying}
          >
            <ChevronRight className="w-4 h-4 mr-1" />
            next()
          </Button>
        </div>

        {/* Code example */}
        {code && (
          <div className="mt-4 bg-secondary/30 rounded-lg p-3">
            <pre className="text-sm font-mono overflow-x-auto">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Yield visualizer component
export function YieldVisualizer() {
  const [step, setStep] = useState(0);
  const [inputValue, setInputValue] = useState<number | null>(null);

  const steps = [
    { label: 'Start', state: 'idle', yielded: null, received: null },
    { label: 'yield 1', state: 'paused', yielded: 1, received: null },
    { label: 'next(10)', state: 'resumed', yielded: null, received: 10 },
    { label: 'yield 2', state: 'paused', yielded: 2, received: null },
    { label: 'next(20)', state: 'resumed', yielded: null, received: 20 },
    { label: 'return', state: 'done', yielded: 'done', received: null },
  ];

  const currentStepData = steps[step];

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="bg-secondary/50 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          yield Keyword - Two-Way Communication
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Generator function visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Generator side */}
          <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2 font-medium">Generator Function</div>
            <div className="font-mono text-sm space-y-1">
              <div className={cn(step === 0 && "bg-yellow-500/20 -mx-2 px-2 rounded")}>
                function* gen() {'{'}
              </div>
              <div className={cn("pl-4", step === 1 && "bg-yellow-500/20 -mx-2 px-2 rounded")}>
                let a = <span className="text-primary">yield</span> 1;
              </div>
              <div className={cn("pl-4", step === 3 && "bg-yellow-500/20 -mx-2 px-2 rounded")}>
                let b = <span className="text-primary">yield</span> 2;
              </div>
              <div className={cn("pl-4", step === 5 && "bg-yellow-500/20 -mx-2 px-2 rounded")}>
                return a + b;
              </div>
              <div>{'}'}</div>
            </div>
          </div>

          {/* Data flow */}
          <div className="flex flex-col items-center justify-center gap-2">
            <AnimatePresence mode="wait">
              {currentStepData.yielded !== null && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-green-500"
                >
                  <span className="text-sm">yields</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-mono bg-green-500/20 px-2 py-1 rounded">
                    {currentStepData.yielded}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence mode="wait">
              {currentStepData.received !== null && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 text-blue-500"
                >
                  <span className="font-mono bg-blue-500/20 px-2 py-1 rounded">
                    {currentStepData.received}
                  </span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span className="text-sm">receives</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Caller side */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">Caller Code</div>
            <div className="font-mono text-sm space-y-1">
              <div className={cn(step === 0 && "bg-blue-500/20 -mx-2 px-2 rounded")}>
                const g = gen();
              </div>
              <div className={cn(step === 1 && "bg-blue-500/20 -mx-2 px-2 rounded")}>
                g.next(); <span className="text-muted-foreground">{'// {value: 1}'}</span>
              </div>
              <div className={cn(step === 2 && "bg-blue-500/20 -mx-2 px-2 rounded")}>
                g.next(10); <span className="text-muted-foreground">{'// a = 10'}</span>
              </div>
              <div className={cn(step === 4 && "bg-blue-500/20 -mx-2 px-2 rounded")}>
                g.next(20); <span className="text-muted-foreground">{'// b = 20'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* State indicator */}
        <div className="flex justify-center">
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-medium",
            currentStepData.state === 'idle' && "bg-secondary text-muted-foreground",
            currentStepData.state === 'paused' && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
            currentStepData.state === 'resumed' && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
            currentStepData.state === 'done' && "bg-green-500/20 text-green-600 dark:text-green-400",
          )}>
            State: {currentStepData.state.toUpperCase()}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(0)}
            disabled={step === 0}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setStep(prev => Math.min(prev + 1, steps.length - 1))}
            disabled={step >= steps.length - 1}
          >
            <ChevronRight className="w-4 h-4 mr-1" />
            Next Step
          </Button>
        </div>
      </div>
    </div>
  );
}

// Custom iterable builder
export function IterableBuilder() {
  const [showIterator, setShowIterator] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const items = ['🍎', '🍌', '🍒'];

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="bg-secondary/50 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-500" />
          Building a Custom Iterable
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Object with Symbol.iterator */}
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-2 font-medium">
              Iterable Object
            </div>
            <div className="font-mono text-xs space-y-1">
              <div>const fruits = {'{'}</div>
              <div className="pl-4">items: [{items.map(i => `'${i}'`).join(', ')}],</div>
              <div className="pl-4 text-primary">[Symbol.iterator]() {'{'}</div>
              <div className="pl-8">let index = 0;</div>
              <div className="pl-8">return {'{'}</div>
              <div className="pl-12">next: () =&gt; {'{'}</div>
              <div className="pl-16">if (index &lt; this.items.length) {'{'}</div>
              <div className="pl-20">return {'{'} value: this.items[index++], done: false {'}'}</div>
              <div className="pl-16">{'}'}</div>
              <div className="pl-16">return {'{'} done: true {'}'}</div>
              <div className="pl-12">{'}'}</div>
              <div className="pl-8">{'}'}</div>
              <div className="pl-4">{'}'}</div>
              <div>{'}'}</div>
            </div>
          </div>

          {/* Visual representation */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex gap-2">
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center text-2xl border-2 transition-colors",
                    index < currentIndex 
                      ? "bg-green-500/20 border-green-500/50 opacity-50"
                      : index === currentIndex && showIterator
                        ? "bg-primary/20 border-primary"
                        : "bg-secondary border-border"
                  )}
                  animate={index === currentIndex && showIterator ? { scale: [1, 1.1, 1] } : {}}
                >
                  {item}
                </motion.div>
              ))}
            </div>

            {showIterator && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-muted-foreground"
              >
                {currentIndex < items.length 
                  ? `Current: ${items[currentIndex]} (index: ${currentIndex})`
                  : 'Iteration complete!'}
              </motion.div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowIterator(true);
                  setCurrentIndex(0);
                }}
              >
                for...of
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setCurrentIndex(prev => Math.min(prev + 1, items.length))}
                disabled={!showIterator || currentIndex >= items.length}
              >
                next()
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowIterator(false);
                  setCurrentIndex(0);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { IteratorVisualizerProps, IteratorStep };
