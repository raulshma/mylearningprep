'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Plus, 
  Trash2, 
  Search,
  ArrowRight,
  RefreshCw,
  Layers,
  CircleDot
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

// Types for keyed collection visualization
export type KeyedCollectionType = 'map' | 'weakmap' | 'set' | 'weakset';

export interface KeyedCollectionExplorerProps {
  /** Collection type to display */
  collectionType?: KeyedCollectionType;
  /** Whether to show comparison with Object/Array */
  showComparison?: boolean;
  /** Initial entries for Map/Set */
  initialEntries?: [string, string][] | string[];
}

interface MapEntry {
  key: string;
  value: string;
  id: string;
}

interface SetEntry {
  value: string;
  id: string;
}

// Collection type configurations
const collectionConfigs: Record<KeyedCollectionType, {
  name: string;
  description: string;
  keyType: string;
  features: string[];
  color: string;
  icon: string;
}> = {
  map: {
    name: 'Map',
    description: 'Key-value pairs with any type as key',
    keyType: 'Any value',
    features: ['Maintains insertion order', 'Any type as key', 'Has size property', 'Iterable'],
    color: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    icon: '🗺️'
  },
  weakmap: {
    name: 'WeakMap',
    description: 'Key-value pairs with objects as keys (weakly held)',
    keyType: 'Objects only',
    features: ['Keys are weakly held', 'Not enumerable', 'Memory efficient', 'Private data storage'],
    color: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
    icon: '🔗'
  },
  set: {
    name: 'Set',
    description: 'Collection of unique values',
    keyType: 'Any value',
    features: ['Unique values only', 'Maintains insertion order', 'Has size property', 'Iterable'],
    color: 'bg-green-500/20 border-green-500/50 text-green-400',
    icon: '📦'
  },
  weakset: {
    name: 'WeakSet',
    description: 'Collection of unique objects (weakly held)',
    keyType: 'Objects only',
    features: ['Objects only', 'Weakly held', 'Not enumerable', 'Membership testing'],
    color: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    icon: '🔐'
  }
};

// Map vs Object comparison
const mapVsObject = [
  { feature: 'Key types', map: 'Any value', object: 'String or Symbol' },
  { feature: 'Size', map: 'map.size', object: 'Object.keys(obj).length' },
  { feature: 'Iteration order', map: 'Guaranteed', object: 'Not guaranteed (mostly)' },
  { feature: 'Default keys', map: 'None', object: 'Has prototype' },
  { feature: 'Performance', map: 'Better for frequent add/remove', object: 'Better for static data' },
];

/**
 * KeyedCollectionExplorer Component
 * Interactive exploration of Map, WeakMap, Set, WeakSet
 */
