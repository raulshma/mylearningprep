"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { Loader2, Bot, AlertCircle, ArrowDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message/message-bubble";
import { ChatInput } from "./input/chat-input";
import { ChatEmptyState } from "./empty-state/chat-empty-state";
import { ActiveTools } from "@/components/streaming/tool-status";
import {
  useAIAssistant,
  ASSISTANT_SUGGESTIONS,
  type SuggestionCategory,
} from "@/hooks/use-ai-assistant";
import { generateConversationTitle } from "@/lib/actions/ai-chat-actions";
import { getMessageTextContent, isErrorMessage, getErrorContent, formatMessagesForCopy } from "./utils/message-helpers";
import { LoadingAnnouncer, ErrorAnnouncer } from "./accessibility";
import { useModels, useModelActions } from "@/lib/store/chat";
import { fileService } from "@/lib/services/chat/client";
import type { UserPlan } from "@/lib/db/schemas/user";

interface AIChatMainProps {
  conversationId?: string;
  interviewId?: string;
  learningPathId?: string;
  initialPrompt?: string | null;
  shouldEditLastMessage?: boolean;
  onPromptUsed?: () => void;
  onNewConversation?: () => void;
  onConversationCreated?: (id: string, title: string) => void;
  onConversationUpdate?: (id: string, title: string) => void;
  userPlan?: UserPlan;
}

