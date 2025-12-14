'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  List, 
  Plus, 
  Minus, 
  Shuffle, 
  Search,
  ArrowRight,
  Binary,
  MemoryStick
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Types for indexed collection visualization
export type ArrayOperation = 'push' | 'pop' | 'shift' | 'unshift' | 'splice' | 'slice' | 'at' | 'find';
export type CollectionType = 'array' | 'int8' | 'uint8' | 'int16' | 'int32' | 'float32' | 'float64';

export interface IndexedCollectionVisualizerProps {
  /** Initial array to visualize */
  initialArray?: (number | string)[];
  /** Collection type to display */
  collectionType?: CollectionType;
  /** Whether to show the operation panel */
  showOperations?: boolean;
  /** Whether to show typed array comparison */
  showTypedArrays?: boolean;
}

// Collection type configurations
const collectionTypes: Record<CollectionType, { 
  name: string; 
  description: string; 
  bytes: number;
  min?: number;
  max?: number;
  color: string;
}> = {
  array: { 
    name: 'Array', 
    description: 'Dynamic, any type', 
    bytes: 8, // approximation for reference
    color: 'bg-blue-500/20 border-blue-500/50 text-blue-400'
  },
  int8: { 
    name: 'Int8Array', 
    description: '8-bit signed integer', 
    bytes: 1, 
    min: -128, 
    max: 127,
    color: 'bg-green-500/20 border-green-500/50 text-green-400'
  },
  uint8: { 
    name: 'Uint8Array', 
    description: '8-bit unsigned integer', 
    bytes: 1, 
    min: 0, 
    max: 255,
    color: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
  },
  int16: { 
    name: 'Int16Array', 
    description: '16-bit signed integer', 
    bytes: 2, 
    min: -32768, 
    max: 32767,
    color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
  },
  int32: { 
    name: 'Int32Array', 
    description: '32-bit signed integer', 
    bytes: 4, 
    min: -2147483648, 
    max: 2147483647,
    color: 'bg-orange-500/20 border-orange-500/50 text-orange-400'
  },
  float32: { 
    name: 'Float32Array', 
    description: '32-bit floating point', 
    bytes: 4,
    color: 'bg-purple-500/20 border-purple-500/50 text-purple-400'
  },
  float64: { 
    name: 'Float64Array', 
    description: '64-bit floating point', 
    bytes: 8,
    color: 'bg-pink-500/20 border-pink-500/50 text-pink-400'
  },
};

// Operation descriptions
const operationDescriptions: Record<ArrayOperation, string> = {
  push: 'Adds element(s) to the end and returns new length',
  pop: 'Removes and returns the last element',
  shift: 'Removes and returns the first element',
  unshift: 'Adds element(s) to the beginning and returns new length',
  splice: 'Changes array by removing/replacing/adding elements',
  slice: 'Returns a shallow copy of a portion of the array',
  at: 'Returns element at the given index (supports negative)',
  find: 'Returns the first element that satisfies the condition',
};

/**
 * IndexedCollectionVisualizer Component
 * Interactive visualization of Arrays and Typed Arrays
 */
