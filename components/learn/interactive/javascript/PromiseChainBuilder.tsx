'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Link2, Plus, Trash2, Play, GripVertical, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for promise chain building
export interface PromiseStep {
  id: string;
  type: 'then' | 'catch' | 'finally';
  callback: string;
  delay?: number;
  shouldReject?: boolean;
}

export interface ExecutionStep {
  stepId: string;
  status: 'pending' | 'executing' | 'resolved' | 'rejected' | 'skipped';
  output?: string;
  error?: string;
}

export interface PromiseChainBuilderProps {
  /** Initial chain configuration */
  initialChain?: PromiseStep[];
  /** Callback when chain changes */
  onChainChange?: (chain: PromiseStep[]) => void;
  /** Whether to show execution order */
  showExecutionOrder?: boolean;
}

// Default chain for demonstration
const defaultChain: PromiseStep[] = [
  { id: '1', type: 'then', callback: 'value => value * 2', delay: 500 },
  { id: '2', type: 'then', callback: 'value => value + 10', delay: 300 },
  { id: '3', type: 'catch', callback: 'error => "Recovered!"', delay: 200 },
  { id: '4', type: 'finally', callback: '() => console.log("Done!")', delay: 100 },
];

// Step type colors and icons
const stepTypeConfig = {
  then: { 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/50', 
    text: 'text-green-400',
    icon: CheckCircle2,
    description: 'Handles resolved value'
  },
  catch: { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/50', 
    text: 'text-red-400',
    icon: XCircle,
    description: 'Handles rejection'
  },
  finally: { 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/50', 
    text: 'text-blue-400',
    icon: Clock,
    description: 'Always runs'
  },
};

/**
 * Simulate promise chain execution
 */
export function simulatePromiseChain(
  chain: PromiseStep[],
  initialValue: number = 5,
  initialReject: boolean = false
): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  let currentValue: number | string = initialValue;
  let isRejected = initialReject;
  let rejectionReason = initialReject ? 'Initial rejection' : '';

  for (const step of chain) {
    if (step.type === 'then') {
      if (isRejected) {
        // Skip .then() when in rejected state
        steps.push({
          stepId: step.id,
          status: 'skipped',
          output: 'Skipped (promise rejected)',
        });
      } else {
        // Check if this step should reject
        if (step.shouldReject) {
          isRejected = true;
          rejectionReason = 'Error in .then()';
          steps.push({
            stepId: step.id,
            status: 'rejected',
            error: rejectionReason,
          });
        } else {
          // Execute .then() callback
          try {
            // Simulate callback execution
            if (typeof currentValue === 'number') {
              if (step.callback.includes('* 2')) {
                currentValue = currentValue * 2;
              } else if (step.callback.includes('+ 10')) {
                currentValue = currentValue + 10;
              } else if (step.callback.includes('+ 5')) {
                currentValue = currentValue + 5;
              }
            }
            steps.push({
              stepId: step.id,
              status: 'resolved',
              output: String(currentValue),
            });
          } catch {
            isRejected = true;
            rejectionReason = 'Callback error';
            steps.push({
              stepId: step.id,
              status: 'rejected',
              error: rejectionReason,
            });
          }
        }
      }
    } else if (step.type === 'catch') {
      if (isRejected) {
        // Execute .catch() callback
        currentValue = 'Recovered!';
        isRejected = false;
        steps.push({
          stepId: step.id,
          status: 'resolved',
          output: String(currentValue),
        });
      } else {
        // Skip .catch() when not rejected
        steps.push({
          stepId: step.id,
          status: 'skipped',
          output: 'Skipped (no rejection)',
        });
      }
    } else if (step.type === 'finally') {
      // .finally() always runs
      steps.push({
        stepId: step.id,
        status: 'resolved',
        output: 'Cleanup executed',
      });
    }
  }

  return steps;
}

let idCounter = 100;
function generateId(): string {
  return String(++idCounter);
}

/**
 * PromiseChainBuilder Component
 * Visual promise chain construction with drag-and-drop
 * Requirements: 6.6
 */
