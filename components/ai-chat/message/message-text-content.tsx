"use client";

import { memo } from "react";
import { MarkdownRenderer } from "@/components/streaming/markdown-renderer";
import { cn } from "@/lib/utils";

interface MessageTextContentProps {
  /**
   * The text content to render
   */
  content: string;
  /**
   * Whether this is a user message (renders as plain text)
   * or assistant message (renders as markdown)
   */
  isUser: boolean;
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
 * Renders message text content with appropriate formatting
 * 
 * - User messages: Plain text with whitespace preservation
 * - Assistant messages: Full markdown rendering with code blocks, lists, etc.
 * 
 * Requirements: 3.5 - Correctly handle markdown, code blocks, and special characters
 */
export const MessageTextContent = memo(function MessageTextContent({
  content,
  isUser,
  variant = "default",
  className,
}: MessageTextContentProps) {
  if (!content) return null;

  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "text-sm shadow-sm",
        // Use inline-block for user messages (short text), block for assistant (may have code blocks)
        isUser ? "inline-block" : "block max-w-full overflow-hidden",
        isCompact ? "rounded-lg px-3 py-2" : "rounded-[20px] px-5 py-3.5",
        isUser
          ? cn(
              "bg-primary text-primary-foreground",
              isCompact ? "rounded-tr-none" : "rounded-tr-none"
            )
          : cn(
              "bg-muted/50 border border-border/50",
              isCompact ? "rounded-tl-none" : "rounded-tl-none"
            ),
        className
      )}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap text-left">{content}</p>
      ) : (
        <MarkdownRenderer content={content} className="prose-sm max-w-full" />
      )}
    </div>
  );
});
