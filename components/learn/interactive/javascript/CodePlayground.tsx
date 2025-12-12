'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  Terminal,
  Maximize2,
  Minimize2,
  Loader2,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Types for execution results
export interface ExecutionError {
  type: 'SYNTAX_ERROR' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'SECURITY_VIOLATION';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ExecutionResult {
  success: boolean;
  output: ConsoleOutput[];
  error?: ExecutionError;
  executionTime: number;
}

export interface ConsoleOutput {
  type: 'log' | 'warn' | 'error' | 'info';
  content: string;
  timestamp: number;
}

export interface CodePlaygroundProps {
  /** Initial code to display in the editor */
  initialCode?: string;
  /** Programming language for syntax highlighting */
  language?: 'javascript' | 'typescript';
  /** Height of the editor in pixels */
  height?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Whether to show the console output panel */
  showConsole?: boolean;
  /** Whether to auto-run code on mount */
  autoRun?: boolean;
  /** Execution timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Callback when code changes */
  onCodeChange?: (code: string) => void;
  /** Callback when code is executed */
  onExecute?: (result: ExecutionResult) => void;
}

const defaultCode = `// Welcome to the JavaScript Playground!
// Try writing some code and click "Run" to see the output.

// Example: Variables and data types
const greeting = "Hello, World!";
const number = 42;
const isLearning = true;

console.log(greeting);
console.log("The answer is:", number);
console.log("Am I learning?", isLearning);

// Try modifying the code above or write your own!
`;

// Timeout duration in milliseconds
const DEFAULT_TIMEOUT = 5000;


/**
 * Execute JavaScript code in a sandboxed iframe environment
 * Requirements: 1.5, 1.6, 21.1, 21.2, 21.3, 21.4, 21.5
 */
function executeInSandbox(
  code: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const outputs: ConsoleOutput[] = [];

    // Create sandboxed iframe
    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Set up timeout handler
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        output: outputs,
        error: {
          type: 'TIMEOUT',
          message: `Code execution exceeded ${timeout / 1000} second limit`,
          suggestion: 'Check for infinite loops or long-running operations',
        },
        executionTime: timeout,
      });
    }, timeout);

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', messageHandler);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    // Message handler for receiving results from iframe
    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (event.source !== iframe.contentWindow) return;

      const { type, data } = event.data || {};

      if (type === 'console') {
        outputs.push({
          type: data.method,
          content: data.args.map((arg: unknown) => formatOutput(arg)).join(' '),
          timestamp: Date.now(),
        });
      } else if (type === 'complete') {
        cleanup();
        resolve({
          success: true,
          output: outputs,
          executionTime: performance.now() - startTime,
        });
      } else if (type === 'error') {
        cleanup();
        const errorInfo = parseError(data.message, data.stack);
        resolve({
          success: false,
          output: outputs,
          error: errorInfo,
          executionTime: performance.now() - startTime,
        });
      }
    };

    window.addEventListener('message', messageHandler);

    // Inject the execution code into the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      cleanup();
      resolve({
        success: false,
        output: [],
        error: {
          type: 'RUNTIME_ERROR',
          message: 'Failed to create sandbox environment',
        },
        executionTime: 0,
      });
      return;
    }

    // Create the sandboxed execution environment
    const sandboxCode = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          // Override console methods to capture output
          const originalConsole = { ...console };
          ['log', 'warn', 'error', 'info'].forEach(method => {
            console[method] = (...args) => {
              parent.postMessage({
                type: 'console',
                data: { method, args: args.map(arg => {
                  try {
                    if (typeof arg === 'object') {
                      return JSON.stringify(arg, null, 2);
                    }
                    return String(arg);
                  } catch {
                    return String(arg);
                  }
                })}
              }, '*');
            };
          });

          // Execute user code
          try {
            ${code}
            parent.postMessage({ type: 'complete' }, '*');
          } catch (error) {
            parent.postMessage({
              type: 'error',
              data: {
                message: error.message,
                stack: error.stack,
                name: error.name
              }
            }, '*');
          }
        <\/script>
      </head>
      <body></body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(sandboxCode);
    iframeDoc.close();
  });
}

/**
 * Format output for display in console
 */
