'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, ChevronRight, RotateCcw, Circle, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Types for prototype chain visualization
export interface PrototypeProperty {
  name: string;
  type: 'method' | 'property';
  value: string;
  inherited: boolean;
}

export interface PrototypeNode {
  id: string;
  name: string;
  constructor: string;
  properties: PrototypeProperty[];
  isNull?: boolean;
}

export interface PrototypeChainExplorerProps {
  /** Object code to create (optional - uses default example) */
  object?: string;
  /** Whether to show methods */
  showMethods?: boolean;
  /** Whether to allow interactive navigation */
  interactive?: boolean;
}

// Default prototype chain for demonstration
const defaultChain: PrototypeNode[] = [
  {
    id: 'instance',
    name: 'myDog',
    constructor: 'Dog',
    properties: [
      { name: 'name', type: 'property', value: '"Buddy"', inherited: false },
      { name: 'age', type: 'property', value: '3', inherited: false },
      { name: 'bark', type: 'method', value: 'function() {...}', inherited: false },
    ],
  },
  {
    id: 'dog-prototype',
    name: 'Dog.prototype',
    constructor: 'Dog',
    properties: [
      { name: 'constructor', type: 'property', value: 'Dog', inherited: false },
      { name: 'speak', type: 'method', value: 'function() {...}', inherited: false },
      { name: 'eat', type: 'method', value: 'function() {...}', inherited: false },
    ],
  },
  {
    id: 'animal-prototype',
    name: 'Animal.prototype',
    constructor: 'Animal',
    properties: [
      { name: 'constructor', type: 'property', value: 'Animal', inherited: false },
      { name: 'breathe', type: 'method', value: 'function() {...}', inherited: false },
      { name: 'sleep', type: 'method', value: 'function() {...}', inherited: false },
    ],
  },
  {
    id: 'object-prototype',
    name: 'Object.prototype',
    constructor: 'Object',
    properties: [
      { name: 'constructor', type: 'property', value: 'Object', inherited: false },
      { name: 'toString', type: 'method', value: 'function() {...}', inherited: false },
      { name: 'hasOwnProperty', type: 'method', value: 'function() {...}', inherited: false },
      { name: 'valueOf', type: 'method', value: 'function() {...}', inherited: false },
    ],
  },
  {
    id: 'null',
    name: 'null',
    constructor: '',
    properties: [],
    isNull: true,
  },
];

// Example code for display
const exampleCode = `// Define Animal class
class Animal {
  breathe() { console.log("Breathing..."); }
  sleep() { console.log("Sleeping..."); }
}

// Dog extends Animal
class Dog extends Animal {
  constructor(name, age) {
    super();
    this.name = name;
    this.age = age;
  }
  bark() { console.log("Woof!"); }
  speak() { console.log(\`\${this.name} says woof!\`); }
  eat() { console.log("Eating..."); }
}

// Create instance
const myDog = new Dog("Buddy", 3);

// Prototype chain:
// myDog → Dog.prototype → Animal.prototype → Object.prototype → null`;

// Node colors based on position in chain
const nodeColors = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/50', text: 'text-pink-400' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400' },
  { bg: 'bg-zinc-500/10', border: 'border-zinc-500/50', text: 'text-zinc-400' },
];


/**
 * PrototypeChainExplorer Component
 * Interactive visualization of JavaScript prototype chain
 * Requirements: 5.7
 */
