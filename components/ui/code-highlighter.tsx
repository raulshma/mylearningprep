"use client";

/**
 * Code Highlighter Component
 * Uses Shiki for syntax highlighting with dual theme support
 * Enhanced with expanded language support, labels, and collapse functionality
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { getHighlighter, type Highlighter } from "shiki";
import { cn } from "@/lib/utils";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";

interface CodeHighlighterProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
  showHeader?: boolean;
  collapsible?: boolean;
  maxCollapsedLines?: number;
}

// Cache the highlighter instance
let highlighterPromise: Promise<Highlighter> | null = null;

// Supported languages - comprehensive list for lesson content
const SUPPORTED_LANGUAGES = [
  // Core web languages
  "typescript", "javascript", "jsx", "tsx", "html", "css",
  // Backend languages
  "csharp", "python", "java", "go", "rust", "ruby", "php",
  // System languages
  "cpp", "c", "swift", "kotlin", "scala",
  // Data & Config
  "sql", "json", "yaml", "xml", "graphql", "toml",
  // Shell & DevOps
  "bash", "dockerfile", "powershell",
  // Documentation
  "markdown",
  // Fallback
  "text"
] as const;

// Language aliases for common variations
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  razor: "csharp",
  dotnet: "csharp",
};

// Display names for languages
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  jsx: "JSX",
  tsx: "TSX",
  html: "HTML",
  css: "CSS",
  csharp: "C#",
  python: "Python",
  java: "Java",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  cpp: "C++",
  c: "C",
  swift: "Swift",
  kotlin: "Kotlin",
  scala: "Scala",
  sql: "SQL",
  json: "JSON",
  yaml: "YAML",
  xml: "XML",
  graphql: "GraphQL",
  toml: "TOML",
  bash: "Bash",
  dockerfile: "Dockerfile",
  powershell: "PowerShell",
  markdown: "Markdown",
  text: "Plain Text",
};

function getShikiHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [...SUPPORTED_LANGUAGES],
    });
  }
  return highlighterPromise;
}

// Resolve language alias to actual language
function resolveLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

// Get display name for language
function getLanguageDisplayName(lang: string): string {
  const resolved = resolveLanguage(lang);
  return LANGUAGE_DISPLAY_NAMES[resolved] || lang.toUpperCase();
}

// Default collapse threshold
const DEFAULT_COLLAPSE_THRESHOLD = 20;

export function CodeHighlighter({
  code,
  language = "typescript",
  className,
  showLineNumbers = false,
  showHeader = true,
  collapsible = true,
  maxCollapsedLines = DEFAULT_COLLAPSE_THRESHOLD,
}: CodeHighlighterProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Resolve language and get display name
  const resolvedLanguage = useMemo(() => resolveLanguage(language), [language]);
  const displayName = useMemo(() => getLanguageDisplayName(language), [language]);
  
  // Calculate line count and whether to show collapse
  const lineCount = useMemo(() => code.split('\n').length, [code]);
  const shouldCollapse = collapsible && lineCount > maxCollapsedLines;

  const highlight = useCallback(async () => {
    try {
      const highlighter = await getShikiHighlighter();
      const loadedLangs = highlighter.getLoadedLanguages();
      const langToUse = loadedLangs.includes(resolvedLanguage as never) ? resolvedLanguage : "text";
      
      const highlighted = highlighter.codeToHtml(code, {
        lang: langToUse,
        themes: {
          light: "github-light",
          dark: "github-dark",
        },
        defaultColor: false,
      });

      setHtml(highlighted);
    } catch (error) {
      console.warn(`Shiki highlighting failed:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [code, resolvedLanguage]);

  useEffect(() => {
    highlight();
  }, [highlight]);

  const handleCopy = useCallback(async () => {
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

  // Loading/fallback state
  if (isLoading || !html) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden border border-border/50 bg-muted/30", className)}>
        {showHeader && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono font-medium">
                {displayName}
              </span>
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            </div>
          </div>
        )}
        <pre
          className={cn(
            "p-4 overflow-x-auto text-sm font-mono",
            "scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground/30"
          )}
        >
          <code className="whitespace-pre-wrap break-words">{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-border/50 bg-muted/30", className)}>
      {/* Header bar with language, line count, and actions */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono font-medium">
              {displayName}
            </span>
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Expand/collapse button for long code */}
            {shouldCollapse && (
              <button
                onClick={toggleExpand}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title={isExpanded ? "Collapse code" : "Expand code"}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>Expand</span>
                  </>
                )}
              </button>
            )}
            {/* Copy button */}
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
      )}
      
      {/* Code content with optional collapse */}
      <div 
        className={cn(
          "max-w-full [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:-webkit-overflow-scrolling-touch",
          "[&_code]:text-sm [&_code]:font-mono",
          "[&_pre]:scrollbar-thin [&_pre]:scrollbar-track-muted [&_pre]:scrollbar-thumb-muted-foreground/30",
          "[&_pre]:bg-transparent transition-all duration-200",
          showLineNumbers && "[&_pre]:pl-12",
          shouldCollapse && !isExpanded && "max-h-[300px] overflow-hidden",
          "[&_pre]:my-0"
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      
      {/* Fade overlay when collapsed */}
      {shouldCollapse && !isExpanded && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/90 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Detect programming language from code content
 */
export function detectLanguage(code: string): string {
  const trimmed = code.trim().toLowerCase();
  
  // C# indicators
  if (trimmed.includes("using system") || trimmed.includes("namespace ") || 
      (trimmed.includes("public class ") && trimmed.includes("{"))) {
    return "csharp";
  }
  
  // Python indicators
  if (trimmed.includes("def ") || trimmed.includes("import ") && trimmed.includes(":") || trimmed.includes("print(")) {
    return "python";
  }
  
  // JavaScript/TypeScript indicators
  if (trimmed.includes("const ") || trimmed.includes("let ") || trimmed.includes("function ") || trimmed.includes("=>")) {
    if (trimmed.includes(": ") && (trimmed.includes("interface ") || trimmed.includes("type "))) {
      return "typescript";
    }
    return "javascript";
  }
  
  // Java indicators
  if (trimmed.includes("public class ") || trimmed.includes("public static void main")) {
    return "java";
  }
  
  // C++ indicators
  if (trimmed.includes("#include") || trimmed.includes("std::") || trimmed.includes("cout <<")) {
    return "cpp";
  }
  
  // SQL indicators
  if (trimmed.includes("select ") && trimmed.includes("from ") || trimmed.includes("create table")) {
    return "sql";
  }
  
  // Go indicators
  if (trimmed.includes("func ") && trimmed.includes("package ")) {
    return "go";
  }
  
  // Rust indicators
  if (trimmed.includes("fn ") && trimmed.includes("let mut ")) {
    return "rust";
  }
  
  return "typescript"; // Default fallback
}

// Export language utilities for use elsewhere
export { resolveLanguage, getLanguageDisplayName, LANGUAGE_ALIASES, LANGUAGE_DISPLAY_NAMES };
