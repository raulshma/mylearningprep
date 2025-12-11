"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { User, Square, ArrowUp } from "lucide-react";
import { ChatEmptyState } from "../empty-state/chat-empty-state";
import { MultiModelSelector } from "./multi-model-selector";
import { MultiModelResponse } from "./multi-model-response";
import { useMultiModelAssistant } from "@/hooks/use-multi-model-assistant";
import type { SelectedModel, ModelResponse } from "@/lib/ai/multi-model-types";
import { ASSISTANT_SUGGESTIONS } from "@/hooks/use-ai-assistant";
import { cn } from "@/lib/utils";

interface MultiModelChatMainProps {
  conversationId?: string;
  onConversationCreated?: (id: string, title: string) => void;
}

export function MultiModelChatMain({ 
  conversationId: externalConversationId,
  onConversationCreated,
}: MultiModelChatMainProps) {
  const [input, setInput] = useState("");
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [internalConversationId, setInternalConversationId] = useState<string | undefined>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Use external conversationId if provided, otherwise use internal state
  const conversationId = externalConversationId ?? internalConversationId;
  const pendingResponsesRef = useRef<Map<string, ModelResponse>>(new Map());

  // Track if we've already created conversation for current message
  const conversationCreatedRef = useRef(false);
  
  // Use refs to track current values for callbacks (avoids stale closure issues)
  const selectedModelsRef = useRef<SelectedModel[]>([]);
  const lastUserMessageRef = useRef("");

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

  // Load existing conversation when externalConversationId changes
  useEffect(() => {
    if (!externalConversationId) {
      // Reset state when no conversation selected
      reset();
      setHasSubmitted(false);
      setLastUserMessage("");
      setSelectedModels([]);
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

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || isLoading || selectedModels.length === 0) return;

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

  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      if (isLoading || selectedModels.length === 0) return;
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const suggestions = ASSISTANT_SUGGESTIONS.general;
  const needsModelSelection = selectedModels.length === 0;
  const canSend = input.trim() && !needsModelSelection;

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
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            {/* Compact User Message */}
            <div className="flex items-center gap-2 mb-2 shrink-0 px-1">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground truncate flex-1">{lastUserMessage}</p>
            </div>

            {/* Responses Grid - Takes remaining space */}
            <div className="flex-1 overflow-hidden">
              <MultiModelResponse responses={responses} isLoading={isLoading} />
            </div>
          </div>
        )}
      </div>

      {/* Compact Input */}
      <div className="p-3 bg-background/50 backdrop-blur-sm border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="bg-muted/30 border border-border/40 rounded-2xl p-2 focus-within:border-primary/40 transition-colors">
            {/* Input Row */}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={needsModelSelection ? "Select models first..." : "Compare responses..."}
                className="flex-1 border-0 bg-transparent focus:outline-none resize-none text-sm px-1 min-h-[36px] max-h-[100px]"
                rows={1}
                disabled={isLoading || needsModelSelection}
              />
              {isLoading ? (
                <button
                  onClick={stop}
                  className="h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center shrink-0"
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
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
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
}
