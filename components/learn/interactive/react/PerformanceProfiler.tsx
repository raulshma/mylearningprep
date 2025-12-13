'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Clock,
  RotateCcw,
  Zap,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PerformanceProfilerProps {
  /** Components to profile */
  components?: string[];
  /** Whether to show flame graph visualization */
  showFlameGraph?: boolean;
  /** Whether to show optimization tips */
  showOptimizationTips?: boolean;
}

interface RenderMetric {
  id: string;
  name: string;
  renderTime: number;
  commitTime: number;
  totalTime: number;
  renderCount: number;
  isExpensive: boolean;
  children: RenderMetric[];
}

interface ProfileSession {
  id: number;
  timestamp: number;
  metrics: RenderMetric[];
  totalTime: number;
}

// Calculate total times recursively - pure function, no dependencies
function calculateTotalTimes(metrics: RenderMetric[]): RenderMetric[] {
  return metrics.map(metric => {
    const childrenWithTotals = calculateTotalTimes(metric.children);
    const childrenTotal = childrenWithTotals.reduce((sum, c) => sum + c.totalTime, 0);
    return {
      ...metric,
      children: childrenWithTotals,
      totalTime: metric.renderTime + metric.commitTime + childrenTotal,
    };
  });
}

/**
 * PerformanceProfiler Component
 * Display component render times, show flame graph visualization, highlight optimization opportunities
 * Requirements: 17.7
 */
