/**
 * Chat Store Module
 *
 * Central export point for all chat store functionality.
 * This module provides a centralized state management system for the AI Chat feature
 * using Zustand with a slice-based architecture.
 *
 * ## Architecture
 *
 * The store is organized into four slices:
 * - **ConversationSlice**: Manages conversation list, active conversation, search, and CRUD operations
 * - **MessageSlice**: Manages messages per conversation, pending messages, and streaming state
 * - **UISlice**: Manages sidebar states, chat mode, and viewport information
 * - **ModelSlice**: Manages available models, selection, and provider tools
 *
 * ## Usage
 *
 * ### Basic Usage with Hooks
 * ```typescript
 * import { useActiveConversation, useConversationActions } from '@/lib/store/chat';
 *
 * function MyComponent() {
 *   const conversation = useActiveConversation();
 *   const { create, delete: deleteConv } = useConversationActions();
 *
 *   return <div>{conversation?.title}</div>;
 * }
 * ```
 *
 * ### Direct Store Access
 * ```typescript
 * import { useChatStore, getChatStore } from '@/lib/store/chat';
 *
 * // In a component
 * const conversations = useChatStore((state) => state.conversations);
 *
 * // Outside React
 * const state = getChatStore();
 * ```
 *
 * ### Using Selectors
 * ```typescript
 * import { selectFilteredConversations, selectMessagesByConversation } from '@/lib/store/chat';
 *
 * const filtered = selectFilteredConversations(state.conversations, 'search term');
 * const messages = selectMessagesByConversation(state.messages, conversationId);
 * ```
 *
 * @module lib/store/chat
 * @see {@link ./types.ts} for type definitions
 * @see {@link ./store.ts} for store implementation
 * @see {@link ./slices/} for individual slice implementations
 */

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Core data types for the chat feature
 */
export type {
  /** Tool call within a message */
  ToolCall,
  /** Message metadata containing performance and usage metrics */
  MessageMetadata,
  /** Error details for error messages */
  ErrorDetails,
  /** A single message in a conversation */
  Message,
  /** Conversation context linking to other entities */
  ConversationContext,
  /** Model info for multi-model comparison */
  ModelInfo,
  /** A conversation thread with the AI assistant */
  Conversation,
  /** A message that is currently being streamed */
  StreamingMessage,
  /** A message pending to be sent */
  PendingMessage,
  /** Encoded file for upload */
  EncodedFile,
  /** Stream error information */
  StreamError,
} from './types';

/**
 * State slice types
 */
export type {
  /** Conversation state slice */
  ConversationState,
  /** Message state slice */
  MessageState,
  /** UI state slice */
  UIState,
  /** Model state slice */
  ModelState,
} from './types';

/**
 * Action types for reducers
 */
export type {
  /** Conversation actions */
  ConversationAction,
  /** Message actions */
  MessageAction,
  /** UI actions */
  UIAction,
  /** Model actions */
  ModelAction,
} from './types';

/**
 * Action handler interfaces
 */
export type {
  /** Conversation action handlers */
  ConversationActions,
  /** Message action handlers */
  MessageActions,
  /** UI action handlers */
  UIActions,
  /** Model action handlers */
  ModelActions,
  /** Combined chat store interface */
  ChatStore,
} from './types';

/**
 * Serialization types for persistence
 */
export type {
  /** Serializable conversation state (Maps converted to arrays) */
  SerializableConversationState,
  /** Serializable message state (Maps converted to arrays) */
  SerializableMessageState,
  /** Serializable chat store state */
  SerializableChatState,
} from './types';

// =============================================================================
// Initial State Factories
// =============================================================================

export {
  /**
   * Create initial conversation state
   * @returns Fresh ConversationState with empty items Map
   */
  createInitialConversationState,
  /**
   * Create initial message state
   * @returns Fresh MessageState with empty Maps
   */
  createInitialMessageState,
  /**
   * Create initial UI state
   * @returns Fresh UIState with default sidebar and viewport settings
   */
  createInitialUIState,
  /**
   * Create initial model state
   * @returns Fresh ModelState with no selection
   */
  createInitialModelState,
} from './types';

