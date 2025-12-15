'use client';

import { CodeHighlighter } from '@/components/ui/code-highlighter';

interface EnhancedCodeBlockProps {
  children: string;
  className?: string;
}

/**
 * Enhanced Code Block Component
 * Provides syntax highlighting and copy functionality for code blocks in MDX
 * Integrates with the enhanced CodeHighlighter component
 */
export function EnhancedCodeBlock({ 
  children, 
  className
}: EnhancedCodeBlockProps) {
  // Extract language from className (e.g., "language-css" -> "css")
  const language = className?.replace(/language-/, '') || 'text';
  
  // Clean up the code content
  const code = typeof children === 'string' 
    ? children.trim() 
    : String(children).trim();

  return (
    <div className="my-6">
      <CodeHighlighter
        code={code}
        language={language}
        showHeader={true}
        collapsible={true}
        className="rounded-xl"
      />
    </div>
  );
}
