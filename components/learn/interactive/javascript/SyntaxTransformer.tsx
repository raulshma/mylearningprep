'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Wand2,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
  Sparkles,
  Code2,
} from 'lucide-react';

// Types
export interface TransformRule {
  name: string;
  description: string;
  pattern: RegExp;
  transform: (match: RegExpMatchArray) => string;
  highlight?: boolean;
}

export interface TransformResult {
  original: string;
  transformed: string;
  appliedRules: string[];
  highlights: TransformHighlight[];
}

export interface TransformHighlight {
  start: number;
  end: number;
  rule: string;
  original: string;
  transformed: string;
}

export interface SyntaxTransformerProps {
  /** Initial ES6+ code */
  initialCode?: string;
  /** Show transformation highlights */
  showHighlights?: boolean;
  /** Auto-transform on code change */
  autoTransform?: boolean;
  /** Callback when code is transformed */
  onTransform?: (result: TransformResult) => void;
}

// Default ES6+ code example
const defaultCode = `// ES6+ Code - Try editing this!
const greeting = "Hello";
const name = "World";

// Template literal
const message = \`\${greeting}, \${name}!\`;

// Arrow function
const add = (a, b) => a + b;

// Arrow function with body
const multiply = (a, b) => {
  const result = a * b;
  return result;
};

// Destructuring
const person = { name: "Alice", age: 25 };
const { name: personName, age } = person;

// Array destructuring
const colors = ["red", "green", "blue"];
const [first, second] = colors;

// Spread operator
const numbers = [1, 2, 3];
const moreNumbers = [...numbers, 4, 5];

// Default parameters
const greet = (name = "Guest") => {
  console.log(\`Hello, \${name}!\`);
};

// Class
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(\`\${this.name} makes a sound\`);
  }
}
`;

/**
 * Transform ES6+ code to ES5 equivalent
 * Requirements: 4.7
 */
