/**
 * Chat Store
 *
 * Combined Zustand store for AI Chat state management.
 * Integrates all slices and provides persistence middleware.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type { AIProviderType, AIModelMetadata } from '@/lib/ai/types';
import type { ProviderToolType } from '@/lib/ai/provider-tools';
import type {
  ConversationState,
  MessageState,
  UIState,
  ModelState,
  Conversation,
  Message,
  PendingMessage,
  StreamingMessage,
} from './types';
import {
  createInitialConversationState,
  createInitialMessageState,
  createInitialUIState,
  createInitialModelState,
} from './types';
import { conversationReducer } from './slices/conversation-slice';
import { messageReducer } from './slices/message-slice';
import { uiReducer } from './slices/ui-slice';
import { modelReducer } from './slices/model-slice';

// =============================================================================
// Store State Type (internal)
// =============================================================================

interface ChatStoreState {
  // State slices
  conversations: ConversationState;
  messages: MessageState;
  ui: UIState;
  models: ModelState;

  // Conversation actions
  loadConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  createConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  archiveConversation: (id: string) => void;
  restoreConversation: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setConversationsLoading: (loading: boolean) => void;
  setConversationsError: (error: string | null) => void;

  // Message actions
  loadMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessagesFrom: (conversationId: string, fromIndex: number) => void;
  setPendingMessage: (message: PendingMessage) => void;
  clearPendingMessage: (id: string) => void;
  setStreamingMessage: (message: StreamingMessage | null) => void;
  updateStreamingMessage: (updates: Partial<StreamingMessage>) => void;

  // UI actions
  setLeftSidebar: (open: boolean) => void;
  setRightSidebar: (open: boolean) => void;
  setChatMode: (mode: 'single' | 'multi') => void;
  setViewport: (viewport: { isMobile: boolean; isTablet: boolean }) => void;

  // Model actions
  setAvailableModels: (models: AIModelMetadata[]) => void;
  selectModel: (id: string, provider: AIProviderType, supportsImages: boolean) => void;
  setProviderTools: (tools: ProviderToolType[]) => void;
  clearModelSelection: () => void;
}

// =============================================================================
// Persistence Configuration
// =============================================================================

/**
 * Custom storage that handles Map serialization
 */
