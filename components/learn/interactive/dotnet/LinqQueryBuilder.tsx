'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Filter, ArrowRight, Layers, SortAsc, Group } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataItem {
  id: number;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

type LinqOperator = 'where' | 'select' | 'orderby' | 'first' | 'groupby';
type SyntaxMode = 'query' | 'method';

interface LinqQueryBuilderProps {
  initialData?: DataItem[];
  showBothSyntax?: boolean;
  defaultOperator?: LinqOperator;
}

// Sample data
const sampleProducts: DataItem[] = [
  { id: 1, name: 'Laptop', category: 'Electronics', price: 999, inStock: true },
  { id: 2, name: 'Phone', category: 'Electronics', price: 699, inStock: true },
  { id: 3, name: 'Book', category: 'Books', price: 29, inStock: false },
  { id: 4, name: 'Tablet', category: 'Electronics', price: 499, inStock: true },
  { id: 5, name: 'Headphones', category: 'Electronics', price: 199, inStock: false },
  { id: 6, name: 'Novel', category: 'Books', price: 15, inStock: true },
];

// Operator configurations
const operatorConfigs: Record<LinqOperator, {
  label: string;
  icon: React.ElementType;
  description: string;
  querySyntax: string;
  methodSyntax: string;
  color: string;
}> = {
  where: {
    label: 'Where (Filter)',
    icon: Filter,
    description: 'Filter items based on a condition',
    querySyntax: `from product in products
where product.Price > 100
select product`,
    methodSyntax: `products.Where(p => p.Price > 100)`,
    color: 'bg-blue-500',
  },
  select: {
    label: 'Select (Transform)',
    icon: Layers,
    description: 'Transform/project items to a new shape',
    querySyntax: `from product in products
select product.Name`,
    methodSyntax: `products.Select(p => p.Name)`,
    color: 'bg-green-500',
  },
  orderby: {
    label: 'OrderBy (Sort)',
    icon: SortAsc,
    description: 'Sort items by a property',
    querySyntax: `from product in products
orderby product.Price
select product`,
    methodSyntax: `products.OrderBy(p => p.Price)`,
    color: 'bg-purple-500',
  },
  first: {
    label: 'First / FirstOrDefault',
    icon: ArrowRight,
    description: 'Get the first matching item',
    querySyntax: `(from product in products
where product.InStock
select product).First()`,
    methodSyntax: `products.First(p => p.InStock)`,
    color: 'bg-orange-500',
  },
  groupby: {
    label: 'GroupBy',
    icon: Group,
    description: 'Group items by a key',
    querySyntax: `from product in products
group product by product.Category`,
    methodSyntax: `products.GroupBy(p => p.Category)`,
    color: 'bg-pink-500',
  },
};

/**
 * LinqQueryBuilder Component
 * Interactive LINQ query construction and visualization
 */
