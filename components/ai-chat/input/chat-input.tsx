"use client";

import { useRef, useCallback, useEffect, memo, useState } from "react";
import {
  Square,
  ArrowUp,
  Image as ImageIcon,
  X,
  MessageSquarePlus,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "../model-selector";
import { ProviderToolsSelector } from "../provider-tools-selector";
import { FileAttachmentList } from "./file-attachment";
import { cn } from "@/lib/utils";
import { useChatStore, useModelActions } from "@/lib/store/chat/store";
import { fileService } from "@/lib/services/chat/file-service";
import type { AIProviderType } from "@/lib/ai/types";
import type { ProviderToolType } from "@/lib/ai/provider-tools";
import type { EncodedFile } from "@/lib/store/chat/types";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onNewChat?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  // MAX plan features
  isMaxPlan?: boolean;
  selectedModelId?: string | null;
  selectedProvider?: AIProviderType | null;
  onModelSelect?: (modelId: string, supportsImages: boolean, provider: AIProviderType) => void;
  modelSupportsImages?: boolean;
  // Provider tools
  enabledProviderTools?: ProviderToolType[];
  onProviderToolsChange?: (tools: ProviderToolType[]) => void;
  // File attachments - legacy props for backward compatibility
  attachedFiles?: File[];
  filePreviews?: string[];
  onFileSelect?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  // New file attachment props using EncodedFile
  encodedFiles?: EncodedFile[];
  onEncodedFileRemove?: (index: number) => void;
  // Store integration
  useStore?: boolean;
  // Variant
  variant?: "default" | "compact";
}

/**
 * Reusable chat input component with model selection and file attachments
 * Memoized to prevent unnecessary re-renders
 * 
 * Requirements: 7.1 - Display preview thumbnail before sending
 * Requirements: 7.2 - Revoke object URL and clear preview on remove
 * Requirements: 7.3 - Encode images as base64 data URLs
 * Requirements: 7.5 - Disable attachment interface for unsupported models
 */
