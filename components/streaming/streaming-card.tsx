"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  type LucideIcon,
  AlertCircle,
  Loader2,
  Sparkles,
  Brain,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegenerateMenu } from "@/components/streaming/regenerate-menu";
import { cn } from "@/lib/utils";

export type StreamingCardStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "complete"
  | "error";

interface StreamingCardProps {
  title: string;
  icon: LucideIcon;
  status: StreamingCardStatus;
  children: React.ReactNode;
  onAddMore?: () => void;
  onAddMoreWithInstructions?: (instructions: string) => void;
  addMoreLabel?: string;
  errorMessage?: string;
  className?: string;
  /** Number of items currently streamed (for progress display) */
  streamedCount?: number;
  /** Status message to show during streaming */
  streamingMessage?: string;
  /** Callback to retry generation on error */
  onRetry?: () => void;
}

const statusVariants = {
  idle: { opacity: 0.7 },
  loading: { opacity: 1 },
  streaming: { opacity: 1 },
  complete: { opacity: 1 },
  error: { opacity: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: "easeIn" as const },
  },
};

export function StreamingCard({
  title,
  icon: Icon,
  status,
  children,
  onAddMore,
  onAddMoreWithInstructions,
  addMoreLabel = "Add More",
  errorMessage,
  className,
  streamedCount,
  streamingMessage,
  onRetry,
}: StreamingCardProps) {
  const isLoading = status === "loading";
  const isStreaming = status === "streaming";
  const isComplete = status === "complete";
  const isError = status === "error";

  return (
    <motion.div
      initial="idle"
      animate={status}
      variants={statusVariants}
      className={className}
    >
      <Card
        className={cn(
          "transition-colors duration-200",
          isError && "border-destructive/50",
          (isLoading || isStreaming) && "border-primary/30"
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <motion.div
              animate={
                isLoading || isStreaming ? { rotate: 360 } : { rotate: 0 }
              }
              transition={
                isLoading || isStreaming
                  ? {
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }
                  : {}
              }
            >
              {isLoading || isStreaming ? (
                <Loader2 className="h-5 w-5 text-primary" />
              ) : isError ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Icon className="h-5 w-5 text-muted-foreground" />
              )}
            </motion.div>
            <CardTitle>{title}</CardTitle>
            {/* Streaming status badge */}
            {(isLoading || isStreaming) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 ml-auto"
              >
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [0.95, 1.05, 0.95],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full"
                >
                  {isLoading ? (
                    <>
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        {streamingMessage || "Thinking..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        {streamingMessage ||
                          (streamedCount !== undefined
                            ? `Generating... ${streamedCount} items`
                            : "Generating...")}
                      </span>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </div>
          {isComplete && onAddMore && (
            <CardAction>
              {onAddMoreWithInstructions ? (
                <RegenerateMenu
                  onRegenerate={onAddMore}
                  onRegenerateWithInstructions={onAddMoreWithInstructions}
                  label={addMoreLabel}
                  contextHint={title.toLowerCase()}
                />
              ) : (
                <Button variant="outline" size="sm" onClick={onAddMore}>
                  {addMoreLabel}
                </Button>
              )}
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="skeleton"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-3"
              >
                <div className="h-4 bg-muted rounded skeleton-pulse w-3/4" />
                <div className="h-4 bg-muted rounded skeleton-pulse w-full" />
                <div className="h-4 bg-muted rounded skeleton-pulse w-2/3" />
              </motion.div>
            )}
            {isError && (
              <motion.div
                key="error"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center justify-between"
              >
                <span className="text-destructive text-sm">
                  {errorMessage || "An error occurred while generating content."}
                </span>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Retry
                  </Button>
                )}
              </motion.div>
            )}
            {(status === "idle" || isStreaming || isComplete) && (
              <motion.div
                key="content"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={
                  {
                    viewTransitionName: "streaming-content",
                  } as React.CSSProperties
                }
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
