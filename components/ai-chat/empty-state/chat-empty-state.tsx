"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface ChatEmptyStateProps {
  title?: string;
  description?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  variant?: "default" | "compact";
}

// Memoized suggestion button to prevent re-renders
const SuggestionButton = memo(function SuggestionButton({
  suggestion,
  index,
  onClick,
  variant,
}: {
  suggestion: string;
  index: number;
  onClick: (suggestion: string) => void;
  variant: "default" | "compact";
}) {
  const handleClick = useCallback(() => onClick(suggestion), [onClick, suggestion]);

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left text-xs p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors flex items-center gap-2 group"
      >
        <span className="line-clamp-1">{suggestion}</span>
      </button>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className="p-5 text-left rounded-2xl border border-border/50 bg-card/50 hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md"
    >
      <p className="text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors">
        {suggestion}
      </p>
    </motion.button>
  );
});

/**
 * Empty state shown when there are no messages
 * Memoized to prevent unnecessary re-renders
 */
export const ChatEmptyState = memo(function ChatEmptyState({
  title = "How can I help you today?",
  description = "I can help with interview prep, analyze tech trends, generate questions, and more.",
  suggestions = [],
  onSuggestionClick,
  variant = "default",
}: ChatEmptyStateProps) {
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <div 
        className="text-center py-8"
        role="region"
        aria-label="Chat welcome message"
      >
        <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" aria-hidden="true" />
        <h4 className="text-sm font-medium mb-2">{title}</h4>
        <p className="text-xs text-muted-foreground mb-6">{description}</p>
        {suggestions.length > 0 && onSuggestionClick && (
          <div 
            className="space-y-2"
            role="list"
            aria-label="Suggested prompts"
          >
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <SuggestionButton
                key={suggestion}
                suggestion={suggestion}
                index={index}
                onClick={onSuggestionClick}
                variant="compact"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-2"
      role="region"
      aria-label="Chat welcome message"
    >
      <div className="inline-flex p-6 rounded-3xl bg-primary/10 mb-8 shadow-sm" aria-hidden="true">
        <Bot className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-3xl font-bold mb-3 tracking-tight">{title}</h2>
      <p className="text-muted-foreground mb-12 max-w-md mx-auto text-lg">
        {description}
      </p>

      {/* Suggestions Grid */}
      {suggestions.length > 0 && onSuggestionClick && (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
          role="list"
          aria-label="Suggested prompts to get started"
        >
          {suggestions.slice(0, 4).map((suggestion, index) => (
            <SuggestionButton
              key={suggestion}
              suggestion={suggestion}
              index={index}
              onClick={onSuggestionClick}
              variant="default"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
});
