'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeExampleProps {
  children: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

/**
 * Code Example Component
 * Enhanced code block with syntax highlighting, copy functionality, and line highlighting
 */
export function CodeExample({ 
  children, 
  language = 'javascript',
  filename,
  showLineNumbers = true,
  highlightLines = []
}: CodeExampleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = children.trim().split('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 rounded-xl border border-border overflow-hidden bg-zinc-950"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Window dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          {filename && (
            <span className="ml-2 text-xs text-muted-foreground font-mono">
              {filename}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-sm">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                highlightLines.includes(i + 1) && 'bg-yellow-500/10 -mx-4 px-4'
              )}
            >
              {showLineNumbers && (
                <span className="select-none text-muted-foreground/50 w-8 text-right mr-4 shrink-0">
                  {i + 1}
                </span>
              )}
              <code className="text-zinc-300">
                <SyntaxHighlight code={line} language={language} />
              </code>
            </div>
          ))}
        </pre>
      </div>
    </motion.div>
  );
}

// Simple syntax highlighting (can be enhanced with a library like shiki)
function SyntaxHighlight({ code, language }: { code: string; language: string }) {
  // Basic keyword highlighting for demonstration
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'async', 'await', 'class', 'extends'];
  const types = ['string', 'number', 'boolean', 'null', 'undefined', 'true', 'false'];
  
  // Very basic tokenization - in production, use a proper highlighter
  let result = code;
  
  // Highlight strings
  result = result.replace(/(["'`])(.*?)\1/g, '<span class="text-green-400">$1$2$1</span>');
  
  // Highlight keywords
  keywords.forEach(kw => {
    result = result.replace(
      new RegExp(`\\b(${kw})\\b`, 'g'), 
      '<span class="text-purple-400">$1</span>'
    );
  });
  
  // Highlight types/values
  types.forEach(t => {
    result = result.replace(
      new RegExp(`\\b(${t})\\b`, 'g'),
      '<span class="text-blue-400">$1</span>'
    );
  });

  // Highlight comments
  result = result.replace(/(\/\/.*$)/gm, '<span class="text-zinc-500">$1</span>');
  
  // Highlight numbers
  result = result.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: result }} />;
}
