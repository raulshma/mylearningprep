'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Sparkles,
  Copy,
  RotateCcw,
} from 'lucide-react';

// Types
export interface ES6Feature {
  id: string;
  name: string;
  description: string;
  es5Code: string;
  es6Code: string;
  explanation: string;
  category: 'variables' | 'functions' | 'syntax' | 'objects' | 'modules';
}

export interface ES6FeatureExplorerProps {
  /** Initial feature to display */
  initialFeature?: string;
  /** Features to display (uses defaults if not provided) */
  features?: ES6Feature[];
  /** Callback when feature is selected */
  onFeatureSelect?: (feature: ES6Feature) => void;
  /** Show category filter */
  showCategories?: boolean;
}

// Default ES6 features with ES5 comparisons
const defaultFeatures: ES6Feature[] = [
  {
    id: 'let-const',
    name: 'let and const',
    description: 'Block-scoped variable declarations',
    category: 'variables',
    es5Code: `// ES5: var is function-scoped
var name = "Alice";
var age = 25;

// Problem: var leaks out of blocks
if (true) {
  var leaked = "I'm visible outside!";
}
console.log(leaked); // Works (bad!)

// No way to make constants
var PI = 3.14159;
PI = 3; // Oops, changed!`,
    es6Code: `// ES6: let and const are block-scoped
let name = "Alice";
const age = 25;

// let stays in its block
if (true) {
  let contained = "I'm only here!";
}
// console.log(contained); // Error!

// const prevents reassignment
const PI = 3.14159;
// PI = 3; // Error: Assignment to constant`,
    explanation: 'let and const provide block scoping, preventing accidental variable leaks. const also prevents reassignment, making your code more predictable.',
  },
  {
    id: 'arrow-functions',
    name: 'Arrow Functions',
    description: 'Shorter function syntax with lexical this',
    category: 'functions',
    es5Code: `// ES5: function keyword
var numbers = [1, 2, 3, 4, 5];

var doubled = numbers.map(function(n) {
  return n * 2;
});

// Problem with 'this'
var counter = {
  count: 0,
  start: function() {
    var self = this; // Save reference
    setInterval(function() {
      self.count++; // Use saved reference
    }, 1000);
  }
};`,
    es6Code: `// ES6: Arrow functions
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(n => n * 2);

// Arrow functions inherit 'this'
const counter = {
  count: 0,
  start() {
    setInterval(() => {
      this.count++; // 'this' works!
    }, 1000);
  }
};`,
    explanation: 'Arrow functions provide a shorter syntax and automatically bind "this" from the surrounding scope, eliminating the need for workarounds like "var self = this".',
  },
  {
    id: 'template-literals',
    name: 'Template Literals',
    description: 'String interpolation and multi-line strings',
    category: 'syntax',
    es5Code: `// ES5: String concatenation
var name = "Alice";
var age = 25;

var greeting = "Hello, " + name + "!\\n" +
  "You are " + age + " years old.";

// Multi-line strings are awkward
var html = "<div>\\n" +
  "  <h1>Title</h1>\\n" +
  "  <p>Content</p>\\n" +
  "</div>";`,
    es6Code: `// ES6: Template literals
const name = "Alice";
const age = 25;

const greeting = \`Hello, \${name}!
You are \${age} years old.\`;

// Multi-line strings are natural
const html = \`
  <div>
    <h1>Title</h1>
    <p>Content</p>
  </div>
\`;`,
    explanation: 'Template literals use backticks and allow embedded expressions with ${}, making string building much cleaner. They also support multi-line strings naturally.',
  },
  {
    id: 'destructuring',
    name: 'Destructuring',
    description: 'Extract values from arrays and objects',
    category: 'objects',
    es5Code: `// ES5: Manual extraction
var person = { name: "Alice", age: 25 };
var name = person.name;
var age = person.age;

var colors = ["red", "green", "blue"];
var first = colors[0];
var second = colors[1];

// Function parameters
function greet(options) {
  var name = options.name;
  var greeting = options.greeting || "Hello";
  console.log(greeting + ", " + name);
}`,
    es6Code: `// ES6: Destructuring
const person = { name: "Alice", age: 25 };
const { name, age } = person;

const colors = ["red", "green", "blue"];
const [first, second] = colors;

// Function parameters with defaults
function greet({ name, greeting = "Hello" }) {
  console.log(\`\${greeting}, \${name}\`);
}`,
    explanation: 'Destructuring lets you extract values from objects and arrays into variables in a single, readable statement. It also works in function parameters.',
  },
  {
    id: 'spread-rest',
    name: 'Spread & Rest Operators',
    description: 'Expand and collect array/object elements',
    category: 'syntax',
    es5Code: `// ES5: Array operations
var arr1 = [1, 2, 3];
var arr2 = [4, 5, 6];
var combined = arr1.concat(arr2);

// Copying arrays
var copy = arr1.slice();

// Function with variable arguments
function sum() {
  var args = Array.prototype.slice.call(arguments);
  return args.reduce(function(a, b) {
    return a + b;
  }, 0);
}`,
    es6Code: `// ES6: Spread and rest
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];

// Copying arrays
const copy = [...arr1];

// Rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}

// Object spread
const obj = { a: 1, b: 2 };
const extended = { ...obj, c: 3 };`,
    explanation: 'The spread operator (...) expands arrays/objects, while rest parameters collect multiple arguments into an array. Both make working with collections much easier.',
  },
  {
    id: 'default-params',
    name: 'Default Parameters',
    description: 'Set default values for function parameters',
    category: 'functions',
    es5Code: `// ES5: Manual default checking
function greet(name, greeting) {
  name = name || "Guest";
  greeting = greeting || "Hello";
  console.log(greeting + ", " + name + "!");
}

// Problem: falsy values
function setCount(count) {
  count = count || 10; // 0 becomes 10!
  return count;
}
setCount(0); // Returns 10, not 0`,
    es6Code: `// ES6: Default parameters
function greet(name = "Guest", greeting = "Hello") {
  console.log(\`\${greeting}, \${name}!\`);
}

// Works correctly with falsy values
function setCount(count = 10) {
  return count;
}
setCount(0); // Returns 0 correctly
setCount();  // Returns 10`,
    explanation: 'Default parameters provide fallback values when arguments are undefined. Unlike the || pattern, they correctly handle falsy values like 0 or empty strings.',
  },
  {
    id: 'classes',
    name: 'Classes',
    description: 'Cleaner syntax for constructor functions',
    category: 'objects',
    es5Code: `// ES5: Constructor functions
function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function() {
  console.log(this.name + " makes a sound");
};

// Inheritance is complex
function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;`,
    es6Code: `// ES6: Classes
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(\`\${this.name} makes a sound\`);
  }
}

// Clean inheritance
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
}`,
    explanation: 'Classes provide a cleaner, more familiar syntax for creating objects and handling inheritance. Under the hood, they still use prototypes.',
  },
  {
    id: 'modules',
    name: 'ES Modules',
    description: 'Native import/export for code organization',
    category: 'modules',
    es5Code: `// ES5: No native modules
// Option 1: Global variables (bad)
var MyModule = {
  doSomething: function() { }
};

// Option 2: IIFE pattern
var MyModule = (function() {
  var privateVar = "secret";
  
  return {
    publicMethod: function() {
      return privateVar;
    }
  };
})();

// Option 3: CommonJS (Node.js)
// module.exports = { ... };
// var mod = require('./module');`,
    es6Code: `// ES6: Native modules
// math.js
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}
export default class Calculator { }

// main.js
import Calculator, { PI, add } from './math.js';
import * as math from './math.js';

// Dynamic imports
const module = await import('./heavy-module.js');`,
    explanation: 'ES modules provide a standard way to organize code into reusable pieces. They support named exports, default exports, and even dynamic imports for code splitting.',
  },
];

