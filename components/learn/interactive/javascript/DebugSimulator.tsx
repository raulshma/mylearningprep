'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bug, Play, Pause, SkipForward, RotateCcw, 
  Circle, CircleDot, Eye, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Types for debug simulation
export interface CodeLine {
  lineNumber: number;
  code: string;
  hasBreakpoint: boolean;
  isExecutable: boolean;
}

export interface Variable {
  name: string;
  value: string;
  type: string;
  scope: 'global' | 'local' | 'closure';
}

export interface ExecutionState {
  currentLine: number;
  variables: Variable[];
  callStack: string[];
  output: string[];
}

export interface DebugSimulatorProps {
  /** Code to debug (optional - uses default example) */
  code?: string;
  /** Initial breakpoints (line numbers) */
  initialBreakpoints?: number[];
}

// Default code example for debugging
const defaultCode = `function calculateSum(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

const myNumbers = [1, 2, 3, 4, 5];
const result = calculateSum(myNumbers);
console.log("Sum:", result);`;

// Parse code into lines
function parseCode(code: string): CodeLine[] {
  return code.split('\n').map((line, index) => ({
    lineNumber: index + 1,
    code: line,
    hasBreakpoint: false,
    isExecutable: line.trim().length > 0 && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      line.trim() !== '{' &&
      line.trim() !== '}',
  }));
}

// Simulate execution states for the default code
function generateExecutionStates(code: string): ExecutionState[] {
  // This is a simplified simulation for educational purposes
  const states: ExecutionState[] = [
    // Initial state
    {
      currentLine: 1,
      variables: [],
      callStack: ['<global>'],
      output: [],
    },
    // Function defined (skip to line 9)
    {
      currentLine: 9,
      variables: [],
      callStack: ['<global>'],
      output: [],
    },
    // myNumbers declared
    {
      currentLine: 9,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
      ],
      callStack: ['<global>'],
      output: [],
    },
    // Calling calculateSum
    {
      currentLine: 10,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
      ],
      callStack: ['<global>'],
      output: [],
    },
    // Inside calculateSum - line 1
    {
      currentLine: 1,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'numbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'local' },
      ],
      callStack: ['<global>', 'calculateSum'],
      output: [],
    },
    // total = 0
    {
      currentLine: 2,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'numbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'local' },
        { name: 'total', value: '0', type: 'number', scope: 'local' },
      ],
      callStack: ['<global>', 'calculateSum'],
      output: [],
    },
    // Loop iteration 1
    {
      currentLine: 3,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'numbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'local' },
        { name: 'total', value: '0', type: 'number', scope: 'local' },
        { name: 'i', value: '0', type: 'number', scope: 'local' },
      ],
      callStack: ['<global>', 'calculateSum'],
      output: [],
    },
    // total += numbers[0]
    {
      currentLine: 4,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'numbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'local' },
        { name: 'total', value: '1', type: 'number', scope: 'local' },
        { name: 'i', value: '0', type: 'number', scope: 'local' },
      ],
      callStack: ['<global>', 'calculateSum'],
      output: [],
    },
    // i = 1
    {
      currentLine: 3,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'numbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'local' },
        { name: 'total', value: '1', type: 'number', scope: 'local' },
        { name: 'i', value: '1', type: 'number', scope: 'local' },
      ],
      callStack: ['<global>', 'calculateSum'],
      output: [],
    },
    // total += numbers[1]
    {
      currentLine: 4,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'numbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'local' },
        { name: 'total', value: '3', type: 'number', scope: 'local' },
        { name: 'i', value: '1', type: 'number', scope: 'local' },
      ],
      callStack: ['<global>', 'calculateSum'],
      output: [],
    },
    // Skip to end of loop (total = 15)
    {
      currentLine: 6,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'numbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'local' },
        { name: 'total', value: '15', type: 'number', scope: 'local' },
        { name: 'i', value: '5', type: 'number', scope: 'local' },
      ],
      callStack: ['<global>', 'calculateSum'],
      output: [],
    },
    // Return from function
    {
      currentLine: 10,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'result', value: '15', type: 'number', scope: 'global' },
      ],
      callStack: ['<global>'],
      output: [],
    },
    // console.log
    {
      currentLine: 11,
      variables: [
        { name: 'myNumbers', value: '[1, 2, 3, 4, 5]', type: 'Array', scope: 'global' },
        { name: 'result', value: '15', type: 'number', scope: 'global' },
      ],
      callStack: ['<global>'],
      output: ['Sum: 15'],
    },
  ];
  
  return states;
}

