"use client";

import { useState, useCallback, useRef } from "react";
import type { SelectedModel, ModelResponse } from "@/lib/ai/multi-model-types";

export interface UseMultiModelAssistantOptions {
  conversationId?: string;
  onError?: (error: Error, modelId: string) => void;
  onResponseComplete?: (modelId: string, response: ModelResponse) => void;
}

export interface UseMultiModelAssistantReturn {
  responses: Map<string, ModelResponse>;
  isLoading: boolean;
  sendMessage: (content: string, models: SelectedModel[]) => Promise<void>;
  stop: () => void;
  reset: () => void;
  setResponses: React.Dispatch<React.SetStateAction<Map<string, ModelResponse>>>;
}

/**
 * Hook for sending messages to multiple AI models simultaneously
 * Each model streams its response independently
 */
export function useMultiModelAssistant(
  options: UseMultiModelAssistantOptions = {}
): UseMultiModelAssistantReturn {
  const { conversationId, onError, onResponseComplete } = options;
  const [responses, setResponses] = useState<Map<string, ModelResponse>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const activeStreamsRef = useRef(0);

  const stop = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    activeStreamsRef.current = 0;
    setIsLoading(false);
    
    // Mark all streaming responses as complete
    setResponses((prev) => {
      const next = new Map(prev);
      next.forEach((response, key) => {
        if (response.isStreaming) {
          next.set(key, { ...response, isStreaming: false, isComplete: true });
        }
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    stop();
    setResponses(new Map());
  }, [stop]);

  const streamModelResponse = useCallback(
    async (
      content: string,
      model: SelectedModel,
      abortController: AbortController,
      shouldIncrementCount: boolean
    ) => {
      const modelKey = `${model.provider}:${model.id}`;

      try {
        const response = await fetch("/api/ai-assistant/multi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            modelId: model.id,
            provider: model.provider,
            conversationId,
            shouldIncrementCount,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let reasoning = "";
        let metadata: ModelResponse["metadata"] = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === "text") {
                accumulatedContent += parsed.content;
                setResponses((prev) => {
                  const next = new Map(prev);
                  next.set(modelKey, {
                    modelId: model.id,
                    modelName: model.name,
                    provider: model.provider,
                    content: accumulatedContent,
                    reasoning: reasoning || undefined,
                    isStreaming: true,
                    isComplete: false,
                    metadata,
                  });
                  return next;
                });
              } else if (parsed.type === "reasoning") {
                reasoning += parsed.content;
                setResponses((prev) => {
                  const next = new Map(prev);
                  next.set(modelKey, {
                    modelId: model.id,
                    modelName: model.name,
                    provider: model.provider,
                    content: accumulatedContent,
                    reasoning,
                    isStreaming: true,
                    isComplete: false,
                    metadata,
                  });
                  return next;
                });
              } else if (parsed.type === "metadata") {
                metadata = parsed.metadata;
              } else if (parsed.type === "error") {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              // Skip invalid JSON lines (not a parsing error for the stream)
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }

        // Mark as complete
        setResponses((prev) => {
          const next = new Map(prev);
          next.set(modelKey, {
            modelId: model.id,
            modelName: model.name,
            provider: model.provider,
            content: accumulatedContent,
            reasoning: reasoning || undefined,
            isStreaming: false,
            isComplete: true,
            metadata,
          });
          return next;
        });

        onResponseComplete?.(model.id, {
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          content: accumulatedContent,
          reasoning: reasoning || undefined,
          isStreaming: false,
          isComplete: true,
          metadata,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setResponses((prev) => {
          const next = new Map(prev);
          next.set(modelKey, {
            modelId: model.id,
            modelName: model.name,
            provider: model.provider,
            content: "",
            isStreaming: false,
            isComplete: true,
            error: errorMessage,
          });
          return next;
        });
        onError?.(error instanceof Error ? error : new Error(errorMessage), model.id);
      } finally {
        activeStreamsRef.current--;
        if (activeStreamsRef.current <= 0) {
          setIsLoading(false);
        }
      }
    },
    [conversationId, onError, onResponseComplete]
  );

  const sendMessage = useCallback(
    async (content: string, models: SelectedModel[]) => {
      if (!content.trim() || models.length === 0) return;

      // Clear previous responses and abort any ongoing streams
      stop();
      setIsLoading(true);
      activeStreamsRef.current = models.length;

      // Initialize all responses at once before starting streams
      const initialResponses = new Map<string, ModelResponse>();
      models.forEach((model) => {
        const key = `${model.provider}:${model.id}`;
        initialResponses.set(key, {
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          content: "",
          isStreaming: true,
          isComplete: false,
        });
      });
      setResponses(initialResponses);

      // Create abort controllers for each model
      const controllers = new Map<string, AbortController>();
      models.forEach((model) => {
        const key = `${model.provider}:${model.id}`;
        controllers.set(key, new AbortController());
      });
      abortControllersRef.current = controllers;

      // Start all streams in parallel (don't await - let them run independently)
      // Only the first model should increment the chat count
      models.forEach((model, index) => {
        const key = `${model.provider}:${model.id}`;
        const controller = controllers.get(key)!;
        const shouldIncrementCount = index === 0; // Only first model increments
        streamModelResponse(content, model, controller, shouldIncrementCount);
      });
    },
    [stop, streamModelResponse]
  );

  return {
    responses,
    isLoading,
    sendMessage,
    stop,
    reset,
    setResponses,
  };
}
