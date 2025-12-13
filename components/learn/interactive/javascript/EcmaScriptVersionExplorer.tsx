'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code,
  ChevronDown,
  Check,
  Star,
  Sparkles,
  BookOpen,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EcmaScriptVersionExplorerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
}

interface VersionFeature {
  name: string;
  description: string;
  code?: string;
  oldCode?: string;
}

interface ECMAScriptVersion {
  version: string;
  year: number;
  nickname: string;
  features: VersionFeature[];
  significance: 'low' | 'medium' | 'high';
  color: string;
}

const versions: ECMAScriptVersion[] = [
  {
    version: 'ES5',
    year: 2009,
    nickname: 'The Foundation',
    significance: 'high',
    color: 'from-gray-500 to-slate-600',
    features: [
      {
        name: 'Strict Mode',
        description: 'Catches common coding mistakes and unsafe actions',
        code: '"use strict";\nundeclaredVar = 5; // Error!',
      },
      {
        name: 'Array Methods',
        description: 'forEach, map, filter, reduce, every, some',
        code: '[1, 2, 3].map(x => x * 2); // [2, 4, 6]',
      },
      {
        name: 'JSON Support',
        description: 'Native JSON.parse() and JSON.stringify()',
        code: 'JSON.stringify({ a: 1 }); // \'{"a":1}\'',
      },
    ],
  },
  {
    version: 'ES6/ES2015',
    year: 2015,
    nickname: 'The Revolution',
    significance: 'high',
    color: 'from-orange-500 to-red-500',
    features: [
      {
        name: 'let & const',
        description: 'Block-scoped variable declarations',
        oldCode: 'var x = 1;\nvar x = 2; // No error',
        code: 'let x = 1;\nconst y = 2;\n// let x = 3; // Error!',
      },
      {
        name: 'Arrow Functions',
        description: 'Shorter function syntax with lexical this',
        oldCode: 'function add(a, b) {\n  return a + b;\n}',
        code: 'const add = (a, b) => a + b;',
      },
      {
        name: 'Template Literals',
        description: 'String interpolation with backticks',
        oldCode: '"Hello, " + name + "!"',
        code: '`Hello, ${name}!`',
      },
      {
        name: 'Destructuring',
        description: 'Extract values from arrays/objects elegantly',
        oldCode: 'var x = obj.x;\nvar y = obj.y;',
        code: 'const { x, y } = obj;',
      },
      {
        name: 'Classes',
        description: 'Cleaner syntax for object-oriented programming',
        code: 'class Dog {\n  constructor(name) {\n    this.name = name;\n  }\n  bark() { return "Woof!"; }\n}',
      },
      {
        name: 'Promises',
        description: 'Async operations made manageable',
        code: 'fetch(url)\n  .then(r => r.json())\n  .catch(err => console.error(err));',
      },
    ],
  },
  {
    version: 'ES2017',
    year: 2017,
    nickname: 'Async Era',
    significance: 'high',
    color: 'from-cyan-500 to-blue-500',
    features: [
      {
        name: 'async/await',
        description: 'Write async code that looks synchronous',
        oldCode: 'fetch(url)\n  .then(r => r.json())\n  .then(data => use(data));',
        code: 'const r = await fetch(url);\nconst data = await r.json();',
      },
      {
        name: 'Object.entries/values',
        description: 'Get key-value pairs or values as arrays',
        code: 'Object.entries({ a: 1 }); // [["a", 1]]',
      },
    ],
  },
  {
    version: 'ES2020',
    year: 2020,
    nickname: 'Safe Access',
    significance: 'medium',
    color: 'from-purple-500 to-pink-500',
    features: [
      {
        name: 'Optional Chaining',
        description: 'Safely access nested properties',
        oldCode: 'user && user.address && user.address.city',
        code: 'user?.address?.city',
      },
      {
        name: 'Nullish Coalescing',
        description: 'Default only for null/undefined',
        oldCode: 'value || "default" // 0 gives "default" 😱',
        code: 'value ?? "default" // 0 stays 0 ✓',
      },
      {
        name: 'BigInt',
        description: 'Integers larger than Number.MAX_SAFE_INTEGER',
        code: 'const big = 9007199254740993n;',
      },
    ],
  },
  {
    version: 'ES2022',
    year: 2022,
    nickname: 'Class Fields',
    significance: 'medium',
    color: 'from-emerald-500 to-green-600',
    features: [
      {
        name: 'Private Fields',
        description: 'True private properties in classes',
        code: 'class Counter {\n  #count = 0; // Private!\n  increment() { this.#count++; }\n}',
      },
      {
        name: 'Top-level await',
        description: 'Use await at module level',
        code: 'const config = await loadConfig();',
      },
      {
        name: 'Object.hasOwn()',
        description: 'Safer property check',
        oldCode: 'obj.hasOwnProperty("key")',
        code: 'Object.hasOwn(obj, "key")',
      },
    ],
  },
  {
    version: 'ES2023',
    year: 2023,
    nickname: 'Immutable Arrays',
    significance: 'medium',
    color: 'from-teal-500 to-cyan-600',
    features: [
      {
        name: 'toSorted/toReversed',
        description: 'Non-mutating array methods',
        oldCode: 'arr.sort(); // Mutates original!',
        code: 'arr.toSorted(); // Returns new array',
      },
      {
        name: 'Array.with()',
        description: 'Replace element immutably',
        oldCode: 'arr[1] = "new"; // Mutates',
        code: 'arr.with(1, "new"); // New array',
      },
      {
        name: 'findLast/findLastIndex',
        description: 'Search from the end',
        code: '[1, 2, 3, 2].findLast(x => x === 2); // 2',
      },
    ],
  },
  {
    version: 'ES2024',
    year: 2024,
    nickname: 'Grouping',
    significance: 'high',
    color: 'from-violet-500 to-purple-600',
    features: [
      {
        name: 'Object.groupBy',
        description: 'Group array elements by key',
        code: 'Object.groupBy(\n  [{t:"a"}, {t:"b"}, {t:"a"}],\n  x => x.t\n); // {a: [...], b: [...]}',
      },
      {
        name: 'Promise.withResolvers',
        description: 'Create promise with external control',
        code: 'const { promise, resolve, reject } =\n  Promise.withResolvers();',
      },
      {
        name: 'RegExp v flag',
        description: 'Enhanced Unicode regex',
        code: '/[\\p{Emoji}--\\p{ASCII}]/v',
      },
    ],
  },
];

