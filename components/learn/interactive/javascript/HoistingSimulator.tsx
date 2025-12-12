'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Play, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for hoisting simulation
export interface Declaration {
  id: string;
  name: string;
  type: 'var' | 'let' | 'const' | 'function';
  line: number;
  value?: string;
  isHoisted: boolean;
  inTDZ?: boolean;
}

export interface HoistingStep {
  phase: 'compilation' | 'execution';
  declarationId: string;
  description: string;
  action: 'hoist' | 'initialize' | 'assign' | 'tdz-error';
}

export interface HoistingSimulatorProps {
  /** Code to analyze (optional - uses default example) */
  code?: string;
  /** Whether to show compilation vs execution phases */
  showPhases?: boolean;
  /** Whether to highlight hoisted declarations */
  highlightHoisted?: boolean;
}

// Default code example for demonstration
const defaultCode = `console.log(x);      // undefined (hoisted)
console.log(y);      // ReferenceError (TDZ)
console.log(greet);  // function (hoisted)

var x = 5;
let y = 10;
const z = 15;

function greet() {
  return "Hello!";
}

console.log(x);      // 5
console.log(y);      // 10`;

// Parse code to extract declarations
function parseDeclarations(code: string): Declaration[] {
  const declarations: Declaration[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Match var declarations
    const varMatch = line.match(/var\s+(\w+)\s*(?:=\s*(.+))?;?/);
    if (varMatch) {
      declarations.push({
        id: `var-${varMatch[1]}`,
        name: varMatch[1],
        type: 'var',
        line: lineNum,
        value: varMatch[2]?.trim(),
        isHoisted: true,
      });
    }
    
    // Match let declarations
    const letMatch = line.match(/let\s+(\w+)\s*(?:=\s*(.+))?;?/);
    if (letMatch) {
      declarations.push({
        id: `let-${letMatch[1]}`,
        name: letMatch[1],
        type: 'let',
        line: lineNum,
        value: letMatch[2]?.trim(),
        isHoisted: true,
        inTDZ: true,
      });
    }
    
    // Match const declarations
    const constMatch = line.match(/const\s+(\w+)\s*=\s*(.+);?/);
    if (constMatch) {
      declarations.push({
        id: `const-${constMatch[1]}`,
        name: constMatch[1],
        type: 'const',
        line: lineNum,
        value: constMatch[2]?.trim(),
        isHoisted: true,
        inTDZ: true,
      });
    }
    
    // Match function declarations
    const funcMatch = line.match(/function\s+(\w+)\s*\(/);
    if (funcMatch) {
      declarations.push({
        id: `func-${funcMatch[1]}`,
        name: funcMatch[1],
        type: 'function',
        line: lineNum,
        isHoisted: true,
      });
    }
  });
  
  return declarations;
}

// Generate hoisting steps for animation
export function generateHoistingSteps(declarations: Declaration[]): HoistingStep[] {
  const steps: HoistingStep[] = [];
  
  // Compilation phase - hoist declarations
  declarations.forEach((decl) => {
    if (decl.type === 'var') {
      steps.push({
        phase: 'compilation',
        declarationId: decl.id,
        description: `Hoisting: var ${decl.name} → initialized to undefined`,
        action: 'hoist',
      });
    } else if (decl.type === 'function') {
      steps.push({
        phase: 'compilation',
        declarationId: decl.id,
        description: `Hoisting: function ${decl.name} → fully hoisted with body`,
        action: 'hoist',
      });
    } else if (decl.type === 'let' || decl.type === 'const') {
      steps.push({
        phase: 'compilation',
        declarationId: decl.id,
        description: `Hoisting: ${decl.type} ${decl.name} → hoisted but in TDZ (Temporal Dead Zone)`,
        action: 'hoist',
      });
    }
  });
  
  // Execution phase - initialize/assign values
  declarations.forEach((decl) => {
    if (decl.type === 'var' && decl.value) {
      steps.push({
        phase: 'execution',
        declarationId: decl.id,
        description: `Execution: ${decl.name} = ${decl.value} (assignment)`,
        action: 'assign',
      });
    } else if (decl.type === 'let' || decl.type === 'const') {
      steps.push({
        phase: 'execution',
        declarationId: decl.id,
        description: `Execution: ${decl.type} ${decl.name} = ${decl.value} (exits TDZ)`,
        action: 'initialize',
      });
    }
  });
  
  return steps;
}

// Phase colors
const phaseColors = {
  compilation: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
  execution: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' },
};

// Declaration type colors
const declColors: Record<Declaration['type'], string> = {
  var: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  let: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  const: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  function: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};


/**
 * HoistingSimulator Component
 * Animated visualization of JavaScript hoisting behavior
 * Requirements: 5.6
 */