export function transformToES5(code: string): TransformResult {
  let transformed = code;
  const appliedRules: string[] = [];
  const highlights: TransformHighlight[] = [];

  // Rule 1: const/let to var
  const constLetRegex = /\b(const|let)\s+/g;
  if (constLetRegex.test(transformed)) {
    transformed = transformed.replace(constLetRegex, 'var ');
    appliedRules.push('const/let → var');
  }

  // Rule 2: Template literals to string concatenation
  const templateRegex = /`([^`]*)`/g;
  let templateMatch;
  while ((templateMatch = templateRegex.exec(code)) !== null) {
    const original = templateMatch[0];
    const content = templateMatch[1];
    
    // Replace ${...} with " + ... + "
    let converted = '"' + content
      .replace(/\$\{([^}]+)\}/g, '" + $1 + "')
      .replace(/\n/g, '\\n')
      + '"';
    
    // Clean up empty concatenations
    converted = converted.replace(/"" \+ /g, '').replace(/ \+ ""/g, '');
    
    transformed = transformed.replace(original, converted);
    appliedRules.push('Template literal → String concatenation');
  }

  // Rule 3: Arrow functions to regular functions
  // Simple arrow: (a, b) => a + b
  const simpleArrowRegex = /(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*([^{;][^;]*);/g;
  transformed = transformed.replace(simpleArrowRegex, (match, name, params, body) => {
    appliedRules.push('Arrow function → function expression');
    return `var ${name} = function(${params}) { return ${body.trim()}; };`;
  });

  // Arrow with body: (a, b) => { ... }
  const bodyArrowRegex = /(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/g;
  transformed = transformed.replace(bodyArrowRegex, (match, name, params) => {
    appliedRules.push('Arrow function → function expression');
    return `var ${name} = function(${params}) {`;
  });

  // Rule 4: Object destructuring
  const objDestructRegex = /var\s+\{\s*([^}]+)\s*\}\s*=\s*(\w+);/g;
  transformed = transformed.replace(objDestructRegex, (match, props, obj) => {
    const propList = props.split(',').map((p: string) => p.trim());
    const assignments = propList.map((prop: string) => {
      const [key, alias] = prop.split(':').map((s: string) => s.trim());
      const varName = alias || key;
      return `var ${varName} = ${obj}.${key};`;
    });
    appliedRules.push('Object destructuring → property access');
    return assignments.join('\n');
  });

  // Rule 5: Array destructuring
  const arrDestructRegex = /var\s+\[\s*([^\]]+)\s*\]\s*=\s*(\w+);/g;
  transformed = transformed.replace(arrDestructRegex, (match, items, arr) => {
    const itemList = items.split(',').map((i: string) => i.trim());
    const assignments = itemList.map((item: string, index: number) => {
      if (item) {
        return `var ${item} = ${arr}[${index}];`;
      }
      return '';
    }).filter(Boolean);
    appliedRules.push('Array destructuring → index access');
    return assignments.join('\n');
  });

  // Rule 6: Spread operator in arrays
  const spreadArrayRegex = /\[\s*\.\.\.(\w+)\s*,?\s*([^\]]*)\]/g;
  transformed = transformed.replace(spreadArrayRegex, (match, arr, rest) => {
    appliedRules.push('Spread operator → concat');
    if (rest.trim()) {
      return `${arr}.concat([${rest.trim()}])`;
    }
    return `${arr}.slice()`;
  });

  // Rule 7: Default parameters
  const defaultParamRegex = /function\(([^)]*=\s*[^)]+)\)/g;
  transformed = transformed.replace(defaultParamRegex, (match, params) => {
    const paramList = params.split(',').map((p: string) => {
      const [name, defaultVal] = p.split('=').map((s: string) => s.trim());
      return { name, defaultVal };
    });
    
    const cleanParams = paramList.map((p: { name: string }) => p.name).join(', ');
    const defaults = paramList
      .filter((p: { defaultVal?: string }) => p.defaultVal)
      .map((p: { name: string; defaultVal: string }) => 
        `  ${p.name} = ${p.name} !== undefined ? ${p.name} : ${p.defaultVal};`
      )
      .join('\n');
    
    if (defaults) {
      appliedRules.push('Default parameters → conditional assignment');
    }
    
    return `function(${cleanParams})`;
  });

  // Rule 8: Class to constructor function
  const classRegex = /class\s+(\w+)\s*\{[\s\S]*?constructor\s*\(([^)]*)\)\s*\{([\s\S]*?)\}([\s\S]*?)\}/g;
  transformed = transformed.replace(classRegex, (match, className, params, constructorBody, methods) => {
    appliedRules.push('Class → constructor function');
    
    let result = `function ${className}(${params}) {${constructorBody}}\n`;
    
    // Extract methods
    const methodRegex = /(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*?)\}/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(methods)) !== null) {
      const [, methodName, methodParams, methodBody] = methodMatch;
      if (methodName !== 'constructor') {
        result += `\n${className}.prototype.${methodName} = function(${methodParams}) {${methodBody}};`;
      }
    }
    
    return result;
  });

  // Remove duplicate rules
  const uniqueRules = [...new Set(appliedRules)];

  return {
    original: code,
    transformed,
    appliedRules: uniqueRules,
    highlights,
  };
}


/**
 * SyntaxTransformer Component
 * Shows how ES6+ code transpiles to ES5 equivalent
 * Requirements: 4.7
 */
export function SyntaxTransformer({
  initialCode = defaultCode,
  showHighlights = true,
  autoTransform = true,
  onTransform,
}: SyntaxTransformerProps) {
  const [code, setCode] = useState(initialCode);
  const [isTransforming, setIsTransforming] = useState(false);
  const [copiedSide, setCopiedSide] = useState<'es6' | 'es5' | null>(null);

  // Transform code
  const result = useMemo(() => {
    return transformToES5(code);
  }, [code]);

  // Handle code change
  const handleCodeChange = useCallback((value: string | undefined) => {
    setCode(value || '');
  }, []);

  // Handle manual transform
  const handleTransform = useCallback(() => {
    setIsTransforming(true);
    setTimeout(() => {
      onTransform?.(result);
      setIsTransforming(false);
    }, 300);
  }, [result, onTransform]);

  // Handle copy
  const handleCopy = useCallback(async (text: string, side: 'es6' | 'es5') => {
    await navigator.clipboard.writeText(text);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
  }, []);

  // Reset to initial code
  const handleReset = useCallback(() => {
    setCode(initialCode);
  }, [initialCode]);

  return (
    <div className="w-full max-w-5xl mx-auto my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          ES6+ to ES5 Transformer
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
          {!autoTransform && (
            <Button
              variant="default"
              size="sm"
              onClick={handleTransform}
              disabled={isTransforming}
              className="gap-1"
            >
              {isTransforming ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              Transform
            </Button>
          )}
        </div>
      </div>

      {/* Side-by-Side Editors */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* ES6+ Input */}
        <Card className="overflow-hidden border shadow-sm">
          <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">ES6+ (Input)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(code, 'es6')}
              className="h-6 px-2"
            >
              {copiedSide === 'es6' ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
          <div style={{ height: 400 }}>
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </Card>

        {/* ES5 Output */}
        <Card className="overflow-hidden border shadow-sm">
          <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">ES5 (Output)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(result.transformed, 'es5')}
              className="h-6 px-2"
            >
              {copiedSide === 'es5' ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
          <div style={{ height: 400 }}>
            <Editor
              height="100%"
              language="javascript"
              value={result.transformed}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                readOnly: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Arrow indicator */}
      <div className="hidden md:flex justify-center -my-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm text-primary">ES6+</span>
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="text-sm text-orange-400">ES5</span>
        </div>
      </div>

      {/* Applied Transformations */}
      {showHighlights && result.appliedRules.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            Applied Transformations
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.appliedRules.map((rule, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
              >
                {rule}
              </motion.span>
            ))}
          </div>
        </Card>
      )}

      {/* No transformations message */}
      {result.appliedRules.length === 0 && (
        <Card className="p-4 bg-secondary/30">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              No ES6+ features detected. Try adding arrow functions, template literals, or destructuring!
            </span>
          </div>
        </Card>
      )}

      {/* Tips */}
      <div className="text-xs text-muted-foreground">
        💡 Edit the ES6+ code on the left to see how it transforms to ES5 on the right. 
        This simulates what tools like Babel do to make modern JavaScript work in older browsers.
      </div>
    </div>
  );
}

// Export for testing
export { defaultCode };
export default SyntaxTransformer;
