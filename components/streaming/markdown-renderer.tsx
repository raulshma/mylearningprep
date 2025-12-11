"use client";

/**
 * Markdown Renderer using llm-ui
 * Displays streaming markdown content with code block support
 * Based on: https://github.com/richardgill/llm-ui
 *
 * OPTIMIZED: Only loads required themes and common languages
 * to prevent page slowdown during streaming
 */

import { memo, useMemo, useState, useCallback } from "react";
import type { CodeToHtmlOptions } from "@llm-ui/code";
import {
  codeBlockLookBack,
  findCompleteCodeBlock,
  findPartialCodeBlock,
  loadHighlighter,
  useCodeBlockToHtml,
} from "@llm-ui/code";
import { markdownLookBack } from "@llm-ui/markdown";
import { useLLMOutput, type LLMOutputComponent } from "@llm-ui/react";
import parseHtml from "html-react-parser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getHighlighterCore } from "shiki/core";
import getWasm from "shiki/wasm";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

// Import only required themes (2 vs 40+)
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

// Import only commonly used languages (avoids loading 200+ languages)
import javascript from "shiki/langs/javascript.mjs";
import typescript from "shiki/langs/typescript.mjs";
import python from "shiki/langs/python.mjs";
import java from "shiki/langs/java.mjs";
import cpp from "shiki/langs/cpp.mjs";
import csharp from "shiki/langs/csharp.mjs";
import go from "shiki/langs/go.mjs";
import rust from "shiki/langs/rust.mjs";
import sql from "shiki/langs/sql.mjs";
import json from "shiki/langs/json.mjs";
import yaml from "shiki/langs/yaml.mjs";
import markdown from "shiki/langs/markdown.mjs";
import bash from "shiki/langs/bash.mjs";
import html from "shiki/langs/html.mjs";
import css from "shiki/langs/css.mjs";
import jsx from "shiki/langs/jsx.mjs";
import tsx from "shiki/langs/tsx.mjs";
import ruby from "shiki/langs/ruby.mjs";
import php from "shiki/langs/php.mjs";
import swift from "shiki/langs/swift.mjs";
import kotlin from "shiki/langs/kotlin.mjs";
import scala from "shiki/langs/scala.mjs";
import graphql from "shiki/langs/graphql.mjs";
import dockerfile from "shiki/langs/dockerfile.mjs";

// -------Step 1: Create a code block component with Shiki-------

// Load highlighter once with ONLY required themes and common languages
const highlighter = loadHighlighter(
  getHighlighterCore({
    langs: [
      javascript,
      typescript,
      python,
      java,
      cpp,
      csharp,
      go,
      rust,
      sql,
      json,
      yaml,
      markdown,
      bash,
      html,
      css,
      jsx,
      tsx,
      ruby,
      php,
      swift,
      kotlin,
      scala,
      graphql,
      dockerfile,
    ],
    // Language aliases for common names
    langAlias: {
      js: "javascript",
      ts: "typescript",
      py: "python",
      rb: "ruby",
      sh: "bash",
      shell: "bash",
      zsh: "bash",
      yml: "yaml",
      md: "markdown",
      c: "cpp",
      "c++": "cpp",
      "c#": "csharp",
      cs: "csharp",
    },
    themes: [githubDark, githubLight],
    loadWasm: getWasm,
  })
);

const codeToHtmlOptions: CodeToHtmlOptions = {
  themes: {
    light: "github-light",
    dark: "github-dark",
  },
  defaultColor: false,
};