export function PerformanceProfiler({
  showFlameGraph = true,
  showOptimizationTips = true,
}: PerformanceProfilerProps) {
  const [isProfiling, setIsProfiling] = useState(false);
  const [sessions, setSessions] = useState<ProfileSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ProfileSession | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<RenderMetric | null>(null);

  // Generate simulated render metrics
  const generateMetrics = useCallback((): RenderMetric[] => {
    const randomTime = (min: number, max: number) => 
      Math.round((Math.random() * (max - min) + min) * 100) / 100;

    return [
      {
        id: 'app',
        name: 'App',
        renderTime: randomTime(0.5, 2),
        commitTime: randomTime(0.1, 0.5),
        totalTime: 0,
        renderCount: 1,
        isExpensive: false,
        children: [
          {
            id: 'header',
            name: 'Header',
            renderTime: randomTime(0.2, 0.8),
            commitTime: randomTime(0.05, 0.2),
            totalTime: 0,
            renderCount: 1,
            isExpensive: false,
            children: [],
          },
          {
            id: 'main',
            name: 'Main',
            renderTime: randomTime(1, 3),
            commitTime: randomTime(0.2, 0.8),
            totalTime: 0,
            renderCount: 1,
            isExpensive: false,
            children: [
              {
                id: 'productList',
                name: 'ProductList',
                renderTime: randomTime(5, 15),
                commitTime: randomTime(1, 3),
                totalTime: 0,
                renderCount: 1,
                isExpensive: true,
                children: [
                  {
                    id: 'productItem1',
                    name: 'ProductItem',
                    renderTime: randomTime(0.5, 2),
                    commitTime: randomTime(0.1, 0.3),
                    totalTime: 0,
                    renderCount: 1,
                    isExpensive: false,
                    children: [],
                  },
                  {
                    id: 'productItem2',
                    name: 'ProductItem',
                    renderTime: randomTime(0.5, 2),
                    commitTime: randomTime(0.1, 0.3),
                    totalTime: 0,
                    renderCount: 1,
                    isExpensive: false,
                    children: [],
                  },
                  {
                    id: 'productItem3',
                    name: 'ProductItem',
                    renderTime: randomTime(0.5, 2),
                    commitTime: randomTime(0.1, 0.3),
                    totalTime: 0,
                    renderCount: 1,
                    isExpensive: false,
                    children: [],
                  },
                ],
              },
              {
                id: 'sidebar',
                name: 'Sidebar',
                renderTime: randomTime(2, 8),
                commitTime: randomTime(0.5, 1.5),
                totalTime: 0,
                renderCount: 1,
                isExpensive: Math.random() > 0.5,
                children: [
                  {
                    id: 'filterPanel',
                    name: 'FilterPanel',
                    renderTime: randomTime(1, 4),
                    commitTime: randomTime(0.2, 0.6),
                    totalTime: 0,
                    renderCount: 1,
                    isExpensive: false,
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            id: 'footer',
            name: 'Footer',
            renderTime: randomTime(0.1, 0.5),
            commitTime: randomTime(0.05, 0.15),
            totalTime: 0,
            renderCount: 1,
            isExpensive: false,
            children: [],
          },
        ],
      },
    ];
  }, []);

  // Start profiling
  const handleStartProfiling = useCallback(() => {
    setIsProfiling(true);
    
    // Simulate profiling for 2 seconds
    setTimeout(() => {
      const metrics = calculateTotalTimes(generateMetrics());
      const totalTime = metrics.reduce((sum, m) => sum + m.totalTime, 0);
      
      const session: ProfileSession = {
        id: Date.now(),
        timestamp: Date.now(),
        metrics,
        totalTime,
      };
      
      setSessions(prev => [...prev.slice(-4), session]);
      setSelectedSession(session);
      setIsProfiling(false);
    }, 1500);
  }, [generateMetrics]);

  // Reset
  const handleReset = useCallback(() => {
    setSessions([]);
    setSelectedSession(null);
    setHoveredMetric(null);
  }, []);

  // Find expensive components
  const expensiveComponents = useMemo(() => {
    if (!selectedSession) return [];
    
    const findExpensive = (metrics: RenderMetric[]): RenderMetric[] => {
      const result: RenderMetric[] = [];
      metrics.forEach(m => {
        if (m.isExpensive || m.renderTime > 5) {
          result.push(m);
        }
        result.push(...findExpensive(m.children));
      });
      return result;
    };
    
    return findExpensive(selectedSession.metrics);
  }, [selectedSession]);

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Performance Profiler
        </h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleStartProfiling}
            disabled={isProfiling}
            variant={isProfiling ? 'secondary' : 'default'}
            size="sm"
            className="gap-1"
          >
            {isProfiling ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Activity className="w-3 h-3" />
                </motion.div>
                Profiling...
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Start Profiling
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">React DevTools Profiler:</strong> This simulates the React DevTools Profiler.
          Click &quot;Start Profiling&quot; to capture a render and see which components take the longest to render.
        </p>
      </Card>

      {/* Session Selector */}
      {sessions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sessions.map((session, i) => (
            <Button
              key={session.id}
              variant={selectedSession?.id === session.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSession(session)}
              className="shrink-0"
            >
              Commit #{i + 1}
              <span className="ml-1 text-xs opacity-70">
                ({session.totalTime.toFixed(1)}ms)
              </span>
            </Button>
          ))}
        </div>
      )}

      {/* Main Content */}
      {selectedSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Flame Graph */}
          {showFlameGraph && (
            <Card className="overflow-hidden border shadow-sm">
              <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Flame Graph</span>
              </div>
              <div className="p-4 min-h-[300px]">
                <FlameGraph
                  metrics={selectedSession.metrics}
                  totalTime={selectedSession.totalTime}
                  onHover={setHoveredMetric}
                  hoveredId={hoveredMetric?.id}
                />
              </div>
            </Card>
          )}

          {/* Render Times */}
          <Card className="overflow-hidden border shadow-sm">
            <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Render Times</span>
            </div>
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
              <RenderTimesList
                metrics={selectedSession.metrics}
                onHover={setHoveredMetric}
                hoveredId={hoveredMetric?.id}
              />
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Click &quot;Start Profiling&quot; to capture a render and analyze performance.
          </p>
        </Card>
      )}

      {/* Hovered Component Details */}
      <AnimatePresence>
        {hoveredMetric && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-medium">&lt;{hoveredMetric.name}&gt;</span>
                {hoveredMetric.isExpensive && (
                  <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Expensive
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Render Time</div>
                  <div className="font-mono">{hoveredMetric.renderTime.toFixed(2)}ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Commit Time</div>
                  <div className="font-mono">{hoveredMetric.commitTime.toFixed(2)}ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Total Time</div>
                  <div className="font-mono font-bold">{hoveredMetric.totalTime.toFixed(2)}ms</div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimization Opportunities */}
      {showOptimizationTips && expensiveComponents.length > 0 && (
        <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400">
                Optimization Opportunities
              </h4>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                {expensiveComponents.map(comp => (
                  <li key={comp.id} className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">
                      {comp.name}
                    </span>
                    <span>took {comp.renderTime.toFixed(1)}ms to render</span>
                    <span className="text-xs text-muted-foreground">
                      - Consider using React.memo or useMemo
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/50" />
          <span>&lt;1ms (fast)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500/50" />
          <span>1-5ms (moderate)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500/50" />
          <span>5-10ms (slow)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/50" />
          <span>&gt;10ms (expensive)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * FlameGraph - Renders a flame graph visualization
 */
interface FlameGraphProps {
  metrics: RenderMetric[];
  totalTime: number;
  onHover: (metric: RenderMetric | null) => void;
  hoveredId?: string;
  depth?: number;
}

function FlameGraph({ metrics, totalTime, onHover, hoveredId, depth = 0 }: FlameGraphProps) {
  const getColor = (renderTime: number) => {
    if (renderTime > 10) return 'bg-red-500/70 hover:bg-red-500';
    if (renderTime > 5) return 'bg-orange-500/70 hover:bg-orange-500';
    if (renderTime > 1) return 'bg-yellow-500/70 hover:bg-yellow-500';
    return 'bg-green-500/70 hover:bg-green-500';
  };

  return (
    <div className="space-y-1">
      {metrics.map(metric => {
        const widthPercent = Math.max((metric.totalTime / totalTime) * 100, 10);
        
        return (
          <div key={metric.id}>
            <motion.div
              className={cn(
                'px-2 py-1 rounded text-xs font-mono cursor-pointer transition-all',
                getColor(metric.renderTime),
                hoveredId === metric.id && 'ring-2 ring-primary ring-offset-1'
              )}
              style={{ width: `${widthPercent}%`, marginLeft: depth * 8 }}
              onMouseEnter={() => onHover(metric)}
              onMouseLeave={() => onHover(null)}
              whileHover={{ scale: 1.02 }}
            >
              <span className="text-white truncate block">
                {metric.name} ({metric.renderTime.toFixed(1)}ms)
              </span>
            </motion.div>
            {metric.children.length > 0 && (
              <FlameGraph
                metrics={metric.children}
                totalTime={totalTime}
                onHover={onHover}
                hoveredId={hoveredId}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * RenderTimesList - Renders a list of render times
 */
interface RenderTimesListProps {
  metrics: RenderMetric[];
  onHover: (metric: RenderMetric | null) => void;
  hoveredId?: string;
  depth?: number;
}

function RenderTimesList({ metrics, onHover, hoveredId, depth = 0 }: RenderTimesListProps) {
  const getTimeColor = (time: number) => {
    if (time > 10) return 'text-red-500';
    if (time > 5) return 'text-orange-500';
    if (time > 1) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <>
      {metrics.map(metric => (
        <div key={metric.id}>
          <div
            className={cn(
              'flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors',
              hoveredId === metric.id ? 'bg-primary/10' : 'hover:bg-muted/50'
            )}
            style={{ paddingLeft: 8 + depth * 16 }}
            onMouseEnter={() => onHover(metric)}
            onMouseLeave={() => onHover(null)}
          >
            <div className="flex items-center gap-2">
              {metric.isExpensive && (
                <AlertTriangle className="w-3 h-3 text-red-500" />
              )}
              <span className="font-mono text-sm">{metric.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={cn('font-mono', getTimeColor(metric.renderTime))}>
                {metric.renderTime.toFixed(2)}ms
              </span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    metric.renderTime > 10 ? 'bg-red-500' :
                    metric.renderTime > 5 ? 'bg-orange-500' :
                    metric.renderTime > 1 ? 'bg-yellow-500' :
                    'bg-green-500'
                  )}
                  style={{ width: `${Math.min((metric.renderTime / 15) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {metric.children.length > 0 && (
            <RenderTimesList
              metrics={metric.children}
              onHover={onHover}
              hoveredId={hoveredId}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </>
  );
}

export default PerformanceProfiler;
