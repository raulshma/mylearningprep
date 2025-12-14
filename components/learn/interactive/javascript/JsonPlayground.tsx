'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileJson, 
  Play, 
  ArrowRight,
  ArrowLeftRight,
  Copy,
  Check,
  AlertCircle,
  Braces,
  Settings2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Types for JSON playground
export type JsonMode = 'parse' | 'stringify';

export interface JsonPlaygroundProps {
  /** Initial mode */
  mode?: JsonMode;
  /** Initial JSON string */
  initialJson?: string;
  /** Initial object for stringify mode */
  initialObject?: string;
  /** Whether to show comparison view */
  showComparison?: boolean;
}

// Sample data for examples
const sampleJsonString = `{
  "name": "Alice",
  "age": 28,
  "isActive": true,
  "hobbies": ["reading", "coding"],
  "address": {
    "city": "New York",
    "zip": "10001"
  }
}`;

const sampleObject = `{
  name: "Alice",
  age: 28,
  isActive: true,
  hobbies: ["reading", "coding"],
  address: {
    city: "New York",
    zip: "10001"
  },
  greet: function() { return "Hello!"; },
  createdAt: new Date()
}`;

// JSON vs JavaScript Object differences
const jsonVsJsObject = [
  { feature: 'Keys', json: 'Must be double-quoted strings', js: 'Can be unquoted or single-quoted' },
  { feature: 'Strings', json: 'Double quotes only', js: 'Single or double quotes' },
  { feature: 'Trailing commas', json: 'Not allowed', js: 'Allowed' },
  { feature: 'Functions', json: 'Not supported', js: 'Supported' },
  { feature: 'undefined', json: 'Not supported', js: 'Supported' },
  { feature: 'Comments', json: 'Not allowed', js: 'Allowed' },
  { feature: 'Dates', json: 'Strings only', js: 'Date objects' },
];

/**
 * JsonPlayground Component
 * Interactive JSON parsing and stringifying playground
 */
