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

export type MessageMetadata = {
  model: string;
  modelName?: string;
  tokensIn?: number;
  tokensOut?: number;
  totalTokens?: number;
  latencyMs?: number;
  ttft?: number;
  throughput?: number;
};

export interface UseAIAssistantOptions {
  interviewId?: string;
  learningPathId?: string;
  conversationId?: string;
  selectedModelId?: string | null;
  /** Provider-specific tools to enable (e.g., googleSearch, urlContext) */
  providerTools?: string[];
  onToolStatus?: (status: AssistantToolStatus) => void;
  onError?: (error: Error) => void;
  onConversationCreated?: (id: string) => void;
  onMessageMetadata?: (messageId: string, metadata: MessageMetadata) => void;
}

export interface UseAIAssistantReturn {
  messages: ReturnType<typeof useChat>["messages"];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  error: Error | undefined;
  activeTools: AssistantToolStatus[];
  messageMetadata: Map<string, MessageMetadata>;
  lastModelId: string | undefined;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  stop: () => void;
  reload: () => void;
  reset: () => void;
  setMessages: (messages: UIMessage[]) => void;
}

// Store refs outside component to avoid lint issues with ref access during render
const contextRefs = {
  interviewId: undefined as string | undefined,
  learningPathId: undefined as string | undefined,
  conversationId: undefined as string | undefined,
  selectedModelId: undefined as string | null | undefined,
  providerTools: undefined as string[] | undefined,
  onConversationCreated: undefined as ((id: string) => void) | undefined,
  onMessageMetadata: undefined as ((messageId: string, metadata: MessageMetadata) => void) | undefined,
  lastModelId: undefined as string | undefined,
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
        providerTools: contextRefs.providerTools,
      }),
      fetch: async (url, init) => {
        const response = await fetch(url, init);

        // Check for new conversation in headers
        const newConversationId = response.headers.get("X-Conversation-Id");
        const isNewConversation = response.headers.get("X-New-Conversation") === "true";

        if (newConversationId && isNewConversation && contextRefs.onConversationCreated) {
          // Update the context ref so subsequent messages use this conversation
          contextRefs.conversationId = newConversationId;
          // Defer callback to avoid triggering state updates during fetch
          queueMicrotask(() => {
            contextRefs.onConversationCreated?.(newConversationId);
          });
        }

        // Capture model ID from response
        const modelId = response.headers.get("X-Model-Id");
        if (modelId) {
          contextRefs.lastModelId = modelId;
        }

        return response;
      },
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
    providerTools,
    onToolStatus,
    onError,
    onConversationCreated,
    onMessageMetadata,
  } = options;
  const [activeTools, setActiveTools] = useState<AssistantToolStatus[]>([]);
  const [input, setInput] = useState("");
  const [lastModelId, setLastModelId] = useState<string | undefined>(undefined);
  const activeToolsRef = useRef<AssistantToolStatus[]>([]);
  // Store metadata in state instead of ref to trigger re-renders
  const [messageMetadata, setMessageMetadata] = useState<Map<string, MessageMetadata>>(new Map());

  // Track previous conversationId to detect changes
  const prevConversationIdRef = useRef<string | undefined>(undefined);

  // Update module-level refs synchronously during render
  // This ensures the refs are always up-to-date when sendMessage is called
  contextRefs.interviewId = interviewId;
  contextRefs.learningPathId = learningPathId;
  contextRefs.conversationId = conversationId;
  contextRefs.selectedModelId = selectedModelId;
  contextRefs.providerTools = providerTools;
  contextRefs.onConversationCreated = onConversationCreated;
  contextRefs.onMessageMetadata = onMessageMetadata;

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
    onFinish: (result) => {
      // Clear active tools after completion
      setActiveTools([]);
      activeToolsRef.current = [];

      // Extract metadata from the message (sent via messageMetadata callback in toUIMessageStreamResponse)
      if (result.message) {
        const messageId = result.message.id;
        // The metadata is attached to the message by the AI SDK from the server's messageMetadata callback
        const streamMetadata = (result.message as any).metadata as MessageMetadata | undefined;
        
        // Build metadata from stream metadata or fall back to model ID from headers
        const metadata: MessageMetadata = {
          model: streamMetadata?.model || contextRefs.lastModelId || 'unknown',
          modelName: streamMetadata?.modelName,
          tokensIn: streamMetadata?.tokensIn,
          tokensOut: streamMetadata?.tokensOut,
          totalTokens: streamMetadata?.totalTokens,
          latencyMs: streamMetadata?.latencyMs,
          ttft: streamMetadata?.ttft,
          throughput: streamMetadata?.throughput,
        };

        // Use queueMicrotask to defer state updates completely outside React's update cycle
        // This prevents "Maximum update depth exceeded" errors
        queueMicrotask(() => {
          if (metadata.model) {
            setLastModelId(metadata.model);
          }
          setMessageMetadata((prev) => {
            const next = new Map(prev);
            next.set(messageId, metadata);
            return next;
          });
          onMessageMetadata?.(messageId, metadata);
        });
      }
    },
  });

  // Load messages when conversationId changes
  useEffect(() => {
    // Skip if conversationId hasn't changed
    if (prevConversationIdRef.current === conversationId) {
      return;
    }
    prevConversationIdRef.current = conversationId;

    // Clear messages when switching to new chat (no conversationId)
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Load existing conversation messages
    const loadConversation = async () => {
      try {
        const { getConversation } = await import(
          "@/lib/actions/ai-chat-actions"
        );
        const result = await getConversation(conversationId);

        if (result.success && result.data.messages.length > 0) {
          // Convert AIMessage[] to UIMessage[] format
          // Include text parts and error messages (using data-error part type)
          const metadataMap = new Map<string, MessageMetadata>();

          const uiMessages = result.data.messages.map((msg) => {
            // Handle error messages - convert to assistant role with data-error part
            if (msg.role === "error") {
              return {
                id: msg.id,
                role: "assistant" as const,
                content: msg.content,
                parts: [
                  {
                    type: "data-error" as const,
                    data: {
                      error: msg.content,
                      errorDetails: msg.errorDetails,
                    },
                  },
                ],
                createdAt: msg.createdAt,
              };
            }
            // Regular user/assistant messages
            // Build parts array with reasoning (if present), tool calls, and text
            const parts: unknown[] = [];

            if (msg.reasoning) {
              parts.push({ type: "reasoning" as const, text: msg.reasoning });
            }

            // Add tool call parts for assistant messages
            if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
              for (const toolCall of msg.toolCalls) {
                parts.push({
                  type: `tool-${toolCall.name}`,
                  toolCallId: toolCall.id,
                  state: toolCall.state,
                  input: toolCall.input,
                  output: toolCall.output,
                  errorText: toolCall.errorText,
                });
              }
            }

            parts.push({ type: "text" as const, text: msg.content });

            // Extract metadata for assistant messages
            if (msg.role === "assistant" && msg.metadata) {
              metadataMap.set(msg.id, msg.metadata as MessageMetadata);
            }

            // At this point, role is either "user" or "assistant" (error handled above)
            const role = msg.role === "user" ? "user" as const : "assistant" as const;

            return {
              id: msg.id,
              role,
              content: msg.content,
              parts,
              createdAt: msg.createdAt,
            };
          });

          setMessages(uiMessages as UIMessage[]);
          setMessageMetadata(metadataMap);
        } else {
          setMessages([]);
          setMessageMetadata(new Map());
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        setMessages([]);
      }
    };

    loadConversation();
  }, [conversationId, setMessages]);

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
    setMessageMetadata(new Map());
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
    messageMetadata,
    lastModelId,
    sendMessage,
    stop,
    reload: regenerate,
    reset,
    setMessages,
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
