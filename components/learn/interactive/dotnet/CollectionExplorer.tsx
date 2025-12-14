'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Search, Trash2, List, BookOpen, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CollectionType = 'list' | 'dictionary';

interface ListItem {
  id: string;
  value: string;
  isHighlighted: boolean;
}

interface DictionaryItem {
  id: string;
  key: string;
  value: string;
  isHighlighted: boolean;
}

interface CollectionExplorerProps {
  type?: CollectionType;
  initialItems?: string[] | Record<string, string>;
  showOperations?: boolean;
  showCode?: boolean;
}

/**
 * CollectionExplorer Component
 * Interactive visualization of C# List and Dictionary collections
 */
export function CollectionExplorer({
  type = 'list',
  initialItems,
  showOperations = true,
  showCode = true,
}: CollectionExplorerProps) {
  // List state
  const [listItems, setListItems] = useState<ListItem[]>(() => {
    if (type === 'list' && Array.isArray(initialItems)) {
      return initialItems.map((v, i) => ({ id: `${i}`, value: v, isHighlighted: false }));
    }
    return [
      { id: '0', value: 'Apple', isHighlighted: false },
      { id: '1', value: 'Banana', isHighlighted: false },
      { id: '2', value: 'Cherry', isHighlighted: false },
    ];
  });

  // Dictionary state
  const [dictItems, setDictItems] = useState<DictionaryItem[]>(() => {
    if (type === 'dictionary' && initialItems && !Array.isArray(initialItems)) {
      return Object.entries(initialItems).map(([k, v], i) => ({
        id: `${i}`,
        key: k,
        value: v,
        isHighlighted: false,
      }));
    }
    return [
      { id: '0', key: 'name', value: 'John', isHighlighted: false },
      { id: '1', key: 'age', value: '25', isHighlighted: false },
      { id: '2', key: 'city', value: 'NYC', isHighlighted: false },
    ];
  });

  const [newValue, setNewValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [lastOperation, setLastOperation] = useState<string>('');
  const [operationResult, setOperationResult] = useState<string>('');

  // List operations
  const handleListAdd = useCallback(() => {
    if (!newValue.trim()) return;
    const newItem: ListItem = {
      id: `${Date.now()}`,
      value: newValue,
      isHighlighted: true,
    };
    setListItems((prev) => [...prev, newItem]);
    setLastOperation(`list.Add("${newValue}");`);
    setOperationResult(`Added "${newValue}" at index ${listItems.length}`);
    setNewValue('');
    setTimeout(() => {
      setListItems((prev) => prev.map((item) => ({ ...item, isHighlighted: false })));
    }, 1000);
  }, [newValue, listItems.length]);

  const handleListRemove = useCallback((index: number) => {
    const item = listItems[index];
    setListItems((prev) => prev.filter((_, i) => i !== index));
    setLastOperation(`list.RemoveAt(${index});`);
    setOperationResult(`Removed "${item.value}" from index ${index}`);
  }, [listItems]);

  const handleListSearch = useCallback(() => {
    const index = listItems.findIndex((item) => 
      item.value.toLowerCase().includes(searchValue.toLowerCase())
    );
    if (index !== -1) {
      setListItems((prev) => prev.map((item, i) => ({
        ...item,
        isHighlighted: i === index,
      })));
      setLastOperation(`list.IndexOf("${searchValue}");`);
      setOperationResult(`Found at index ${index}`);
      setTimeout(() => {
        setListItems((prev) => prev.map((item) => ({ ...item, isHighlighted: false })));
      }, 2000);
    } else {
      setLastOperation(`list.IndexOf("${searchValue}");`);
      setOperationResult('Not found (-1)');
    }
  }, [listItems, searchValue]);

  // Dictionary operations
  const handleDictAdd = useCallback(() => {
    if (!newKey.trim() || !newValue.trim()) return;
    
    const existingIndex = dictItems.findIndex((item) => item.key === newKey);
    if (existingIndex !== -1) {
      // Update existing
      setDictItems((prev) => prev.map((item, i) => 
        i === existingIndex ? { ...item, value: newValue, isHighlighted: true } : item
      ));
      setLastOperation(`dict["${newKey}"] = "${newValue}";`);
      setOperationResult(`Updated key "${newKey}" with new value`);
    } else {
      // Add new
      const newItem: DictionaryItem = {
        id: `${Date.now()}`,
        key: newKey,
        value: newValue,
        isHighlighted: true,
      };
      setDictItems((prev) => [...prev, newItem]);
      setLastOperation(`dict.Add("${newKey}", "${newValue}");`);
      setOperationResult(`Added new key-value pair`);
    }
    
    setNewKey('');
    setNewValue('');
    setTimeout(() => {
      setDictItems((prev) => prev.map((item) => ({ ...item, isHighlighted: false })));
    }, 1000);
  }, [newKey, newValue, dictItems]);

  const handleDictRemove = useCallback((key: string) => {
    setDictItems((prev) => prev.filter((item) => item.key !== key));
    setLastOperation(`dict.Remove("${key}");`);
    setOperationResult(`Removed key "${key}"`);
  }, []);

  const handleDictSearch = useCallback(() => {
    const found = dictItems.find((item) => item.key === searchValue);
    if (found) {
      setDictItems((prev) => prev.map((item) => ({
        ...item,
        isHighlighted: item.key === searchValue,
      })));
      setLastOperation(`dict.TryGetValue("${searchValue}", out value);`);
      setOperationResult(`Found! Value: "${found.value}"`);
      setTimeout(() => {
        setDictItems((prev) => prev.map((item) => ({ ...item, isHighlighted: false })));
      }, 2000);
    } else {
      setLastOperation(`dict.ContainsKey("${searchValue}");`);
      setOperationResult('Key not found (false)');
    }
  }, [dictItems, searchValue]);

  const handleClear = useCallback(() => {
    if (type === 'list') {
      setListItems([]);
      setLastOperation('list.Clear();');
    } else {
      setDictItems([]);
      setLastOperation('dict.Clear();');
    }
    setOperationResult('Cleared all items');
  }, [type]);

  return (
    <Card className="p-6 my-6 bg-linear-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {type === 'list' ? (
              <List className="w-5 h-5 text-primary" />
            ) : (
              <BookOpen className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {type === 'list' ? 'List<string>' : 'Dictionary<string, string>'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {type === 'list' 
                ? `${listItems.length} items` 
                : `${dictItems.length} key-value pairs`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Operations Panel */}
      {showOperations && (
        <div className="mb-4 p-4 bg-secondary/30 rounded-lg">
          <h4 className="font-medium mb-3">Operations</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {type === 'list' ? (
              <>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter value..."
                  className="flex-1 min-w-[120px] px-3 py-1.5 text-sm bg-background/50 rounded border border-border"
                  onKeyDown={(e) => e.key === 'Enter' && handleListAdd()}
                />
                <Button size="sm" onClick={handleListAdd}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Key..."
                  className="w-24 px-3 py-1.5 text-sm bg-background/50 rounded border border-border"
                />
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Value..."
                  className="flex-1 min-w-[100px] px-3 py-1.5 text-sm bg-background/50 rounded border border-border"
                  onKeyDown={(e) => e.key === 'Enter' && handleDictAdd()}
                />
                <Button size="sm" onClick={handleDictAdd}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add/Update
                </Button>
              </>
            )}
          </div>
          
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={type === 'list' ? 'Search value...' : 'Search by key...'}
              className="flex-1 px-3 py-1.5 text-sm bg-background/50 rounded border border-border"
              onKeyDown={(e) => e.key === 'Enter' && (type === 'list' ? handleListSearch() : handleDictSearch())}
            />
            <Button size="sm" variant="outline" onClick={type === 'list' ? handleListSearch : handleDictSearch}>
              <Search className="w-4 h-4 mr-1" />
              Find
            </Button>
          </div>
        </div>
      )}

      {/* Collection Visualization */}
      <div className="mb-4 p-4 bg-secondary/30 rounded-lg min-h-[150px]">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Collection Contents
        </h4>
        
        {type === 'list' ? (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {listItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: item.isHighlighted ? 1.1 : 1,
                    boxShadow: item.isHighlighted ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className={cn(
                    'group relative px-4 py-2 rounded-lg border-2 transition-colors',
                    item.isHighlighted 
                      ? 'border-green-500 bg-green-500/20' 
                      : 'border-border bg-background/50 hover:border-primary/50'
                  )}
                >
                  <span className="absolute -top-2 -left-1 text-xs bg-secondary px-1 rounded text-muted-foreground">
                    [{index}]
                  </span>
                  <code className="text-sm">{item.value}</code>
                  <button
                    onClick={() => handleListRemove(index)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {listItems.length === 0 && (
              <div className="text-muted-foreground italic">Empty list</div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {dictItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    boxShadow: item.isHighlighted ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
                  }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-lg border-2 transition-colors',
                    item.isHighlighted 
                      ? 'border-green-500 bg-green-500/20' 
                      : 'border-border bg-background/50 hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <code className="px-2 py-1 bg-primary/20 text-primary rounded text-sm font-medium">
                      {item.key}
                    </code>
                    <span className="text-muted-foreground">→</span>
                    <code className="text-sm">{item.value}</code>
                  </div>
                  <button
                    onClick={() => handleDictRemove(item.key)}
                    className="w-6 h-6 bg-destructive/20 text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {dictItems.length === 0 && (
              <div className="text-muted-foreground italic">Empty dictionary</div>
            )}
          </div>
        )}
      </div>

      {/* Operation Result */}
      {showCode && lastOperation && (
        <div className="p-4 bg-secondary/50 rounded-lg font-mono text-sm">
          <div className="text-muted-foreground mb-1">Last Operation:</div>
          <code className="text-primary">{lastOperation}</code>
          {operationResult && (
            <div className="mt-2 text-green-400">{/* // */}{operationResult}</div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg">
        <h4 className="font-medium text-blue-400 mb-2">
          {type === 'list' ? '📋 List Facts' : '📖 Dictionary Facts'}
        </h4>
        {type === 'list' ? (
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <code>List&lt;T&gt;</code> stores items in order by index</li>
            <li>• Access by index: <code>list[0]</code> is O(1) - instant!</li>
            <li>• Search by value: <code>IndexOf()</code> is O(n) - checks each item</li>
            <li>• Add to end: <code>Add()</code> is usually O(1)</li>
          </ul>
        ) : (
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <code>Dictionary&lt;K,V&gt;</code> stores key-value pairs</li>
            <li>• Access by key: <code>dict[&quot;key&quot;]</code> is O(1) - instant lookup!</li>
            <li>• Keys must be unique (values can repeat)</li>
            <li>• No guaranteed order (use <code>SortedDictionary</code> if needed)</li>
          </ul>
        )}
      </div>
    </Card>
  );
}

export type { CollectionExplorerProps, CollectionType };
export default CollectionExplorer;