export function PromiseChainBuilder({
  initialChain = defaultChain,
  onChainChange,
  showExecutionOrder = true,
}: PromiseChainBuilderProps) {
  const [chain, setChain] = useState<PromiseStep[]>(initialChain);
  const [initialValue, setInitialValue] = useState(5);
  const [startWithRejection, setStartWithRejection] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentExecutionIndex, setCurrentExecutionIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const baseDuration = 1000;
  const duration = baseDuration * speedMultipliers[speed];

  // Notify parent of chain changes
  useEffect(() => {
    onChainChange?.(chain);
  }, [chain, onChainChange]);

  // Auto-advance execution animation
  useEffect(() => {
    if (!isPlaying) return;

    if (currentExecutionIndex >= executionSteps.length - 1) {
      queueMicrotask(() => setIsPlaying(false));
      return;
    }

    intervalRef.current = setTimeout(() => {
      setCurrentExecutionIndex((prev) => Math.min(prev + 1, executionSteps.length - 1));
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentExecutionIndex, executionSteps.length, duration]);

  const handlePlayPause = useCallback(() => {
    if (currentExecutionIndex >= executionSteps.length - 1 || executionSteps.length === 0) {
      // Start fresh execution
      const steps = simulatePromiseChain(chain, initialValue, startWithRejection);
      setExecutionSteps(steps);
      setCurrentExecutionIndex(0);
      setTimeout(() => setIsPlaying(true), 100);
    } else if (currentExecutionIndex === -1) {
      const steps = simulatePromiseChain(chain, initialValue, startWithRejection);
      setExecutionSteps(steps);
      setCurrentExecutionIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentExecutionIndex, executionSteps.length, chain, initialValue, startWithRejection]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentExecutionIndex(-1);
    setExecutionSteps([]);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleReorder = useCallback((newOrder: PromiseStep[]) => {
    setChain(newOrder);
    handleReset();
  }, [handleReset]);

  const handleAddStep = useCallback((type: PromiseStep['type']) => {
    const newStep: PromiseStep = {
      id: generateId(),
      type,
      callback: type === 'then' 
        ? 'value => value + 5' 
        : type === 'catch' 
        ? 'error => "Recovered!"' 
        : '() => console.log("Done!")',
      delay: 300,
    };
    setChain((prev) => [...prev, newStep]);
    handleReset();
  }, [handleReset]);

  const handleRemoveStep = useCallback((id: string) => {
    setChain((prev) => prev.filter((step) => step.id !== id));
    handleReset();
  }, [handleReset]);

  const handleUpdateStep = useCallback((id: string, updates: Partial<PromiseStep>) => {
    setChain((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
    handleReset();
  }, [handleReset]);

  const getExecutionStatus = (stepId: string): ExecutionStep | undefined => {
    if (currentExecutionIndex < 0) return undefined;
    const stepIndex = executionSteps.findIndex((s) => s.stepId === stepId);
    if (stepIndex <= currentExecutionIndex) {
      return executionSteps[stepIndex];
    }
    return undefined;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Promise Chain Builder</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Build and visualize promise chains with .then(), .catch(), and .finally()
        </p>
      </div>

      {/* Initial Value Configuration */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Initial value:</span>
          <Input
            type="number"
            value={initialValue}
            onChange={(e) => {
              setInitialValue(Number(e.target.value));
              handleReset();
            }}
            className="w-20 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={startWithRejection}
              onChange={(e) => {
                setStartWithRejection(e.target.checked);
                handleReset();
              }}
              className="rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Start with rejection</span>
          </label>
        </div>
      </div>

      {/* Chain Builder */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Promise Chain
          </span>
          <span className="text-xs text-muted-foreground">
            (drag to reorder)
          </span>
        </div>

        {/* Initial Promise */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            'px-4 py-2 rounded-lg border-2 font-mono text-sm',
            startWithRejection 
              ? 'bg-red-500/10 border-red-500/50 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
          )}>
            {startWithRejection 
              ? `Promise.reject("Error")`
              : `Promise.resolve(${initialValue})`
            }
          </div>
        </div>

        {/* Chain Steps */}
        <Reorder.Group
          axis="y"
          values={chain}
          onReorder={handleReorder}
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {chain.map((step) => (
              <ChainStepItem
                key={step.id}
                step={step}
                executionStatus={getExecutionStatus(step.id)}
                onRemove={() => handleRemoveStep(step.id)}
                onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                showExecutionOrder={showExecutionOrder}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Add Step Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddStep('then')}
            className="text-green-400 border-green-500/50 hover:bg-green-500/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            .then()
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddStep('catch')}
            className="text-red-400 border-red-500/50 hover:bg-red-500/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            .catch()
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddStep('finally')}
            className="text-blue-400 border-blue-500/50 hover:bg-blue-500/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            .finally()
          </Button>
        </div>
      </div>

      {/* Execution Output */}
      {executionSteps.length > 0 && (
        <div className="px-6 py-4 border-t border-border bg-secondary/5">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-3">
            Execution Flow
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {executionSteps.slice(0, currentExecutionIndex + 1).map((step, index) => {
              const chainStep = chain.find((s) => s.id === step.stepId);
              const config = chainStep ? stepTypeConfig[chainStep.type] : stepTypeConfig.then;
              
              return (
                <motion.div
                  key={step.stepId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  {index > 0 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                  <div className={cn(
                    'px-3 py-1.5 rounded text-xs font-mono',
                    step.status === 'skipped' && 'opacity-50',
                    step.status === 'rejected' ? 'bg-red-500/20 text-red-400' : config.bg,
                    step.status === 'rejected' ? 'border-red-500/50' : config.border,
                    'border'
                  )}>
                    {step.status === 'skipped' ? 'skipped' : step.output || step.error}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <AnimatedControls
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        onReset={handleReset}
        label="Run Chain"
      />
    </Card>
  );
}

/**
 * Chain step item component
 */
interface ChainStepItemProps {
  step: PromiseStep;
  executionStatus?: ExecutionStep;
  onRemove: () => void;
  onUpdate: (updates: Partial<PromiseStep>) => void;
  showExecutionOrder: boolean;
}

function ChainStepItem({
  step,
  executionStatus,
  onRemove,
  onUpdate,
  showExecutionOrder,
}: ChainStepItemProps) {
  const config = stepTypeConfig[step.type];
  const Icon = config.icon;

  return (
    <Reorder.Item
      value={step}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all',
        config.bg,
        config.border,
        executionStatus?.status === 'resolved' && 'ring-2 ring-green-500 ring-offset-2 ring-offset-background',
        executionStatus?.status === 'rejected' && 'ring-2 ring-red-500 ring-offset-2 ring-offset-background',
        executionStatus?.status === 'skipped' && 'opacity-50'
      )}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Step Type Icon */}
      <Icon className={cn('w-5 h-5 shrink-0', config.text)} />

      {/* Step Type Selector */}
      <Select
        value={step.type}
        onValueChange={(value) => onUpdate({ type: value as PromiseStep['type'] })}
      >
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="then">.then()</SelectItem>
          <SelectItem value="catch">.catch()</SelectItem>
          <SelectItem value="finally">.finally()</SelectItem>
        </SelectContent>
      </Select>

      {/* Callback Input */}
      <Input
        value={step.callback}
        onChange={(e) => onUpdate({ callback: e.target.value })}
        className="flex-1 h-8 text-xs font-mono"
        placeholder="Callback function"
      />

      {/* Execution Status */}
      {showExecutionOrder && executionStatus && (
        <div className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          executionStatus.status === 'resolved' && 'bg-green-500/20 text-green-400',
          executionStatus.status === 'rejected' && 'bg-red-500/20 text-red-400',
          executionStatus.status === 'skipped' && 'bg-gray-500/20 text-gray-400'
        )}>
          {executionStatus.status === 'resolved' && executionStatus.output}
          {executionStatus.status === 'rejected' && executionStatus.error}
          {executionStatus.status === 'skipped' && 'skipped'}
        </div>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </Reorder.Item>
  );
}

// Export for testing
export { defaultChain };
export default PromiseChainBuilder;
