'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight,
  Globe,
  Box,
  Zap,
  ArrowRight,
  Code2,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for this keyword visualization
export interface BindingContext {
  id: string;
  name: string;
  type: 'global' | 'function' | 'method' | 'class' | 'arrow' | 'explicit';
  thisValue: string;
  description: string;
  code: string;
  explanation: string;
}

export interface ExecutionStep {
  id: string;
  description: string;
  thisValue: string;
  highlight: string[];
  isActive?: boolean;
}

export interface ThisKeywordVisualizerProps {
  /** Which context to visualize */
  context?: 'global' | 'function' | 'class' | 'arrow' | 'explicit';
  /** Show strict mode toggle */
  showStrictMode?: boolean;
  /** Enable animations */
  animated?: boolean;
  /** Initial strict mode state */
  strictMode?: boolean;
}

// Binding scenarios with examples
const bindingScenarios: Record<string, BindingContext[]> = {
  global: [
    {
      id: 'global-browser',
      name: 'Browser Global',
      type: 'global',
      thisValue: 'window',
      description: 'At the top level of a script',
      code: `// In browser
console.log(this); // window
console.log(this === window); // true

this.myGlobal = "Hello!";
console.log(window.myGlobal); // "Hello!"`,
      explanation: 'In the global scope of a browser, `this` refers to the `window` object (the global object).'
    },
    {
      id: 'global-node',
      name: 'Node.js Global',
      type: 'global',
      thisValue: 'globalThis',
      description: 'In Node.js environment',
      code: `// In Node.js (module)
console.log(this); // {} (module.exports)

// In Node.js REPL
console.log(this === globalThis); // true`,
      explanation: 'In Node.js modules, `this` refers to `module.exports`. Use `globalThis` for consistent cross-platform access.'
    },
    {
      id: 'global-strict',
      name: 'Strict Mode Global',
      type: 'global',
      thisValue: 'undefined',
      description: 'Global in strict mode function',
      code: `'use strict';

function showThis() {
  console.log(this); // undefined
}

showThis();`,
      explanation: 'In strict mode, when a function is called without a context, `this` is `undefined` instead of the global object.'
    }
  ],
  function: [
    {
      id: 'function-standalone',
      name: 'Standalone Function',
      type: 'function',
      thisValue: 'window (or undefined)',
      description: 'Function called without an object',
      code: `function greet() {
  console.log(this); // window (sloppy mode)
  console.log("Hello, " + this.name);
}

greet(); // "Hello, undefined"`,
      explanation: 'When a function is called without an object context, `this` defaults to the global object (or `undefined` in strict mode).'
    },
    {
      id: 'function-method',
      name: 'Object Method',
      type: 'method',
      thisValue: 'the object',
      description: 'Function called as an object method',
      code: `const user = {
  name: "Alice",
  greet() {
    console.log(this); // user object
    console.log("Hello, " + this.name);
  }
};

user.greet(); // "Hello, Alice"`,
      explanation: 'When a function is called as a method (object.method()), `this` refers to the object before the dot.'
    },
    {
      id: 'function-lost',
      name: 'Lost this',
      type: 'function',
      thisValue: 'window (lost!)',
      description: 'Method assigned to a variable',
      code: `const user = {
  name: "Alice",
  greet() {
    console.log("Hello, " + this.name);
  }
};

const greetFn = user.greet;
greetFn(); // "Hello, undefined" - this is lost!`,
      explanation: 'When you extract a method and call it without an object, `this` loses its original context - a common bug!'
    }
  ],
  class: [
    {
      id: 'class-constructor',
      name: 'Constructor',
      type: 'class',
      thisValue: 'new instance',
      description: 'Inside the constructor',
      code: `class User {
  constructor(name) {
    this.name = name; // this = new instance
    console.log(this); // User { name: "Alice" }
  }
}

const alice = new User("Alice");`,
      explanation: 'In a constructor, `this` refers to the newly created instance. This is how you initialize instance properties.'
    },
    {
      id: 'class-method',
      name: 'Instance Method',
      type: 'class',
      thisValue: 'the instance',
      description: 'Inside a class method',
      code: `class User {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    console.log(\`Hello, \${this.name}\`);
  }
}

const alice = new User("Alice");
alice.greet(); // "Hello, Alice"`,
      explanation: 'In instance methods, `this` refers to the instance calling the method, allowing access to instance properties.'
    },
    {
      id: 'class-static',
      name: 'Static Method',
      type: 'class',
      thisValue: 'the class itself',
      description: 'Inside a static method',
      code: `class User {
  static count = 0;
  
  static getCount() {
    return this.count; // this = User class
  }
  
  constructor(name) {
    this.name = name;
    User.count++;
  }
}

console.log(User.getCount()); // 0`,
      explanation: 'In static methods, `this` refers to the class itself, not an instance. Useful for factory methods and class-level operations.'
    }
  ],
  arrow: [
    {
      id: 'arrow-lexical',
      name: 'Lexical Binding',
      type: 'arrow',
      thisValue: 'enclosing scope this',
      description: 'Arrow function captures this',
      code: `const user = {
  name: "Alice",
  greetLater() {
    // Arrow captures 'this' from greetLater
    setTimeout(() => {
      console.log(\`Hello, \${this.name}\`);
    }, 1000);
  }
};

user.greetLater(); // "Hello, Alice" (after 1 second)`,
      explanation: 'Arrow functions don\'t have their own `this`. They capture `this` from the surrounding scope when defined - this is called lexical binding.'
    },
    {
      id: 'arrow-no-own-this',
      name: 'No Own this',
      type: 'arrow',
      thisValue: 'inherited (cannot change)',
      description: 'Cannot rebind with call/apply/bind',
      code: `const obj = { name: "obj" };
const arrow = () => this;

// These do NOT change this for arrow functions
console.log(arrow.call(obj)); // window (not obj!)
console.log(arrow.apply(obj)); // window (not obj!)

const bound = arrow.bind(obj);
console.log(bound()); // window (not obj!)`,
      explanation: 'You cannot change an arrow function\'s `this` using call(), apply(), or bind(). The lexical `this` is permanent.'
    },
    {
      id: 'arrow-method-warning',
      name: 'Arrow as Method (Anti-pattern)',
      type: 'arrow',
      thisValue: 'enclosing scope (wrong!)',
      description: 'Avoid using arrows as methods',
      code: `const user = {
  name: "Alice",
  // ❌ Bad: Arrow as method
  greet: () => {
    console.log(\`Hello, \${this.name}\`);
  }
};

user.greet(); // "Hello, undefined"
// this is window, not user!`,
      explanation: 'Don\'t use arrow functions for object methods! The `this` will be from the enclosing scope (global), not the object.'
    }
  ],
  explicit: [
    {
      id: 'explicit-call',
      name: 'call() Method',
      type: 'explicit',
      thisValue: 'first argument',
      description: 'Invoke with custom this, args list',
      code: `function greet(greeting, punctuation) {
  console.log(\`\${greeting}, \${this.name}\${punctuation}\`);
}

const alice = { name: "Alice" };
const bob = { name: "Bob" };

greet.call(alice, "Hello", "!"); // "Hello, Alice!"
greet.call(bob, "Hi", "?");     // "Hi, Bob?"`,
      explanation: 'call() invokes the function immediately with the first argument as `this`, and remaining arguments passed individually.'
    },
    {
      id: 'explicit-apply',
      name: 'apply() Method',
      type: 'explicit',
      thisValue: 'first argument',
      description: 'Invoke with custom this, args array',
      code: `function greet(greeting, punctuation) {
  console.log(\`\${greeting}, \${this.name}\${punctuation}\`);
}

const alice = { name: "Alice" };
const args = ["Hey", "!!!"];

// apply takes an array of arguments
greet.apply(alice, args); // "Hey, Alice!!!"

// Useful for spreading array into arguments
Math.max.apply(null, [1, 5, 3]); // 5`,
      explanation: 'apply() is like call(), but takes arguments as an array. Great for passing dynamic argument lists.'
    },
    {
      id: 'explicit-bind',
      name: 'bind() Method',
      type: 'explicit',
      thisValue: 'permanently bound',
      description: 'Create new function with fixed this',
      code: `const user = {
  name: "Alice",
  greet() {
    console.log(\`Hello, \${this.name}\`);
  }
};

// Create a bound function
const greetAlice = user.greet.bind(user);

// Now it works even when called standalone!
const callback = greetAlice;
callback(); // "Hello, Alice" - this is preserved!`,
      explanation: 'bind() returns a new function with `this` permanently set. Perfect for callbacks and event handlers!'
    },
    {
      id: 'explicit-partial',
      name: 'Partial Application',
      type: 'explicit',
      thisValue: 'bound + partial args',
      description: 'Pre-fill arguments with bind',
      code: `function multiply(a, b) {
  return a * b;
}

// Create a "double" function by pre-filling first arg
const double = multiply.bind(null, 2);

console.log(double(5));  // 10
console.log(double(10)); // 20

// Pattern: creating specialized functions
const greet = (greeting, name) => \`\${greeting}, \${name}\`;
const sayHello = greet.bind(null, "Hello");
console.log(sayHello("Alice")); // "Hello, Alice"`,
      explanation: 'bind() can also pre-fill arguments (partial application). This creates specialized functions from general ones.'
    }
  ]
};

