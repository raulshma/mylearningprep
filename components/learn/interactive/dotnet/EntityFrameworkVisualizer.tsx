'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Database, ArrowRight, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EntityExample {
  entity: string;
  linq: string;
  sql: string;
  result?: Record<string, unknown>[];
}

export interface EntityFrameworkVisualizerProps {
  examples?: EntityExample[];
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

const defaultExamples: EntityExample[] = [
  {
    entity: 'User',
    linq: 'context.Users.Where(u => u.Age > 18).ToList()',
    sql: 'SELECT * FROM Users WHERE Age > 18',
    result: [
      { Id: 1, Name: 'Alice', Age: 25 },
      { Id: 2, Name: 'Bob', Age: 30 },
    ],
  },
  {
    entity: 'Product',
    linq: 'context.Products.OrderBy(p => p.Price).Take(5).ToList()',
    sql: 'SELECT TOP 5 * FROM Products ORDER BY Price',
    result: [
      { Id: 101, Name: 'Widget', Price: 9.99 },
      { Id: 102, Name: 'Gadget', Price: 19.99 },
    ],
  },
  {
    entity: 'Order',
    linq: 'context.Orders.Include(o => o.Items).FirstOrDefault(o => o.Id == 1)',
    sql: 'SELECT o.*, i.* FROM Orders o LEFT JOIN OrderItems i ON o.Id = i.OrderId WHERE o.Id = 1',
    result: [
      { Id: 1, CustomerId: 1, Total: 49.99, Items: '[...]' },
    ],
  },
];

type TranslationPhase = 'idle' | 'linq' | 'translating' | 'sql' | 'executing' | 'result';

export function EntityFrameworkVisualizer({
  examples = defaultExamples,
  mode = 'beginner',
  title = 'Entity Framework Core',
}: EntityFrameworkVisualizerProps) {
  const [currentExample, setCurrentExample] = useState(0);
  const [phase, setPhase] = useState<TranslationPhase>('idle');
  const [isAnimating, setIsAnimating] = useState(false);

  const example = examples[currentExample];

  const resetDemo = () => {
    setPhase('idle');
    setIsAnimating(false);
  };

  const runQuery = async () => {
    setIsAnimating(true);
    
    setPhase('linq');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setPhase('translating');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setPhase('sql');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setPhase('executing');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setPhase('result');
    setIsAnimating(false);
  };

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Database className="h-4 w-4 text-green-400" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={currentExample}
            onChange={(e) => {
              setCurrentExample(Number(e.target.value));
              resetDemo();
            }}
            className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700"
          >
            {examples.map((ex, i) => (
              <option key={i} value={i}>{ex.entity} Query</option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDemo}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Beginner Analogy */}
        {mode === 'beginner' && phase === 'idle' && (
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-200 mb-2">🔮 EF Core is Like a Translator</h4>
            <p className="text-sm text-gray-400">
              You speak C# (LINQ), EF Core translates it to SQL that the database understands.
              It&apos;s like having a bilingual friend who handles all the database communication for you!
            </p>
          </div>
        )}

        {/* Start Button */}
        {phase === 'idle' && (
          <div className="text-center mb-4">
            <Button
              onClick={runQuery}
              disabled={isAnimating}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Run LINQ Query
            </Button>
          </div>
        )}

        {/* Visualization Flow */}
        <div className="space-y-4">
          {/* LINQ Query */}
          <motion.div
            className={cn(
              'p-4 rounded-lg border-2 transition-all duration-300',
              phase === 'linq' || phase === 'translating'
                ? 'border-purple-500 bg-purple-900/20'
                : 'border-gray-700 bg-gray-900/50'
            )}
            animate={phase === 'linq' ? { scale: 1.02 } : { scale: 1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-purple-400">C# / LINQ</span>
              {phase === 'linq' && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-purple-300"
                >
                  ← Your Code
                </motion.span>
              )}
            </div>
            <code className="text-sm font-mono text-gray-300 block">
              {example.linq}
            </code>
          </motion.div>

          {/* Translation Arrow */}
          <AnimatePresence>
            {(phase === 'translating' || phase === 'sql' || phase === 'executing' || phase === 'result') && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-6 w-6 text-gray-500 rotate-90" />
                  <span className="text-xs text-gray-500">EF Core translates</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SQL Query */}
          <AnimatePresence>
            {(phase === 'sql' || phase === 'executing' || phase === 'result') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all duration-300',
                  phase === 'sql' || phase === 'executing'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-900/50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-3 w-3 text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">SQL (Generated)</span>
                  {phase === 'executing' && (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-xs text-blue-300"
                    >
                      Executing...
                    </motion.span>
                  )}
                </div>
                <code className="text-sm font-mono text-gray-300 block">
                  {example.sql}
                </code>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {phase === 'result' && example.result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border-2 border-green-500 bg-green-900/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Table className="h-3 w-3 text-green-400" />
                  <span className="text-xs font-medium text-green-400">Results</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {Object.keys(example.result[0]).map(key => (
                          <th key={key} className="text-left p-2 text-gray-400 font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {example.result.map((row, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="border-b border-gray-800"
                        >
                          {Object.values(row).map((value, j) => (
                            <td key={j} className="p-2 text-gray-300">
                              {String(value)}
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Advanced: Performance Tips */}
        {mode === 'advanced' && phase === 'result' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 bg-amber-900/20 border border-amber-700 rounded-lg"
          >
            <h5 className="text-xs font-medium text-amber-400 mb-1">⚡ Performance Tips</h5>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Use <code className="text-cyan-400">.AsNoTracking()</code> for read-only queries</li>
              <li>• Prefer <code className="text-cyan-400">.Select()</code> to project only needed columns</li>
              <li>• Use <code className="text-cyan-400">.Include()</code> wisely to avoid N+1 queries</li>
            </ul>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default EntityFrameworkVisualizer;
