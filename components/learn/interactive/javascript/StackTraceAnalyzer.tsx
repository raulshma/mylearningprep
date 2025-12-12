'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, ChevronDown, ChevronRight, FileCode, 
  MapPin, Info, AlertTriangle, RotateCcw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Types for stack trace analysis
export interface StackFrame {
  id: string;
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  isNative: boolean;
  isUserCode: boolean;
  explanation: string;
}

export interface ParsedStackTrace {
  errorType: string;
  errorMessage: string;
  frames: StackFrame[];
}

export interface StackTraceAnalyzerProps {
  /** Stack trace string to analyze (optional - uses default example) */
  stackTrace?: string;
  /** Whether to show explanations for each frame */
  showExplanations?: boolean;
}

// Default stack trace example
const defaultStackTrace = `TypeError: Cannot read properties of undefined (reading 'map')
    at renderItems (App.js:15:23)
    at processData (utils.js:42:10)
    at fetchAndDisplay (api.js:28:5)
    at async handleClick (App.js:8:3)
    at HTMLButtonElement.<anonymous> (index.js:12:1)`;

// Parse a stack trace string into structured data
export function parseStackTrace(stackTrace: string): ParsedStackTrace {
  const lines = stackTrace.trim().split('\n');
  const firstLine = lines[0] || '';
  
  // Parse error type and message
  const errorMatch = firstLine.match(/^(\w+Error):\s*(.+)$/);
  const errorType = errorMatch?.[1] || 'Error';
  const errorMessage = errorMatch?.[2] || firstLine;
  
  // Parse stack frames
  const frames: StackFrame[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('at ')) continue;
    
    // Parse different stack frame formats
    // Format 1: at functionName (fileName:line:column)
    // Format 2: at fileName:line:column
    // Format 3: at async functionName (fileName:line:column)
    
    let functionName = '<anonymous>';
    let fileName = 'unknown';
    let lineNumber = 0;
    let columnNumber = 0;
    let isNative = false;
    
    const asyncMatch = line.match(/^at async\s+(.+)$/);
    const cleanLine = asyncMatch ? `at ${asyncMatch[1]}` : line;
    
    const match1 = cleanLine.match(/^at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
    const match2 = cleanLine.match(/^at\s+(.+?):(\d+):(\d+)$/);
    const match3 = cleanLine.match(/^at\s+(.+?)\s+\(native\)$/);
    
    if (match1) {
      functionName = match1[1];
      fileName = match1[2];
      lineNumber = parseInt(match1[3], 10);
      columnNumber = parseInt(match1[4], 10);
    } else if (match2) {
      fileName = match2[1];
      lineNumber = parseInt(match2[2], 10);
      columnNumber = parseInt(match2[3], 10);
    } else if (match3) {
      functionName = match3[1];
      isNative = true;
    }
    
    // Determine if it's user code (simple heuristic)
    const isUserCode = !isNative && 
      !fileName.includes('node_modules') && 
      !fileName.startsWith('<');
    
    // Generate explanation
    const explanation = generateFrameExplanation(functionName, fileName, lineNumber, i === 1);
    
    frames.push({
      id: `frame-${i}`,
      functionName: asyncMatch ? `async ${functionName}` : functionName,
      fileName,
      lineNumber,
      columnNumber,
      isNative,
      isUserCode,
      explanation,
    });
  }
  
  return { errorType, errorMessage, frames };
}

// Generate explanation for a stack frame
function generateFrameExplanation(
  functionName: string, 
  fileName: string, 
  lineNumber: number,
  isTopFrame: boolean
): string {
  if (isTopFrame) {
    return `This is where the error occurred. The function "${functionName}" in "${fileName}" at line ${lineNumber} tried to access a property on an undefined value.`;
  }
  
  if (functionName.includes('async')) {
    return `This async function called the function above it and is waiting for it to complete.`;
  }
  
  if (functionName === '<anonymous>') {
    return `An anonymous function (like an event handler or callback) called the function above it.`;
  }
  
  return `The function "${functionName}" called the function above it in the stack.`;
}

// Example stack traces for selection
const exampleStackTraces = [
  {
    id: 'type-error',
    name: 'TypeError',
    trace: defaultStackTrace,
  },
  {
    id: 'reference-error',
    name: 'ReferenceError',
    trace: `ReferenceError: userData is not defined
    at displayUser (profile.js:25:15)
    at loadProfile (profile.js:12:3)
    at Object.<anonymous> (app.js:45:1)`,
  },
  {
    id: 'range-error',
    name: 'RangeError (Recursion)',
    trace: `RangeError: Maximum call stack size exceeded
    at factorial (math.js:3:10)
    at factorial (math.js:4:12)
    at factorial (math.js:4:12)
    at factorial (math.js:4:12)
    at calculateResult (app.js:15:8)`,
  },
];

/**
 * StackTraceAnalyzer Component
 * Parse and explain JavaScript stack traces
 * Requirements: 7.7
 */