export function EcmaScriptVersionExplorer({ mode = 'beginner' }: EcmaScriptVersionExplorerProps) {
  const [selectedVersion, setSelectedVersion] = useState<string>('ES6/ES2015');
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const filteredVersions = mode === 'beginner'
    ? versions.filter(v => v.significance === 'high')
    : versions;

  const currentVersion = filteredVersions.find(v => v.version === selectedVersion) || filteredVersions[0];

  const handleVersionSelect = useCallback((version: string) => {
    setSelectedVersion(version);
    setExpandedFeature(null);
  }, []);

  const handleFeatureToggle = useCallback((featureName: string) => {
    setExpandedFeature(prev => prev === featureName ? null : featureName);
  }, []);

  return (
    <div className="my-8 p-6 rounded-2xl bg-gradient-to-br from-background to-muted/30 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Layers className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">ECMAScript Version Explorer</h3>
          <p className="text-sm text-muted-foreground">
            {mode === 'beginner' 
              ? 'Compare major JavaScript versions'
              : mode === 'intermediate'
              ? 'Explore features with before/after code'
              : 'Complete version history with all features'}
          </p>
        </div>
      </div>

      {/* Version Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filteredVersions.map(version => (
          <Button
            key={version.version}
            variant={selectedVersion === version.version ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleVersionSelect(version.version)}
            className={cn(
              'transition-all',
              selectedVersion === version.version && 'shadow-md'
            )}
          >
            <span className="mr-1">{version.year}</span>
            <span className="font-bold">{version.version.replace('ES2', 'ES20').split('/')[0]}</span>
          </Button>
        ))}
      </div>

      {/* Version Details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentVersion.version}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className={cn(
            'p-4 bg-gradient-to-r text-white',
            currentVersion.color
          )}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <h4 className="text-xl font-bold">{currentVersion.version}</h4>
                </div>
                <p className="text-sm opacity-90">
                  {currentVersion.year} — &ldquo;{currentVersion.nickname}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-1">
                {currentVersion.significance === 'high' && (
                  <>
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </>
                )}
                {currentVersion.significance === 'medium' && (
                  <>
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 opacity-50" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="p-4 bg-card space-y-3">
            {currentVersion.features.map(feature => (
              <motion.div
                key={feature.name}
                className="rounded-lg border border-border overflow-hidden"
              >
                <button
                  onClick={() => handleFeatureToggle(feature.name)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-foreground">{feature.name}</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      'w-4 h-4 text-muted-foreground transition-transform',
                      expandedFeature === feature.name && 'rotate-180'
                    )}
                  />
                </button>

                <AnimatePresence>
                  {expandedFeature === feature.name && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 pt-0 border-t border-border bg-muted/20">
                        <p className="text-sm text-muted-foreground mb-3">
                          {feature.description}
                        </p>

                        {(mode === 'intermediate' || mode === 'advanced') && feature.oldCode && (
                          <div className="grid md:grid-cols-2 gap-3 mb-3">
                            <div>
                              <div className="text-xs text-red-500 font-medium mb-1 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500/50" />
                                Before
                              </div>
                              <pre className="p-2 rounded text-xs bg-red-950/30 text-red-200 border border-red-500/20 overflow-x-auto">
                                <code>{feature.oldCode}</code>
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs text-green-500 font-medium mb-1 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500/50" />
                                After
                              </div>
                              <pre className="p-2 rounded text-xs bg-green-950/30 text-green-200 border border-green-500/20 overflow-x-auto">
                                <code>{feature.code}</code>
                              </pre>
                            </div>
                          </div>
                        )}

                        {!feature.oldCode && feature.code && (
                          <pre className="p-2 rounded text-xs bg-slate-900 text-slate-100 overflow-x-auto">
                            <code>{feature.code}</code>
                          </pre>
                        )}

                        {mode === 'beginner' && feature.code && !feature.oldCode && (
                          <pre className="p-2 rounded text-xs bg-slate-900 text-slate-100 overflow-x-auto">
                            <code>{feature.code}</code>
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Info Footer */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="w-4 h-4" />
        <span>
          {mode === 'beginner' 
            ? 'Showing major versions. Switch to intermediate for more details!'
            : `Showing ${filteredVersions.length} versions with ${currentVersion.features.length} features highlighted`}
        </span>
      </div>
    </div>
  );
}

export default EcmaScriptVersionExplorer;
