"use client";

import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { User, Square, ArrowUp, Copy, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatEmptyState } from "../empty-state/chat-empty-state";
import { MultiModelSelector, validateModelSelection } from "./multi-model-selector";
import { MultiModelResponse } from "./multi-model-response";
import { useMultiModelAssistant } from "@/hooks/use-multi-model-assistant";
import type { SelectedModel, ModelResponse } from "@/lib/ai/multi-model-types";
import type { AIProviderType } from "@/lib/ai/types";
import { ASSISTANT_SUGGESTIONS } from "@/hooks/use-ai-assistant";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store/chat/store";
import { aiService } from "@/lib/services/chat/ai-service";
import { MIN_MODELS_SELECTION } from "./multi-model-selector";

interface MultiModelChatMainProps {
  conversationId?: string;
  onConversationCreated?: (id: string, title: string) => void;
}

/**
 * Multi-model chat main component
 * Requirements: 5.1 - Allow selection of 2-4 models for comparison
 * Requirements: 5.2 - Dispatch requests to all selected models concurrently
 * Requirements: 5.3 - Render each response in separate panel with model identification
 * Requirements: 5.4 - Display error for failed model while showing successful responses
 * Requirements: 5.5 - Persist comparison as single conversation entry
 */
export const MultiModelChatMain = memo(function MultiModelChatMain({ 
  conversationId: externalConversationId,
  onConversationCreated,
}: MultiModelChatMainProps) {
  const [input, setInput] = useState("");
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [internalConversationId, setInternalConversationId] = useState<string | undefined>();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  
  // Connect to store for state management
  const setChatMode = useChatStore((state) => state.setChatMode);
  const createConversationInStore = useChatStore((state) => state.createConversation);
  const updateConversationInStore = useChatStore((state) => state.updateConversation);
  
  // Use external conversationId if provided, otherwise use internal state
  const conversationId = externalConversationId ?? internalConversationId;
  const pendingResponsesRef = useRef<Map<string, ModelResponse>>(new Map());

  // Track if we've already created conversation for current message
  const conversationCreatedRef = useRef(false);
  
  // Use refs to track current values for callbacks (avoids stale closure issues)
  const selectedModelsRef = useRef<SelectedModel[]>([]);
  const lastUserMessageRef = useRef("");
  
  // Set chat mode to multi when component mounts
  useEffect(() => {
    setChatMode('multi');
    return () => {
      // Don't reset on unmount - let the parent handle mode switching
    };
  }, [setChatMode]);

  // Create conversation after all responses complete
  const createConversation = useCallback(async (
    userMessage: string,
    models: SelectedModel[],
    completedResponses: Map<string, ModelResponse>
  ) => {
    // Prevent duplicate creation
    if (conversationCreatedRef.current) return;
    conversationCreatedRef.current = true;

    try {
      const responsesArray = Array.from(completedResponses.values())
        .filter(r => r.isComplete && !r.error)
        .map(r => ({
          modelId: r.modelId,
          modelName: r.modelName,
          provider: r.provider,
          content: r.content,
          metadata: r.metadata,
        }));

      const res = await fetch("/api/ai-assistant/multi/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userMessage,
          models: models.map(m => ({ id: m.id, name: m.name, provider: m.provider })),
          responses: responsesArray,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isNewConversation && data.conversationId) {
          setInternalConversationId(data.conversationId);
          const title = userMessage.slice(0, 40) + (userMessage.length > 40 ? "..." : "");
          onConversationCreated?.(data.conversationId, title);
        }
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [conversationId, onConversationCreated]);

  // Check if all responses are complete and trigger conversation creation
  const checkAndCreateConversation = useCallback((
    currentResponses: Map<string, ModelResponse>
  ) => {
    const userMessage = lastUserMessageRef.current;
    const models = selectedModelsRef.current;
    
    if (currentResponses.size === 0 || !userMessage || models.length === 0) return;
    
    const allComplete = Array.from(currentResponses.values()).every(r => r.isComplete);
    if (allComplete && currentResponses.size === models.length) {
      createConversation(userMessage, models, currentResponses);
    }
  }, [createConversation]);

  const handleResponseComplete = useCallback((modelId: string, response: ModelResponse) => {
    pendingResponsesRef.current.set(`${response.provider}:${modelId}`, response);
    
    // Check if all models have completed using refs for current values
    const models = selectedModelsRef.current;
    if (models.length > 0 && pendingResponsesRef.current.size === models.length) {
      checkAndCreateConversation(pendingResponsesRef.current);
    }
  }, [checkAndCreateConversation]);

  const { responses, isLoading, sendMessage, stop, reset, setResponses } = useMultiModelAssistant({
    conversationId,
    onError: (error, modelId) => {
      console.error(`Error from model ${modelId}:`, error);
    },
    onResponseComplete: handleResponseComplete,
  });

  // Track previous conversationId to detect actual changes vs initial mount
  const prevConversationIdRef = useRef<string | undefined>(externalConversationId);

  // Load existing conversation when externalConversationId changes
  useEffect(() => {
    const prevId = prevConversationIdRef.current;
    prevConversationIdRef.current = externalConversationId;

    // Only reset if we're explicitly clearing the conversation (user clicked new chat)
    // Don't reset if conversationId is just undefined on mount or mode switch
    if (!externalConversationId) {
      // Only reset if we had a conversation before and now we don't
      if (prevId) {
        reset();
        setHasSubmitted(false);
        setLastUserMessage("");
        setSelectedModels([]);
      }
      return;
    }
    
    // Skip if conversationId hasn't actually changed
    if (prevId === externalConversationId) {
      return;
    }

    const loadConversation = async () => {
      try {
        const { getConversation } = await import("@/lib/actions/ai-chat-actions");
        const result = await getConversation(externalConversationId);

        if (result.success && result.data.messages.length > 0) {
          const conversation = result.data;
          
          // Find the last user message
          const userMessages = conversation.messages.filter(m => m.role === "user");
          const lastUserMsg = userMessages[userMessages.length - 1];
          
          if (lastUserMsg) {
            setLastUserMessage(lastUserMsg.content);
            setHasSubmitted(true);
          }

          // Restore selected models from conversation
          if (conversation.comparisonModels && conversation.comparisonModels.length > 0) {
            setSelectedModels(conversation.comparisonModels.map(m => ({
              id: m.id,
              name: m.name,
              provider: m.provider,
              supportsImages: false, // Default, not stored in conversation
            })));
          }

          // Parse assistant messages and restore responses
          const assistantMessages = conversation.messages.filter(m => m.role === "assistant");
          const restoredResponses = new Map<string, ModelResponse>();

          for (const msg of assistantMessages) {
            // Parse format: **ModelName** (provider):\n\n{content}
            const match = msg.content.match(/^\*\*(.+?)\*\* \((.+?)\):\n\n([\s\S]*)$/);
            if (match) {
              const [, modelName, provider, content] = match;
              const modelId = msg.metadata?.model || modelName;
              const key = `${provider}:${modelId}`;
              
              restoredResponses.set(key, {
                modelId,
                modelName,
                provider: provider as "openrouter" | "google",
                content,
                reasoning: msg.reasoning,
                isStreaming: false,
                isComplete: true,
                metadata: msg.metadata ? {
                  tokensIn: msg.metadata.tokensIn,
                  tokensOut: msg.metadata.tokensOut,
                  latencyMs: msg.metadata.latencyMs,
                  ttft: msg.metadata.ttft,
                } : undefined,
              });
            }
          }

          if (restoredResponses.size > 0) {
            setResponses(restoredResponses);
            
            // Trigger auto-scroll in response columns after conversation is loaded
            setShouldScrollToBottom(true);
          }
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
      }
    };

    loadConversation();
  }, [externalConversationId, reset, setResponses]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // QoL: Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, [input]);
  
  // QoL: Detect user scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      isUserScrollingRef.current = !isNearBottom;
      setShowScrollToBottom(!isNearBottom && hasSubmitted);

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
  }, [hasSubmitted]);
  
  // QoL: Scroll to bottom handler
  const handleScrollToBottom = useCallback(() => {
    isUserScrollingRef.current = false;
    setShowScrollToBottom(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);
  
  // QoL: Copy all responses
  const handleCopyAll = useCallback(async () => {
    if (responses.size === 0) return;
    try {
      const formatted = [`You:\n${lastUserMessage}`, "---"];
      responses.forEach((response) => {
        if (response.content) {
          formatted.push(`${response.modelName} (${response.provider}):\n${response.content}`);
          formatted.push("---");
        }
      });
      await navigator.clipboard.writeText(formatted.join("\n\n"));
      toast.success("All responses copied to clipboard");
    } catch {
      toast.error("Failed to copy responses");
    }
  }, [responses, lastUserMessage]);

  /**
   * Handle sending a message to all selected models
   * Requirements: 5.1 - Validate 2-4 model selection bounds
   * Requirements: 5.2 - Dispatch requests to all selected models concurrently
   */
  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || isLoading) return;
    
    // Validate model selection bounds (Requirements: 5.1)
    const validation = validateModelSelection(selectedModels);
    if (!validation.isValid) {
      console.warn("Invalid model selection:", validation.error);
      return;
    }

    pendingResponsesRef.current.clear();
    conversationCreatedRef.current = false;
    // Update refs before sending so callbacks have current values
    lastUserMessageRef.current = content;
    selectedModelsRef.current = selectedModels;
    setLastUserMessage(content);
    setHasSubmitted(true);
    setInput("");
    await sendMessage(content, selectedModels);
  }, [input, isLoading, selectedModels, sendMessage]);

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      // Validate model selection bounds (Requirements: 5.1)
      const validation = validateModelSelection(selectedModels);
      if (isLoading || !validation.isValid) return;
      
      pendingResponsesRef.current.clear();
      conversationCreatedRef.current = false;
      // Update refs before sending so callbacks have current values
      lastUserMessageRef.current = suggestion;
      selectedModelsRef.current = selectedModels;
      setLastUserMessage(suggestion);
      setHasSubmitted(true);
      await sendMessage(suggestion, selectedModels);
    },
    [isLoading, selectedModels, sendMessage]
  );

  /**
   * Handle retry for a failed model
   * Requirements: 5.4 - Allow retry for failed models
   */
  const handleRetry = useCallback(
    async (modelId: string, provider: AIProviderType) => {
      if (isLoading || !lastUserMessage) return;
      
      // Find the model to retry
      const modelToRetry = selectedModels.find(
        (m) => m.id === modelId && m.provider === provider
      );
      
      if (!modelToRetry) return;
      
      // Send message to just this model
      await sendMessage(lastUserMessage, [modelToRetry]);
    },
    [isLoading, lastUserMessage, selectedModels, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Memoize suggestions to prevent recreation
  const suggestions = useMemo(() => ASSISTANT_SUGGESTIONS.general, []);
  
  // Validate model selection for UI state
  const modelValidation = useMemo(() => validateModelSelection(selectedModels), [selectedModels]);
  const needsMoreModels = selectedModels.length < MIN_MODELS_SELECTION;
  const canSend = input.trim() && modelValidation.isValid && !isLoading;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!hasSubmitted ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              <ChatEmptyState
                suggestions={[...suggestions]}
                onSuggestionClick={handleSuggestionClick}
                title="Compare Models"
                description="Send a message to multiple AI models and compare responses"
              />
            </div>
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="flex-1 flex flex-col overflow-hidden p-3"
          >
            {/* Compact User Message */}
            <div className="flex items-center gap-2 mb-2 shrink-0 px-1">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground truncate flex-1">{lastUserMessage}</p>
            </div>

            {/* Responses Grid - Takes remaining space */}
            {/* Requirements: 5.3, 5.4 - Display responses with model identification and error handling */}
            <div className="flex-1 overflow-hidden">
              <MultiModelResponse 
                responses={responses} 
                isLoading={isLoading}
                onRetry={handleRetry}
                scrollToBottom={shouldScrollToBottom}
                onScrollComplete={() => setShouldScrollToBottom(false)}
              />
            </div>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Compact Input - wrapped in relative container for floating buttons */}
      <div className="relative p-3 bg-background/50">
        {/* QoL: Floating action buttons - absolutely positioned above input */}
        {hasSubmitted && (responses.size > 0 || showScrollToBottom) && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {/* Copy all button */}
            {responses.size > 0 && !showScrollToBottom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAll}
                className="rounded-full shadow-lg gap-1.5 px-3 h-8 bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-background text-muted-foreground hover:text-foreground"
                title="Copy all responses"
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
                <span className="text-xs">Scroll down</span>
              </Button>
            )}
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          <div className="bg-muted/30 border border-border/40 rounded-2xl p-2 focus-within:border-primary/40 transition-colors">
            {/* Input Row */}
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    needsMoreModels 
                      ? `Select at least ${MIN_MODELS_SELECTION} models...` 
                      : "Compare responses..."
                  }
                  className="w-full border-0 bg-transparent focus:outline-none resize-none text-sm px-1 min-h-[36px] max-h-[200px] overflow-y-auto"
                  rows={1}
                  disabled={isLoading || needsMoreModels}
                  aria-label="Message input for multi-model comparison"
                />
                {/* QoL: Character count */}
                {input.length > 100 && (
                  <span className="absolute right-1 bottom-1 text-[10px] text-muted-foreground/60 tabular-nums">
                    {input.length.toLocaleString()}
                  </span>
                )}
              </div>
              {isLoading ? (
                <button
                  onClick={stop}
                  className="h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center shrink-0"
                  title="Stop generation"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    canSend ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                  title="Send message (Enter)"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            {/* QoL: Keyboard shortcut hint */}
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="text-[10px] text-muted-foreground/50">
                <kbd className="px-1 py-0.5 rounded bg-muted/50 font-mono text-[9px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-muted/50 font-mono text-[9px]">Shift+Enter</kbd> for new line
              </span>
            </div>

            {/* Model Selector Row */}
            <div className="mt-1.5 pt-1.5 border-t border-border/30">
              <MultiModelSelector
                selectedModels={selectedModels}
                onModelsChange={setSelectedModels}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
