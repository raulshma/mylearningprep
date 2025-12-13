'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  Zap, 
  Play, 
  RotateCcw,
  Clock,
  Package,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EsbuildSpeedDemoProps {
  /** Number of modules to simulate */
  moduleCount?: number;
}

interface BuildResult {
  bundler: string;
  time: number;
  color: string;
  icon: string;
}

// Bundler configurations - defined outside component to prevent recreation on every render
const BUNDLERS = [
  { name: 'esbuild', baseTime: 0.8, color: 'yellow', description: 'Written in Go' },
  { name: 'Vite (prod)', baseTime: 8, color: 'purple', description: 'Uses esbuild + Rollup' },
  { name: 'Webpack', baseTime: 25, color: 'blue', description: 'JavaScript-based' },
] as const;

/**
 * EsbuildSpeedDemo Component
 * Visual comparison of esbuild's speed vs traditional bundlers
 */
export function EsbuildSpeedDemo({ moduleCount = 1000 }: EsbuildSpeedDemoProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BuildResult[]>([]);
  const [currentBundler, setCurrentBundler] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const shouldReduceMotion = useReducedMotion();
  const animationRef = useRef<number | null>(null);

  const runBenchmark = useCallback(() => {
    setIsRunning(true);
    setResults([]);
    setProgress({});
    
    let bundlerIndex = 0;
    
    const runNextBundler = () => {
      if (bundlerIndex >= BUNDLERS.length) {
        setIsRunning(false);
        setCurrentBundler(null);
        return;
      }

      const bundler = BUNDLERS[bundlerIndex];
      setCurrentBundler(bundler.name);
      
      // Simulate build with progress
      const totalTime = bundler.baseTime * 1000; // Convert to ms for animation
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min((elapsed / totalTime) * 100, 100);
        
        setProgress(prev => ({
          ...prev,
          [bundler.name]: currentProgress,
        }));

        if (currentProgress < 100) {
          animationRef.current = requestAnimationFrame(updateProgress);
        } else {
          // Build complete
          setResults(prev => [...prev, {
            bundler: bundler.name,
            time: bundler.baseTime,
            color: bundler.color,
            icon: bundler.name === 'esbuild' ? '⚡' : bundler.name === 'Vite (prod)' ? '🚀' : '📦',
          }]);
          
          bundlerIndex++;
          setTimeout(runNextBundler, 300);
        }
      };

      animationRef.current = requestAnimationFrame(updateProgress);
    };

    runNextBundler();
  }, []);

  const resetDemo = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsRunning(false);
    setResults([]);
    setProgress({});
    setCurrentBundler(null);
  }, []);

  const maxTime = Math.max(...BUNDLERS.map(b => b.baseTime));

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden" role="region" aria-label="esbuild Speed Demo">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" aria-hidden="true" />
            <h3 className="font-semibold">esbuild Speed Comparison</h3>
          </div>
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button onClick={runBenchmark} size="sm">
                <Play className="w-4 h-4 mr-2" />
                Run Benchmark
              </Button>
            ) : (
              <Button onClick={resetDemo} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Bundling {moduleCount.toLocaleString()} modules - watch the speed difference!
        </p>
      </div>

      <div className="p-6">
        {/* Project Info */}
        <div className="mb-6 p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-secondary">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Simulated Project</p>
              <p className="text-xs text-muted-foreground">
                {moduleCount.toLocaleString()} modules • TypeScript • React • CSS Modules
              </p>
            </div>
          </div>
        </div>

        {/* Bundler Comparison */}
        <div className="space-y-4">
          {BUNDLERS.map((bundler) => {
            const result = results.find(r => r.bundler === bundler.name);
            const currentProgress = progress[bundler.name] || 0;
            const isActive = currentBundler === bundler.name;
            const isComplete = !!result;

            return (
              <div key={bundler.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-medium',
                      isActive && 'text-primary',
                      isComplete && 'text-green-500'
                    )}>
                      {bundler.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({bundler.description})
                    </span>
                  </div>
                  {result && (
                    <motion.span
                      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'text-sm font-mono font-bold',
                        bundler.name === 'esbuild' ? 'text-yellow-500' : 'text-muted-foreground'
                      )}
                    >
                      {result.time < 1 ? `${(result.time * 1000).toFixed(0)}ms` : `${result.time.toFixed(1)}s`}
                    </motion.span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="relative h-8 bg-secondary rounded-lg overflow-hidden">
                  {/* Time scale markers */}
                  <div className="absolute inset-0 flex">
                    {[0, 5, 10, 15, 20, 25].map((sec) => (
                      <div
                        key={sec}
                        className="absolute h-full border-l border-border/30"
                        style={{ left: `${(sec / maxTime) * 100}%` }}
                      >
                        <span className="absolute bottom-0 left-1 text-[10px] text-muted-foreground">
                          {sec}s
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Progress fill */}
                  <motion.div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-lg',
                      bundler.color === 'yellow' && 'bg-yellow-500/50',
                      bundler.color === 'purple' && 'bg-purple-500/50',
                      bundler.color === 'blue' && 'bg-blue-500/50'
                    )}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: isComplete 
                        ? `${(bundler.baseTime / maxTime) * 100}%`
                        : `${(currentProgress / 100) * (bundler.baseTime / maxTime) * 100}%`
                    }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.1 }}
                  />

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-y-0 right-0 w-1 bg-primary"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      style={{ 
                        left: `${(currentProgress / 100) * (bundler.baseTime / maxTime) * 100}%`,
                        right: 'auto'
                      }}
                    />
                  )}

                  {/* Label */}
                  <div className="absolute inset-0 flex items-center px-3">
                    {isActive && (
                      <div className="flex items-center gap-2 text-xs">
                        <Cpu className="w-3 h-3 animate-pulse" />
                        <span>Building...</span>
                      </div>
                    )}
                    {isComplete && (
                      <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-xs font-medium"
                      >
                        <span>{result.icon}</span>
                        <span>Complete</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Summary */}
        <AnimatePresence>
          {results.length === BUNDLERS.length && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
            >
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">
                    esbuild is {Math.round(BUNDLERS[2].baseTime / BUNDLERS[0].baseTime)}x faster than Webpack!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Written in Go with full parallelization, esbuild processes files 10-100x faster than JavaScript-based bundlers. This makes it ideal for CI/CD pipelines and large codebases.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Why esbuild is fast */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { title: 'Go Language', desc: 'Compiled, not interpreted', icon: '🔧' },
            { title: 'Parallelism', desc: 'Uses all CPU cores', icon: '⚡' },
            { title: 'Single Pass', desc: 'Parse + transform + output', icon: '🎯' },
          ].map((item) => (
            <div key={item.title} className="p-3 rounded-lg bg-secondary/30 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-xs font-medium">{item.title}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default EsbuildSpeedDemo;