const chatStorage = createJSONStorage(() => localStorage, {
  reviver: (_key, value) => {
    // Handle Date revival
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    return value;
  },
  replacer: (_key, value) => {
    // Handle Date serialization
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
});

/**
 * Partialize function to select what state to persist
 * We persist UI preferences and model selection, but not conversations/messages
 * (those are loaded from the server)
 */
function partialize(state: ChatStoreState): Partial<ChatStoreState> {
  return {
    ui: state.ui,
    models: {
      ...state.models,
      // Don't persist available models - they're loaded from server
      available: [],
    },
  };
}

// =============================================================================
// Store Creation
// =============================================================================

/**
 * Main chat store with Zustand
 * Uses subscribeWithSelector for fine-grained subscriptions
 * Uses persist for localStorage sync
 */
export const useChatStore = create<ChatStoreState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        // Initial state
        conversations: createInitialConversationState(),
        messages: createInitialMessageState(),
        ui: createInitialUIState(),
        models: createInitialModelState(),

        // =================================================================
        // Conversation Actions
        // =================================================================

        loadConversations: (conversations) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'LOAD_CONVERSATIONS',
              payload: conversations,
            }),
          }));
        },

        setActiveConversation: (id) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'SET_ACTIVE',
              payload: id,
            }),
          }));
        },

        createConversation: (conversation) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'CREATE',
              payload: conversation,
            }),
          }));
        },

        updateConversation: (id, updates) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'UPDATE',
              payload: { id, updates },
            }),
          }));
        },

        deleteConversation: (id) => {
          set((state) => {
            // Also clear messages for this conversation
            const newMessages = new Map(state.messages.byConversation);
            newMessages.delete(id);

            return {
              conversations: conversationReducer(state.conversations, {
                type: 'DELETE',
                payload: id,
              }),
              messages: {
                ...state.messages,
                byConversation: newMessages,
              },
            };
          });
        },

        togglePinConversation: (id) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'PIN_TOGGLE',
              payload: id,
            }),
          }));
        },

        archiveConversation: (id) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'ARCHIVE',
              payload: id,
            }),
          }));
        },

        restoreConversation: (id) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'RESTORE',
              payload: id,
            }),
          }));
        },

        setSearchQuery: (query) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'SET_SEARCH',
              payload: query,
            }),
          }));
        },

        setConversationsLoading: (loading) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'SET_LOADING',
              payload: loading,
            }),
          }));
        },

        setConversationsError: (error) => {
          set((state) => ({
            conversations: conversationReducer(state.conversations, {
              type: 'SET_ERROR',
              payload: error,
            }),
          }));
        },

        // =================================================================
        // Message Actions
        // =================================================================

        loadMessages: (conversationId, messages) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'LOAD_MESSAGES',
              payload: { conversationId, messages },
            }),
          }));
        },

        addMessage: (conversationId, message) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'ADD_MESSAGE',
              payload: { conversationId, message },
            }),
          }));
        },

        updateMessage: (conversationId, messageId, updates) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'UPDATE_MESSAGE',
              payload: { conversationId, messageId, updates },
            }),
          }));
        },

        deleteMessagesFrom: (conversationId, fromIndex) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'DELETE_MESSAGES_FROM',
              payload: { conversationId, fromIndex },
            }),
          }));
        },

        setPendingMessage: (message) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'SET_PENDING',
              payload: message,
            }),
          }));
        },

        clearPendingMessage: (id) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'CLEAR_PENDING',
              payload: id,
            }),
          }));
        },

        setStreamingMessage: (message) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'SET_STREAMING',
              payload: message,
            }),
          }));
        },

        updateStreamingMessage: (updates) => {
          set((state) => ({
            messages: messageReducer(state.messages, {
              type: 'UPDATE_STREAMING',
              payload: updates,
            }),
          }));
        },

        // =================================================================
        // UI Actions
        // =================================================================

        setLeftSidebar: (open) => {
          set((state) => ({
            ui: uiReducer(state.ui, {
              type: 'SET_LEFT_SIDEBAR',
              payload: open,
            }),
          }));
        },

        setRightSidebar: (open) => {
          set((state) => ({
            ui: uiReducer(state.ui, {
              type: 'SET_RIGHT_SIDEBAR',
              payload: open,
            }),
          }));
        },

        setChatMode: (mode) => {
          set((state) => ({
            ui: uiReducer(state.ui, {
              type: 'SET_CHAT_MODE',
              payload: mode,
            }),
          }));
        },

        setViewport: (viewport) => {
          set((state) => ({
            ui: uiReducer(state.ui, {
              type: 'SET_VIEWPORT',
              payload: viewport,
            }),
          }));
        },

        // =================================================================
        // Model Actions
        // =================================================================

        setAvailableModels: (models) => {
          set((state) => ({
            models: modelReducer(state.models, {
              type: 'SET_AVAILABLE',
              payload: models,
            }),
          }));
        },

        selectModel: (id, provider, supportsImages) => {
          set((state) => ({
            models: modelReducer(state.models, {
              type: 'SELECT_MODEL',
              payload: { id, provider, supportsImages },
            }),
          }));
        },

        setProviderTools: (tools) => {
          set((state) => ({
            models: modelReducer(state.models, {
              type: 'SET_PROVIDER_TOOLS',
              payload: tools,
            }),
          }));
        },

        clearModelSelection: () => {
          set((state) => ({
            models: modelReducer(state.models, {
              type: 'CLEAR_SELECTION',
            }),
          }));
        },
      }),
      {
        name: 'chat-store',
        storage: chatStorage,
        partialize,
        // Merge persisted state with initial state
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<ChatStoreState> | undefined;
          return {
            ...currentState,
            ui: persisted?.ui ?? currentState.ui,
            models: {
              ...currentState.models,
              selectedId: persisted?.models?.selectedId ?? null,
              selectedProvider: persisted?.models?.selectedProvider ?? null,
              enabledProviderTools: persisted?.models?.enabledProviderTools ?? [],
              supportsImages: persisted?.models?.supportsImages ?? false,
            },
          };
        },
      }
    )
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

/**
 * Select conversation state
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useConversations = () => useChatStore(useShallow((state) => state.conversations));

/**
 * Select message state
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useMessages = () => useChatStore(useShallow((state) => state.messages));

/**
 * Select UI state
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useUI = () => useChatStore(useShallow((state) => state.ui));

/**
 * Select model state
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useModels = () => useChatStore(useShallow((state) => state.models));

/**
 * Select active conversation
 */
export const useActiveConversation = () =>
  useChatStore((state) => {
    const { activeId, items } = state.conversations;
    return activeId ? items.get(activeId) ?? null : null;
  });

/**
 * Select messages for active conversation
 */
export const useActiveMessages = () =>
  useChatStore((state) => {
    const { activeId } = state.conversations;
    if (!activeId) return [];
    return state.messages.byConversation.get(activeId) ?? [];
  });

/**
 * Select streaming message
 */
export const useStreamingMessage = () =>
  useChatStore((state) => state.messages.streamingMessage);

/**
 * Select if currently streaming
 */
export const useIsStreaming = () =>
  useChatStore(
    (state) =>
      state.messages.streamingMessage !== null &&
      !state.messages.streamingMessage.isComplete
  );

