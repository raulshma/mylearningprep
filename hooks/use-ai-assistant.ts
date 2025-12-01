"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import type { AIToolName } from "@/lib/services/ai-tools";

export type AssistantToolStatus = {
  toolName: AIToolName;
  status: "calling" | "complete" | "error";
  input?: Record<string, unknown>;
  timestamp: string;
};

export interface UseAIAssistantOptions {
  interviewId?: string;
  learningPathId?: string;
  conversationId?: string;
  selectedModelId?: string | null;
  onToolStatus?: (status: AssistantToolStatus) => void;
  onError?: (error: Error) => void;
  onConversationCreated?: (id: string) => void;
}

export interface UseAIAssistantReturn {
  messages: ReturnType<typeof useChat>["messages"];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  error: Error | undefined;
  activeTools: AssistantToolStatus[];
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  stop: () => void;
  reload: () => void;
  reset: () => void;
}

// Store refs outside component to avoid lint issues with ref access during render
const contextRefs = {
  interviewId: undefined as string | undefined,
  learningPathId: undefined as string | undefined,
  conversationId: undefined as string | undefined,
  selectedModelId: undefined as string | null | undefined,
};

// Create transport singleton
let transportInstance: DefaultChatTransport<UIMessage> | null = null;

function getOrCreateTransport(): DefaultChatTransport<UIMessage> {
  if (!transportInstance) {
    transportInstance = new DefaultChatTransport<UIMessage>({
      api: "/api/ai-assistant",
      body: () => ({
        interviewId: contextRefs.interviewId,
        learningPathId: contextRefs.learningPathId,
        conversationId: contextRefs.conversationId,
        selectedModelId: contextRefs.selectedModelId,
      }),
    });
  }
  return transportInstance;
}

/**
 * Hook for interacting with the AI Assistant
 * Supports multi-tool calling and context from interviews/learning paths
 */
export function useAIAssistant(
  options: UseAIAssistantOptions = {}
): UseAIAssistantReturn {
  const {
    interviewId,
    learningPathId,
    conversationId,
    selectedModelId,
    onToolStatus,
    onError,
  } = options;
  const [activeTools, setActiveTools] = useState<AssistantToolStatus[]>([]);
  const [input, setInput] = useState("");
  const activeToolsRef = useRef<AssistantToolStatus[]>([]);

  // Update module-level refs via effect
  useEffect(() => {
    contextRefs.interviewId = interviewId;
    contextRefs.learningPathId = learningPathId;
    contextRefs.conversationId = conversationId;
    contextRefs.selectedModelId = selectedModelId;
  }, [interviewId, learningPathId, conversationId, selectedModelId]);

  // Get transport (created once at module level)
  const transport = getOrCreateTransport();

  const {
    messages,
    status,
    error,
    sendMessage: chatSendMessage,
    stop,
    regenerate,
    setMessages,
  } = useChat({
    transport,
    onError: (err) => {
      console.error("AI Assistant error:", err);
      onError?.(err);
    },
    onFinish: () => {
      // Clear active tools after completion
      setActiveTools([]);
      activeToolsRef.current = [];
    },
  });

  // Handle tool status updates from the stream
  const handleStreamData = useCallback(
    (data: unknown) => {
      if (!data || typeof data !== "object") return;

      const streamData = data as Record<string, unknown>;

      // Check for tool status updates
      if (streamData.type === "tool-status" && streamData.data) {
        const toolStatus = streamData.data as AssistantToolStatus;

        // Update active tools
        setActiveTools((prev) => {
          const existing = prev.findIndex(
            (t) => t.toolName === toolStatus.toolName
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = toolStatus;
            return updated;
          }
          return [...prev, toolStatus];
        });

        activeToolsRef.current = [
          ...activeToolsRef.current.filter(
            (t) => t.toolName !== toolStatus.toolName
          ),
          toolStatus,
        ];

        onToolStatus?.(toolStatus);
      }
    },
    [onToolStatus]
  );

  // Convert File to base64 data URL
  const fileToDataUrl = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Send a message to the assistant
  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if (!content.trim()) return;

      // Clear previous tools
      setActiveTools([]);
      activeToolsRef.current = [];

      // If files are provided, convert them to FileUIPart format
      if (files && files.length > 0) {
        const fileParts = await Promise.all(
          files.map(async (file) => ({
            type: "file" as const,
            mediaType: file.type,
            filename: file.name,
            url: await fileToDataUrl(file),
          }))
        );
        await chatSendMessage({ text: content, files: fileParts });
      } else {
        await chatSendMessage({ text: content });
      }
    },
    [chatSendMessage]
  );

  // Reset the conversation
  const reset = useCallback(() => {
    setMessages([]);
    setActiveTools([]);
    activeToolsRef.current = [];
  }, [setMessages]);

  // Derive isLoading from status for backwards compatibility
  const isLoading = status === "streaming" || status === "submitted";

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    activeTools,
    sendMessage,
    stop,
    reload: regenerate,
    reset,
  };
}

/**
 * Suggested prompts for the AI Assistant
 */
export const ASSISTANT_SUGGESTIONS = {
  interview: [
    "What are the most common interview questions for a senior engineer role?",
    "Help me prepare a system design for a URL shortener",
    "Analyze my resume for gaps I should address",
    "Generate mock behavioral interview questions",
    "What technology trends should I focus on for my job search?",
  ],
  learning: [
    "What should I learn next based on my progress?",
    "Find resources for improving my system design skills",
    "Explain the key concepts I need to master",
    "Create a study plan for the next week",
    "What are common mistakes to avoid in this topic?",
  ],
  general: [
    "What are the hottest technologies in the job market right now?",
    "Help me structure a STAR answer for a leadership question",
    "Analyze a GitHub repo to understand its architecture",
    "What skills should a senior engineer have?",
    "How can I improve my technical communication?",
  ],
} as const;

export type SuggestionCategory = keyof typeof ASSISTANT_SUGGESTIONS;