export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  onNewChat,
  isLoading = false,
  disabled = false,
  placeholder = "Ask me anything...",
  isMaxPlan = false,
  selectedModelId: propSelectedModelId,
  selectedProvider: propSelectedProvider,
  onModelSelect,
  modelSupportsImages: propModelSupportsImages = false,
  enabledProviderTools: propEnabledProviderTools = [],
  onProviderToolsChange,
  attachedFiles = [],
  filePreviews = [],
  onFileSelect,
  onFileRemove,
  encodedFiles = [],
  onEncodedFileRemove,
  useStore = false,
  variant = "default",
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store integration
  const storeModelState = useChatStore((state) => state.models);
  const modelActions = useModelActions();

  // Use store or props based on useStore flag
  const selectedModelId = useStore ? storeModelState.selectedId : propSelectedModelId;
  const selectedProvider = useStore ? storeModelState.selectedProvider : propSelectedProvider;
  const modelSupportsImages = useStore ? storeModelState.supportsImages : propModelSupportsImages;
  const enabledProviderTools = useStore ? storeModelState.enabledProviderTools : propEnabledProviderTools;

  // Handle model selection - update store if using store mode
  const handleModelSelect = useCallback(
    (modelId: string, supportsImages: boolean, provider: AIProviderType) => {
      if (useStore) {
        modelActions.select(modelId, provider, supportsImages);
      }
      onModelSelect?.(modelId, supportsImages, provider);
    },
    [useStore, modelActions, onModelSelect]
  );

  // Handle provider tools change - update store if using store mode
  const handleProviderToolsChange = useCallback(
    (tools: ProviderToolType[]) => {
      if (useStore) {
        modelActions.setProviderTools(tools);
      }
      onProviderToolsChange?.(tools);
    },
    [useStore, modelActions, onProviderToolsChange]
  );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // QoL: Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight, capped at max-height (handled by CSS)
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim()) {
          onSend();
        }
      }
    },
    [disabled, value, onSend]
  );

  // Handle file selection with validation through file service
  // Requirements: 7.1, 7.3
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !onFileSelect) return;

      // Filter to only image files using file service
      const imageFiles = Array.from(files).filter((file) =>
        fileService.isImageFile(file)
      );
      
      // Validate files
      const validation = fileService.validateFiles(imageFiles);
      if (!validation.valid) {
        console.warn("File validation failed:", validation.error);
        // Still allow valid files through
      }

      if (imageFiles.length > 0) {
        onFileSelect(imageFiles);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFileSelect]
  );

  // Handle encoded file removal with cleanup
  // Requirements: 7.2
  const handleEncodedFileRemove = useCallback(
    (index: number) => {
      onEncodedFileRemove?.(index);
    },
    [onEncodedFileRemove]
  );

  const needsModelSelection = isMaxPlan && !selectedModelId;
  const canSend = value.trim() && !disabled && !needsModelSelection;
  
  // Determine if we have files to show (either legacy or encoded)
  const hasLegacyFiles = attachedFiles.length > 0 && filePreviews.length > 0;
  const hasEncodedFiles = encodedFiles.length > 0;
  
  // QoL: Character count for input
  const charCount = value.length;
  const showCharCount = charCount > 100;

  return (
    <div className="p-3 bg-background/50 backdrop-blur-sm border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        {/* Attached files preview - using new FileAttachmentList for encoded files */}
        {hasEncodedFiles && (
          <FileAttachmentList
            files={encodedFiles}
            onRemove={handleEncodedFileRemove}
            size="sm"
            showRemove={true}
            className="mb-2"
          />
        )}

        {/* Legacy attached files preview - for backward compatibility */}
        {hasLegacyFiles && !hasEncodedFiles && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {filePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`Attachment ${index + 1}`}
                  className="h-12 w-12 object-cover rounded-lg border border-border/50"
                />
                {onFileRemove && (
                  <button
                    type="button"
                    onClick={() => onFileRemove(index)}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          id="chat-input"
          className="bg-muted/30 border border-border/40 rounded-2xl p-2 focus-within:border-primary/40 transition-colors"
          role="group"
          aria-label="Message input area"
        >
          {/* Input Row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={needsModelSelection ? "Select a model first..." : placeholder}
                className="w-full border-0 bg-transparent focus-visible:ring-0 resize-none text-sm px-1 min-h-[36px] max-h-[200px] shadow-none overflow-y-auto"
                rows={1}
                disabled={isLoading || needsModelSelection}
                aria-label="Type your message"
                aria-describedby={needsModelSelection ? "model-selection-hint" : undefined}
              />
              {/* QoL: Character count indicator */}
              {showCharCount && (
                <span className="absolute right-1 bottom-1 text-[10px] text-muted-foreground/60 tabular-nums">
                  {charCount.toLocaleString()}
                </span>
              )}
            </div>
            {isLoading && onStop ? (
              <button
                onClick={onStop}
                className="h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center shrink-0"
                aria-label="Stop generating response"
              >
                <Square className="h-3 w-3 fill-current" aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!canSend}
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  canSend ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
                aria-label="Send message"
                title="Send message (Enter)"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          
          {/* QoL: Keyboard shortcut hint */}
          <div className="flex items-center justify-between mt-1 px-1">
            <span className="text-[10px] text-muted-foreground/50">
              <kbd className="px-1 py-0.5 rounded bg-muted/50 font-mono text-[9px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-muted/50 font-mono text-[9px]">Shift+Enter</kbd> for new line
            </span>
          </div>

          {/* Tools Row - Compact chip-based layout */}
          {(onNewChat || isMaxPlan) && variant === "default" && (
            <div 
              className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border/30"
              role="toolbar"
              aria-label="Chat tools"
            >
              {onNewChat && (
                <button
                  onClick={onNewChat}
                  className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                  aria-label="Start new chat"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              
              {/* Compact Model Selector Chip */}
              {isMaxPlan && (onModelSelect || useStore) && (
                <ModelSelector
                  selectedModelId={selectedModelId ?? null}
                  onModelSelect={handleModelSelect}
                  disabled={isLoading}
                  useStore={useStore}
                  variant="compact"
                />
              )}
              
              {/* Provider-specific tools selector */}
              {isMaxPlan && selectedProvider && selectedModelId && (onProviderToolsChange || useStore) && (
                <ProviderToolsSelector
                  provider={selectedProvider}
                  modelId={selectedModelId.replace(/^google:/, '')}
                  enabledTools={enabledProviderTools}
                  onToolsChange={handleProviderToolsChange}
                  disabled={isLoading}
                />
              )}
              
              {/* Image attachment button */}
              {isMaxPlan && modelSupportsImages && onFileSelect && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Attach image files"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center disabled:opacity-50"
                    title="Attach image"
                    aria-label="Attach image"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