// Context colors
const contextColors: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  global: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400', icon: <Globe className="w-4 h-4" /> },
  function: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400', icon: <Code2 className="w-4 h-4" /> },
  method: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/50', text: 'text-cyan-400', icon: <Box className="w-4 h-4" /> },
  class: { bg: 'bg-amber-500/10', border: 'border-amber-500/50', text: 'text-amber-400', icon: <Box className="w-4 h-4" /> },
  arrow: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400', icon: <ArrowRight className="w-4 h-4" /> },
  explicit: { bg: 'bg-rose-500/10', border: 'border-rose-500/50', text: 'text-rose-400', icon: <Zap className="w-4 h-4" /> },
};

/**
 * ThisKeywordVisualizer Component
 * Interactive visualization of JavaScript's this keyword behavior
 */
export function ThisKeywordVisualizer({
  context = 'global',
  showStrictMode = true,
  animated = true,
  strictMode: initialStrictMode = false,
}: ThisKeywordVisualizerProps) {
  const [scenarios] = useState<BindingContext[]>(() => bindingScenarios[context] || []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [strictMode, setStrictMode] = useState(initialStrictMode);
  const [showExplanation, setShowExplanation] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectedScenario = scenarios[selectedIndex];
  const colors = contextColors[selectedScenario?.type || context];
  const baseDuration = 3000;
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance through scenarios
  useEffect(() => {
    if (!isPlaying || !animated || scenarios.length <= 1) return;

    intervalRef.current = setTimeout(() => {
      setSelectedIndex((prev) => (prev + 1) % scenarios.length);
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, selectedIndex, scenarios.length, duration, animated]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setSelectedIndex(0);
    setShowExplanation(false);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleScenarioSelect = useCallback((index: number) => {
    setSelectedIndex(index);
    setIsPlaying(false);
    setShowExplanation(false);
  }, []);

  if (!selectedScenario) {
    return (
      <Card className="w-full max-w-4xl mx-auto my-8 p-6">
        <p className="text-muted-foreground text-center">No scenarios available for this context.</p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">this Keyword Visualizer</h3>
          {showStrictMode && (
            <Button
              variant={strictMode ? 'default' : 'outline'}
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => setStrictMode(!strictMode)}
            >
              {strictMode ? '"use strict"' : 'Sloppy Mode'}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Explore how <code className="text-primary">this</code> behaves in different contexts
        </p>
      </div>

      {/* Scenario Tabs */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {scenarios.map((scenario, index) => (
            <Button
              key={scenario.id}
              variant={selectedIndex === index ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 text-xs transition-all',
                selectedIndex === index && colors.bg
              )}
              onClick={() => handleScenarioSelect(index)}
            >
              <span className={cn('mr-1.5', colors.text)}>{colors.icon}</span>
              {scenario.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-0">
        {/* Code Display */}
        <div className="p-6 border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Code Example
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded', colors.bg, colors.text)}>
              {selectedScenario.type}
            </span>
          </div>
          
          <motion.div
            key={selectedScenario.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <pre className="bg-secondary/50 border border-border rounded-xl p-4 overflow-x-auto text-sm font-mono">
              <code>{selectedScenario.code}</code>
            </pre>
          </motion.div>

          {/* Description */}
          <motion.div
            key={`desc-${selectedScenario.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-sm text-muted-foreground"
          >
            <span className="font-medium text-foreground">Scenario: </span>
            {selectedScenario.description}
          </motion.div>
        </div>

        {/* this Value Display */}
        <div className="p-6 bg-secondary/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Value of <code className="text-primary">this</code>
            </span>
          </div>

          {/* Animated this Value */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedScenario.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                'rounded-xl border-2 p-6 text-center',
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className={cn('p-2 rounded-lg', colors.bg)}>
                  <Target className={cn('w-6 h-6', colors.text)} />
                </div>
              </div>
              <div className="font-mono text-2xl font-bold text-foreground mb-2">
                this = <span className={colors.text}>{selectedScenario.thisValue}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedScenario.type === 'global' && 'The global object (window in browsers)'}
                {selectedScenario.type === 'function' && 'Depends on how the function is called'}
                {selectedScenario.type === 'method' && 'The object that owns the method'}
                {selectedScenario.type === 'class' && 'The class instance being created/used'}
                {selectedScenario.type === 'arrow' && 'Inherited from the enclosing scope'}
                {selectedScenario.type === 'explicit' && 'Explicitly set via call/apply/bind'}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Explanation Toggle */}
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => setShowExplanation(!showExplanation)}
            >
              <Lightbulb className={cn('w-4 h-4 mr-2', showExplanation && 'text-yellow-500')} />
              {showExplanation ? 'Hide' : 'Show'} Explanation
              <ChevronRight className={cn(
                'w-4 h-4 ml-auto transition-transform',
                showExplanation && 'rotate-90'
              )} />
            </Button>
            
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-4 rounded-lg bg-secondary/50 border border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedScenario.explanation}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Strict Mode Warning */}
      <AnimatePresence>
        {strictMode && selectedScenario.type === 'function' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-3 bg-amber-500/10 border-t border-amber-500/30"
          >
            <p className="text-sm text-amber-400">
              <strong>Strict Mode Active:</strong> In standalone function calls, <code>this</code> will be <code>undefined</code> instead of the global object.
            </p>
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
        label="Auto-cycle Scenarios"
      />
    </Card>
  );
}

export default ThisKeywordVisualizer;
