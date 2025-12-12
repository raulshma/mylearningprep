'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bug, Play, RotateCcw, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Types for error exploration
export interface ErrorTypeInfo {
  id: string;
  name: string;
  description: string;
  commonCauses: string[];
  example: {
    code: string;
    errorMessage: string;
  };
  howToFix: string;
  color: string;
}

export interface ErrorTypeExplorerProps {
  /** Initial error type to display */
  initialErrorType?: string;
  /** Whether to allow interactive error triggering */
  interactive?: boolean;
}

// JavaScript error types with detailed information
const errorTypes: ErrorTypeInfo[] = [
  {
    id: 'syntax-error',
    name: 'SyntaxError',
    description: 'Occurs when the JavaScript engine encounters code that doesn\'t follow the language grammar rules.',
    commonCauses: [
      'Missing or extra brackets, parentheses, or braces',
      'Missing semicolons (in some cases)',
      'Typos in keywords (e.g., "funtion" instead of "function")',
      'Invalid characters in code',
    ],
    example: {
      code: `// Missing closing bracket
function greet( {
  console.log("Hello");
}`,
      errorMessage: 'SyntaxError: Unexpected token \'{\'',
    },
    howToFix: 'Check for matching brackets, parentheses, and braces. Look for typos in keywords.',
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  {
    id: 'reference-error',
    name: 'ReferenceError',
    description: 'Occurs when you try to use a variable that hasn\'t been declared or is out of scope.',
    commonCauses: [
      'Using a variable before declaring it',
      'Typos in variable names',
      'Accessing variables outside their scope',
      'Using let/const before declaration (TDZ)',
    ],
    example: {
      code: `// Variable not declared
console.log(myVariable);
// myVariable is never defined`,
      errorMessage: 'ReferenceError: myVariable is not defined',
    },
    howToFix: 'Make sure the variable is declared before use. Check for typos in variable names.',
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'type-error',
    name: 'TypeError',
    description: 'Occurs when a value is not of the expected type, or when you try to use a method on an incompatible type.',
    commonCauses: [
      'Calling a method on null or undefined',
      'Calling a non-function as a function',
      'Accessing properties on null/undefined',
      'Using wrong data type for an operation',
    ],
    example: {
      code: `// Calling method on null
const user = null;
console.log(user.name);`,
      errorMessage: 'TypeError: Cannot read properties of null (reading \'name\')',
    },
    howToFix: 'Check if values are null/undefined before accessing properties. Verify data types.',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'range-error',
    name: 'RangeError',
    description: 'Occurs when a value is not within the expected range or set of allowed values.',
    commonCauses: [
      'Creating an array with invalid length',
      'Infinite recursion (call stack exceeded)',
      'Invalid arguments to numeric methods',
      'toFixed() with invalid precision',
    ],
    example: {
      code: `// Invalid array length
const arr = new Array(-1);`,
      errorMessage: 'RangeError: Invalid array length',
    },
    howToFix: 'Validate numeric inputs before using them. Add base cases to recursive functions.',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'uri-error',
    name: 'URIError',
    description: 'Occurs when global URI handling functions are used incorrectly.',
    commonCauses: [
      'Invalid characters in encodeURI/decodeURI',
      'Malformed URI sequences',
      'Invalid escape sequences',
    ],
    example: {
      code: `// Invalid URI encoding
decodeURIComponent('%');`,
      errorMessage: 'URIError: URI malformed',
    },
    howToFix: 'Ensure URI strings are properly formatted before encoding/decoding.',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  },
  {
    id: 'eval-error',
    name: 'EvalError',
    description: 'Historically related to the eval() function. Rarely seen in modern JavaScript.',
    commonCauses: [
      'Legacy: incorrect use of eval()',
      'Note: Modern JS engines rarely throw this',
    ],
    example: {
      code: `// EvalError is rarely thrown in modern JS
// It exists for backward compatibility
throw new EvalError('Example');`,
      errorMessage: 'EvalError: Example',
    },
    howToFix: 'Avoid using eval(). Use safer alternatives like JSON.parse() for data.',
    color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  },
  {
    id: 'aggregate-error',
    name: 'AggregateError',
    description: 'Wraps multiple errors into a single error. Used with Promise.any() when all promises reject.',
    commonCauses: [
      'All promises in Promise.any() rejected',
      'Multiple errors need to be reported together',
    ],
    example: {
      code: `// All promises rejected
Promise.any([
  Promise.reject('Error 1'),
  Promise.reject('Error 2'),
]).catch(e => console.log(e));`,
      errorMessage: 'AggregateError: All promises were rejected',
    },
    howToFix: 'Handle the case where all promises might fail. Check the errors array for details.',
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  },
];

/**
 * ErrorTypeExplorer Component
 * Interactive exploration of JavaScript error types
 * Requirements: 7.5
 */
export function ErrorTypeExplorer({
  initialErrorType = 'type-error',
  interactive = true,
}: ErrorTypeExplorerProps) {
  const [selectedError, setSelectedError] = useState<string>(initialErrorType);
  const [triggeredError, setTriggeredError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentError = errorTypes.find(e => e.id === selectedError) || errorTypes[0];

  const handleTriggerError = useCallback(() => {
    setIsAnimating(true);
    setTriggeredError(null);
    
    // Simulate error triggering with animation
    setTimeout(() => {
      setTriggeredError(currentError.example.errorMessage);
      setIsAnimating(false);
    }, 800);
  }, [currentError]);

  const handleReset = useCallback(() => {
    setTriggeredError(null);
    setIsAnimating(false);
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Error Type Explorer</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Explore different JavaScript error types and learn how to handle them
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-0">
        {/* Error Type List */}
        <div className="border-r border-border bg-secondary/10 p-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-3">
            Error Types
          </span>
          <div className="space-y-1">
            {errorTypes.map((error) => (
              <button
                key={error.id}
                onClick={() => {
                  setSelectedError(error.id);
                  setTriggeredError(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all',
                  selectedError === error.id
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'hover:bg-secondary/50 text-muted-foreground'
                )}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-mono text-xs">{error.name}</span>
                {selectedError === error.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error Details */}
        <div className="md:col-span-2 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentError.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Error Name & Description */}
              <div className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4',
                currentError.color
              )}>
                <AlertTriangle className="w-4 h-4" />
                <span className="font-mono font-medium">{currentError.name}</span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {currentError.description}
              </p>

              {/* Common Causes */}
              <div className="mb-4">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">
                  Common Causes
                </span>
                <ul className="space-y-1">
                  {currentError.commonCauses.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Example Code */}
              <div className="mb-4">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">
                  Example
                </span>
                <pre className="text-xs font-mono bg-secondary/30 rounded-lg p-4 overflow-auto">
                  <code className="text-foreground">{currentError.example.code}</code>
                </pre>
              </div>

              {/* Interactive Error Trigger */}
              {interactive && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTriggerError}
                      disabled={isAnimating}
                      className="gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Trigger Error
                    </Button>
                    {triggeredError && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </Button>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {(isAnimating || triggeredError) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          'rounded-lg border p-3 font-mono text-xs',
                          isAnimating
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        )}
                      >
                        {isAnimating ? (
                          <span className="flex items-center gap-2">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              ⚙️
                            </motion.span>
                            Executing code...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {triggeredError}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* How to Fix */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <Info className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-green-400 font-medium uppercase tracking-wide block mb-1">
                    How to Fix
                  </span>
                  <p className="text-sm text-green-300/80">
                    {currentError.howToFix}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

// Export for testing
export { errorTypes };
export default ErrorTypeExplorer;