/**
 * Select selected model
 */
export const useSelectedModel = () =>
  useChatStore((state) => {
    const { selectedId, available } = state.models;
    if (!selectedId) return null;
    return available.find((m) => m.id === selectedId) ?? null;
  });

// =============================================================================
// Action Hooks
// =============================================================================

/**
 * Get conversation actions
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useConversationActions = () =>
  useChatStore(
    useShallow((state) => ({
      load: state.loadConversations,
      setActive: state.setActiveConversation,
      create: state.createConversation,
      update: state.updateConversation,
      delete: state.deleteConversation,
      togglePin: state.togglePinConversation,
      archive: state.archiveConversation,
      restore: state.restoreConversation,
      setSearch: state.setSearchQuery,
      setLoading: state.setConversationsLoading,
      setError: state.setConversationsError,
    }))
  );

/**
 * Get message actions
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useMessageActions = () =>
  useChatStore(
    useShallow((state) => ({
      load: state.loadMessages,
      add: state.addMessage,
      update: state.updateMessage,
      deleteFrom: state.deleteMessagesFrom,
      setPending: state.setPendingMessage,
      clearPending: state.clearPendingMessage,
      setStreaming: state.setStreamingMessage,
      updateStreaming: state.updateStreamingMessage,
    }))
  );

/**
 * Get UI actions
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useUIActions = () =>
  useChatStore(
    useShallow((state) => ({
      setLeftSidebar: state.setLeftSidebar,
      setRightSidebar: state.setRightSidebar,
      setChatMode: state.setChatMode,
      setViewport: state.setViewport,
    }))
  );

/**
 * Get model actions
 * Uses useShallow to prevent infinite loops with React 19's useSyncExternalStore
 */
export const useModelActions = () =>
  useChatStore(
    useShallow((state) => ({
      setAvailable: state.setAvailableModels,
      select: state.selectModel,
      setProviderTools: state.setProviderTools,
      clearSelection: state.clearModelSelection,
    }))
  );

// =============================================================================
// Optimized Selectors (Requirements: 10.5 - Minimize unnecessary re-renders)
// =============================================================================

/**
 * Select only the conversation IDs (stable reference if IDs don't change)
 */
export const useConversationIds = () =>
  useChatStore((state) => {
    const ids = Array.from(state.conversations.items.keys());
    return ids;
  });

/**
 * Select conversation count without subscribing to conversation changes
 */
export const useConversationCount = () =>
  useChatStore((state) => state.conversations.items.size);

/**
 * Select message count for active conversation
 */
export const useActiveMessageCount = () =>
  useChatStore((state) => {
    const { activeId } = state.conversations;
    if (!activeId) return 0;
    return state.messages.byConversation.get(activeId)?.length ?? 0;
  });

/**
 * Select only loading state
 */
export const useIsConversationsLoading = () =>
  useChatStore((state) => state.conversations.isLoading);

/**
 * Select only error state
 */
export const useConversationsError = () =>
  useChatStore((state) => state.conversations.error);

/**
 * Select only search query
 */
export const useSearchQuery = () =>
  useChatStore((state) => state.conversations.searchQuery);

/**
 * Select only active conversation ID (not the full conversation)
 */
export const useActiveConversationId = () =>
  useChatStore((state) => state.conversations.activeId);

/**
 * Select only sidebar states
 */
export const useSidebarStates = () =>
  useChatStore((state) => ({
    leftOpen: state.ui.leftSidebarOpen,
    rightOpen: state.ui.rightSidebarOpen,
  }));

/**
 * Select only viewport info
 */
export const useViewport = () =>
  useChatStore((state) => ({
    isMobile: state.ui.isMobile,
    isTablet: state.ui.isTablet,
  }));

/**
 * Select only chat mode
 */
export const useChatMode = () =>
  useChatStore((state) => state.ui.chatMode);

/**
 * Select only model selection info
 */
export const useModelSelection = () =>
  useChatStore((state) => ({
    selectedId: state.models.selectedId,
    selectedProvider: state.models.selectedProvider,
    supportsImages: state.models.supportsImages,
  }));

/**
 * Select only provider tools
 */
export const useProviderTools = () =>
  useChatStore((state) => state.models.enabledProviderTools);

// =============================================================================
// Store Utilities
// =============================================================================

/**
 * Get the raw store for testing or advanced usage
 */
export const getChatStore = () => useChatStore.getState();

/**
 * Subscribe to store changes
 */
export const subscribeToChatStore = useChatStore.subscribe;

/**
 * Reset store to initial state (useful for testing)
 */
export const resetChatStore = () => {
  useChatStore.setState({
    conversations: createInitialConversationState(),
    messages: createInitialMessageState(),
    ui: createInitialUIState(),
    models: createInitialModelState(),
  });
};