export function IndexedCollectionVisualizer({
  initialArray = [10, 20, 30, 40, 50],
  collectionType: initialType = 'array',
  showOperations = true,
  showTypedArrays = true,
}: IndexedCollectionVisualizerProps) {
  const [array, setArray] = useState<(number | string)[]>(initialArray);
  const [collectionType, setCollectionType] = useState<CollectionType>(initialType);
  const [selectedOperation, setSelectedOperation] = useState<ArrayOperation>('push');
  const [inputValue, setInputValue] = useState('60');
  const [indexValue, setIndexValue] = useState('0');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());

  // Calculate memory usage
  const memoryInfo = useMemo(() => {
    const config = collectionTypes[collectionType];
    const totalBytes = array.length * config.bytes;
    return {
      bytesPerElement: config.bytes,
      totalBytes,
      formatted: totalBytes < 1024 ? `${totalBytes} bytes` : `${(totalBytes / 1024).toFixed(2)} KB`
    };
  }, [array.length, collectionType]);

  const executeOperation = useCallback(() => {
    const value = collectionType === 'array' ? inputValue : Number(inputValue);
    const index = parseInt(indexValue, 10);
    let result: unknown;
    
    switch (selectedOperation) {
      case 'push':
        setArray(prev => {
          const newArray = [...prev, value];
          setAnimatingIndices(new Set([newArray.length - 1]));
          return newArray;
        });
        result = array.length + 1;
        break;
        
      case 'pop':
        if (array.length > 0) {
          result = array[array.length - 1];
          setArray(prev => prev.slice(0, -1));
        } else {
          result = undefined;
        }
        break;
        
      case 'shift':
        if (array.length > 0) {
          result = array[0];
          setArray(prev => prev.slice(1));
        } else {
          result = undefined;
        }
        break;
        
      case 'unshift':
        setArray(prev => {
          setAnimatingIndices(new Set([0]));
          return [value, ...prev];
        });
        result = array.length + 1;
        break;
        
      case 'splice':
        setArray(prev => {
          const newArray = [...prev];
          newArray.splice(index, 1, value as never);
          setAnimatingIndices(new Set([index]));
          return newArray;
        });
        result = `Replaced at index ${index}`;
        break;
        
      case 'slice':
        const endIndex = Math.min(index + 3, array.length);
        result = JSON.stringify(array.slice(index, endIndex));
        setHighlightedIndex(index);
        break;
        
      case 'at':
        const atIndex = index < 0 ? array.length + index : index;
        result = array[atIndex];
        setHighlightedIndex(atIndex);
        break;
        
      case 'find':
        const foundIndex = array.findIndex(item => item === value);
        result = foundIndex >= 0 ? `Found at index ${foundIndex}` : 'Not found';
        if (foundIndex >= 0) setHighlightedIndex(foundIndex);
        break;
    }
    
    setLastResult(result !== undefined ? String(result) : 'undefined');
    
    // Clear animations after delay
    setTimeout(() => {
      setAnimatingIndices(new Set());
      setHighlightedIndex(null);
    }, 1500);
  }, [selectedOperation, inputValue, indexValue, array, collectionType]);

  const resetArray = useCallback(() => {
    setArray(initialArray);
    setLastResult(null);
    setHighlightedIndex(null);
    setAnimatingIndices(new Set());
  }, [initialArray]);

  const shuffleArray = useCallback(() => {
    setArray(prev => {
      const newArray = [...prev];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    });
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Indexed Collection Visualizer</h3>
          </div>
          {showTypedArrays && (
            <Select 
              value={collectionType} 
              onValueChange={(v) => setCollectionType(v as CollectionType)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(collectionTypes).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {collectionTypes[collectionType].description}
        </p>
      </div>

      {/* Array Visualization */}
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {collectionTypes[collectionType].name} ({array.length} elements)
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MemoryStick className="w-3 h-3" />
            <span>{memoryInfo.formatted}</span>
          </div>
        </div>

        {/* Index Row */}
        <div className="flex flex-wrap gap-1 mb-1">
          {array.map((_, index) => (
            <div
              key={`index-${index}`}
              className="w-14 text-center text-xs text-muted-foreground"
            >
              [{index}]
            </div>
          ))}
        </div>

        {/* Array Elements */}
        <div className="flex flex-wrap gap-1 mb-4">
          <AnimatePresence mode="popLayout">
            {array.map((item, index) => (
              <motion.div
                key={`${index}-${item}`}
                layout
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  scale: animatingIndices.has(index) ? 1.1 : 1,
                }}
                exit={{ opacity: 0, scale: 0.5, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={cn(
                  'w-14 h-14 flex items-center justify-center rounded-lg border-2 font-mono text-sm transition-all',
                  collectionTypes[collectionType].color,
                  highlightedIndex === index && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  animatingIndices.has(index) && 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-background'
                )}
              >
                {typeof item === 'number' ? item : `"${item}"`}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {array.length === 0 && (
            <div className="w-full text-center py-8 text-muted-foreground">
              Array is empty
            </div>
          )}
        </div>

        {/* Memory Layout for Typed Arrays */}
        {collectionType !== 'array' && array.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-zinc-900 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Binary className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                Memory Layout ({memoryInfo.bytesPerElement} byte{memoryInfo.bytesPerElement > 1 ? 's' : ''} per element)
              </span>
            </div>
            <div className="flex gap-0.5 overflow-x-auto">
              {array.slice(0, 8).map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="h-6 flex items-center justify-center text-[10px] font-mono border border-border"
                    style={{ width: `${memoryInfo.bytesPerElement * 20}px` }}
                  >
                    {item}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {index * memoryInfo.bytesPerElement}-{(index + 1) * memoryInfo.bytesPerElement - 1}
                  </span>
                </div>
              ))}
              {array.length > 8 && (
                <div className="flex items-center px-2 text-muted-foreground">...</div>
              )}
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30"
          >
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-sm">
                <span className="text-muted-foreground">Result: </span>
                <span className="font-mono text-primary">{lastResult}</span>
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Operations Panel */}
      {showOperations && (
        <div className="px-6 py-4 border-t border-border bg-secondary/20">
          <div className="flex flex-wrap items-center gap-3">
            <Select 
              value={selectedOperation} 
              onValueChange={(v) => setSelectedOperation(v as ArrayOperation)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="push">.push()</SelectItem>
                <SelectItem value="pop">.pop()</SelectItem>
                <SelectItem value="shift">.shift()</SelectItem>
                <SelectItem value="unshift">.unshift()</SelectItem>
                <SelectItem value="splice">.splice()</SelectItem>
                <SelectItem value="slice">.slice()</SelectItem>
                <SelectItem value="at">.at()</SelectItem>
                <SelectItem value="find">.find()</SelectItem>
              </SelectContent>
            </Select>

            {['push', 'unshift', 'splice', 'find'].includes(selectedOperation) && (
              <Input
                type={collectionType === 'array' ? 'text' : 'number'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-20"
                placeholder="Value"
              />
            )}

            {['splice', 'slice', 'at'].includes(selectedOperation) && (
              <Input
                type="number"
                value={indexValue}
                onChange={(e) => setIndexValue(e.target.value)}
                className="w-20"
                placeholder="Index"
              />
            )}

            <Button onClick={executeOperation} size="sm">
              Execute
            </Button>

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={shuffleArray}>
              <Shuffle className="w-4 h-4 mr-1" />
              Shuffle
            </Button>

            <Button variant="outline" size="sm" onClick={resetArray}>
              Reset
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {operationDescriptions[selectedOperation]}
          </p>
        </div>
      )}

      {/* Type Comparison */}
      {showTypedArrays && collectionType !== 'array' && (
        <div className="px-6 py-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">
            Type Constraints: {collectionTypes[collectionType].min !== undefined && (
              <span className="font-mono">
                {collectionTypes[collectionType].min} to {collectionTypes[collectionType].max}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Fixed size</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Contiguous memory</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Faster operations</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default IndexedCollectionVisualizer;
