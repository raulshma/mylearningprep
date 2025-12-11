"use client";

import { useState, memo, useCallback, useMemo } from "react";
import {
  Loader2,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/lib/store/chat/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Tool invocation state
 */
export type ToolInvocationState = 
  | 'input-streaming' 
  | 'input-available' 
  | 'output-available' 
  | 'output-error';

/**
 * Props for ToolInvocationDisplay component
 */
export interface ToolInvocationDisplayProps {
  /**
   * The tool call to display
   */
  toolCall: ToolCall;
  /**
   * Visual variant
   */
  variant?: "default" | "compact";
  /**
   * Optional class name
   */
  className?: string;
}

/**
 * Props for ToolOutputDisplay component
 */
export interface ToolOutputDisplayProps {
  /**
   * The output to display
   */
  output: unknown;
  /**
   * The tool name for specialized formatting
   */
  toolName: string;
  /**
   * Optional class name
   */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format tool name for display (convert camelCase to Title Case)
 */
export function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Get status info for a tool invocation
 */
export function getToolStatusInfo(state: ToolInvocationState): {
  icon: typeof CheckCircle2;
  label: string;
  colorClass: string;
  bgClass: string;
  isLoading: boolean;
} {
  switch (state) {
    case 'output-available':
      return {
        icon: CheckCircle2,
        label: 'Completed',
        colorClass: 'text-green-600',
        bgClass: 'bg-green-500/20',
        isLoading: false,
      };
    case 'output-error':
      return {
        icon: AlertCircle,
        label: 'Error',
        colorClass: 'text-red-600',
        bgClass: 'bg-red-500/20',
        isLoading: false,
      };
    case 'input-streaming':
    case 'input-available':
    default:
      return {
        icon: Wrench,
        label: 'Running',
        colorClass: 'text-primary',
        bgClass: 'bg-primary/20',
        isLoading: true,
      };
  }
}

// =============================================================================
// Tool Output Display Component
// =============================================================================

/**
 * Displays formatted tool output based on tool type
 * 
 * Requirements: 9.4 - Show tool output in collapsible section
 */
export const ToolOutputDisplay = memo(function ToolOutputDisplay({
  output,
  toolName,
  className,
}: ToolOutputDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = typeof output === 'string' 
      ? output 
      : JSON.stringify(output, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  // Format output based on type and tool name
  const formattedOutput = useMemo(() => {
    if (output == null) return null;

    if (typeof output === "string") {
      return <span className="whitespace-pre-wrap">{output}</span>;
    }

    if (typeof output === "object") {
      const obj = output as Record<string, unknown>;

      // Search results formatting
      if (toolName === "searchWeb" && Array.isArray(obj.results)) {
        return (
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs">
              Found {obj.results.length} results:
            </div>
            {obj.results.slice(0, 5).map(
              (result: { title?: string; url?: string; snippet?: string }, i: number) => (
                <div key={i} className="pl-2 border-l-2 border-primary/30">
                  <div className="font-medium text-sm">{result.title}</div>
                  {result.url && (
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {result.url}
                    </a>
                  )}
                  {result.snippet && (
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {result.snippet}
                    </div>
                  )}
                </div>
              )
            )}
            {obj.results.length > 5 && (
              <div className="text-muted-foreground text-xs">
                ...and {obj.results.length - 5} more
              </div>
            )}
          </div>
        );
      }

      // Tech trends formatting
      if (toolName === "analyzeTechTrends" && obj.trends) {
        const trends = obj.trends as Array<{
          technology?: string;
          trend?: string;
          recommendation?: string;
        }>;
        return (
          <div className="space-y-2">
            {trends.map((trend, i: number) => (
              <div key={i} className="pl-2 border-l-2 border-primary/30">
                <div className="font-medium text-sm">{trend.technology}</div>
                {trend.trend && <div className="text-xs">{trend.trend}</div>}
                {trend.recommendation && (
                  <div className="text-muted-foreground text-xs mt-0.5">
                    💡 {trend.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      // Interview questions formatting
      if (toolName === "generateInterviewQuestions" && Array.isArray(obj.questions)) {
        return (
          <div className="space-y-1.5">
            {obj.questions.slice(0, 5).map(
              (q: { question?: string; difficulty?: string }, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-primary font-medium">{i + 1}.</span>
                  <div>
                    <span className="text-sm">{q.question}</span>
                    {q.difficulty && (
                      <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">
                        {q.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            )}
            {obj.questions.length > 5 && (
              <div className="text-muted-foreground text-xs">
                ...and {obj.questions.length - 5} more questions
              </div>
            )}
          </div>
        );
      }

      // Default object display
      const entries = Object.entries(obj).filter(([, v]) => v != null);
      if (entries.length === 0) {
        return <span className="text-muted-foreground">No data</span>;
      }

      return (
        <div className="space-y-1">
          {entries.slice(0, 5).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-sm">
              <span className="text-muted-foreground capitalize shrink-0">
                {key.replace(/([A-Z])/g, " $1").trim()}:
              </span>
              <span className="flex-1 break-words">
                {typeof value === "object"
                  ? Array.isArray(value)
                    ? `${value.length} items`
                    : JSON.stringify(value).slice(0, 50) + "..."
                  : String(value).slice(0, 100)}
              </span>
            </div>
          ))}
          {entries.length > 5 && (
            <div className="text-muted-foreground text-xs">
              ...and {entries.length - 5} more fields
            </div>
          )}
        </div>
      );
    }

    return <span>{String(output)}</span>;
  }, [output, toolName]);

  if (output == null) return null;

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 h-6 w-6"
        onClick={handleCopy}
        aria-label="Copy output"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
      <div className="pr-8">{formattedOutput}</div>
    </div>
  );
});

// =============================================================================
// Tool Error Display Component
// =============================================================================

/**
 * Displays tool error information
 * 
 * Requirements: 9.5 - Display error message with tool context
 */
export const ToolErrorDisplay = memo(function ToolErrorDisplay({
  errorText,
  toolName,
  className,
}: {
  errorText: string;
  toolName: string;
  className?: string;
}) {
  return (
    <div className={cn("text-red-500 text-sm", className)} role="alert">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span className="font-medium">Error in {formatToolName(toolName)}</span>
      </div>
      <p className="text-xs">{errorText}</p>
    </div>
  );
});

// =============================================================================
// Tool Input Display Component
// =============================================================================

/**
 * Displays tool input parameters
 */
export const ToolInputDisplay = memo(function ToolInputDisplay({
  input,
  className,
}: {
  input: unknown;
  className?: string;
}) {
  if (input == null) return null;

  const inputStr = typeof input === "object" 
    ? JSON.stringify(input, null, 2) 
    : String(input);

  const truncated = inputStr.length > 200 
    ? inputStr.slice(0, 200) + "..." 
    : inputStr;

  return (
    <div className={cn("text-muted-foreground text-xs font-mono", className)}>
      <pre className="whitespace-pre-wrap break-words">{truncated}</pre>
    </div>
  );
});


// =============================================================================
// Main Tool Invocation Display Component
// =============================================================================

/**
 * Displays a tool invocation with expandable input/output
 * 
 * Requirements: 9.3 - Display tool name and status in real-time
 * Requirements: 9.4 - Show tool output in collapsible section
 * Requirements: 9.5 - Display error message with tool context
 */
export const ToolInvocationDisplay = memo(function ToolInvocationDisplay({
  toolCall,
  variant = "default",
  className,
}: ToolInvocationDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { name, state, input, output, errorText } = toolCall;
  const statusInfo = getToolStatusInfo(state);
  const StatusIcon = statusInfo.icon;
  const isComplete = state === "output-available";
  const isError = state === "output-error";
  const isCompact = variant === "compact";

  const toggleExpanded = useCallback(() => {
    if (isComplete || isError) {
      setIsExpanded((prev) => !prev);
    }
  }, [isComplete, isError]);

  return (
    <div
      className={cn(
        "text-xs overflow-hidden border border-border/50",
        isCompact ? "rounded-md bg-muted/50" : "rounded-2xl bg-muted/30",
        className
      )}
      role="region"
      aria-label={`Tool: ${formatToolName(name)}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        disabled={!isComplete && !isError}
        className={cn(
          "flex items-start gap-2 w-full text-left",
          isCompact ? "p-2" : "p-3",
          (isComplete || isError) && "hover:bg-muted/50 cursor-pointer"
        )}
        aria-expanded={isExpanded}
        aria-controls={`tool-content-${toolCall.id}`}
      >
        {/* Status Icon */}
        <div
          className={cn(
            "shrink-0 rounded-lg",
            isCompact ? "p-1" : "p-1.5",
            statusInfo.bgClass,
            statusInfo.colorClass
          )}
          aria-hidden="true"
        >
          {statusInfo.isLoading ? (
            <Loader2 className={cn(isCompact ? "h-3 w-3" : "h-3.5 w-3.5", "animate-spin")} />
          ) : (
            <StatusIcon className={cn(isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">
              {formatToolName(name)}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] py-0 px-1",
                statusInfo.colorClass
              )}
            >
              {statusInfo.label}
            </Badge>
            {(isComplete || isError) && (
              isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" aria-hidden="true" />
              )
            )}
          </div>

          {/* Show input while streaming/running */}
          {!isComplete && !isError && input != null && (
            <ToolInputDisplay input={input} className="mt-1" />
          )}

          {/* Show error inline if not expanded */}
          {isError && !isExpanded && errorText && (
            <div className="text-red-500 mt-1 truncate">{errorText}</div>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div 
          id={`tool-content-${toolCall.id}`}
          className="border-t border-border/50 p-3 bg-background/50"
        >
          {/* Input Section */}
          {input != null && (
            <div className="mb-3">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
                Input
              </div>
              <ToolInputDisplay input={input} />
            </div>
          )}

          {/* Output Section */}
          {isComplete && output != null && (
            <div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
                Output
              </div>
              <ToolOutputDisplay output={output} toolName={name} />
            </div>
          )}

          {/* Error Section */}
          {isError && errorText && (
            <ToolErrorDisplay errorText={errorText} toolName={name} />
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Tool Invocation List Component
// =============================================================================

/**
 * Displays a list of tool invocations
 */
export const ToolInvocationList = memo(function ToolInvocationList({
  toolCalls,
  variant = "default",
  className,
}: {
  toolCalls: ToolCall[];
  variant?: "default" | "compact";
  className?: string;
}) {
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="Tool invocations">
      {toolCalls.map((toolCall) => (
        <ToolInvocationDisplay
          key={toolCall.id}
          toolCall={toolCall}
          variant={variant}
        />
      ))}
    </div>
  );
});
