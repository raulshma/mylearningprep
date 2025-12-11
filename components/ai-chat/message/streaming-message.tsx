"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Bot, AlertCircle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThinkingIndicator } from "../thinking-indicator";
import { MessageTextContent } from "./message-text-content";
import { ToolDisplay } from "./tool-display";
import type { StreamingMessage as StreamingMessageType, ToolCall } from "@/lib/store/chat/types";
import type { ToolPart } from "../utils/message-helpers";
import { cn } from "@/lib/utils";

interface StreamingMessageProps {
  /**
   * The streaming message data
   */
  message: StreamingMessageType;
  /**
   * Visual variant
   */
  variant?: "default" | "compact";
  /**
   * Callback to stop the stream
   */
  onStop?: () => void;
  /**
   * Optional class name
   */
  className?: string;
}

/**
 * Convert store ToolCall to ToolPart format for display
 */
function toolCallToToolPart(toolCall: ToolCall): ToolPart {
  return {
    type: `tool-${toolCall.name}` as `tool-${string}`,
    toolCallId: toolCall.id,
    state: toolCall.state,
    input: toolCall.input,
    output: toolCall.output,
    errorText: toolCall.errorText,
  };
}

/**
 * Streaming message component
 * 
 * Handles incremental content rendering during AI response generation.
 * 
 * Features:
 * - Incremental text content rendering (Requirements 8.1)
 * - Reasoning display in thinking indicator (Requirements 8.2)
 * - Tool invocation status display (Requirements 8.3)
 * - Stop button to terminate stream
 */
export const StreamingMessage = memo(function StreamingMessage({
  message,
  variant = "default",
  onStop,
  className,
}: StreamingMessageProps) {
  const isCompact = variant === "compact";
  const avatarSize = isCompact ? "h-7 w-7" : "h-10 w-10";
  const iconSize = isCompact ? "h-3.5 w-3.5" : "h-5 w-5";

  // Convert tool calls to display format
  const toolParts = useMemo(
    () => message.toolCalls.map(toolCallToToolPart),
    [message.toolCalls]
  );

  // Determine if we're actively streaming (not complete and no error)
  const isStreaming = !message.isComplete && !message.error;

  // Show error state if there's an error
  if (message.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex gap-4", className)}
      >
        <div
          className={cn(
            "shrink-0 rounded-full flex items-center justify-center bg-destructive/10 border border-destructive/20",
            avatarSize
          )}
        >
          <AlertCircle className={cn(iconSize, "text-destructive")} />
        </div>
        <div className="flex-1 max-w-[85%]">
          {/* Show any partial content that was received */}
          {message.content && (
            <MessageTextContent
              content={message.content}
              isUser={false}
              variant={variant}
              className="mb-3"
            />
          )}
          <div
            className={cn(
              "inline-block rounded-tl-none text-sm bg-destructive/10 border border-destructive/20",
              isCompact ? "rounded-lg px-3 py-2" : "rounded-[20px] px-5 py-3.5"
            )}
          >
            <p className="text-destructive font-medium mb-1">Stream Error</p>
            <p className="text-destructive/80 text-xs">{message.error.message}</p>
            {message.error.isRetryable && (
              <p className="text-destructive/60 text-xs mt-2">
                You can try sending your message again.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-4 group", className)}
    >
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 rounded-full flex items-center justify-center shadow-sm",
          avatarSize,
          "bg-muted border border-border/50"
        )}
      >
        <Bot className={iconSize} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 max-w-[85%]">
        {/* Reasoning/Thinking indicator */}
        {message.reasoning && (
          <ThinkingIndicator
            reasoning={message.reasoning}
            isStreaming={isStreaming && !message.content}
          />
        )}

        {/* Text content with streaming cursor */}
        {message.content && (
          <div className="relative">
            <MessageTextContent
              content={message.content}
              isUser={false}
              variant={variant}
            />
            {/* Streaming cursor */}
            {isStreaming && (
              <motion.span
                className="inline-block w-2 h-4 bg-primary ml-0.5 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </div>
        )}

        {/* Loading indicator when no content yet */}
        {isStreaming && !message.content && !message.reasoning && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <motion.div
              className="flex gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-primary/60"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.span
                className="w-2 h-2 rounded-full bg-primary/60"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span
                className="w-2 h-2 rounded-full bg-primary/60"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </motion.div>
            <span>Generating response...</span>
          </div>
        )}

        {/* Tool invocations */}
        {toolParts.length > 0 && (
          <ToolDisplay toolParts={toolParts} variant={variant} />
        )}

        {/* Stop button */}
        {isStreaming && onStop && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="h-7 text-xs gap-1.5"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop generating
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

/**
 * Simple loading indicator for when streaming hasn't started yet
 */
export const StreamingLoadingIndicator = memo(function StreamingLoadingIndicator({
  variant = "default",
  className,
}: {
  variant?: "default" | "compact";
  className?: string;
}) {
  const isCompact = variant === "compact";
  const avatarSize = isCompact ? "h-7 w-7" : "h-10 w-10";
  const iconSize = isCompact ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-4", className)}
    >
      <div
        className={cn(
          "shrink-0 rounded-full flex items-center justify-center shadow-sm",
          avatarSize,
          "bg-muted border border-border/50"
        )}
      >
        <Bot className={iconSize} />
      </div>
      <div className="flex-1 max-w-[85%]">
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
          <motion.div className="flex gap-1">
            <motion.span
              className="w-2 h-2 rounded-full bg-primary/60"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-2 h-2 rounded-full bg-primary/60"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-2 h-2 rounded-full bg-primary/60"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </motion.div>
          <span>Thinking...</span>
        </div>
      </div>
    </motion.div>
  );
});