export function PrototypeChainExplorer({
  showMethods = true,
  interactive = true,
}: PrototypeChainExplorerProps) {
  const [chain] = useState<PrototypeNode[]>(defaultChain);
  const [selectedNode, setSelectedNode] = useState<string>(chain[0]?.id || '');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(chain.map(n => n.id))
  );

  const selectedNodeData = useMemo(
    () => chain.find(n => n.id === selectedNode),
    [chain, selectedNode]
  );

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!interactive) return;
    setSelectedNode(nodeId);
  }, [interactive]);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelectedNode(chain[0]?.id || '');
    setExpandedNodes(new Set(chain.map(n => n.id)));
  }, [chain]);

  // Get all inherited properties for selected node
  const inheritedProperties = useMemo(() => {
    const selectedIndex = chain.findIndex(n => n.id === selectedNode);
    if (selectedIndex === -1) return [];
    
    const inherited: Array<PrototypeProperty & { from: string }> = [];
    for (let i = selectedIndex + 1; i < chain.length; i++) {
      const node = chain[i];
      if (node.isNull) continue;
      node.properties.forEach(prop => {
        if (showMethods || prop.type === 'property') {
          inherited.push({ ...prop, from: node.name, inherited: true });
        }
      });
    }
    return inherited;
  }, [chain, selectedNode, showMethods]);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Prototype Chain Explorer</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Navigate through the prototype chain to see inherited properties and methods
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* Chain Visualization */}
        <div className="p-6 border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Prototype Chain
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            {chain.map((node, index) => (
              <div key={node.id} className="flex flex-col items-center">
                <PrototypeNodeCard
                  node={node}
                  colorIndex={index}
                  isSelected={selectedNode === node.id}
                  isExpanded={expandedNodes.has(node.id)}
                  showMethods={showMethods}
                  interactive={interactive}
                  onClick={() => handleNodeClick(node.id)}
                  onToggleExpand={() => handleToggleExpand(node.id)}
                />
                {index < chain.length - 1 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      [[Prototype]]
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Property Details */}
        <div className="p-6 bg-secondary/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {selectedNodeData?.name || 'Select a node'}
            </span>
          </div>

          {selectedNodeData && !selectedNodeData.isNull && (
            <div className="space-y-4">
              {/* Own Properties */}
              <div>
                <h4 className="text-xs font-medium text-foreground mb-2">
                  Own Properties
                </h4>
                <div className="space-y-1">
                  {selectedNodeData.properties
                    .filter(p => showMethods || p.type === 'property')
                    .map((prop) => (
                      <PropertyRow key={prop.name} property={prop} />
                    ))}
                  {selectedNodeData.properties.filter(p => showMethods || p.type === 'property').length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No own properties
                    </span>
                  )}
                </div>
              </div>

              {/* Inherited Properties */}
              {inheritedProperties.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-foreground mb-2">
                    Inherited Properties
                  </h4>
                  <div className="space-y-1 max-h-[200px] overflow-auto">
                    {inheritedProperties.map((prop, i) => (
                      <PropertyRow
                        key={`${prop.from}-${prop.name}-${i}`}
                        property={prop}
                        from={prop.from}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedNodeData?.isNull && (
            <div className="text-center py-8 text-muted-foreground">
              <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">End of prototype chain</p>
              <p className="text-xs mt-1">null has no properties</p>
            </div>
          )}
        </div>
      </div>

      {/* Code Example */}
      <div className="px-6 py-4 border-t border-border bg-secondary/5">
        <details className="group">
          <summary className="text-xs text-muted-foreground font-medium uppercase tracking-wide cursor-pointer hover:text-foreground">
            View Example Code
          </summary>
          <pre className="mt-3 text-xs font-mono bg-secondary/30 rounded-lg p-4 overflow-auto max-h-[200px]">
            {exampleCode}
          </pre>
        </details>
      </div>
    </Card>
  );
}

/**
 * Prototype node card component
 */
interface PrototypeNodeCardProps {
  node: PrototypeNode;
  colorIndex: number;
  isSelected: boolean;
  isExpanded: boolean;
  showMethods: boolean;
  interactive: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
}

function PrototypeNodeCard({
  node,
  colorIndex,
  isSelected,
  isExpanded,
  showMethods,
  interactive,
  onClick,
  onToggleExpand,
}: PrototypeNodeCardProps) {
  const colors = nodeColors[colorIndex % nodeColors.length];
  const visibleProps = node.properties.filter(p => showMethods || p.type === 'property');

  if (node.isNull) {
    return (
      <motion.div
        layout
        className={cn(
          'px-6 py-3 rounded-lg border-2 border-dashed',
          'border-zinc-600 bg-zinc-800/30 text-zinc-400',
          interactive && 'cursor-pointer',
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        onClick={onClick}
      >
        <span className="font-mono text-sm">null</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        'w-full max-w-[280px] rounded-lg border-2 overflow-hidden transition-all',
        colors.bg,
        colors.border,
        interactive && 'cursor-pointer hover:shadow-lg',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={onClick}
    >
      {/* Node Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          colors.bg
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'w-4 h-4 transition-transform',
              colors.text,
              isExpanded && 'rotate-90'
            )}
          />
          <span className={cn('font-mono text-sm font-medium', colors.text)}>
            {node.name}
          </span>
        </div>
        {node.constructor && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground">
            {node.constructor}
          </span>
        )}
      </div>

      {/* Properties */}
      <AnimatePresence>
        {isExpanded && visibleProps.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            <div className="px-3 py-2 space-y-1">
              {visibleProps.slice(0, 4).map((prop) => (
                <div
                  key={prop.name}
                  className="flex items-center gap-2 text-xs font-mono"
                >
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    prop.type === 'method' ? 'bg-yellow-500' : 'bg-cyan-500'
                  )} />
                  <span className="text-foreground">{prop.name}</span>
                </div>
              ))}
              {visibleProps.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{visibleProps.length - 4} more...
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Property row component
 */
function PropertyRow({
  property,
  from,
}: {
  property: PrototypeProperty;
  from?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-background/50 text-xs font-mono">
      <span className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        property.type === 'method' ? 'bg-yellow-500' : 'bg-cyan-500'
      )} />
      <span className="text-foreground">{property.name}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-emerald-400 truncate">{property.value}</span>
      {from && (
        <span className="text-[10px] text-muted-foreground ml-auto">
          from {from}
        </span>
      )}
    </div>
  );
}

// Export for testing
export { defaultChain, exampleCode };
export default PrototypeChainExplorer;
