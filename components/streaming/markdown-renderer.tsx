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

// Memoized Code block component with Shiki syntax highlighting
const CodeBlock: LLMOutputComponent = memo(function CodeBlock({ blockMatch }) {
  const { html, code } = useCodeBlockToHtml({
    markdownCodeBlock: blockMatch.output,
    highlighter,
    codeToHtmlOptions,
  });

  const [isCopied, setIsCopied] = useState(false);

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

  if (!html) {
    // Fallback while Shiki is loading
    return (
      <div className="relative group my-4">
        <pre className="shiki bg-muted p-4 rounded-lg overflow-x-auto max-w-full scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground/30">
          <code className="text-sm font-mono">{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border/50">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 shadow-sm backdrop-blur-sm transition-all"
          title="Copy code"
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          )}
        </button>
      </div>
      <div className="max-w-full [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:-webkit-overflow-scrolling-touch [&_code]:text-sm [&_pre]:scrollbar-thin [&_pre]:scrollbar-track-muted [&_pre]:scrollbar-thumb-muted-foreground/30">
        {parseHtml(html)}
      </div>
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
          "prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-pre:my-0 prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
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
    <div className={cn("relative", className)}>
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
