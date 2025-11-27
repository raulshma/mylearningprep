"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  type LucideIcon,
  AlertCircle,
  Loader2,
  Sparkles,
  Brain,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RegenerateMenu } from "@/components/streaming/regenerate-menu";
import type { StreamingCardStatus } from "@/components/streaming/streaming-card";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: StreamingCardStatus;
  children: React.ReactNode;
  count?: number;
  onRetry?: () => void;
  onRegenerate?: () => void;
  onRegenerateWithInstructions?: (instructions: string) => void;
  regenerateLabel?: string;
  id?: string;
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  status,
  children,
  count,
  onRetry,
  onRegenerate,
  onRegenerateWithInstructions,
  regenerateLabel = "Add More",
  id,
}: ModuleCardProps) {
  const isLoading = status === "loading";
  const isStreaming = status === "streaming";
  const isComplete = status === "complete";
  const isError = status === "error";
  const isIdle = status === "idle";

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div
        className={`rounded-3xl border bg-background/60 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300 ${isError
          ? "border-destructive/30 shadow-destructive/5"
          : isLoading || isStreaming
            ? "border-primary/30 shadow-primary/5"
            : "border-border/50 hover:shadow-xl hover:border-border"
          }`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-6 md:p-8 pb-4 md:pb-6 gap-4 sm:gap-0">
          <div className="flex items-start gap-4 md:gap-5">
            <div
              className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-colors shadow-inner ${isLoading || isStreaming
                ? "bg-primary/10"
                : isError
                  ? "bg-destructive/10"
                  : "bg-secondary"
                }`}
            >
              {isLoading || isStreaming ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-6 h-6 text-primary" />
                </motion.div>
              ) : isError ? (
                <AlertCircle className="w-6 h-6 text-destructive" />
              ) : (
                <Icon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">{title}</h3>
                {count !== undefined && count > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary/50 border-border/50">
                    {count}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-medium">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Status indicator */}
            {(isLoading || isStreaming) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
              >
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {isLoading ? (
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  )}
                </motion.div>
                <span className="text-xs font-semibold text-primary">
                  {isLoading ? "Thinking..." : "Generating..."}
                </span>
              </motion.div>
            )}

            {/* Actions */}
            {isComplete &&
              onRegenerate &&
              (onRegenerateWithInstructions ? (
                <RegenerateMenu
                  onRegenerate={onRegenerate}
                  onRegenerateWithInstructions={onRegenerateWithInstructions}
                  label={regenerateLabel}
                  contextHint={title.toLowerCase()}
                />
              ) : (
                <Button variant="outline" size="sm" onClick={onRegenerate} className="rounded-full shadow-sm">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {regenerateLabel}
                </Button>
              ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 md:px-8 pb-6 md:pb-8">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="h-4 bg-muted/50 w-3/4 rounded-full animate-pulse" />
                <div className="h-4 bg-muted/50 w-full rounded-full animate-pulse" />
                <div className="h-4 bg-muted/50 w-2/3 rounded-full animate-pulse" />
              </motion.div>
            )}

            {isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between py-6 px-4 rounded-2xl bg-destructive/5 border border-destructive/10"
              >
                <span className="text-destructive text-sm font-medium">
                  Failed to generate content. Please try again.
                </span>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry} className="rounded-full border-destructive/20 hover:bg-destructive/10 text-destructive hover:text-destructive">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry
                  </Button>
                )}
              </motion.div>
            )}

            {isIdle && !children && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between py-6 px-4 rounded-2xl bg-secondary/20 border border-border/50"
              >
                <span className="text-muted-foreground text-sm font-medium">
                  Content not generated yet.
                </span>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry} className="rounded-full shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Generate
                  </Button>
                )}
              </motion.div>
            )}

            {(isStreaming || isComplete || (isIdle && children)) && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
