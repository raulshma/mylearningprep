'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Lightbulb, 
  AlertTriangle, 
  Trophy,
  CheckCircle,
  XCircle,
  ArrowRight,
  Shuffle,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TypeofExplorerProps {
  /** Complexity mode */
  mode?: 'beginner' | 'intermediate' | 'advanced';
  /** Show typeof quirks section */
  showQuirks?: boolean;
  /** Show specification details */
  showSpecification?: boolean;
}

interface TypeofQuirk {
  expression: string;
  result: string;
  explanation: string;
  isQuirk: boolean;
}

// Typeof quirks and interesting cases
const typeofQuirks: TypeofQuirk[] = [
  { expression: 'null', result: 'object', explanation: 'Historical bug from the first JavaScript implementation. null was represented with all zero bits, same as objects.', isQuirk: true },
  { expression: 'function(){}', result: 'function', explanation: 'Functions are objects, but typeof gives them special treatment for convenience.', isQuirk: true },
  { expression: '[]', result: 'object', explanation: 'Arrays are objects in JavaScript. Use Array.isArray() to check for arrays.', isQuirk: true },
  { expression: 'NaN', result: 'number', explanation: 'NaN (Not a Number) is paradoxically of type "number". It represents an invalid numeric operation.', isQuirk: true },
  { expression: 'typeof typeof 1', result: 'string', explanation: 'typeof always returns a string, so typeof of any typeof result is "string".', isQuirk: true },
  { expression: 'undefined', result: 'undefined', explanation: 'The only value that returns "undefined" from typeof.', isQuirk: false },
  { expression: '"hello"', result: 'string', explanation: 'Text in quotes creates a string primitive.', isQuirk: false },
  { expression: '42', result: 'number', explanation: 'Numeric literals are of type number.', isQuirk: false },
  { expression: 'true', result: 'boolean', explanation: 'true and false are the only boolean values.', isQuirk: false },
  { expression: 'Symbol("id")', result: 'symbol', explanation: 'Symbols are unique identifiers introduced in ES6.', isQuirk: false },
  { expression: '123n', result: 'bigint', explanation: 'BigInt literals end with "n" for arbitrary precision integers.', isQuirk: false },
  { expression: '{}', result: 'object', explanation: 'Object literals are of type object.', isQuirk: false },
  { expression: 'new Date()', result: 'object', explanation: 'Date instances are objects. Most built-in types are objects.', isQuirk: false },
  { expression: '/regex/', result: 'object', explanation: 'Regular expressions are objects in JavaScript.', isQuirk: false },
  { expression: 'class {}', result: 'function', explanation: 'Classes are syntactic sugar over constructor functions.', isQuirk: true },
];

// Challenge questions for gamification
interface Challenge {
  expression: string;
  correctAnswer: string;
  points: number;
}

const challenges: Challenge[] = [
  { expression: 'typeof null', correctAnswer: 'object', points: 10 },
  { expression: 'typeof []', correctAnswer: 'object', points: 10 },
  { expression: 'typeof NaN', correctAnswer: 'number', points: 15 },
  { expression: 'typeof function(){}', correctAnswer: 'function', points: 10 },
  { expression: 'typeof undefined', correctAnswer: 'undefined', points: 5 },
  { expression: 'typeof "hello"', correctAnswer: 'string', points: 5 },
  { expression: 'typeof 42n', correctAnswer: 'bigint', points: 10 },
  { expression: 'typeof Symbol()', correctAnswer: 'symbol', points: 10 },
  { expression: 'typeof class{}', correctAnswer: 'function', points: 20 },
  { expression: 'typeof typeof 1', correctAnswer: 'string', points: 25 },
];