function formatOutput(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Parse error message and extract line/column information
 */
function parseError(message: string, stack?: string): ExecutionError {
  let line: number | undefined;
  let column: number | undefined;
  let errorType: ExecutionError['type'] = 'RUNTIME_ERROR';
  let suggestion: string | undefined;

  // Try to extract line number from stack trace
  if (stack) {
    const lineMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
    if (lineMatch) {
      // Adjust line number to account for wrapper code (approximately 20 lines)
      line = Math.max(1, parseInt(lineMatch[1], 10) - 20);
      column = parseInt(lineMatch[2], 10);
    }
  }

  // Determine error type and suggestion
  if (message.includes('SyntaxError') || message.includes('Unexpected')) {
    errorType = 'SYNTAX_ERROR';
    suggestion = 'Check for missing brackets, semicolons, or typos';
  } else if (message.includes('ReferenceError')) {
    suggestion = 'Make sure the variable is defined before using it';
  } else if (message.includes('TypeError')) {
    suggestion = 'Check that you\'re using the correct data type';
  } else if (message.includes('RangeError')) {
    suggestion = 'Check for infinite recursion or invalid array lengths';
  }

  return {
    type: errorType,
    message,
    line,
    column,
    suggestion,
  };
}


/**
 * CodePlayground Component
 * Interactive JavaScript code editor with sandboxed execution
 * Requirements: 1.5, 1.6, 21.1, 21.2, 21.3, 21.4, 21.5
 */
export function CodePlayground({
  initialCode = defaultCode,
  language = 'javascript',
  height = 300,
  showLineNumbers = true,
  showConsole = true,
  autoRun = false,
  timeout = DEFAULT_TIMEOUT,
  onCodeChange,
  onExecute,
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<ConsoleOutput[]>([]);
  const [error, setError] = useState<ExecutionError | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Handle editor mount
  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Handle code change
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || '';
      setCode(newCode);
      onCodeChange?.(newCode);
    },
    [onCodeChange]
  );

  // Execute code in sandbox
  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setOutput([]);
    setExecutionTime(null);

    try {
      const result = await executeInSandbox(code, timeout);
      setOutput(result.output);
      setExecutionTime(result.executionTime);

      if (!result.success && result.error) {
        setError(result.error);
      }

      onExecute?.(result);
    } catch (err) {
      const errorResult: ExecutionError = {
        type: 'RUNTIME_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      };
      setError(errorResult);
      onExecute?.({
        success: false,
        output: [],
        error: errorResult,
        executionTime: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, timeout, onExecute]);

  // Reset to initial code
  const handleReset = useCallback(() => {
    setCode(initialCode);
    setOutput([]);
    setError(null);
    setExecutionTime(null);
    onCodeChange?.(initialCode);
  }, [initialCode, onCodeChange]);

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // Auto-run on mount if enabled
  useEffect(() => {
    if (autoRun) {
      handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editorHeight = isExpanded ? 500 : height;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          JavaScript Playground
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1"
          >
            {isExpanded ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="gap-1"
          >
            {isRunning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isRunning ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="ml-2 text-xs text-zinc-400 font-mono">
            script.{language === 'typescript' ? 'ts' : 'js'}
          </span>
          {executionTime !== null && (
            <span className="ml-auto text-xs text-zinc-500">
              Executed in {executionTime.toFixed(2)}ms
            </span>
          )}
        </div>
        <div style={{ height: editorHeight }}>
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: showLineNumbers ? 'on' : 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>
      </Card>

      {/* Console Output */}
      {showConsole && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Console Output</span>
            {output.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {output.length} message{output.length !== 1 && 's'}
              </span>
            )}
          </div>
          <div
            className="bg-zinc-950 p-4 font-mono text-sm overflow-auto"
            style={{ minHeight: 100, maxHeight: 200 }}
          >
            <AnimatePresence mode="popLayout">
              {output.length === 0 && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-zinc-500 text-xs"
                >
                  Click &quot;Run&quot; to execute your code and see the output here.
                </motion.div>
              )}
              {output.map((item, index) => (
                <ConsoleOutputLine key={index} output={item} />
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'p-4 rounded-lg border',
              error.type === 'TIMEOUT'
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-red-500/10 border-red-500/30'
            )}
          >
            <h4
              className={cn(
                'text-sm font-medium mb-2 flex items-center gap-2',
                error.type === 'TIMEOUT' ? 'text-yellow-500' : 'text-red-500'
              )}
            >
              {error.type === 'TIMEOUT' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {error.type === 'SYNTAX_ERROR'
                ? 'Syntax Error'
                : error.type === 'TIMEOUT'
                  ? 'Execution Timeout'
                  : 'Runtime Error'}
              {error.line && (
                <span className="text-xs font-normal opacity-70">
                  (Line {error.line})
                </span>
              )}
            </h4>
            <p className="text-sm text-foreground/80 font-mono">{error.message}</p>
            {error.suggestion && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {error.suggestion}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <div className="text-xs text-muted-foreground">
        💡 Write JavaScript code above and click &quot;Run&quot; to execute it safely in a
        sandboxed environment.
      </div>
    </div>
  );
}


/**
 * Console output line component
 */
function ConsoleOutputLine({ output }: { output: ConsoleOutput }) {
  const iconMap = {
    log: null,
    warn: <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />,
    error: <XCircle className="w-3 h-3 text-red-500 shrink-0" />,
    info: <Info className="w-3 h-3 text-blue-500 shrink-0" />,
  };

  const colorMap = {
    log: 'text-zinc-300',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-start gap-2 py-1 border-b border-zinc-800/50 last:border-0',
        colorMap[output.type]
      )}
    >
      {iconMap[output.type]}
      <pre className="whitespace-pre-wrap break-all">{output.content}</pre>
    </motion.div>
  );
}

// Export for testing
export { executeInSandbox, parseError, formatOutput, defaultCode };
export default CodePlayground;