// Scope colors
const scopeColors: Record<Variable['scope'], string> = {
  global: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  local: 'text-green-400 bg-green-500/10 border-green-500/30',
  closure: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

/**
 * DebugSimulator Component
 * Step-through code execution with breakpoints and variable inspection
 * Requirements: 7.6
 */
export function DebugSimulator({
  code = defaultCode,
  initialBreakpoints = [],
}: DebugSimulatorProps) {
  const codeLines = useMemo(() => parseCode(code), [code]);
  const executionStates = useMemo(() => generateExecutionStates(code), [code]);
  
  const [breakpoints, setBreakpoints] = useState<Set<number>>(
    new Set(initialBreakpoints)
  );
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);

  const currentState = currentStateIndex >= 0 
    ? executionStates[currentStateIndex] 
    : null;

  const toggleBreakpoint = useCallback((lineNumber: number) => {
    setBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(lineNumber)) {
        next.delete(lineNumber);
      } else {
        next.add(lineNumber);
      }
      return next;
    });
  }, []);

  const handleStepOver = useCallback(() => {
    if (currentStateIndex < executionStates.length - 1) {
      setCurrentStateIndex(prev => prev + 1);
    }
  }, [currentStateIndex, executionStates.length]);

  const handleRun = useCallback(() => {
    if (currentStateIndex === -1) {
      setCurrentStateIndex(0);
      setIsRunning(true);
    } else {
      setIsRunning(prev => !prev);
    }
  }, [currentStateIndex]);

  const handleReset = useCallback(() => {
    setCurrentStateIndex(-1);
    setIsRunning(false);
  }, []);

  // Auto-advance when running
  // Note: In a real implementation, this would check breakpoints
  // For simplicity, we just step through states

  return (
    <Card className="w-full max-w-5xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Debug Simulator</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Step through code execution and inspect variables at each step
        </p>
      </div>

      {/* Controls */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {currentStateIndex === -1 ? 'Start' : 'Continue'}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStepOver}
          disabled={currentStateIndex >= executionStates.length - 1}
          className="gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Step Over
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Click line numbers to toggle breakpoints
        </span>
      </div>

      <div className="grid md:grid-cols-5 gap-0">
        {/* Code View */}
        <div className="md:col-span-3 border-r border-border">
          <div className="px-4 py-2 border-b border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Source Code
            </span>
          </div>
          <div className="font-mono text-sm overflow-auto max-h-[400px]">
            {codeLines.map((line) => (
              <CodeLineRow
                key={line.lineNumber}
                line={line}
                isCurrentLine={currentState?.currentLine === line.lineNumber}
                hasBreakpoint={breakpoints.has(line.lineNumber)}
                onToggleBreakpoint={() => toggleBreakpoint(line.lineNumber)}
              />
            ))}
          </div>
        </div>

        {/* Debug Panel */}
        <div className="md:col-span-2 bg-secondary/5">
          {/* Variables */}
          <div className="border-b border-border">
            <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Variables
              </span>
            </div>
            <div className="p-4 max-h-[200px] overflow-auto">
              <AnimatePresence mode="popLayout">
                {currentState?.variables.length ? (
                  currentState.variables.map((variable) => (
                    <VariableRow key={variable.name} variable={variable} />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4 text-muted-foreground text-sm"
                  >
                    {currentStateIndex === -1 
                      ? 'Click "Start" to begin debugging'
                      : 'No variables in scope'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Call Stack */}
          <div className="border-b border-border">
            <div className="px-4 py-2 border-b border-border bg-secondary/20">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Call Stack
              </span>
            </div>
            <div className="p-4 max-h-[100px] overflow-auto">
              {currentState?.callStack.length ? (
                <div className="space-y-1">
                  {[...currentState.callStack].reverse().map((frame, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded text-xs font-mono',
                        i === 0 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground'
                      )}
                    >
                      <ChevronRight className="w-3 h-3" />
                      {frame}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-muted-foreground text-sm">
                  Empty
                </div>
              )}
            </div>
          </div>

          {/* Console Output */}
          <div>
            <div className="px-4 py-2 border-b border-border bg-secondary/20">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Console
              </span>
            </div>
            <div className="p-4 max-h-[100px] overflow-auto font-mono text-xs">
              {currentState?.output.length ? (
                currentState.output.map((line, i) => (
                  <div key={i} className="text-foreground">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">
                  No output yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Code line row component
 */
interface CodeLineRowProps {
  line: CodeLine;
  isCurrentLine: boolean;
  hasBreakpoint: boolean;
  onToggleBreakpoint: () => void;
}

function CodeLineRow({
  line,
  isCurrentLine,
  hasBreakpoint,
  onToggleBreakpoint,
}: CodeLineRowProps) {
  return (
    <div
      className={cn(
        'flex items-center group',
        isCurrentLine && 'bg-yellow-500/20',
      )}
    >
      {/* Breakpoint gutter */}
      <button
        onClick={onToggleBreakpoint}
        className={cn(
          'w-8 h-6 flex items-center justify-center shrink-0',
          'hover:bg-secondary/50 transition-colors',
          line.isExecutable ? 'cursor-pointer' : 'cursor-default'
        )}
        disabled={!line.isExecutable}
      >
        {hasBreakpoint ? (
          <CircleDot className="w-3 h-3 text-red-500" />
        ) : line.isExecutable ? (
          <Circle className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
        ) : null}
      </button>
      
      {/* Line number */}
      <span className="w-8 text-right pr-2 text-muted-foreground/50 text-xs select-none">
        {line.lineNumber}
      </span>
      
      {/* Current line indicator */}
      <span className="w-4 flex items-center justify-center">
        {isCurrentLine && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-yellow-500"
          >
            ▶
          </motion.span>
        )}
      </span>
      
      {/* Code */}
      <span className={cn(
        'flex-1 pr-4 py-0.5',
        isCurrentLine ? 'text-foreground font-medium' : 'text-foreground/80'
      )}>
        {line.code || ' '}
      </span>
    </div>
  );
}

/**
 * Variable row component
 */
function VariableRow({ variable }: { variable: Variable }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        'flex items-center justify-between px-2 py-1.5 rounded mb-1 border',
        scopeColors[variable.scope]
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium">{variable.name}</span>
        <span className="text-muted-foreground text-xs">({variable.type})</span>
      </div>
      <span className="font-mono text-xs truncate max-w-[120px]" title={variable.value}>
        {variable.value}
      </span>
    </motion.div>
  );
}

// Export for testing
export { parseCode, generateExecutionStates, defaultCode };
export default DebugSimulator;