// Simulate typeof for common expressions
function simulateTypeof(expression: string): { result: string; isValid: boolean } {
  const trimmed = expression.trim();
  
  // Map of known expressions to their typeof results
  const knownExpressions: Record<string, string> = {
    'null': 'object',
    'undefined': 'undefined',
    'true': 'boolean',
    'false': 'boolean',
    'NaN': 'number',
    'Infinity': 'number',
    '-Infinity': 'number',
    '{}': 'object',
    '[]': 'object',
    'function(){}': 'function',
    '() => {}': 'function',
    'class {}': 'function',
    'class{}': 'function',
    'new Date()': 'object',
    'new Array()': 'object',
    'new Object()': 'object',
    '/regex/': 'object',
    'Math': 'object',
    'JSON': 'object',
    'console': 'object',
  };

  // Check for literal patterns
  if (knownExpressions[trimmed] !== undefined) {
    return { result: knownExpressions[trimmed], isValid: true };
  }

  // String literals
  if (/^["'`].*["'`]$/.test(trimmed)) {
    return { result: 'string', isValid: true };
  }

  // Number literals (including decimals, negative, scientific notation)
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/.test(trimmed)) {
    return { result: 'number', isValid: true };
  }

  // BigInt literals
  if (/^-?\d+n$/.test(trimmed)) {
    return { result: 'bigint', isValid: true };
  }

  // Symbol
  if (/^Symbol\(.*\)$/.test(trimmed)) {
    return { result: 'symbol', isValid: true };
  }

  // Function expressions  
  if (/^function\s*\(/.test(trimmed) || /^function\s+\w+\s*\(/.test(trimmed)) {
    return { result: 'function', isValid: true };
  }

  // Arrow functions
  if (/^\(.*\)\s*=>/.test(trimmed) || /^\w+\s*=>/.test(trimmed)) {
    return { result: 'function', isValid: true };
  }

  // typeof typeof anything
  if (/^typeof\s+/.test(trimmed)) {
    return { result: 'string', isValid: true };
  }

  // Object literal
  if (/^\{.*\}$/.test(trimmed)) {
    return { result: 'object', isValid: true };
  }

  // Array literal
  if (/^\[.*\]$/.test(trimmed)) {
    return { result: 'object', isValid: true };
  }

  return { result: 'unknown', isValid: false };
}

/**
 * TypeofExplorer Component
 * Interactive playground for exploring the typeof operator
 */
export function TypeofExplorer({
  mode = 'beginner',
  showQuirks = false,
  showSpecification = false,
}: TypeofExplorerProps) {
  const [inputValue, setInputValue] = useState('');
  const [lastResult, setLastResult] = useState<{ expression: string; result: string; isValid: boolean } | null>(null);
  const [showChallengeMode, setShowChallengeMode] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [challengeResult, setChallengeResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [challengesCompleted, setChallengesCompleted] = useState(0);
  const [usedChallenges, setUsedChallenges] = useState<Set<string>>(new Set());

  const shouldShowQuirks = showQuirks || mode === 'intermediate' || mode === 'advanced';
  const shouldShowSpec = showSpecification || mode === 'advanced';

  // Filter quirks based on mode
  const displayedQuirks = useMemo(() => {
    if (mode === 'beginner') {
      return typeofQuirks.filter(q => !q.isQuirk);
    }
    return typeofQuirks;
  }, [mode]);

  const handleCheck = useCallback(() => {
    if (!inputValue.trim()) return;
    const result = simulateTypeof(inputValue);
    setLastResult({ expression: inputValue, ...result });
  }, [inputValue]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheck();
    }
  }, [handleCheck]);

  const startChallenge = useCallback(() => {
    const availableChallenges = challenges.filter(c => !usedChallenges.has(c.expression));
    if (availableChallenges.length === 0) {
      // Reset if all challenges used
      setUsedChallenges(new Set());
      const randomIndex = Math.floor(Math.random() * challenges.length);
      setCurrentChallenge(challenges[randomIndex]);
    } else {
      const randomIndex = Math.floor(Math.random() * availableChallenges.length);
      setCurrentChallenge(availableChallenges[randomIndex]);
    }
    setChallengeAnswer('');
    setChallengeResult(null);
    setShowChallengeMode(true);
  }, [usedChallenges]);

  const checkChallengeAnswer = useCallback(() => {
    if (!currentChallenge || !challengeAnswer.trim()) return;
    
    const isCorrect = challengeAnswer.trim().toLowerCase() === currentChallenge.correctAnswer.toLowerCase() ||
                      `"${challengeAnswer.trim().toLowerCase()}"` === `"${currentChallenge.correctAnswer.toLowerCase()}"`;
    
    setChallengeResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      setScore(prev => prev + currentChallenge.points);
    }
    setChallengesCompleted(prev => prev + 1);
    setUsedChallenges(prev => new Set([...prev, currentChallenge.expression]));
  }, [currentChallenge, challengeAnswer]);

  const nextChallenge = useCallback(() => {
    startChallenge();
  }, [startChallenge]);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-blue-500/5 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Search className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">typeof Operator Explorer</h3>
              <p className="text-sm text-muted-foreground">
                Discover what type any JavaScript value is
              </p>
            </div>
          </div>
          
          {/* Challenge Mode Toggle */}
          <Button
            variant={showChallengeMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!showChallengeMode) {
                startChallenge();
              } else {
                setShowChallengeMode(false);
              }
            }}
            className="gap-2"
          >
            <Trophy className="w-4 h-4" />
            {showChallengeMode ? 'Exit Challenge' : 'Challenge Mode'}
          </Button>
        </div>
      </div>

      {/* Challenge Mode */}
      <AnimatePresence mode="wait">
        {showChallengeMode ? (
          <motion.div
            key="challenge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6"
          >
            {/* Score Display */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600">
                  <Trophy className="w-4 h-4" />
                  <span className="font-semibold">{score} pts</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {challengesCompleted} challenges completed
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setScore(0); setChallengesCompleted(0); setUsedChallenges(new Set()); startChallenge(); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            {currentChallenge && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">What does this return?</p>
                  <code className="text-2xl font-mono text-primary">
                    {currentChallenge.expression}
                  </code>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Worth {currentChallenge.points} points
                  </p>
                </div>

                <div className="flex gap-2 max-w-md mx-auto">
                  <Input
                    value={challengeAnswer}
                    onChange={(e) => setChallengeAnswer(e.target.value)}
                    placeholder='Type your answer (e.g., "string")'
                    className="font-mono"
                    onKeyPress={(e) => e.key === 'Enter' && !challengeResult && checkChallengeAnswer()}
                    disabled={!!challengeResult}
                  />
                  {!challengeResult ? (
                    <Button onClick={checkChallengeAnswer} disabled={!challengeAnswer.trim()}>
                      Check
                    </Button>
                  ) : (
                    <Button onClick={nextChallenge} className="gap-2">
                      <Shuffle className="w-4 h-4" />
                      Next
                    </Button>
                  )}
                </div>

                {/* Result Feedback */}
                <AnimatePresence>
                  {challengeResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        'text-center p-4 rounded-lg',
                        challengeResult === 'correct' ? 'bg-green-500/10' : 'bg-red-500/10'
                      )}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {challengeResult === 'correct' ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-green-500" />
                            <span className="text-lg font-semibold text-green-500">Correct! +{currentChallenge.points} pts</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-6 h-6 text-red-500" />
                            <span className="text-lg font-semibold text-red-500">Not quite!</span>
                          </>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        <code className="font-mono">{currentChallenge.expression}</code> returns{' '}
                        <code className="font-mono text-primary">&quot;{currentChallenge.correctAnswer}&quot;</code>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="explorer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Interactive Input */}
            <div className="p-6 border-b border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                    typeof
                  </span>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter any expression..."
                    className="pl-16 font-mono"
                  />
                </div>
                <Button onClick={handleCheck} disabled={!inputValue.trim()}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Result Display */}
              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <div className={cn(
                      'p-4 rounded-lg',
                      lastResult.isValid ? 'bg-green-500/10' : 'bg-yellow-500/10'
                    )}>
                      <div className="flex items-center gap-2">
                        <code className="font-mono">typeof {lastResult.expression}</code>
                        <span className="text-muted-foreground">=</span>
                        <code className={cn(
                          'font-mono font-semibold',
                          lastResult.isValid ? 'text-green-500' : 'text-yellow-500'
                        )}>
                          &quot;{lastResult.result}&quot;
                        </code>
                      </div>
                      {!lastResult.isValid && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Expression not recognized. Try common JavaScript values.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Examples */}
              <div className="mt-4 flex flex-wrap gap-2">
                {['null', '"hello"', '42', 'true', '[]', '{}', 'function(){}'].map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      setInputValue(example);
                      const result = simulateTypeof(example);
                      setLastResult({ expression: example, ...result });
                    }}
                    className="px-2 py-1 text-xs font-mono rounded bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Quirks Section */}
            {shouldShowQuirks && (
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-medium">typeof Results Reference</h4>
                </div>

                <div className="grid gap-2">
                  {displayedQuirks.map((quirk) => (
                    <motion.div
                      key={quirk.expression}
                      className={cn(
                        'flex items-start gap-4 p-3 rounded-lg',
                        quirk.isQuirk ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-secondary/50'
                      )}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-mono text-sm">typeof {quirk.expression}</code>
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <code className="font-mono text-sm font-semibold text-primary">&quot;{quirk.result}&quot;</code>
                          {quirk.isQuirk && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-600 font-medium">
                              QUIRK
                            </span>
                          )}
                        </div>
                        {(mode !== 'beginner' || quirk.isQuirk) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {quirk.explanation}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Specification Details (Advanced) */}
            {shouldShowSpec && (
              <div className="p-6 bg-secondary/30">
                <h4 className="font-medium mb-3">ECMAScript Specification</h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <h5 className="font-medium text-primary mb-1">The typeof Operator Algorithm</h5>
                    <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                      <li>If Type(val) is Undefined, return &quot;undefined&quot;</li>
                      <li>If Type(val) is Null, return &quot;object&quot;</li>
                      <li>If Type(val) is Boolean, return &quot;boolean&quot;</li>
                      <li>If Type(val) is Number, return &quot;number&quot;</li>
                      <li>If Type(val) is BigInt, return &quot;bigint&quot;</li>
                      <li>If Type(val) is String, return &quot;string&quot;</li>
                      <li>If Type(val) is Symbol, return &quot;symbol&quot;</li>
                      <li>If Type(val) is Object and has [[Call]], return &quot;function&quot;</li>
                      <li>If Type(val) is Object, return &quot;object&quot;</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <h5 className="font-medium text-primary mb-1">Better Type Checking</h5>
                    <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
{`// For arrays
Array.isArray([1, 2, 3]); // true

// For null
value === null; // explicit check

// For any type (robust)
Object.prototype.toString.call(value);
// "[object Array]", "[object Null]", etc.`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default TypeofExplorer;
