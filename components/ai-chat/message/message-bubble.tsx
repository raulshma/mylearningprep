"use client";

import { useState, memo, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, User, AlertCircle, Copy, Pencil, RefreshCw, Download, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThinkingIndicator } from "../thinking-indicator";
import { MessageMetadataDisplay } from "../message-metadata";
import { MessageTextContent } from "./message-text-content";
import { ToolDisplay } from "./tool-display";
import { MessageEditor } from "./message-editor";
import {
  getMessageTextContent,
  getMessageReasoning,
  getToolParts,
  getFileParts,
  isErrorMessage,
  getErrorContent,
} from "../utils/message-helpers";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import type { MessageMetadata } from "@/hooks/use-ai-assistant";
import type { AIProviderType } from "@/lib/ai/types";

interface MessageBubbleProps {
  message: UIMessage;
  isLastMessage?: boolean;
  isLoading?: boolean;
  metadata?: MessageMetadata;
  variant?: "default" | "compact";
  // MAX plan features for editing
  isMaxPlan?: boolean;
  selectedModelId?: string | null;
  onModelSelect?: (modelId: string, supportsImages: boolean, provider: AIProviderType) => void;
  // Actions
  onCopy?: (content: string) => void;
  onEdit?: (content: string) => void;
  onRegenerate?: () => void;
  onBranch?: () => void;
}

/**
 * Renders a single chat message with all its parts
 * Memoized to prevent unnecessary re-renders
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  isLastMessage = false,
  isLoading = false,
  metadata,
  variant = "default",
  isMaxPlan,
  selectedModelId,
  onModelSelect,
  onCopy,
  onEdit,
  onRegenerate,
  onBranch,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isCompact = variant === "compact";
  const isUser = message.role === "user";
  
  // Memoize expensive computations
  const textContent = useMemo(() => getMessageTextContent(message), [message]);
  const reasoning = useMemo(() => getMessageReasoning(message), [message]);
  const toolParts = useMemo(() => getToolParts(message), [message]);
  const fileParts = useMemo(() => getFileParts(message), [message]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);
  
  // QoL: Double-click to edit user messages
  const handleDoubleClick = useCallback(() => {
    if (isUser && onEdit && !isLoading) {
      setIsEditing(true);
    }
  }, [isUser, onEdit, isLoading]);

  const handleEditSave = useCallback((newContent: string) => {
    setIsEditing(false);
    onEdit?.(newContent);
  }, [onEdit]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleCopy = useCallback(() => {
    onCopy?.(textContent);
  }, [onCopy, textContent]);

  // Handle persisted error messages
  if (isErrorMessage(message)) {
    const errorContent = getErrorContent(message);
    if (!errorContent) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4"
      >
        <div
          className={cn(
            "shrink-0 rounded-full flex items-center justify-center bg-destructive/10 border border-destructive/20",
            isCompact ? "h-7 w-7" : "h-10 w-10"
          )}
        >
          <AlertCircle className={cn(isCompact ? "h-3.5 w-3.5" : "h-5 w-5", "text-destructive")} />
        </div>
        <div className="flex-1 max-w-[85%]">
          <div
            className={cn(
              "inline-block rounded-tl-none text-sm bg-destructive/10 border border-destructive/20",
              isCompact ? "rounded-lg px-3 py-2" : "rounded-[20px] px-5 py-3.5"
            )}
          >
            <p className="text-destructive font-medium mb-1">Something went wrong</p>
            <p className="text-destructive/80 text-xs">{errorContent.error}</p>
            {errorContent.errorDetails?.isRetryable && (
              <p className="text-destructive/60 text-xs mt-2">
                You can try sending your message again.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  const avatarSize = isCompact ? "h-7 w-7" : "h-10 w-10";
  const iconSize = isCompact ? "h-3.5 w-3.5" : "h-5 w-5";

  // Show editor for user messages when editing
  if (isUser && isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4 flex-row-reverse"
      >
        {/* Avatar */}
        <div
          className={cn(
            "shrink-0 rounded-full flex items-center justify-center shadow-sm",
            avatarSize,
            "bg-primary text-primary-foreground"
          )}
        >
          <User className={iconSize} />
        </div>

        {/* Editor */}
        <div className="flex-1 max-w-[85%]">
          <MessageEditor
            initialContent={textContent}
            isMaxPlan={isMaxPlan}
            selectedModelId={selectedModelId}
            onModelSelect={onModelSelect}
            onSave={handleEditSave}
            onCancel={handleEditCancel}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-4 group", isUser && "flex-row-reverse")}
      role="article"
      aria-label={`Message from ${isUser ? 'you' : 'AI assistant'}`}
      onDoubleClick={handleDoubleClick}
      title={isUser && onEdit ? "Double-click to edit" : undefined}
    >
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 rounded-full flex items-center justify-center shadow-sm",
          avatarSize,
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted border border-border/50"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className={iconSize} />
        ) : (
          <Bot className={iconSize} />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 space-y-3 max-w-[85%]",
          isUser && "text-right"
        )}
      >
        {/* Reasoning/Thinking indicator for assistant */}
        {!isUser && reasoning && (
          <ThinkingIndicator
            reasoning={reasoning}
            isStreaming={isLoading && isLastMessage && !textContent}
          />
        )}

        {/* Image attachments for user messages */}
        {isUser && fileParts.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {fileParts.map(
              (part, index) =>
                part.mediaType?.startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={index}
                    src={part.url}
                    alt={part.filename || `Image ${index + 1}`}
                    className="max-w-[200px] max-h-[200px] rounded-xl border border-border/50 object-cover"
                  />
                )
            )}
          </div>
        )}

        {/* Text content */}
        {textContent && (
          <MessageTextContent
            content={textContent}
            isUser={isUser}
            variant={variant}
          />
        )}

        {/* Tool invocations */}
        {!isUser && toolParts.length > 0 && (
          <ToolDisplay
            toolParts={toolParts}
            variant={variant}
          />
        )}

        {/* Generated images for assistant messages */}
        {!isUser && fileParts.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-start">
            {fileParts.map(
              (part, index) =>
                part.mediaType?.startsWith("image/") && (
                  <div key={index} className="relative group/image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={part.url}
                      alt={part.filename || `Generated image ${index + 1}`}
                      className="max-w-[400px] max-h-[400px] rounded-xl border-2 border-primary/20 object-contain shadow-lg hover:border-primary/40 transition-colors"
                    />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
                      <a
                        href={part.url}
                        download={part.filename || `generated-image-${index + 1}.png`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-sm hover:bg-background transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-primary/90 text-primary-foreground rounded-full shadow-sm">
                        AI Generated
                      </span>
                    </div>
                  </div>
                )
            )}
          </div>
        )}

        {/* Message metadata for assistant messages */}
        {!isUser && metadata && (
          <MessageMetadataDisplay metadata={metadata} className="mt-2" />
        )}

        {/* Message Actions */}
        {(onCopy || onEdit || onRegenerate || onBranch) && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity",
              isUser ? "justify-end" : "justify-start"
            )}
            role="toolbar"
            aria-label="Message actions"
          >
            {onCopy && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                aria-label="Copy message to clipboard"
              >
                <Copy className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}

            {isUser && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                onClick={handleEditClick}
                aria-label="Edit message"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}

            {!isUser && isLastMessage && !isLoading && onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                onClick={onRegenerate}
                aria-label="Regenerate response"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}

            {onBranch && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                onClick={onBranch}
                aria-label="Branch conversation from this message"
              >
                <GitBranch className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