// Extract language from markdown code block
function extractLanguage(markdownCodeBlock: string): string | null {
  const match = markdownCodeBlock.match(/^```(\w+)/);
  return match ? match[1] : null;
}

// Language display names
const languageDisplayNames: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  bash: "Bash",
  html: "HTML",
  css: "CSS",
  jsx: "JSX",
  tsx: "TSX",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  scala: "Scala",
  graphql: "GraphQL",
  dockerfile: "Dockerfile",
  js: "JavaScript",
  ts: "TypeScript",
  py: "Python",
  rb: "Ruby",
  sh: "Shell",
  shell: "Shell",
};

// QoL: Line count threshold for collapsible code blocks
const COLLAPSE_THRESHOLD = 20;

// Memoized Code block component with Shiki syntax highlighting
const CodeBlock: LLMOutputComponent = memo(function CodeBlock({ blockMatch }) {
  const { html, code } = useCodeBlockToHtml({
    markdownCodeBlock: blockMatch.output,
    highlighter,
    codeToHtmlOptions,
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const language = extractLanguage(blockMatch.output);
  const displayLanguage = language ? (languageDisplayNames[language.toLowerCase()] || language) : null;
  
  // QoL: Calculate line count for collapse feature
  const lineCount = useMemo(() => code?.split('\n').length ?? 0, [code]);
  const shouldCollapse = lineCount > COLLAPSE_THRESHOLD;

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }, [code]);
  
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  if (!html) {
    // Fallback while Shiki is loading
    return (
      <div className="relative group my-4">
        {displayLanguage && (
          <div className="absolute left-3 top-2 text-xs text-muted-foreground/70 font-mono">
            {displayLanguage}
          </div>
        )}
        <pre className="shiki bg-muted p-4 pt-8 rounded-lg overflow-x-auto max-w-full scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground/30">
          <code className="text-sm font-mono">{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
      {/* Header bar with language, line count, and actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/30">
        <div className="flex items-center gap-2">
          {displayLanguage && (
            <span className="text-xs text-muted-foreground font-mono font-medium">
              {displayLanguage}
            </span>
          )}
          {/* QoL: Show line count */}
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* QoL: Expand/collapse button for long code */}
          {shouldCollapse && (
            <button
              onClick={toggleExpand}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title={isExpanded ? "Collapse code" : "Expand code"}
            >
              <span>{isExpanded ? "Collapse" : "Expand"}</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="Copy code"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* Code content with optional collapse */}
      <div 
        className={cn(
          "max-w-full [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:-webkit-overflow-scrolling-touch [&_code]:text-sm [&_pre]:scrollbar-thin [&_pre]:scrollbar-track-muted [&_pre]:scrollbar-thumb-muted-foreground/30 [&_pre]:bg-transparent transition-all duration-200",
          shouldCollapse && !isExpanded && "max-h-[300px] overflow-hidden"
        )}
      >
        {parseHtml(html)}
      </div>
      {/* QoL: Gradient overlay when collapsed */}
      {shouldCollapse && !isExpanded && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/80 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

// -------Step 2: Main MarkdownRenderer component-------

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  proseClassName?: string;
}

// Memoized Markdown component to prevent re-renders
const createMarkdownComponent = (
  proseClassName?: string
): LLMOutputComponent => {
  const MarkdownBlock: LLMOutputComponent = memo(function MarkdownBlock({
    blockMatch,
  }) {
    const markdown = blockMatch.output;
    return (
      <div
        className={cn(
          "prose dark:prose-invert max-w-none",
          // Paragraph and text spacing
          "prose-p:my-3 prose-p:leading-relaxed",
          // Heading styles with better hierarchy
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/40",
          "prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3",
          "prose-h4:text-base prose-h4:mt-4 prose-h4:mb-2",
          // List styles
          "prose-ul:my-3 prose-ol:my-3 prose-li:my-1.5",
          "prose-ul:pl-4 prose-ol:pl-4",
          // Code styles (inline)
          "prose-pre:my-0",
          "prose-code:before:content-none prose-code:after:content-none",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
          // Table styles - enhanced for interview content
          "prose-table:my-4 prose-table:w-full prose-table:border-collapse",
          "prose-thead:bg-muted/50",
          "prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-sm prose-th:border prose-th:border-border/50",
          "prose-td:px-4 prose-td:py-2.5 prose-td:text-sm prose-td:border prose-td:border-border/50",
          "prose-tr:even:bg-muted/20",
          // Blockquote styles - for interview answer frameworks
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-primary/5",
          "prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:my-4 prose-blockquote:rounded-r-lg",
          "prose-blockquote:not-italic prose-blockquote:text-foreground/90",
          // Strong and emphasis
          "prose-strong:font-semibold prose-strong:text-foreground",
          "prose-em:text-muted-foreground",
          // Horizontal rule
          "prose-hr:my-8 prose-hr:border-border/50",
          // Links
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
          // Images
          "prose-img:rounded-lg prose-img:shadow-md",
          proseClassName
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    );
  });
  return MarkdownBlock;
};

export function MarkdownRenderer({
  content,
  isStreaming = false,
  className,
  proseClassName,
}: MarkdownRendererProps) {
  // Memoize the markdown component to prevent recreation on each render
  const MarkdownComponent = useMemo(
    () => createMarkdownComponent(proseClassName),
    [proseClassName]
  );

  // Memoize blocks configuration
  const blocks = useMemo(
    () => [
      {
        component: CodeBlock,
        findCompleteMatch: findCompleteCodeBlock(),
        findPartialMatch: findPartialCodeBlock(),
        lookBack: codeBlockLookBack(),
      },
    ],
    []
  );

  // Memoize fallback block
  const fallbackBlock = useMemo(
    () => ({
      component: MarkdownComponent,
      lookBack: markdownLookBack(),
    }),
    [MarkdownComponent]
  );

  const { blockMatches } = useLLMOutput({
    llmOutput: content,
    fallbackBlock,
    blocks,
    isStreamFinished: !isStreaming,
  });

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {blockMatches.map((blockMatch, index) => {
        const Component = blockMatch.block.component;
        return <Component key={index} blockMatch={blockMatch} />;
      })}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5" />
      )}
    </div>
  );
}

// Simple markdown renderer without streaming (for static content)
export function StaticMarkdown({
  content,
  className,
  proseClassName,
}: {
  content: string;
  className?: string;
  proseClassName?: string;
}) {
  return (
    <MarkdownRenderer
      content={content}
      isStreaming={false}
      className={className}
      proseClassName={proseClassName}
    />
  );
}

// Export for use in AI log viewer and other components
export { MarkdownRenderer as default };