export function JsonPlayground({
  mode: initialMode = 'parse',
  initialJson = sampleJsonString,
  initialObject = sampleObject,
  showComparison = true,
}: JsonPlaygroundProps) {
  const [mode, setMode] = useState<JsonMode>(initialMode);
  const [jsonInput, setJsonInput] = useState(initialJson);
  const [objectInput, setObjectInput] = useState(initialObject);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Stringify options
  const [indent, setIndent] = useState<string>('2');
  const [useReplacer, setUseReplacer] = useState(false);
  const [replacerType, setReplacerType] = useState<'array' | 'function'>('array');
  const [replacerValue, setReplacerValue] = useState('["name", "age"]');

  // Parse options
  const [useReviver, setUseReviver] = useState(false);
  const [reviverCode, setReviverCode] = useState('(key, value) => key === "age" ? value * 2 : value');

  // Execute parse or stringify
  const execute = useCallback(() => {
    setError(null);
    
    try {
      if (mode === 'parse') {
        let result;
        if (useReviver) {
          try {
            const reviverFn = new Function('return ' + reviverCode)();
            result = JSON.parse(jsonInput, reviverFn);
          } catch {
            setError('Invalid reviver function');
            return;
          }
        } else {
          result = JSON.parse(jsonInput);
        }
        setOutput(JSON.stringify(result, null, 2));
      } else {
        // Stringify mode - evaluate the object
        let obj;
        try {
          obj = new Function('return ' + objectInput)();
        } catch {
          setError('Invalid JavaScript object');
          return;
        }

        let replacer: ((key: string, value: unknown) => unknown) | string[] | null = null;
        if (useReplacer) {
          if (replacerType === 'array') {
            try {
              replacer = JSON.parse(replacerValue);
            } catch {
              setError('Invalid replacer array');
              return;
            }
          } else {
            try {
              replacer = new Function('return ' + replacerValue)();
            } catch {
              setError('Invalid replacer function');
              return;
            }
          }
        }

        const indentValue = indent === 'tab' ? '\t' : parseInt(indent, 10) || undefined;
        let result: string;
        if (replacer === null) {
          result = JSON.stringify(obj, undefined, indentValue);
        } else if (Array.isArray(replacer)) {
          result = JSON.stringify(obj, replacer, indentValue);
        } else {
          result = JSON.stringify(obj, replacer as (key: string, value: unknown) => unknown, indentValue);
        }
        setOutput(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [mode, jsonInput, objectInput, useReviver, reviverCode, useReplacer, replacerType, replacerValue, indent]);

  // Auto-execute on input change
  useEffect(() => {
    const timer = setTimeout(execute, 300);
    return () => clearTimeout(timer);
  }, [execute]);

  // Copy to clipboard
  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  // Swap mode
  const swapMode = useCallback(() => {
    setMode(prev => prev === 'parse' ? 'stringify' : 'parse');
    setError(null);
    setOutput('');
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">JSON Playground</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium transition-colors',
              mode === 'parse' ? 'text-primary' : 'text-muted-foreground'
            )}>
              Parse
            </span>
            <Button variant="ghost" size="sm" onClick={swapMode} className="px-2">
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
            <span className={cn(
              'text-sm font-medium transition-colors',
              mode === 'stringify' ? 'text-primary' : 'text-muted-foreground'
            )}>
              Stringify
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === 'parse' 
            ? 'Convert JSON string to JavaScript object' 
            : 'Convert JavaScript object to JSON string'
          }
        </p>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Input Panel */}
        <div className="p-4 border-r border-border">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {mode === 'parse' ? 'JSON String' : 'JavaScript Object'}
            </Label>
            <span className="text-xs text-muted-foreground">Input</span>
          </div>
          <Textarea
            value={mode === 'parse' ? jsonInput : objectInput}
            onChange={(e) => mode === 'parse' 
              ? setJsonInput(e.target.value) 
              : setObjectInput(e.target.value)
            }
            className="min-h-[200px] font-mono text-sm bg-zinc-900"
            placeholder={mode === 'parse' ? 'Enter JSON string...' : 'Enter JavaScript object...'}
          />
        </div>

        {/* Output Panel */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {mode === 'parse' ? 'JavaScript Object' : 'JSON String'}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyOutput}
              disabled={!output || !!error}
              className="h-6 px-2"
            >
              {copied ? (
                <Check className="w-3 h-3 mr-1 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          
          <div className="min-h-[200px] p-3 rounded-md bg-zinc-900 border border-border font-mono text-sm overflow-auto">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 text-red-400"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              ) : output ? (
                <motion.pre
                  key="output"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-pre-wrap text-green-400"
                >
                  {output}
                </motion.pre>
              ) : (
                <span className="text-muted-foreground">Output will appear here...</span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Options Panel */}
      <div className="px-6 py-4 border-t border-border bg-secondary/20">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Options
          </span>
        </div>

        {mode === 'stringify' ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Indent:</Label>
              <Select value={indent} onValueChange={setIndent}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  <SelectItem value="2">2 spaces</SelectItem>
                  <SelectItem value="4">4 spaces</SelectItem>
                  <SelectItem value="tab">Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={useReplacer}
                onCheckedChange={setUseReplacer}
                id="replacer"
              />
              <Label htmlFor="replacer" className="text-sm">Use Replacer</Label>
            </div>

            {useReplacer && (
              <>
                <Select value={replacerType} onValueChange={(v) => setReplacerType(v as 'array' | 'function')}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="function">Function</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="text"
                  value={replacerValue}
                  onChange={(e) => setReplacerValue(e.target.value)}
                  className="flex-1 min-w-[200px] px-2 py-1 rounded border border-border bg-background text-sm font-mono"
                  placeholder={replacerType === 'array' ? '["key1", "key2"]' : '(key, value) => value'}
                />
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={useReviver}
                onCheckedChange={setUseReviver}
                id="reviver"
              />
              <Label htmlFor="reviver" className="text-sm">Use Reviver Function</Label>
            </div>

            {useReviver && (
              <input
                type="text"
                value={reviverCode}
                onChange={(e) => setReviverCode(e.target.value)}
                className="flex-1 min-w-[300px] px-2 py-1 rounded border border-border bg-background text-sm font-mono"
                placeholder="(key, value) => value"
              />
            )}
          </div>
        )}

        <Button onClick={execute} size="sm" className="mt-3">
          <Play className="w-4 h-4 mr-1" />
          Execute
        </Button>
      </div>

      {/* Comparison Table */}
      {showComparison && (
        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Braces className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              JSON vs JavaScript Object
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Feature</th>
                  <th className="text-left py-2 px-3 text-green-400 font-medium">JSON</th>
                  <th className="text-left py-2 px-3 text-yellow-400 font-medium">JS Object</th>
                </tr>
              </thead>
              <tbody>
                {jsonVsJsObject.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted-foreground">{row.feature}</td>
                    <td className="py-2 px-3 font-mono text-xs">{row.json}</td>
                    <td className="py-2 px-3 font-mono text-xs">{row.js}</td>
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

export default JsonPlayground;