export function KeyedCollectionExplorer({
  collectionType: initialType = 'map',
  showComparison = true,
  initialEntries,
}: KeyedCollectionExplorerProps) {
  const [collectionType, setCollectionType] = useState<KeyedCollectionType>(initialType);
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [lastResult, setLastResult] = useState<string | null>(null);
  
  // Map entries state
  const [mapEntries, setMapEntries] = useState<MapEntry[]>(() => {
    if (initialEntries && Array.isArray(initialEntries[0])) {
      return (initialEntries as [string, string][]).map(([key, value], i) => ({
        key,
        value,
        id: `entry-${i}`
      }));
    }
    return [
      { key: 'name', value: 'Alice', id: 'entry-0' },
      { key: 'age', value: '28', id: 'entry-1' },
      { key: 'city', value: 'New York', id: 'entry-2' },
    ];
  });

  // Set entries state
  const [setEntries, setSetEntries] = useState<SetEntry[]>(() => {
    if (initialEntries && typeof initialEntries[0] === 'string') {
      return (initialEntries as string[]).map((value, i) => ({
        value,
        id: `entry-${i}`
      }));
    }
    return [
      { value: 'apple', id: 'entry-0' },
      { value: 'banana', id: 'entry-1' },
      { value: 'cherry', id: 'entry-2' },
    ];
  });

  const isMapType = collectionType === 'map' || collectionType === 'weakmap';
  const isWeakType = collectionType === 'weakmap' || collectionType === 'weakset';
  const config = collectionConfigs[collectionType];

  // Add entry
  const handleAdd = useCallback(() => {
    if (isMapType) {
      if (!keyInput.trim()) return;
      const existingIndex = mapEntries.findIndex(e => e.key === keyInput);
      if (existingIndex >= 0) {
        // Update existing
        setMapEntries(prev => prev.map((e, i) => 
          i === existingIndex ? { ...e, value: valueInput } : e
        ));
        setLastResult(`Updated: ${keyInput} → ${valueInput}`);
      } else {
        // Add new
        setMapEntries(prev => [...prev, { 
          key: keyInput, 
          value: valueInput, 
          id: `entry-${Date.now()}` 
        }]);
        setLastResult(`Added: ${keyInput} → ${valueInput}`);
      }
    } else {
      if (!valueInput.trim()) return;
      const exists = setEntries.some(e => e.value === valueInput);
      if (exists) {
        setLastResult(`"${valueInput}" already exists (Sets only store unique values)`);
        return;
      }
      setSetEntries(prev => [...prev, { 
        value: valueInput, 
        id: `entry-${Date.now()}` 
      }]);
      setLastResult(`Added: ${valueInput}`);
    }
    setKeyInput('');
    setValueInput('');
  }, [keyInput, valueInput, isMapType, mapEntries, setEntries]);

  // Delete entry
  const handleDelete = useCallback((id: string) => {
    if (isMapType) {
      const entry = mapEntries.find(e => e.id === id);
      setMapEntries(prev => prev.filter(e => e.id !== id));
      setLastResult(`Deleted: ${entry?.key}`);
    } else {
      const entry = setEntries.find(e => e.id === id);
      setSetEntries(prev => prev.filter(e => e.id !== id));
      setLastResult(`Deleted: ${entry?.value}`);
    }
  }, [isMapType, mapEntries, setEntries]);

  // Search/Has
  const handleSearch = useCallback(() => {
    if (isMapType) {
      const entry = mapEntries.find(e => e.key === searchInput);
      setLastResult(entry 
        ? `get("${searchInput}") → "${entry.value}"` 
        : `get("${searchInput}") → undefined`
      );
    } else {
      const exists = setEntries.some(e => e.value === searchInput);
      setLastResult(`has("${searchInput}") → ${exists}`);
    }
  }, [searchInput, isMapType, mapEntries, setEntries]);

  // Clear all
  const handleClear = useCallback(() => {
    if (isMapType) {
      setMapEntries([]);
    } else {
      setSetEntries([]);
    }
    setLastResult('Cleared all entries');
  }, [isMapType]);

  // Size
  const size = useMemo(() => 
    isMapType ? mapEntries.length : setEntries.length
  , [isMapType, mapEntries.length, setEntries.length]);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Keyed Collection Explorer</h3>
          </div>
          <Select 
            value={collectionType} 
            onValueChange={(v) => {
              setCollectionType(v as KeyedCollectionType);
              setLastResult(null);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="map">Map</SelectItem>
              <SelectItem value="weakmap">WeakMap</SelectItem>
              <SelectItem value="set">Set</SelectItem>
              <SelectItem value="weakset">WeakSet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {config.description}
        </p>
      </div>

      {/* Features */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10">
        <div className="flex flex-wrap gap-2">
          {config.features.map((feature, i) => (
            <span 
              key={i}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                config.color
              )}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Weak type warning */}
      {isWeakType && (
        <div className="px-6 py-3 bg-yellow-500/10 border-b border-yellow-500/30">
          <div className="flex items-start gap-2">
            <RefreshCw className="w-4 h-4 text-yellow-500 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-yellow-400">Weak Reference: </span>
              <span className="text-muted-foreground">
                Keys are weakly held. If no other references exist, entries may be garbage collected.
                {collectionType === 'weakmap' || collectionType === 'weakset' ? ' This example uses string representations for visualization.' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collection Visualization */}
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {config.name} ({size} {isMapType ? 'entries' : 'values'})
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Entries Display */}
        <div className="min-h-[120px] p-4 rounded-lg bg-zinc-900 border border-border">
          <AnimatePresence mode="popLayout">
            {isMapType ? (
              // Map/WeakMap display
              mapEntries.length > 0 ? (
                <div className="space-y-2">
                  {mapEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        'px-3 py-1.5 rounded-l-lg border-2 font-mono text-sm',
                        config.color
                      )}>
                        {entry.key}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 px-3 py-1.5 rounded-r-lg bg-secondary/50 border border-border font-mono text-sm">
                        {entry.value}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {config.name} is empty
                </div>
              )
            ) : (
              // Set/WeakSet display
              setEntries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {setEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-mono text-sm',
                        config.color
                      )}
                    >
                      <CircleDot className="w-3 h-3" />
                      {entry.value}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="ml-1 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {config.name} is empty
                </div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Last Result */}
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30"
          >
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono">{lastResult}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Operations Panel */}
      <div className="px-6 py-4 border-t border-border bg-secondary/20">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {isMapType && (
            <Input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-32"
              placeholder="Key"
            />
          )}
          <Input
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className="w-32"
            placeholder="Value"
          />
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {isMapType ? 'set()' : 'add()'}
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-32"
            placeholder={isMapType ? "Key to get" : "Value to check"}
          />
          <Button onClick={handleSearch} size="sm" variant="outline">
            <Search className="w-4 h-4 mr-1" />
            {isMapType ? 'get()' : 'has()'}
          </Button>
        </div>
      </div>

      {/* Comparison Table */}
      {showComparison && collectionType === 'map' && (
        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Map vs Object Comparison
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Feature</th>
                  <th className="text-left py-2 px-3 text-blue-400 font-medium">Map</th>
                  <th className="text-left py-2 px-3 text-orange-400 font-medium">Object</th>
                </tr>
              </thead>
              <tbody>
                {mapVsObject.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted-foreground">{row.feature}</td>
                    <td className="py-2 px-3 font-mono text-xs">{row.map}</td>
                    <td className="py-2 px-3 font-mono text-xs">{row.object}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

export default KeyedCollectionExplorer;