export function StackTraceAnalyzer({
  stackTrace = defaultStackTrace,
  showExplanations = true,
}: StackTraceAnalyzerProps) {
  const [selectedExample, setSelectedExample] = useState('type-error');
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set(['frame-1']));
  const [highlightedFrame, setHighlightedFrame] = useState<string | null>('frame-1');

  const currentTrace = exampleStackTraces.find(e => e.id === selectedExample)?.trace || stackTrace;
  const parsed = useMemo(() => parseStackTrace(currentTrace), [currentTrace]);

  const toggleFrame = useCallback((frameId: string) => {
    setExpandedFrames(prev => {
      const next = new Set(prev);
      if (next.has(frameId)) {
        next.delete(frameId);
      } else {
        next.add(frameId);
      }
      return next;
    });
    setHighlightedFrame(frameId);
  }, []);

  const handleReset = useCallback(() => {
    setExpandedFrames(new Set(['frame-1']));
    setHighlightedFrame('frame-1');
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Stack Trace Analyzer</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Learn to read and understand JavaScript error stack traces
        </p>
      </div>

      {/* Example Selector */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Examples:</span>
        {exampleStackTraces.map((example) => (
          <Button
            key={example.id}
            variant={selectedExample === example.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedExample(example.id);
              setExpandedFrames(new Set(['frame-1']));
              setHighlightedFrame('frame-1');
            }}
            className="text-xs"
          >
            {example.name}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="ml-auto gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* Raw Stack Trace */}
        <div className="border-r border-border">
          <div className="px-4 py-2 border-b border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Raw Stack Trace
            </span>
          </div>
          <pre className="p-4 text-xs font-mono overflow-auto max-h-[300px] bg-red-500/5">
            <code className="text-red-400">{currentTrace}</code>
          </pre>
        </div>

        {/* Parsed Analysis */}
        <div className="bg-secondary/5">
          <div className="px-4 py-2 border-b border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Analyzed Stack
            </span>
          </div>
          
          {/* Error Info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-mono text-sm font-medium text-red-400">
                  {parsed.errorType}
                </span>
                <p className="text-sm text-red-300/80 mt-1">
                  {parsed.errorMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Stack Frames */}
          <div className="p-4 max-h-[250px] overflow-auto">
            <div className="space-y-2">
              {parsed.frames.map((frame, index) => (
                <StackFrameCard
                  key={frame.id}
                  frame={frame}
                  index={index}
                  isExpanded={expandedFrames.has(frame.id)}
                  isHighlighted={highlightedFrame === frame.id}
                  showExplanation={showExplanations}
                  onToggle={() => toggleFrame(frame.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reading Tips */}
      <div className="px-6 py-4 border-t border-border bg-secondary/10">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Reading tip:</span>{' '}
            Stack traces read from top to bottom. The top frame is where the error occurred, 
            and each frame below shows what called it. Click frames to see explanations.
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Stack frame card component
 */
interface StackFrameCardProps {
  frame: StackFrame;
  index: number;
  isExpanded: boolean;
  isHighlighted: boolean;
  showExplanation: boolean;
  onToggle: () => void;
}

function StackFrameCard({
  frame,
  index,
  isExpanded,
  isHighlighted,
  showExplanation,
  onToggle,
}: StackFrameCardProps) {
  const isTopFrame = index === 0;
  
  return (
    <motion.div
      layout
      className={cn(
        'rounded-lg border transition-all cursor-pointer',
        isTopFrame 
          ? 'bg-red-500/10 border-red-500/30' 
          : frame.isUserCode
            ? 'bg-blue-500/10 border-blue-500/30'
            : 'bg-secondary/30 border-border',
        isHighlighted && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Expand/Collapse */}
        <motion.span
          animate={{ rotate: isExpanded ? 90 : 0 }}
          className="text-muted-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.span>
        
        {/* Frame number */}
        <span className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
          isTopFrame 
            ? 'bg-red-500 text-white' 
            : 'bg-secondary text-muted-foreground'
        )}>
          {index + 1}
        </span>
        
        {/* Function name */}
        <span className={cn(
          'font-mono text-sm font-medium',
          isTopFrame ? 'text-red-400' : 'text-foreground'
        )}>
          {frame.functionName}
        </span>
        
        {/* File info */}
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
          <FileCode className="w-3 h-3" />
          {frame.fileName}
          {frame.lineNumber > 0 && (
            <>
              <MapPin className="w-3 h-3 ml-1" />
              {frame.lineNumber}:{frame.columnNumber}
            </>
          )}
        </span>
      </div>
      
      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3"
          >
            <div className={cn(
              'p-2 rounded text-xs',
              isTopFrame 
                ? 'bg-red-500/10 text-red-300' 
                : 'bg-secondary/50 text-muted-foreground'
            )}>
              {frame.explanation}
            </div>
            
            {isTopFrame && (
              <div className="mt-2 p-2 rounded bg-green-500/10 text-xs text-green-300">
                <span className="font-medium">💡 Fix:</span> Check that the variable you&apos;re 
                accessing is defined and not null/undefined before using it.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Export for testing
export { exampleStackTraces };
export default StackTraceAnalyzer;