// =============================================================================
// Serialization Utilities
// =============================================================================

export {
  /**
   * Serialize conversation state for persistence
   * Converts Map to array of entries for JSON serialization
   * @param state - ConversationState to serialize
   * @returns SerializableConversationState
   */
  serializeConversationState,
  /**
   * Deserialize conversation state from persistence
   * Converts array of entries back to Map
   * @param state - SerializableConversationState to deserialize
   * @returns ConversationState
   */
  deserializeConversationState,
  /**
   * Serialize message state for persistence
   * Converts Maps to arrays of entries for JSON serialization
   * @param state - MessageState to serialize
   * @returns SerializableMessageState
   */
  serializeMessageState,
  /**
   * Deserialize message state from persistence
   * Converts arrays of entries back to Maps
   * @param state - SerializableMessageState to deserialize
   * @returns MessageState
   */
  deserializeMessageState,
} from './types';

// =============================================================================
// Conversation Slice Exports
// =============================================================================

export {
  /**
   * Pure reducer for conversation state
   * @param state - Current ConversationState
   * @param action - ConversationAction to apply
   * @returns New ConversationState
   */
  conversationReducer,
  /** Select all conversations as an array */
  selectAllConversations,
  /** Select only active (non-archived) conversations */
  selectActiveConversations,
  /** Select only archived conversations */
  selectArchivedConversations,
  /** Select only pinned conversations */
  selectPinnedConversations,
  /** Select the currently active conversation */
  selectCurrentConversation,
  /** Select a conversation by ID */
  selectConversationById,
  /** Select conversations matching a search query */
  selectFilteredConversations,
  /** Select conversations sorted by lastMessageAt */
  selectSortedConversations,
  /** Select filtered and sorted conversations */
  selectFilteredAndSortedConversations,
  /** Sort conversations with pinned first, then by lastMessageAt */
  sortConversations,
  /** Select the total conversation count */
  selectConversationCount,
  /** Check if a conversation exists */
  selectConversationExists,
} from './slices/conversation-slice';

// =============================================================================
// Message Slice Exports
// =============================================================================

export {
  /**
   * Pure reducer for message state
   * @param state - Current MessageState
   * @param action - MessageAction to apply
   * @returns New MessageState
   */
  messageReducer,
  /** Sort messages by createdAt date ascending */
  sortMessagesByDate,
  /** Select messages for a specific conversation */
  selectMessagesByConversation,
  /** Select message count for a conversation */
  selectMessageCount,
  /** Select the last message in a conversation */
  selectLastMessage,
  /** Select a specific message by ID */
  selectMessageById,
  /** Select the index of a message in a conversation */
  selectMessageIndex,
  /** Select all pending messages */
  selectAllPendingMessages,
  /** Select a specific pending message */
  selectPendingMessage,
  /** Check if currently streaming */
  selectIsStreaming,
  /** Select the current streaming message */
  selectStreamingMessage,
  /** Select streaming message for a specific conversation */
  selectStreamingMessageForConversation,
  /** Select only user messages */
  selectUserMessages,
  /** Select only assistant messages */
  selectAssistantMessages,
  /** Check if messages are loaded for a conversation */
  selectMessagesLoaded,
} from './slices/message-slice';

// =============================================================================
// UI Slice Exports
// =============================================================================

export {
  /**
   * Pure reducer for UI state
   * @param state - Current UIState
   * @param action - UIAction to apply
   * @returns New UIState
   */
  uiReducer,
  /** Select left sidebar open state */
  selectLeftSidebarOpen,
  /** Select right sidebar open state */
  selectRightSidebarOpen,
  /** Select current chat mode */
  selectChatMode,
  /** Check if in multi-model mode */
  selectIsMultiModelMode,
  /** Check if viewport is mobile */
  selectIsMobile,
  /** Check if viewport is tablet */
  selectIsTablet,
  /** Check if viewport is desktop */
  selectIsDesktop,
  /** Select effective left sidebar state (considering viewport) */
  selectEffectiveLeftSidebarOpen,
  /** Select effective right sidebar state (considering viewport) */
  selectEffectiveRightSidebarOpen,
  /** Check if any sidebar is open */
  selectAnySidebarOpen,
  /** Select viewport type string */
  selectViewportType,
} from './slices/ui-slice';

