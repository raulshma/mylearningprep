'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Search, RotateCcw, Box, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for scope chain visualization
export interface Variable {
  name: string;
  value: string;
  type: 'var' | 'let' | 'const' | 'function' | 'parameter';
}

export interface Scope {
  id: string;
  name: string;
  type: 'global' | 'function' | 'block';
  variables: Variable[];
  children: Scope[];
  isClosure?: boolean;
}

export interface ScopeResolutionStep {
  scopeId: string;
  variableName: string;
  found: boolean;
  description: string;
}

export interface ScopeChainVisualizerProps {
  /** Code to analyze (optional - uses default example) */
  code?: string;
  /** Variable to highlight during resolution */
  highlightVariable?: string;
  /** Whether to show closures */
  showClosures?: boolean;
  /** Whether to animate variable resolution */
  animated?: boolean;
}

// Default scope structure for demonstration
const defaultScopes: Scope = {
  id: 'global',
  name: 'Global Scope',
  type: 'global',
  variables: [
    { name: 'globalVar', value: '"I am global"', type: 'var' },
    { name: 'PI', value: '3.14159', type: 'const' },
  ],
  children: [
    {
      id: 'outer',
      name: 'outer() Function Scope',
      type: 'function',
      variables: [
        { name: 'outerVar', value: '"I am outer"', type: 'let' },
        { name: 'counter', value: '0', type: 'let' },
      ],
      children: [
        {
          id: 'inner',
          name: 'inner() Function Scope',
          type: 'function',
          isClosure: true,
          variables: [
            { name: 'innerVar', value: '"I am inner"', type: 'const' },
            { name: 'result', value: 'undefined', type: 'let' },
          ],
          children: [
            {
              id: 'block',
              name: 'if Block Scope',
              type: 'block',
              variables: [
                { name: 'blockVar', value: '"I am block"', type: 'let' },
              ],
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

// Scope type colors
const scopeColors: Record<Scope['type'], { bg: string; border: string; text: string }> = {
  global: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
  function: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
  block: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' },
};

// Variable type colors
const variableColors: Record<Variable['type'], string> = {
  var: 'text-orange-400',
  let: 'text-cyan-400',
  const: 'text-pink-400',
  function: 'text-yellow-400',
  parameter: 'text-emerald-400',
};


/**
 * Find a variable in the scope chain, returning resolution steps
 * Requirements: 5.5
 */
export function resolveVariable(
  scopes: Scope,
  startScopeId: string,
  variableName: string
): ScopeResolutionStep[] {
  const steps: ScopeResolutionStep[] = [];
  
  // Build path from start scope to root
  const findPath = (scope: Scope, targetId: string, path: Scope[] = []): Scope[] | null => {
    const newPath = [...path, scope];
    if (scope.id === targetId) return newPath;
    for (const child of scope.children) {
      const result = findPath(child, targetId, newPath);
      if (result) return result;
    }
    return null;
  };

  const path = findPath(scopes, startScopeId);
  if (!path) return steps;

  // Search from innermost to outermost scope
  for (let i = path.length - 1; i >= 0; i--) {
    const scope = path[i];
    const found = scope.variables.some(v => v.name === variableName);
    
    steps.push({
      scopeId: scope.id,
      variableName,
      found,
      description: found
        ? `✓ Found "${variableName}" in ${scope.name}`
        : `✗ "${variableName}" not in ${scope.name}, checking parent...`,
    });

    if (found) break;
  }

  // If not found anywhere
  if (steps.length > 0 && !steps[steps.length - 1].found) {
    steps[steps.length - 1].description = `✗ "${variableName}" is not defined (ReferenceError)`;
  }

  return steps;
}

/**
 * Get all variable names from a scope tree
 */
function getAllVariables(scope: Scope): string[] {
  const vars = scope.variables.map(v => v.name);
  for (const child of scope.children) {
    vars.push(...getAllVariables(child));
  }
  return vars;
}

/**
 * Find the deepest scope ID
 */
function findDeepestScope(scope: Scope): string {
  if (scope.children.length === 0) return scope.id;
  return findDeepestScope(scope.children[scope.children.length - 1]);
}

/**
 * ScopeChainVisualizer Component
 * Animated visualization of JavaScript scope chain and variable resolution
 * Requirements: 5.5
 */
export function ScopeChainVisualizer({
  highlightVariable,
  showClosures = true,
  animated = true,
}: ScopeChainVisualizerProps) {
  const [scopes] = useState<Scope>(defaultScopes);
  const [selectedVariable, setSelectedVariable] = useState<string>(highlightVariable || '');
  const [startScope, setStartScope] = useState<string>(() => findDeepestScope(defaultScopes));
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [resolutionLog, setResolutionLog] = useState<ScopeResolutionStep[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const allVariables = useMemo(() => getAllVariables(scopes), [scopes]);
  const steps = useMemo(
    () => (selectedVariable ? resolveVariable(scopes, startScope, selectedVariable) : []),
    [scopes, startScope, selectedVariable]
  );
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const baseDuration = 1200;
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying || !animated) return;

    if (currentStepIndex >= steps.length - 1) {
      queueMicrotask(() => setIsPlaying(false));
      return;
    }

    intervalRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next < steps.length) {
          setResolutionLog((log) => [...log, steps[next]]);
        }
        return next;
      });
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps, duration, animated]);

  const handlePlayPause = useCallback(() => {
    if (!selectedVariable) return;
    
    if (currentStepIndex >= steps.length - 1) {
      // Reset and play from beginning
      setCurrentStepIndex(-1);
      setResolutionLog([]);
      setTimeout(() => {
        setCurrentStepIndex(0);
        setResolutionLog([steps[0]]);
        setIsPlaying(true);
      }, 100);
    } else if (currentStepIndex === -1) {
      // Start from beginning
      setCurrentStepIndex(0);
      setResolutionLog([steps[0]]);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentStepIndex, steps, selectedVariable]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setResolutionLog([]);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleVariableSelect = useCallback((varName: string) => {
    setSelectedVariable(varName);
    handleReset();
  }, [handleReset]);

  const getScopeHighlight = (scopeId: string): 'searching' | 'found' | 'not-found' | 'none' => {
    if (!currentStep) return 'none';
    if (currentStep.scopeId === scopeId) {
      return currentStep.found ? 'found' : 'searching';
    }
    // Check if this scope was already searched
    const stepIndex = resolutionLog.findIndex(s => s.scopeId === scopeId);
    if (stepIndex >= 0 && stepIndex < currentStepIndex) {
      return 'not-found';
    }
    return 'none';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Scope Chain Visualizer</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          See how JavaScript resolves variables through the scope chain
        </p>
      </div>

      {/* Variable Selector */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Select variable to resolve:
          </span>
          {allVariables.map((varName) => (
            <Button
              key={varName}
              variant={selectedVariable === varName ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs font-mono"
              onClick={() => handleVariableSelect(varName)}
            >
              {varName}
            </Button>
          ))}
        </div>
      </div>


      <div className="grid md:grid-cols-2 gap-0">
        {/* Scope Boxes Visualization */}
        <div className="p-6 border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Nested Scopes
            </span>
          </div>
          <div className="flex justify-center">
            <ScopeBox
              scope={scopes}
              depth={0}
              showClosures={showClosures}
              highlightState={getScopeHighlight}
              selectedVariable={selectedVariable}
            />
          </div>
        </div>

        {/* Resolution Log */}
        <div className="p-6 bg-secondary/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Resolution Log
            </span>
            {resolutionLog.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {resolutionLog.length} steps
              </span>
            )}
          </div>
          <div
            className="space-y-2 overflow-auto font-mono text-sm"
            style={{ maxHeight: 300 }}
          >
            <AnimatePresence mode="popLayout">
              {resolutionLog.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Select a variable and click &quot;Play&quot; to see resolution</p>
                </motion.div>
              ) : (
                resolutionLog.map((step, index) => (
                  <ResolutionLogEntry
                    key={`${step.scopeId}-${index}`}
                    step={step}
                    isActive={index === currentStepIndex}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Current Step Description */}
      <AnimatePresence>
        {currentStep && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'px-6 py-3 border-t border-border text-sm font-medium',
              currentStep.found
                ? 'bg-green-500/10 text-green-400'
                : 'bg-yellow-500/10 text-yellow-400'
            )}
          >
            {currentStep.description}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatedControls
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        onReset={handleReset}
        label="Animation Controls"
      />
    </Card>
  );
}

/**
 * Scope box component - renders nested scope visualization
 */
interface ScopeBoxProps {
  scope: Scope;
  depth: number;
  showClosures: boolean;
  highlightState: (scopeId: string) => 'searching' | 'found' | 'not-found' | 'none';
  selectedVariable: string;
}

function ScopeBox({
  scope,
  depth,
  showClosures,
  highlightState,
  selectedVariable,
}: ScopeBoxProps) {
  const colors = scopeColors[scope.type];
  const highlight = highlightState(scope.id);

  return (
    <motion.div
      layout
      className={cn(
        'relative rounded-lg border-2 p-3 transition-all duration-300',
        colors.bg,
        colors.border,
        highlight === 'searching' && 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-background',
        highlight === 'found' && 'ring-2 ring-green-500 ring-offset-2 ring-offset-background',
        highlight === 'not-found' && 'opacity-50'
      )}
      animate={{
        scale: highlight === 'searching' || highlight === 'found' ? 1.02 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Scope Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Box className={cn('w-4 h-4', colors.text)} />
          <span className={cn('text-xs font-medium', colors.text)}>
            {scope.name}
          </span>
        </div>
        {showClosures && scope.isClosure && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Closure
          </span>
        )}
      </div>

      {/* Variables */}
      <div className="space-y-1 mb-2">
        {scope.variables.map((variable) => (
          <div
            key={variable.name}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded text-xs font-mono',
              'bg-background/50',
              selectedVariable === variable.name && highlight === 'found' && 'ring-1 ring-green-500'
            )}
          >
            <span className={cn('font-medium', variableColors[variable.type])}>
              {variable.type}
            </span>
            <span className="text-foreground">{variable.name}</span>
            <span className="text-muted-foreground">=</span>
            <span className="text-emerald-400">{variable.value}</span>
          </div>
        ))}
        {scope.variables.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No variables</span>
        )}
      </div>

      {/* Children Scopes */}
      {scope.children.length > 0 && (
        <div className="flex flex-col items-center gap-2 mt-3">
          {scope.children.map((child) => (
            <ScopeBox
              key={child.id}
              scope={child}
              depth={depth + 1}
              showClosures={showClosures}
              highlightState={highlightState}
              selectedVariable={selectedVariable}
            />
          ))}
        </div>
      )}

      {/* Highlight Animation */}
      <AnimatePresence>
        {highlight === 'searching' && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-yellow-500"
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-yellow-500"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
              }}
            />
          </motion.div>
        )}
        {highlight === 'found' && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-green-500"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Resolution log entry component
 */
function ResolutionLogEntry({
  step,
  isActive,
}: {
  step: ScopeResolutionStep;
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        step.found
          ? 'bg-green-500/10 border-green-500/50 text-green-400'
          : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
        isActive && 'ring-2 ring-offset-1 ring-offset-background',
        isActive && step.found && 'ring-green-500',
        isActive && !step.found && 'ring-yellow-500'
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full shrink-0',
          step.found ? 'bg-green-500' : 'bg-yellow-500'
        )}
      />
      <span className="text-xs">{step.description}</span>
    </motion.div>
  );
}

// Export for testing
export { defaultScopes, getAllVariables, findDeepestScope };
export default ScopeChainVisualizer;