export const AIChatMain = memo(function AIChatMain({
  conversationId,
  interviewId,
  learningPathId,
  initialPrompt,
  shouldEditLastMessage,
  onPromptUsed,
  onNewConversation,
  onConversationCreated,
  onConversationUpdate,
  userPlan,
}: AIChatMainProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const promptUsedRef = useRef(false);
  const isUserScrollingRef = useRef(false);
  const titleGeneratedRef = useRef(false);
  const shownErrorToastsRef = useRef<Set<string>>(new Set());
  
  // QoL: Track if user has scrolled away from bottom
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Model state from store (Requirements: 1.1, 1.2 - centralized state management)
  const isMaxPlan = userPlan === "MAX";
  const modelState = useModels();
  const modelActions = useModelActions();
  
  // Derive model selection from store
  const selectedModelId = modelState.selectedId;
  const selectedProvider = modelState.selectedProvider;
  const modelSupportsImages = modelState.supportsImages;
  const enabledProviderTools = modelState.enabledProviderTools;
  
  // File attachment state (local, not persisted)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  const {
    messages,
    input,
    setInput,
    isLoading,
    error,
    activeTools,
    messageMetadata,
    sendMessage,
    stop,
    reset,
    reload,
    setMessages,
  } = useAIAssistant({
    interviewId,
    learningPathId,
    conversationId,
    selectedModelId: isMaxPlan ? selectedModelId : undefined,
    providerTools: isMaxPlan ? enabledProviderTools : undefined,
    onConversationCreated: (id) => {
      const tempTitle = "New Chat";
      onConversationCreated?.(id, tempTitle);
    },
    onError: (error) => {
      console.error("Assistant error:", error);
      // Check for rate limit errors (429) and show toast
      const errorMessage = error.message?.toLowerCase() || "";
      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("429") ||
        errorMessage.includes("resource_exhausted")
      ) {
        toast.error("Rate Limit Exceeded", {
          description: "The AI model is temporarily unavailable due to quota limits. Please try again in a few moments or select a different model.",
          duration: 8000,
        });
      }
    },
  });

  // Handle model selection - updates store (Requirements: 1.2 - unidirectional data flow)
  const handleModelSelect = useCallback(
    (modelId: string, supportsImages: boolean, provider: import("@/lib/ai/types").AIProviderType) => {
      modelActions.select(modelId, provider, supportsImages);
      if (!supportsImages) {
        // Clear files if model doesn't support images
        filePreviews.forEach((previewUrl) => fileService.revokePreview({ id: '', previewUrl, name: '', type: '', size: 0 }));
        setAttachedFiles([]);
        setFilePreviews([]);
      }
      // Reset provider tools when model changes
      modelActions.setProviderTools([]);
      // Persist to localStorage asynchronously
      queueMicrotask(() => {
        localStorage.setItem("ai-chat-selected-model", modelId);
      });
    },
    [modelActions, filePreviews]
  );

  // Handle provider tools change - updates store
  const handleProviderToolsChange = useCallback(
    (tools: import("@/lib/ai/provider-tools").ProviderToolType[]) => {
      modelActions.setProviderTools(tools);
    },
    [modelActions]
  );

  // Handle file selection using file service (Requirements: 7.1 - display preview thumbnail)
  const handleFileSelect = useCallback(async (files: File[]) => {
    const newPreviews: string[] = [];
    for (const file of files) {
      const preview = await fileService.createPreview(file);
      newPreviews.push(preview.previewUrl);
    }
    setAttachedFiles((prev) => [...prev, ...files]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  // Remove attached file using file service (Requirements: 7.2 - revoke object URL)
  const handleFileRemove = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      const urlToRevoke = prev[index];
      fileService.revokePreview({ id: '', previewUrl: urlToRevoke, name: '', type: '', size: 0 });
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Cleanup file previews on unmount (Requirements: 2.4 - clean up subscriptions/resources)
  useEffect(() => {
    const currentPreviews = filePreviews;
    return () => {
      currentPreviews.forEach((previewUrl) => {
        fileService.revokePreview({ id: '', previewUrl, name: '', type: '', size: 0 });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle initial prompt from tools sidebar
  useEffect(() => {
    if (initialPrompt && !promptUsedRef.current && !isLoading) {
      promptUsedRef.current = true;
      setInput(initialPrompt);
      onPromptUsed?.();
    }
  }, [initialPrompt, isLoading, setInput, onPromptUsed]);

  // Reset prompt used flag when prompt changes
  useEffect(() => {
    if (!initialPrompt) {
      promptUsedRef.current = false;
    }
  }, [initialPrompt]);

  // Handle edit last message when branching
  useEffect(() => {
    if (shouldEditLastMessage && messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        const content = getMessageTextContent(lastMessage);
        if (content) {
          setInput(content);
          // Remove the last message so user can edit and resend
          setMessages(messages.slice(0, -1));
        }
      }
    }
  }, [shouldEditLastMessage, messages, isLoading, setInput, setMessages]);

  // Generate AI-powered title after first assistant response
  useEffect(() => {
    if (
      conversationId &&
      messages.length >= 2 &&
      !titleGeneratedRef.current &&
      !isLoading
    ) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      const hasAssistantResponse = messages.some(
        (m) => m.role === "assistant" && getMessageTextContent(m)
      );

      if (firstUserMessage && hasAssistantResponse) {
        titleGeneratedRef.current = true;
        const messageContent = getMessageTextContent(firstUserMessage);
        if (messageContent) {
          queueMicrotask(() => {
            const tempTitle =
              messageContent.slice(0, 40) +
              (messageContent.length > 40 ? "..." : "");
            onConversationUpdate?.(conversationId, tempTitle);

            generateConversationTitle(conversationId, messageContent).then(
              (result) => {
                if (result.success && result.data) {
                  onConversationUpdate?.(conversationId, result.data);
                }
              }
            );
          });
        }
      }
    }
  }, [conversationId, messages, isLoading, onConversationUpdate]);

  // Reset title generation flag when conversation changes
  useEffect(() => {
    if (!conversationId) {
      titleGeneratedRef.current = false;
    }
  }, [conversationId]);

  // Track message count to detect when new messages are added vs when conversation loads
  const prevMessageCountRef = useRef(0);

  // Detect error messages and show toast for rate limit errors (only for new errors)
  useEffect(() => {
    if (messages.length === 0) {
      prevMessageCountRef.current = 0;
      shownErrorToastsRef.current.clear();
      return;
    }
    
    // If this is the initial load (message count jumped significantly), mark all errors as shown
    const isInitialLoad = prevMessageCountRef.current === 0 && messages.length > 1;
    
    if (isInitialLoad) {
      // Mark all existing error messages as already shown
      messages.forEach((m) => {
        if (m.role === "assistant" && isErrorMessage(m)) {
          shownErrorToastsRef.current.add(m.id);
        }
      });
      prevMessageCountRef.current = messages.length;
      return;
    }
    
    // Only check the last message if it's a new message (count increased by 1)
    if (messages.length === prevMessageCountRef.current + 1) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && isErrorMessage(lastMessage)) {
        // Only show toast if we haven't shown it for this message ID before
        if (!shownErrorToastsRef.current.has(lastMessage.id)) {
          const errorContent = getErrorContent(lastMessage);
          if (errorContent) {
            const errorText = errorContent.error.toLowerCase();
            const errorCode = errorContent.errorDetails?.code?.toLowerCase() || "";
            
            if (
              errorText.includes("rate limit") ||
              errorText.includes("quota") ||
              errorText.includes("429") ||
              errorText.includes("temporarily unavailable") ||
              errorCode === "rate_limit" ||
              errorCode === "resource_exhausted"
            ) {
              shownErrorToastsRef.current.add(lastMessage.id);
              toast.error("Rate Limit Exceeded", {
                description: "The AI model is temporarily unavailable due to quota limits. Please try again in a few moments or select a different model.",
                duration: 8000,
              });
            }
          }
        }
      }
    }
    
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Memoize suggestions to prevent recreation
  const suggestions = useMemo(() => {
    const category: SuggestionCategory = learningPathId
      ? "learning"
      : interviewId
      ? "interview"
      : "general";
    return ASSISTANT_SUGGESTIONS[category];
  }, [learningPathId, interviewId]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!isUserScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTools, scrollToBottom]);

  // Detect user scrolling to pause auto-scroll and show scroll-to-bottom button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      isUserScrollingRef.current = !isNearBottom;
      
      // QoL: Show scroll-to-bottom button when scrolled up
      setShowScrollToBottom(!isNearBottom && messages.length > 0);

      clearTimeout(scrollTimeout);
      if (isNearBottom) {
        scrollTimeout = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 150);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [messages.length]);
  
  // QoL: Force scroll to bottom handler
  const handleScrollToBottom = useCallback(() => {
    isUserScrollingRef.current = false;
    setShowScrollToBottom(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;
    if (isMaxPlan && !selectedModelId) return;

    setInput("");
    const filesToSend = attachedFiles.length > 0 ? attachedFiles : undefined;
    setAttachedFiles([]);
    setFilePreviews([]);

    await sendMessage(content, filesToSend);
  };

  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    if (isLoading) return;
    if (isMaxPlan && !selectedModelId) return;
    await sendMessage(suggestion, undefined);
  }, [isLoading, isMaxPlan, selectedModelId, sendMessage]);

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy");
    }
  }, []);
  
  // QoL: Copy entire conversation
  const handleCopyAll = useCallback(async () => {
    if (messages.length === 0) return;
    try {
      const formatted = formatMessagesForCopy(messages);
      await navigator.clipboard.writeText(formatted);
      toast.success("Conversation copied to clipboard");
    } catch (err) {
      console.error("Failed to copy conversation:", err);
      toast.error("Failed to copy conversation");
    }
  }, [messages]);

  const handleEdit = useCallback(
    async (index: number, content: string) => {
      if (isLoading) return;
      if (isMaxPlan && !selectedModelId) return;
      
      // Remove messages from the edited message onwards
      const newMessages = messages.slice(0, index);
      setMessages(newMessages);
      
      // Send the edited message immediately
      await sendMessage(content, undefined);
    },
    [isLoading, isMaxPlan, selectedModelId, messages, setMessages, sendMessage]
  );

  const handleBranch = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;
      
      const { branchConversation } = await import("@/lib/actions/ai-chat-actions");
      const result = await branchConversation(conversationId, messageId);
      
      if (result.success) {
        // Notify parent to switch to branched conversation with edit mode
        const callback = (window as any).onBranchConversation;
        if (callback) {
          callback(result.data._id);
        }
      }
    },
    [conversationId]
  );

  const handleNewChat = useCallback(() => {
    reset();
    onNewConversation?.();
  }, [reset, onNewConversation]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Accessibility announcements for loading and errors
          Requirements: 14.4 - Communicate loading progress to assistive technologies
          Requirements: 14.5 - Announce errors to screen reader users */}
      <LoadingAnnouncer 
        isLoading={isLoading} 
        loadingMessage="AI is generating a response"
        completeMessage="Response complete"
      />
      <ErrorAnnouncer 
        error={error?.message} 
        prefix="Chat error:"
      />
      
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        id="message-list"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        <div className="max-w-5xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <ChatEmptyState
              suggestions={[...suggestions]}
              onSuggestionClick={handleSuggestionClick}
            />
          ) : (
            <div className="space-y-8">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLastMessage={index === messages.length - 1}
                  isLoading={isLoading}
                  metadata={
                    message.role === "assistant"
                      ? messageMetadata.get(message.id)
                      : undefined
                  }
                  isMaxPlan={isMaxPlan}
                  selectedModelId={selectedModelId}
                  onModelSelect={handleModelSelect}
                  onCopy={handleCopy}
                  onEdit={
                    message.role === "user"
                      ? (content) => handleEdit(index, content)
                      : undefined
                  }
                  onRegenerate={
                    message.role === "assistant" &&
                    index === messages.length - 1 &&
                    !isLoading
                      ? reload
                      : undefined
                  }
                  onBranch={
                    conversationId && index < messages.length - 1
                      ? () => handleBranch(message.id)
                      : undefined
                  }
                />
              ))}

              {/* Active Tools Indicator */}
              {activeTools.length > 0 && (
                <div className="flex gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-muted border border-border/50">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <ActiveTools
                      tools={activeTools.map((t) => ({
                        toolName: t.toolName,
                        status: t.status,
                        input: t.input,
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && activeTools.length === 0 && (
                <div 
                  className="flex gap-4"
                  role="status"
                  aria-label="AI is thinking"
                >
                  <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-muted border border-border/50" aria-hidden="true">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-3 px-1">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && !isLoading && (
                <div 
                  className="flex gap-4"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-destructive/10 border border-destructive/20" aria-hidden="true">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div className="inline-block rounded-[20px] rounded-tl-none px-5 py-3.5 text-sm bg-destructive/10 border border-destructive/20">
                      <p className="text-destructive font-medium mb-1">
                        Something went wrong
                      </p>
                      <p className="text-destructive/80 text-xs">
                        {error.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>
      
      {/* Input Area - wrapped in relative container for floating buttons */}
      <div className="relative">
        {/* QoL: Floating action buttons - absolutely positioned above input */}
        {(messages.length > 0 || showScrollToBottom) && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {/* Copy all button - show when there are messages and not scrolled */}
            {messages.length > 0 && !showScrollToBottom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAll}
                className="rounded-full shadow-lg gap-1.5 px-3 h-8 bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-background text-muted-foreground hover:text-foreground"
                title="Copy entire conversation"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Copy all</span>
              </Button>
            )}
            
            {/* Scroll to bottom button */}
            {showScrollToBottom && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleScrollToBottom}
                className="rounded-full shadow-lg gap-1.5 px-3 h-8 bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-background"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                <span className="text-xs">New messages</span>
              </Button>
            )}
          </div>
        )}
        
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={stop}
          onNewChat={handleNewChat}
          isLoading={isLoading}
          placeholder="Ask me anything about interviews..."
          isMaxPlan={isMaxPlan}
          selectedModelId={selectedModelId}
          selectedProvider={selectedProvider}
          onModelSelect={handleModelSelect}
          modelSupportsImages={modelSupportsImages}
          enabledProviderTools={enabledProviderTools}
          onProviderToolsChange={handleProviderToolsChange}
          attachedFiles={attachedFiles}
          filePreviews={filePreviews}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
        />
      </div>
    </div>
  );
});
