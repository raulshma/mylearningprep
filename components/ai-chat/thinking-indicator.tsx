"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  reasoning: string;
  isStreaming: boolean;
  className?: string;
}

export const ThinkingIndicator = memo(function ThinkingIndicator({
  reasoning,
  isStreaming,
  className,
}: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  const prevIsStreamingRef = useRef(isStreaming);

  // Handle auto-expand when streaming starts and auto-collapse when it stops
  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current;
    let expandTimer: NodeJS.Timeout | undefined;
    let collapseTimer: NodeJS.Timeout | undefined;

    // Streaming just started - expand (use microtask to avoid sync setState warning)
    if (isStreaming && !wasStreaming) {
      expandTimer = setTimeout(() => {
        setIsExpanded(true);
      }, 0);
    }

    // Streaming just stopped - collapse after a short delay
    if (!isStreaming && wasStreaming && reasoning.length > 0) {
      collapseTimer = setTimeout(() => {
        setIsExpanded(false);
      }, 500);
    }

    prevIsStreamingRef.current = isStreaming;

    return () => {
      if (expandTimer) clearTimeout(expandTimer);
      if (collapseTimer) clearTimeout(collapseTimer);
    };
  }, [isStreaming, reasoning.length]);

  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);

  if (!reasoning) return null;

  return (
    <div 
      className={cn("mb-3", className)}
      role="region"
      aria-label="AI reasoning process"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleExpanded}
        className={cn(
          "h-auto py-1.5 px-3 gap-2 text-xs font-medium rounded-full",
          "bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400",
          "border border-violet-500/20 transition-all duration-200"
        )}
        aria-expanded={isExpanded}
        aria-controls="thinking-content"
        aria-label={isStreaming ? "AI is thinking, click to collapse" : "View AI thought process"}
      >
        <div className="relative" aria-hidden="true">
          <Brain className="h-3.5 w-3.5" />
          {isStreaming && (
            <motion.div
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-violet-500"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
        <span>{isStreaming ? "Thinking..." : "Thought process"}</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            id="thinking-content"
          >
            <div 
              className="mt-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 text-sm text-muted-foreground"
              role="status"
              aria-live={isStreaming ? "polite" : "off"}
              aria-busy={isStreaming}
            >
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                  {reasoning}
                  {isStreaming && (
                    <motion.span
                      className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
