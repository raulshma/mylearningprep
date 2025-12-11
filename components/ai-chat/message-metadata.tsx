"use client";

import { useState, memo, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Cpu,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageMetadata } from "@/hooks/use-ai-assistant";
import type { MessageMetadata as StoreMessageMetadata } from "@/lib/store/chat/types";

/**
 * Props for MessageMetadataDisplay component
 * Supports both hook-based and store-based metadata types
 */
interface MessageMetadataDisplayProps {
  metadata: MessageMetadata | StoreMessageMetadata;
  className?: string;
  /**
   * Whether to start in expanded state
   */
  defaultExpanded?: boolean;
}

/**
 * Extract short model name from full model ID
 * e.g., "anthropic/claude-3.5-sonnet" -> "Claude 3.5 Sonnet"
 */
function formatModelName(modelId: string): string {
  // Get the part after the last slash
  const parts = modelId.split("/");
  const name = parts[parts.length - 1];
  
  // Clean up common patterns
  return name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/(\d+)\.(\d+)/g, "$1.$2") // Keep version numbers
    .trim();
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

/**
 * Format throughput
 */
function formatThroughput(value?: number | null): string {
  if (value === undefined || value === null) return "N/A";
  return `${value} tok/s`;
}

/**
 * Message metadata display component
 * 
 * Displays token counts, latency, and model information for AI responses.
 * 
 * Requirements: 8.6 - Display message metadata with final token counts and latency
 */
export const MessageMetadataDisplay = memo(function MessageMetadataDisplay({
  metadata,
  className,
  defaultExpanded = false,
}: MessageMetadataDisplayProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // Memoize formatted model name
  const modelName = useMemo(
    () => metadata.modelName || formatModelName(metadata.model),
    [metadata.modelName, metadata.model]
  );

  // Memoize toggle callback
  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className={cn("flex flex-col gap-1", className)} role="region" aria-label="Message metadata">
      {/* Model badge - always visible */}
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="text-[10px] h-5 px-1.5 font-normal bg-primary/10 text-primary cursor-pointer"
                onClick={toggleExpanded}
                aria-expanded={expanded}
                aria-controls="metadata-details"
              >
                <Cpu className="w-3 h-3 mr-1" aria-hidden="true" />
                {modelName}
                {expanded ? (
                  <ChevronUp className="w-3 h-3 ml-1" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1" aria-hidden="true" />
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-mono">{metadata.model}</p>
              <p className="text-muted-foreground">Click to {expanded ? "hide" : "show"} details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Quick stats - always visible */}
        <Badge
          variant="outline"
          className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
          aria-label={`Total tokens: ${formatTokens(metadata.totalTokens)}`}
        >
          {formatTokens(metadata.totalTokens)} tokens
        </Badge>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div id="metadata-details" className="flex items-center gap-2 flex-wrap mt-1 pl-1" role="list" aria-label="Detailed metrics">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                >
                  ↓ {formatTokens(metadata.tokensIn)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Input tokens (prompt)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                >
                  ↑ {formatTokens(metadata.tokensOut)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Output tokens (completion)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {formatLatency(metadata.latencyMs)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Total response time
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                >
                  TTFT: {formatLatency(metadata.ttft)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Time to first token
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  {formatThroughput(metadata.throughput)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Throughput (tokens per second)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
});
