import type { CreateRoadmap } from '@/lib/db/schemas/roadmap';

/**
 * JavaScript Core Roadmap
 * Sub-roadmap for the Frontend Developer path

 *
 * Layout: Vertical flow with horizontal branching
 * Node positions are on a grid: x in steps of 200, y in steps of 120
 */
export const javascriptRoadmap: CreateRoadmap = {
  slug: 'javascript-core',
  title: 'JavaScript',
  description:
    'Comprehensive JavaScript learning path covering fundamentals to advanced concepts including variables, data types, functions, async programming, and more.',
  category: 'frontend',
  version: '2025.1',
  parentRoadmapSlug: 'frontend',
  parentNodeId: 'javascript',
  showInListing: true, // Show as standalone roadmap in listing
  estimatedHours: 80,
  difficulty: 5,
  prerequisites: ['html', 'css'],
  isActive: true,
  nodes: [
    // === ROW 0: INTRODUCTION ===
    {
      id: 'intro-js',
      title: 'Introduction to JavaScript',
      description:
        'Learn what JavaScript is, its history, and how it powers the modern web.',
      type: 'milestone',
      position: { x: 400, y: 0 },
      learningObjectives: [
        { title: 'What is JavaScript?', lessonId: 'what-is-javascript' },
        { title: 'History of JavaScript', lessonId: 'history-of-javascript' },
        { title: 'JavaScript Versions', lessonId: 'javascript-versions' },
        { title: 'How to Run JavaScript', lessonId: 'how-to-run-javascript' },
      ],
      resources: [
        {
          title: 'JavaScript.info - Introduction',
          type: 'documentation',
          description: 'Modern JavaScript Tutorial introduction',
        },
        {
          title: 'MDN JavaScript Guide',
          type: 'documentation',
          description: 'Mozilla Developer Network JS guide',
        },
      ],
      estimatedMinutes: 60,
      difficulty: 1,
      skillCluster: 'frontend',
      tags: ['javascript', 'basics', 'introduction'],
    },

    // === ROW 1: VARIABLES ===
    {
      id: 'variables',
      title: 'All About Variables',
      description:
        'Master variable declarations, scoping, hoisting, and naming conventions in JavaScript.',
      type: 'milestone',
      position: { x: 400, y: 120 },
      learningObjectives: [
        {
          title: 'Variable Declarations (var, let, const)',
          lessonId: 'variable-declarations',
        },
        { title: 'Hoisting', lessonId: 'hoisting' },
        { title: 'Variable Naming Rules', lessonId: 'variable-naming-rules' },
        { title: 'Variable Scopes', lessonId: 'variable-scopes' },
      ],
      resources: [
        {
          title: 'JavaScript Variables',
          type: 'article',
          description: 'Complete guide to JS variables',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 2,
      skillCluster: 'frontend',
      tags: ['javascript', 'variables', 'scope'],
    },

    // === ROW 2: DATA TYPES ===
    {
      id: 'data-types',
      title: 'Data Types',
      description:
        'Understand primitive and reference types, type checking, and built-in objects.',
      type: 'milestone',
      position: { x: 400, y: 240 },
      learningObjectives: [
        {
          title: 'Primitive Types (string, number, boolean, null, undefined, symbol, bigint)',
          lessonId: 'primitive-types',
        },
        { title: 'Object Type', lessonId: 'object-type' },
        { title: 'typeof Operator', lessonId: 'typeof-operator' },
        { title: 'Built-in Objects', lessonId: 'built-in-objects' },
      ],
      resources: [
        {
          title: 'JavaScript Data Types',
          type: 'documentation',
          description: 'MDN data types reference',
        },
      ],
      estimatedMinutes: 120,
      difficulty: 3,
      skillCluster: 'frontend',
      tags: ['javascript', 'data-types', 'primitives'],
    },

    // === ROW 3: TYPE CASTING ===
    {
      id: 'type-casting',
      title: 'Type Casting',
      description:
        'Learn explicit and implicit type conversions in JavaScript.',
      type: 'topic',
      position: { x: 400, y: 360 },
      learningObjectives: [
        { title: 'Type Conversion vs Coercion', lessonId: 'type-conversion-coercion' },
        { title: 'Explicit Type Casting', lessonId: 'explicit-type-casting' },
        { title: 'Implicit Type Casting', lessonId: 'implicit-type-casting' },
      ],
      resources: [
        {
          title: 'Type Conversions',
          type: 'article',
          description: 'JavaScript.info type conversions',
        },
      ],
      estimatedMinutes: 60,
      difficulty: 3,
      skillCluster: 'frontend',
      tags: ['javascript', 'type-casting', 'coercion'],
    },

    // === ROW 4: DATA STRUCTURES ===
    {
      id: 'data-structures',
      title: 'Data Structures',
      description:
        'Master arrays, objects, maps, sets, and other data structures in JavaScript.',
      type: 'milestone',
      position: { x: 400, y: 480 },
      learningObjectives: [
        { title: 'Indexed Collections (Arrays, Typed Arrays)', lessonId: 'indexed-collections' },
        { title: 'Keyed Collections (Map, WeakMap, Set, WeakSet)', lessonId: 'keyed-collections' },
        { title: 'Structured Data (JSON)', lessonId: 'structured-data-json' },
      ],
      resources: [
        {
          title: 'JavaScript Data Structures',
          type: 'documentation',
          description: 'MDN data structures guide',
        },
      ],
      estimatedMinutes: 150,
      difficulty: 4,
      skillCluster: 'frontend',
      tags: ['javascript', 'data-structures', 'arrays', 'objects'],
    },

    // === ROW 5: EQUALITY COMPARISONS ===
    {
      id: 'equality-comparisons',
      title: 'Equality Comparisons',
      description:
        'Understand the difference between loose and strict equality, and value comparison algorithms.',
      type: 'topic',
      position: { x: 400, y: 600 },
      learningObjectives: [
        { title: 'Loose Equality (==)', lessonId: 'loose-equality' },
        { title: 'Strict Equality (===)', lessonId: 'strict-equality' },
        { title: 'Same-value Equality (Object.is)', lessonId: 'same-value-equality' },
      ],
      resources: [
        {
          title: 'Equality Comparisons',
          type: 'documentation',
          description: 'MDN equality comparisons guide',
        },
      ],
      estimatedMinutes: 45,
      difficulty: 3,
      skillCluster: 'frontend',
      tags: ['javascript', 'equality', 'comparison'],
    },

    // === ROW 6: LOOPS AND ITERATIONS ===
    {
      id: 'loops',
      title: 'Loops and Iterations',
      description:
        'Learn all loop constructs and iteration patterns in JavaScript.',
      type: 'milestone',
      position: { x: 400, y: 720 },
      learningObjectives: [
        { title: 'for Loop', lessonId: 'for-loop' },
        { title: 'while and do...while', lessonId: 'while-loops' },
        { title: 'for...in Loop', lessonId: 'for-in-loop' },
        { title: 'for...of Loop', lessonId: 'for-of-loop' },
        { title: 'break and continue', lessonId: 'break-continue' },
      ],
      resources: [
        {
          title: 'Loops and Iteration',
          type: 'documentation',
          description: 'MDN loops guide',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 2,
      skillCluster: 'frontend',
      tags: ['javascript', 'loops', 'iteration'],
    },

    // === ROW 7: CONTROL FLOW ===
    {
      id: 'control-flow',
      title: 'Control Flow',
      description:
        'Master conditional statements and control flow mechanisms.',
      type: 'topic',
      position: { x: 400, y: 840 },
      learningObjectives: [
        { title: 'if...else Statements', lessonId: 'if-else-statements' },
        { title: 'switch Statement', lessonId: 'switch-statement' },
        { title: 'Ternary Operator', lessonId: 'ternary-operator' },
        { title: 'Exception Handling (try/catch/finally)', lessonId: 'exception-handling' },
      ],
      resources: [
        {
          title: 'Control Flow',
          type: 'documentation',
          description: 'MDN control flow guide',
        },
      ],
      estimatedMinutes: 75,
      difficulty: 2,
      skillCluster: 'frontend',
      tags: ['javascript', 'control-flow', 'conditionals'],
    },

    // === ROW 8: EXPRESSIONS AND OPERATORS ===
    {
      id: 'expressions-operators',
      title: 'Expressions and Operators',
      description:
        'Learn all JavaScript operators and expression types.',
      type: 'milestone',
      position: { x: 400, y: 960 },
      learningObjectives: [
        { title: 'Assignment Operators', lessonId: 'assignment-operators' },
        { title: 'Comparison Operators', lessonId: 'comparison-operators' },
        { title: 'Arithmetic Operators', lessonId: 'arithmetic-operators' },
        { title: 'Logical Operators', lessonId: 'logical-operators' },
        { title: 'Bitwise Operators', lessonId: 'bitwise-operators' },
        { title: 'String Operators', lessonId: 'string-operators' },
        { title: 'Conditional (Ternary) Operator', lessonId: 'conditional-operator' },
        { title: 'Comma Operator', lessonId: 'comma-operator' },
        { title: 'Unary Operators', lessonId: 'unary-operators' },
        { title: 'Relational Operators', lessonId: 'relational-operators' },
      ],
      resources: [
        {
          title: 'Expressions and Operators',
          type: 'documentation',
          description: 'MDN operators reference',
        },
      ],
      estimatedMinutes: 120,
      difficulty: 3,
      skillCluster: 'frontend',
      tags: ['javascript', 'operators', 'expressions'],
    },

    // === ROW 9: FUNCTIONS ===
    {
      id: 'functions',
      title: 'Functions',
      description:
        'Master function declarations, expressions, arrow functions, and advanced patterns.',
      type: 'milestone',
      position: { x: 400, y: 1080 },
      learningObjectives: [
        { title: 'Function Declarations', lessonId: 'function-declarations' },
        { title: 'Function Expressions', lessonId: 'function-expressions' },
        { title: 'Arrow Functions', lessonId: 'arrow-functions' },
        { title: 'Parameters and Arguments', lessonId: 'parameters-arguments' },
        { title: 'Default Parameters', lessonId: 'default-parameters' },
        { title: 'Rest Parameters', lessonId: 'rest-parameters' },
        { title: 'IIFE (Immediately Invoked Function Expression)', lessonId: 'iife' },
        { title: 'Closures', lessonId: 'closures' },
        { title: 'Recursion', lessonId: 'recursion' },
        { title: 'Built-in Functions', lessonId: 'built-in-functions' },
      ],
      resources: [
        {
          title: 'Functions Guide',
          type: 'documentation',
          description: 'MDN functions reference',
        },
        {
          title: 'JavaScript.info Functions',
          type: 'article',
          description: 'Advanced function concepts',
        },
      ],
      estimatedMinutes: 180,
      difficulty: 4,
      skillCluster: 'frontend',
      tags: ['javascript', 'functions', 'closures'],
    },

    // === ROW 10: STRICT MODE ===
    {
      id: 'strict-mode',
      title: 'Strict Mode',
      description:
        'Understand JavaScript strict mode and its benefits.',
      type: 'topic',
      position: { x: 200, y: 1200 },
      learningObjectives: [
        { title: 'What is Strict Mode?', lessonId: 'what-is-strict-mode' },
        { title: 'Enabling Strict Mode', lessonId: 'enabling-strict-mode' },
        { title: 'Strict Mode Changes', lessonId: 'strict-mode-changes' },
      ],
      resources: [
        {
          title: 'Strict Mode',
          type: 'documentation',
          description: 'MDN strict mode reference',
        },
      ],
      estimatedMinutes: 30,
      difficulty: 2,
      skillCluster: 'frontend',
      tags: ['javascript', 'strict-mode'],
    },

    // === ROW 10: THIS KEYWORD ===
    {
      id: 'this-keyword',
      title: 'Using this Keyword',
      description:
        'Master the this keyword and its behavior in different contexts.',
      type: 'milestone',
      position: { x: 600, y: 1200 },
      learningObjectives: [
        { title: 'this in Global Context', lessonId: 'this-global-context' },
        { title: 'this in Function Context', lessonId: 'this-function-context' },
        { title: 'this in Class Context', lessonId: 'this-class-context' },
        { title: 'this in Arrow Functions', lessonId: 'this-arrow-functions' },
        { title: 'Explicit Binding (call, apply, bind)', lessonId: 'explicit-binding' },
      ],
      resources: [
        {
          title: 'Understanding this',
          type: 'article',
          description: 'JavaScript.info this keyword',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['javascript', 'this', 'context'],
    },

    // === ROW 11: ASYNC JAVASCRIPT ===
    {
      id: 'async-javascript',
      title: 'Asynchronous JavaScript',
      description:
        'Learn callbacks, promises, async/await, and the event loop.',
      type: 'milestone',
      position: { x: 400, y: 1320 },
      learningObjectives: [
        { title: 'Event Loop', lessonId: 'event-loop' },
        { title: 'Callbacks', lessonId: 'callbacks' },
        { title: 'Promises', lessonId: 'promises' },
        { title: 'async/await', lessonId: 'async-await' },
        { title: 'setTimeout and setInterval', lessonId: 'timers' },
      ],
      resources: [
        {
          title: 'Asynchronous JavaScript',
          type: 'documentation',
          description: 'MDN async guide',
        },
        {
          title: 'JavaScript.info Promises',
          type: 'article',
          description: 'In-depth promises tutorial',
        },
      ],
      estimatedMinutes: 180,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['javascript', 'async', 'promises'],
    },

    // === ROW 12: WORKING WITH APIS ===
    {
      id: 'working-with-apis',
      title: 'Working with APIs',
      description:
        'Learn to interact with web APIs using fetch and XMLHttpRequest.',
      type: 'milestone',
      position: { x: 400, y: 1440 },
      learningObjectives: [
        { title: 'XMLHttpRequest (XHR)', lessonId: 'xmlhttprequest' },
        { title: 'Fetch API', lessonId: 'fetch-api' },
        { title: 'Handling JSON', lessonId: 'handling-json' },
        { title: 'Error Handling in API Calls', lessonId: 'api-error-handling' },
      ],
      resources: [
        {
          title: 'Fetch API',
          type: 'documentation',
          description: 'MDN Fetch API reference',
        },
      ],
      estimatedMinutes: 120,
      difficulty: 4,
      skillCluster: 'frontend',
      tags: ['javascript', 'api', 'fetch'],
    },

    // === ROW 13: CLASSES ===
    {
      id: 'classes',
      title: 'Classes',
      description:
        'Master ES6 classes, inheritance, and object-oriented patterns.',
      type: 'milestone',
      position: { x: 400, y: 1560 },
      learningObjectives: [
        { title: 'Class Declarations', lessonId: 'class-declarations' },
        { title: 'Constructor Method', lessonId: 'constructor-method' },
        { title: 'Instance Methods', lessonId: 'instance-methods' },
        { title: 'Static Methods and Properties', lessonId: 'static-methods' },
        { title: 'Inheritance (extends)', lessonId: 'class-inheritance' },
        { title: 'Private Fields', lessonId: 'private-fields' },
        { title: 'Getters and Setters', lessonId: 'getters-setters' },
      ],
      resources: [
        {
          title: 'Classes',
          type: 'documentation',
          description: 'MDN classes reference',
        },
      ],
      estimatedMinutes: 150,
      difficulty: 4,
      skillCluster: 'frontend',
      tags: ['javascript', 'classes', 'oop'],
    },

    // === ROW 14: ITERATORS AND GENERATORS ===
    {
      id: 'iterators-generators',
      title: 'Iterators and Generators',
      description:
        'Learn the iterator protocol and generator functions.',
      type: 'topic',
      position: { x: 200, y: 1680 },
      learningObjectives: [
        { title: 'Iterator Protocol', lessonId: 'iterator-protocol' },
        { title: 'Iterable Protocol', lessonId: 'iterable-protocol' },
        { title: 'Generator Functions', lessonId: 'generator-functions' },
        { title: 'yield Keyword', lessonId: 'yield-keyword' },
      ],
      resources: [
        {
          title: 'Iterators and Generators',
          type: 'documentation',
          description: 'MDN iterators guide',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['javascript', 'iterators', 'generators'],
    },

    // === ROW 14: MODULES ===
    {
      id: 'modules',
      title: 'Modules in JavaScript',
      description:
        'Learn ES modules, CommonJS, and module patterns.',
      type: 'milestone',
      position: { x: 600, y: 1680 },
      learningObjectives: [
        { title: 'ES Modules (import/export)', lessonId: 'es-modules' },
        { title: 'CommonJS Modules', lessonId: 'commonjs-modules' },
        { title: 'Dynamic Imports', lessonId: 'dynamic-imports' },
        { title: 'Module Patterns', lessonId: 'module-patterns' },
      ],
      resources: [
        {
          title: 'JavaScript Modules',
          type: 'documentation',
          description: 'MDN modules guide',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 4,
      skillCluster: 'frontend',
      tags: ['javascript', 'modules', 'es6'],
    },

    // === ROW 14.5: BUILD TOOLS ===
    {
      id: 'javascript',
      title: 'Build Tools',
      description:
        'Learn about package managers, bundlers, transpilers, and the complete build pipeline for modern web development.',
      type: 'milestone',
      position: { x: 400, y: 1740 },
      learningObjectives: [
        { title: 'Build Tools', lessonId: 'build-tools' },
      ],
      resources: [
        {
          title: 'Modern JavaScript Tooling',
          type: 'article',
          description: 'Overview of build tools ecosystem',
        },
      ],
      estimatedMinutes: 105,
      difficulty: 4,
      skillCluster: 'frontend',
      tags: ['javascript', 'build-tools', 'npm', 'webpack', 'vite'],
    },

    // === ROW 15: MEMORY MANAGEMENT ===
    {
      id: 'memory-management',
      title: 'Memory Management',
      description:
        'Understand memory lifecycle, garbage collection, and memory leaks.',
      type: 'topic',
      position: { x: 200, y: 1800 },
      learningObjectives: [
        { title: 'Memory Lifecycle', lessonId: 'memory-lifecycle' },
        { title: 'Garbage Collection', lessonId: 'garbage-collection' },
        { title: 'Memory Leaks', lessonId: 'memory-leaks' },
      ],
      resources: [
        {
          title: 'Memory Management',
          type: 'documentation',
          description: 'MDN memory management guide',
        },
      ],
      estimatedMinutes: 60,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['javascript', 'memory', 'performance'],
    },

    // === ROW 15: BROWSER DEVTOOLS ===
    {
      id: 'browser-devtools',
      title: 'Using Browser DevTools',
      description:
        'Master browser developer tools for debugging and profiling.',
      type: 'topic',
      position: { x: 600, y: 1800 },
      learningObjectives: [
        { title: 'Console API', lessonId: 'console-api' },
        { title: 'Debugging with Breakpoints', lessonId: 'debugging-breakpoints' },
        { title: 'Network Tab', lessonId: 'network-tab' },
        { title: 'Performance Profiling', lessonId: 'performance-profiling' },
        { title: 'Memory Profiling', lessonId: 'memory-profiling' },
      ],
      resources: [
        {
          title: 'Chrome DevTools',
          type: 'documentation',
          description: 'Chrome DevTools documentation',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 3,
      skillCluster: 'frontend',
      tags: ['javascript', 'devtools', 'debugging'],
    },
  ],

  edges: [
    // Main vertical flow
    { id: 'e1', source: 'intro-js', target: 'variables', type: 'sequential' },
    { id: 'e2', source: 'variables', target: 'data-types', type: 'sequential' },
    { id: 'e3', source: 'data-types', target: 'type-casting', type: 'sequential' },
    { id: 'e4', source: 'type-casting', target: 'data-structures', type: 'sequential' },
    { id: 'e5', source: 'data-structures', target: 'equality-comparisons', type: 'sequential' },
    { id: 'e6', source: 'equality-comparisons', target: 'loops', type: 'sequential' },
    { id: 'e7', source: 'loops', target: 'control-flow', type: 'sequential' },
    { id: 'e8', source: 'control-flow', target: 'expressions-operators', type: 'sequential' },
    { id: 'e9', source: 'expressions-operators', target: 'functions', type: 'sequential' },

    // After functions - split to strict mode and this keyword
    { id: 'e10', source: 'functions', target: 'strict-mode', type: 'recommended' },
    { id: 'e11', source: 'functions', target: 'this-keyword', type: 'sequential' },

    // Converge to async JavaScript
    { id: 'e12', source: 'strict-mode', target: 'async-javascript', type: 'recommended' },
    { id: 'e13', source: 'this-keyword', target: 'async-javascript', type: 'sequential' },

    // Continue main flow
    { id: 'e14', source: 'async-javascript', target: 'working-with-apis', type: 'sequential' },
    { id: 'e15', source: 'working-with-apis', target: 'classes', type: 'sequential' },

    // After classes - split to iterators/generators and modules
    { id: 'e16', source: 'classes', target: 'iterators-generators', type: 'recommended' },
    { id: 'e17', source: 'classes', target: 'modules', type: 'sequential' },

    // Modules to build tools
    { id: 'e17b', source: 'modules', target: 'javascript', type: 'sequential' },

    // Final topics
    { id: 'e18', source: 'iterators-generators', target: 'memory-management', type: 'recommended' },
    { id: 'e19', source: 'javascript', target: 'browser-devtools', type: 'sequential' },

    // Cross connections for recommended paths
    { id: 'e20', source: 'memory-management', target: 'browser-devtools', type: 'recommended' },
  ],
};