export function LinqQueryBuilder({
  initialData = sampleProducts,
  showBothSyntax = true,
  defaultOperator = 'where',
}: LinqQueryBuilderProps) {
  const [data] = useState<DataItem[]>(initialData);
  const [activeOperator, setActiveOperator] = useState<LinqOperator>(defaultOperator);
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>('method');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [filterValue, setFilterValue] = useState(100);

  // Compute result based on operator
  const result = useMemo(() => {
    switch (activeOperator) {
      case 'where':
        return data.filter((p) => p.price > filterValue);
      case 'select':
        return data.map((p) => p.name);
      case 'orderby':
        return [...data].sort((a, b) => a.price - b.price);
      case 'first':
        return data.filter((p) => p.inStock).slice(0, 1);
      case 'groupby':
        const groups: Record<string, DataItem[]> = {};
        data.forEach((p) => {
          if (!groups[p.category]) groups[p.category] = [];
          groups[p.category].push(p);
        });
        return groups;
      default:
        return data;
    }
  }, [data, activeOperator, filterValue]);

  const handleExecute = useCallback(() => {
    setIsExecuting(true);
    setShowResult(false);
    setTimeout(() => {
      setShowResult(true);
      setIsExecuting(false);
    }, 800);
  }, []);

  const config = operatorConfigs[activeOperator];

  return (
    <Card className="p-6 my-6 bg-linear-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">LINQ Query Builder</h3>
            <p className="text-sm text-muted-foreground">
              Learn LINQ operators interactively
            </p>
          </div>
        </div>
        
        {/* Syntax Toggle */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
          <button
            onClick={() => setSyntaxMode('query')}
            className={cn(
              'px-3 py-1 rounded text-sm transition-colors',
              syntaxMode === 'query' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Query Syntax
          </button>
          <button
            onClick={() => setSyntaxMode('method')}
            className={cn(
              'px-3 py-1 rounded text-sm transition-colors',
              syntaxMode === 'method' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            Method Syntax
          </button>
        </div>
      </div>

      {/* Operator Selection */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(operatorConfigs) as LinqOperator[]).map((op) => {
          const cfg = operatorConfigs[op];
          const Icon = cfg.icon;
          return (
            <button
              key={op}
              onClick={() => {
                setActiveOperator(op);
                setShowResult(false);
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all',
                activeOperator === op
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Source Data */}
      <div className="mb-4 p-4 bg-secondary/30 rounded-lg">
        <h4 className="font-medium mb-3">📊 Source Data: products</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">In Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <motion.tr
                  key={item.id}
                  className={cn(
                    'border-b border-border/50 transition-colors',
                    showResult && activeOperator === 'where' && item.price > filterValue && 'bg-green-500/10'
                  )}
                >
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">
                    <span className="px-2 py-0.5 bg-secondary rounded text-xs">{item.category}</span>
                  </td>
                  <td className="p-2">${item.price}</td>
                  <td className="p-2">
                    <span className={item.inStock ? 'text-green-400' : 'text-red-400'}>
                      {item.inStock ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Query Display */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Query Syntax */}
        <div className={cn(
          'p-4 rounded-lg border-2 transition-all',
          syntaxMode === 'query' ? 'border-primary bg-primary/5' : 'border-border'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              syntaxMode === 'query' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            )}>
              Query Syntax
            </span>
          </div>
          <pre className="font-mono text-sm whitespace-pre-wrap text-muted-foreground">
            {config.querySyntax}
          </pre>
        </div>

        {/* Method Syntax */}
        <div className={cn(
          'p-4 rounded-lg border-2 transition-all',
          syntaxMode === 'method' ? 'border-primary bg-primary/5' : 'border-border'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              syntaxMode === 'method' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            )}>
              Method Syntax
            </span>
          </div>
          <pre className="font-mono text-sm whitespace-pre-wrap text-muted-foreground">
            {config.methodSyntax}
          </pre>
        </div>
      </div>

      {/* Filter Value Control (for Where) */}
      {activeOperator === 'where' && (
        <div className="mb-4 flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
          <label className="text-sm">Filter: Price &gt;</label>
          <input
            type="range"
            min={0}
            max={1000}
            step={50}
            value={filterValue}
            onChange={(e) => {
              setFilterValue(Number(e.target.value));
              setShowResult(false);
            }}
            className="flex-1"
          />
          <span className="font-mono text-primary">${filterValue}</span>
        </div>
      )}

      {/* Execute Button */}
      <div className="mb-4">
        <Button onClick={handleExecute} disabled={isExecuting} className="w-full">
          {isExecuting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
              />
              Executing Query...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Execute Query
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-green-500/10 border-2 border-green-500/50 rounded-lg">
              <h4 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                ✓ Query Result
                <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded">
                  {Array.isArray(result) ? `${result.length} items` : `${Object.keys(result).length} groups`}
                </span>
              </h4>
              
              {activeOperator === 'select' ? (
                <div className="flex flex-wrap gap-2">
                  {(result as string[]).map((name, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="px-3 py-1 bg-background/50 rounded border border-border"
                    >
                      &quot;{name}&quot;
                    </motion.span>
                  ))}
                </div>
              ) : activeOperator === 'groupby' ? (
                <div className="space-y-3">
                  {Object.entries(result as Record<string, DataItem[]>).map(([category, items]) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 bg-background/50 rounded border border-border"
                    >
                      <div className="font-medium text-primary mb-2">{category}</div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <span key={item.id} className="text-sm px-2 py-1 bg-secondary rounded">
                            {item.name} (${item.price})
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(result as DataItem[]).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4 p-2 bg-background/50 rounded border border-border"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{item.category}</span>
                      <span className="text-primary">${item.price}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation */}
      <div className="mt-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg">
        <h4 className="font-medium text-blue-400 mb-2">💡 {config.label}</h4>
        <p className="text-sm text-muted-foreground">{config.description}</p>
        
        <div className="mt-3 text-sm space-y-1">
          <div className="text-muted-foreground">
            <strong>Key Points:</strong>
          </div>
          {activeOperator === 'where' && (
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Where filters items that match a condition</li>
              <li>Returns <code>IEnumerable&lt;T&gt;</code> - lazy evaluation!</li>
              <li>Similar to SQL&apos;s WHERE clause</li>
            </ul>
          )}
          {activeOperator === 'select' && (
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Select transforms each item (projection)</li>
              <li>Can change the type: <code>Select(p =&gt; p.Name)</code> returns strings</li>
              <li>Similar to SQL&apos;s SELECT clause</li>
            </ul>
          )}
          {activeOperator === 'orderby' && (
            <ul className="list-disc list-inside text-muted-foreground">
              <li>OrderBy sorts in ascending order</li>
              <li>Use <code>OrderByDescending</code> for reverse order</li>
              <li>Chain with <code>ThenBy</code> for secondary sorting</li>
            </ul>
          )}
          {activeOperator === 'first' && (
            <ul className="list-disc list-inside text-muted-foreground">
              <li>First throws if no match - use FirstOrDefault for safety</li>
              <li>Forces immediate execution (not deferred)</li>
              <li>Returns a single item, not a collection</li>
            </ul>
          )}
          {activeOperator === 'groupby' && (
            <ul className="list-disc list-inside text-muted-foreground">
              <li>GroupBy creates <code>IGrouping&lt;TKey, TElement&gt;</code></li>
              <li>Each group has a Key property and contains items</li>
              <li>Perfect for aggregations and summaries</li>
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

export type { LinqQueryBuilderProps, LinqOperator, DataItem };
export default LinqQueryBuilder;