// =============================================================================
// Model Slice Exports
// =============================================================================

export {
  /**
   * Pure reducer for model state
   * @param state - Current ModelState
   * @param action - ModelAction to apply
   * @returns New ModelState
   */
  modelReducer,
  /** Select all available models */
  selectAvailableModels,
  /** Select the selected model ID */
  selectSelectedModelId,
  /** Select the selected provider */
  selectSelectedProvider,
  /** Select the full selected model object */
  selectSelectedModel,
  /** Check if selected model supports images */
  selectSupportsImages,
  /** Select enabled provider tools */
  selectEnabledProviderTools,
  /** Check if a specific provider tool is enabled */
  selectIsProviderToolEnabled,
  /** Select models grouped by provider */
  selectModelsGroupedByProvider,
  /** Select models for a specific provider */
  selectModelsByProvider,
  /** Select models that support images */
  selectImageCapableModels,
  /** Select models that support tools */
  selectToolCapableModels,
  /** Check if a model is selected */
  selectHasModelSelected,
  /** Select total model count */
  selectModelCount,
  /** Select available providers */
  selectAvailableProviders,
} from './slices/model-slice';

// =============================================================================
// Store and Hooks
// =============================================================================

export {
  /**
   * Main Zustand store hook
   * Use with a selector for optimal performance
   * @example
   * const conversations = useChatStore((state) => state.conversations);
   */
  useChatStore,

  // Selector hooks for common use cases
  /** Select full conversation state */
  useConversations,
  /** Select full message state */
  useMessages,
  /** Select full UI state */
  useUI,
  /** Select full model state */
  useModels,
  /** Select the active conversation object */
  useActiveConversation,
  /** Select messages for the active conversation */
  useActiveMessages,
  /** Select the current streaming message */
  useStreamingMessage,
  /** Check if currently streaming */
  useIsStreaming,
  /** Select the full selected model object */
  useSelectedModel,

  // Optimized selector hooks (Requirements: 10.5 - Minimize re-renders)
  /** Select only conversation IDs (stable reference) */
  useConversationIds,
  /** Select conversation count */
  useConversationCount,
  /** Select message count for active conversation */
  useActiveMessageCount,
  /** Select conversations loading state */
  useIsConversationsLoading,
  /** Select conversations error state */
  useConversationsError,
  /** Select search query */
  useSearchQuery,
  /** Select active conversation ID only */
  useActiveConversationId,
  /** Select sidebar open states */
  useSidebarStates,
  /** Select viewport info */
  useViewport,
  /** Select chat mode */
  useChatMode,
  /** Select model selection info */
  useModelSelection,
  /** Select enabled provider tools */
  useProviderTools,

  // Action hooks
  /**
   * Get conversation action handlers
   * @returns Object with conversation actions (load, create, update, delete, etc.)
   */
  useConversationActions,
  /**
   * Get message action handlers
   * @returns Object with message actions (load, add, update, delete, etc.)
   */
  useMessageActions,
  /**
   * Get UI action handlers
   * @returns Object with UI actions (setSidebar, setChatMode, setViewport)
   */
  useUIActions,
  /**
   * Get model action handlers
   * @returns Object with model actions (setAvailable, select, setProviderTools)
   */
  useModelActions,

  // Utilities
  /**
   * Get the raw store state (for use outside React)
   * @returns Current ChatStoreState
   */
  getChatStore,
  /**
   * Subscribe to store changes
   * @param listener - Callback function called on state changes
   * @returns Unsubscribe function
   */
  subscribeToChatStore,
  /**
   * Reset store to initial state (useful for testing)
   */
  resetChatStore,
} from './store';
