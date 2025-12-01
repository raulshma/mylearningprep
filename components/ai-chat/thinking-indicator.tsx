"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  reasoning: string;
  isStreaming: boolean;
  className?: string;
}

export function ThinkingIndicator({
  reasoning,
  isStreaming,
  className,
}: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  // Auto-collapse when streaming stops
  if (!isStreaming && isExpanded && reasoning.length > 0) {
    // Keep expanded while streaming, collapse after a delay when done
  }

  if (!reasoning) return null;

  return (
    <div className={cn("mb-3", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-auto py-1.5 px-3 gap-2 text-xs font-medium rounded-full",
          "bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400",
          "border border-violet-500/20 transition-all duration-200"
        )}
      >
        <div className="relative">
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
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
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
          >
            <div className="mt-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                <div className="flex-1 whitespace-pre-wrap leading-relaxed">
                  {reasoning}
                  {isStreaming && (
                    <motion.span
                      className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
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
}
