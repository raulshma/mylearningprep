"use client";

import { useState, useRef, useEffect, memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDER_INFO } from "@/lib/ai/types";
import type { AIProviderType } from "@/lib/ai/types";
import type { ModelResponse } from "@/lib/ai/multi-model-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Memoize remarkPlugins array to prevent ReactMarkdown re-renders
const remarkPlugins = [remarkGfm];

/**
 * Error state for a model response
 * Requirements: 5.4 - Display error for failed model while showing successful responses
 */
interface ModelErrorState {
  modelId: string;
  modelName: string;
  provider: AIProviderType;
  error: string;
  isRetryable?: boolean;
}

/**
 * Format token count with K suffix for large numbers
 */
function formatTokens(count?: number | null): string {
  if (count === undefined || count === null) return "N/A";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/**
 * Format latency in ms or seconds
 */
function formatLatency(ms?: number | null): string {
  if (ms === undefined || ms === null) return "N/A";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

interface ResponseColumnProps {
  response: ModelResponse;
  /** Callback for retrying a failed model request */
  onRetry?: (modelId: string, provider: AIProviderType) => void;
}

/**
 * Individual response column for a model
 * Requirements: 5.3 - Render each response in separate panel with model identification
 * Requirements: 5.4 - Display error for failed model while showing successful responses
 */
const ResponseColumn = memo(function ResponseColumn({ response, onRetry }: ResponseColumnProps) {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevContentLengthRef = useRef(0);

  // Auto-scroll when content changes during streaming
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !shouldAutoScrollRef.current) return;

    // Only scroll if new content was added
    if (response.content.length > prevContentLengthRef.current) {
      prevContentLengthRef.current = response.content.length;
      
      // Use setTimeout to ensure DOM has updated after ReactMarkdown renders
      const timeoutId = setTimeout(() => {
        if (container && shouldAutoScrollRef.current) {
          container.scrollTop = container.scrollHeight;
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [response.content]);

  // Reset state when streaming starts
  useEffect(() => {
    if (response.isStreaming) {
      shouldAutoScrollRef.current = true;
      prevContentLengthRef.current = 0;
    }
  }, [response.isStreaming]);

  // Detect user scroll to disable auto-scroll
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // If user scrolls up more than 50px, disable auto-scroll
      shouldAutoScrollRef.current = distanceFromBottom < 50;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    onRetry?.(response.modelId, response.provider);
  };

  const providerInfo = PROVIDER_INFO[response.provider];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex flex-col h-full rounded-xl border bg-background/80 overflow-hidden",
        response.error ? "border-destructive/50" : "border-border/40"
      )}
      role="article"
      aria-label={`Response from ${response.modelName}`}
    >
      {/* Compact Header - Requirements: 5.3 - Model identification */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40 bg-muted/20 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs" aria-hidden="true">{providerInfo?.icon || "🤖"}</span>
          <span className="text-[11px] font-medium truncate" title={response.modelName}>
            {response.modelName}
          </span>
          <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal text-muted-foreground">
            {response.provider}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {response.isStreaming && (
            <Loader2 className="h-3 w-3 animate-spin text-primary" aria-label="Loading response" />
          )}
          {response.isComplete && !response.error && (
            <button
              onClick={handleCopy}
              className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
              aria-label={copied ? "Copied" : "Copy response"}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto p-2 text-sm"
      >
        {/* Requirements: 5.4 - Display error for failed model */}
        {response.error ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-1.5 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{response.error}</span>
            </div>
            {onRetry && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 text-xs text-primary hover:underline self-start"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-1.5 prose-pre:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
            <ReactMarkdown remarkPlugins={remarkPlugins}>
              {response.content || (response.isStreaming ? "..." : "")}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      {response.isComplete && !response.error && response.metadata && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-border/40 bg-muted/10 shrink-0 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                >
                  {formatTokens((response.metadata.tokensIn || 0) + (response.metadata.tokensOut || 0))} tokens
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>↓ {formatTokens(response.metadata.tokensIn)} in</p>
                <p>↑ {formatTokens(response.metadata.tokensOut)} out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {response.metadata.latencyMs !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                  >
                    <Clock className="w-2.5 h-2.5 mr-0.5" />
                    {formatLatency(response.metadata.latencyMs)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Total response time
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {response.metadata.ttft !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                  >
                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                    {formatLatency(response.metadata.ttft)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Time to first token
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </motion.div>
  );
});

interface MultiModelResponseProps {
  responses: Map<string, ModelResponse>;
  isLoading: boolean;
  /** Callback for retrying a failed model request */
  onRetry?: (modelId: string, provider: AIProviderType) => void;
}

/**
 * Multi-model response grid component
 * Requirements: 5.3 - Render each response in separate panel with model identification
 * Requirements: 5.4 - Display error for failed model while showing successful responses
 */
export const MultiModelResponse = memo(function MultiModelResponse({ 
  responses, 
  isLoading,
  onRetry,
}: MultiModelResponseProps) {
  // Memoize array conversion to prevent unnecessary re-renders
  const responsesArray = useMemo(() => Array.from(responses.values()), [responses]);

  // Separate successful and failed responses for display
  const { successfulResponses, failedResponses } = useMemo(() => {
    const successful: ModelResponse[] = [];
    const failed: ModelResponse[] = [];
    
    for (const response of responsesArray) {
      if (response.error && response.isComplete) {
        failed.push(response);
      } else {
        successful.push(response);
      }
    }
    
    return { successfulResponses: successful, failedResponses: failed };
  }, [responsesArray]);

  if (responsesArray.length === 0 && !isLoading) {
    return null;
  }

  // Calculate grid columns based on total responses
  const totalResponses = responsesArray.length;

  return (
    <div
      className={cn(
        "grid gap-2 h-full",
        totalResponses === 1 && "grid-cols-1",
        totalResponses === 2 && "grid-cols-2",
        totalResponses === 3 && "grid-cols-3",
        totalResponses >= 4 && "grid-cols-2 lg:grid-cols-4"
      )}
      role="region"
      aria-label="Model responses comparison"
    >
      {/* Render all responses - successful ones show content, failed ones show errors */}
      {responsesArray.map((response) => (
        <ResponseColumn
          key={`${response.provider}:${response.modelId}`}
          response={response}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
});

// Export types for external use
export type { ModelErrorState };