const categoryLabels: Record<string, string> = {
  variables: 'Variables',
  functions: 'Functions',
  syntax: 'Syntax',
  objects: 'Objects & Classes',
  modules: 'Modules',
};

const categoryColors: Record<string, string> = {
  variables: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  functions: 'bg-green-500/10 text-green-500 border-green-500/30',
  syntax: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  objects: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  modules: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
};


/**
 * ES6FeatureExplorer Component
 * Shows ES5 vs ES6+ side-by-side comparisons with interactive feature selection
 * Requirements: 4.5
 */
export function ES6FeatureExplorer({
  initialFeature,
  features = defaultFeatures,
  onFeatureSelect,
  showCategories = true,
}: ES6FeatureExplorerProps) {
  const [selectedFeature, setSelectedFeature] = useState<ES6Feature>(
    features.find(f => f.id === initialFeature) || features[0]
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedExplanation, setExpandedExplanation] = useState(false);
  const [copiedSide, setCopiedSide] = useState<'es5' | 'es6' | null>(null);

  // Filter features by category
  const filteredFeatures = selectedCategory
    ? features.filter(f => f.category === selectedCategory)
    : features;

  // Get unique categories
  const categories = [...new Set(features.map(f => f.category))];

  // Handle feature selection
  const handleFeatureSelect = useCallback((feature: ES6Feature) => {
    setSelectedFeature(feature);
    setExpandedExplanation(false);
    onFeatureSelect?.(feature);
  }, [onFeatureSelect]);

  // Handle copy
  const handleCopy = useCallback(async (code: string, side: 'es5' | 'es6') => {
    await navigator.clipboard.writeText(code);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
  }, []);

  // Reset to first feature
  const handleReset = useCallback(() => {
    setSelectedFeature(features[0]);
    setSelectedCategory(null);
    setExpandedExplanation(false);
  }, [features]);

  return (
    <div className="w-full max-w-5xl mx-auto my-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          ES6+ Feature Explorer
        </h3>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {/* Category Filter */}
      {showCategories && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                selectedCategory !== category && categoryColors[category],
                'border'
              )}
            >
              {categoryLabels[category]}
            </Button>
          ))}
        </div>
      )}

      {/* Feature Selection */}
      <div className="flex flex-wrap gap-2">
        {filteredFeatures.map(feature => (
          <Button
            key={feature.id}
            variant={selectedFeature.id === feature.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFeatureSelect(feature)}
            className="gap-1"
          >
            {selectedFeature.id === feature.id && (
              <Check className="w-3 h-3" />
            )}
            {feature.name}
          </Button>
        ))}
      </div>

      {/* Feature Description */}
      <Card className="p-4 bg-secondary/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-lg">{selectedFeature.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedFeature.description}
            </p>
          </div>
          <span className={cn(
            'px-2 py-1 rounded-full text-xs border',
            categoryColors[selectedFeature.category]
          )}>
            {categoryLabels[selectedFeature.category]}
          </span>
        </div>
      </Card>

      {/* Side-by-Side Comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* ES5 Side */}
        <Card className="overflow-hidden border shadow-sm">
          <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">ES5 (Old Way)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(selectedFeature.es5Code, 'es5')}
              className="h-6 px-2"
            >
              {copiedSide === 'es5' ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
          <pre className="p-4 bg-zinc-950 text-sm font-mono overflow-auto max-h-[400px]">
            <code className="text-zinc-300">{selectedFeature.es5Code}</code>
          </pre>
        </Card>

        {/* ES6 Side */}
        <Card className="overflow-hidden border shadow-sm ring-2 ring-primary/20">
          <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">ES6+ (Modern Way)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(selectedFeature.es6Code, 'es6')}
              className="h-6 px-2"
            >
              {copiedSide === 'es6' ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
          <pre className="p-4 bg-zinc-950 text-sm font-mono overflow-auto max-h-[400px]">
            <code className="text-zinc-300">{selectedFeature.es6Code}</code>
          </pre>
        </Card>
      </div>

      {/* Arrow indicator */}
      <div className="hidden md:flex justify-center -my-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm">ES5</span>
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">ES6+</span>
        </div>
      </div>

      {/* Explanation */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setExpandedExplanation(!expandedExplanation)}
          className="w-full px-4 py-3 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium">Why use ES6+?</span>
          {expandedExplanation ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        <AnimatePresence>
          {expandedExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 text-sm text-muted-foreground border-t border-border">
                {selectedFeature.explanation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Tips */}
      <div className="text-xs text-muted-foreground">
        💡 Click on different features to compare ES5 and ES6+ syntax side by side.
      </div>
    </div>
  );
}

// Export for testing
export { defaultFeatures };
export default ES6FeatureExplorer;