export function HoistingSimulator({
  code = defaultCode,
  showPhases = true,
  highlightHoisted = true,
}: HoistingSimulatorProps) {
  const declarations = useMemo(() => parseDeclarations(code), [code]);
  const steps = useMemo(() => generateHoistingSteps(declarations), [declarations]);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [stepLog, setStepLog] = useState<HoistingStep[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const baseDuration = 1500;
  const duration = baseDuration * speedMultipliers[speed];

  // Determine current phase
  const currentPhase = currentStep?.phase || (currentStepIndex === -1 ? null : 'execution');

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    if (currentStepIndex >= steps.length - 1) {
      queueMicrotask(() => setIsPlaying(false));
      return;
    }

    intervalRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next < steps.length) {
          setStepLog((log) => [...log, steps[next]]);
        }
        return next;
      });
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps, duration]);

  const handlePlayPause = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      // Reset and play from beginning
      setCurrentStepIndex(-1);
      setStepLog([]);
      setTimeout(() => {
        setCurrentStepIndex(0);
        setStepLog([steps[0]]);
        setIsPlaying(true);
      }, 100);
    } else if (currentStepIndex === -1) {
      // Start from beginning
      setCurrentStepIndex(0);
      setStepLog([steps[0]]);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentStepIndex, steps]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setStepLog([]);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  // Get declaration state based on current step
  const getDeclarationState = (declId: string): 'pending' | 'hoisted' | 'tdz' | 'initialized' => {
    const declSteps = stepLog.filter(s => s.declarationId === declId);
    if (declSteps.length === 0) return 'pending';
    
    const lastStep = declSteps[declSteps.length - 1];
    if (lastStep.action === 'initialize' || lastStep.action === 'assign') return 'initialized';
    if (lastStep.action === 'hoist') {
      const decl = declarations.find(d => d.id === declId);
      if (decl?.inTDZ) return 'tdz';
      return 'hoisted';
    }
    return 'pending';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <ArrowUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Hoisting Simulator</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Watch how JavaScript hoists declarations during compilation
        </p>
      </div>

      {/* Phase Indicator */}
      {showPhases && (
        <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap gap-4">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1 rounded-full border transition-all',
            currentPhase === 'compilation'
              ? 'bg-blue-500/20 border-blue-500 text-blue-400'
              : 'bg-secondary/50 border-border text-muted-foreground'
          )}>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium">Compilation Phase</span>
          </div>
          <div className={cn(
            'flex items-center gap-2 px-3 py-1 rounded-full border transition-all',
            currentPhase === 'execution'
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : 'bg-secondary/50 border-border text-muted-foreground'
          )}>
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium">Execution Phase</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-0">
        {/* Code View */}
        <div className="p-6 border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Original Code
            </span>
          </div>
          <pre className="text-xs font-mono bg-secondary/30 rounded-lg p-4 overflow-auto max-h-[300px]">
            {code.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="text-muted-foreground w-6 select-none">{i + 1}</span>
                <span className="text-foreground">{line}</span>
              </div>
            ))}
          </pre>
        </div>

        {/* Declarations State */}
        <div className="p-6 bg-secondary/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Declaration States
            </span>
          </div>
          <div className="space-y-2">
            {declarations.map((decl) => {
              const state = getDeclarationState(decl.id);
              return (
                <DeclarationCard
                  key={decl.id}
                  declaration={decl}
                  state={state}
                  isActive={currentStep?.declarationId === decl.id}
                  highlightHoisted={highlightHoisted}
                />
              );
            })}
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
              phaseColors[currentStep.phase].bg,
              phaseColors[currentStep.phase].text
            )}
          >
            {currentStep.description}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Log */}
      <div className="px-6 py-4 border-t border-border bg-secondary/5 max-h-[200px] overflow-auto">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">
          Hoisting Log
        </span>
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {stepLog.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4 text-muted-foreground text-sm"
              >
                Click &quot;Play&quot; to see hoisting in action
              </motion.div>
            ) : (
              stepLog.map((step, index) => (
                <StepLogEntry
                  key={`${step.declarationId}-${step.action}-${index}`}
                  step={step}
                  isActive={index === currentStepIndex}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

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
 * Declaration card component
 */
interface DeclarationCardProps {
  declaration: Declaration;
  state: 'pending' | 'hoisted' | 'tdz' | 'initialized';
  isActive: boolean;
  highlightHoisted: boolean;
}

function DeclarationCard({
  declaration,
  state,
  isActive,
  highlightHoisted,
}: DeclarationCardProps) {
  const stateInfo = {
    pending: { icon: null, label: 'Not processed', color: 'text-muted-foreground' },
    hoisted: { icon: CheckCircle2, label: 'Hoisted (undefined)', color: 'text-orange-400' },
    tdz: { icon: AlertTriangle, label: 'In TDZ', color: 'text-red-400' },
    initialized: { icon: CheckCircle2, label: 'Initialized', color: 'text-green-400' },
  };

  const info = stateInfo[state];
  const Icon = info.icon;

  return (
    <motion.div
      layout
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg border transition-all',
        declColors[declaration.type],
        isActive && 'ring-2 ring-offset-2 ring-offset-background ring-primary',
        highlightHoisted && state === 'hoisted' && 'animate-pulse'
      )}
      animate={{
        scale: isActive ? 1.02 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium">
          {declaration.type}
        </span>
        <span className="text-sm font-mono text-foreground">
          {declaration.name}
        </span>
        {declaration.value && (
          <>
            <span className="text-muted-foreground">=</span>
            <span className="text-xs text-emerald-400 truncate max-w-[100px]">
              {declaration.value}
            </span>
          </>
        )}
      </div>
      <div className={cn('flex items-center gap-1 text-xs', info.color)}>
        {Icon && <Icon className="w-3 h-3" />}
        <span>{info.label}</span>
      </div>
    </motion.div>
  );
}

/**
 * Step log entry component
 */
function StepLogEntry({
  step,
  isActive,
}: {
  step: HoistingStep;
  isActive: boolean;
}) {
  const colors = phaseColors[step.phase];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono',
        colors.bg,
        colors.border,
        'border',
        isActive && 'ring-1 ring-offset-1 ring-offset-background ring-primary'
      )}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', 
        step.phase === 'compilation' ? 'bg-blue-500' : 'bg-green-500'
      )} />
      <span className={colors.text}>{step.description}</span>
    </motion.div>
  );
}

// Export for testing
export { parseDeclarations, defaultCode };
export default HoistingSimulator;
