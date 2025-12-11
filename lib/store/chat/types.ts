/**
 * Chat Store Types and Interfaces
 *
 * Centralized type definitions for the AI Chat state management system.
 * These types define the shape of state slices and actions for the chat feature.
 */

import type { AIProviderType, AIModelMetadata } from '@/lib/ai/types';
import type { ProviderToolType } from '@/lib/ai/provider-tools';

// =============================================================================
// Core Data Types
// =============================================================================

/**
 * Tool call within a message
 */
export interface ToolCall {
  id: string;
  name: string;
  input?: unknown;
  output?: unknown;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  errorText?: string;
}

/**
 * Message metadata containing performance and usage metrics
 */
export interface MessageMetadata {
  model: string;
  modelName?: string;
  tokensIn?: number;
  tokensOut?: number;
  totalTokens?: number;
  latencyMs?: number;
  ttft?: number;
  throughput?: number;
}

/**
 * Error details for error messages
 */
export interface ErrorDetails {
  code?: string;
  isRetryable?: boolean;
}

/**
 * A single message in a conversation
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  imageIds?: string[];
  errorDetails?: ErrorDetails;
  metadata?: MessageMetadata;
  createdAt: Date;
}

/**
 * Conversation context linking to other entities
 */
export interface ConversationContext {
  interviewId?: string;
  learningPathId?: string;
  toolsUsed?: string[];
}

/**
 * Model info for multi-model comparison
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProviderType;
}

/**
 * A conversation thread with the AI assistant
 */
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  chatMode: 'single' | 'multi';
  isPinned: boolean;
  isArchived: boolean;
  context?: ConversationContext;
  comparisonModels?: ModelInfo[];
  parentConversationId?: string;
  branchedFromMessageId?: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A message that is currently being streamed
 */
export interface StreamingMessage {
  id: string;
  conversationId: string;
  content: string;
  reasoning: string;
  toolCalls: ToolCall[];
  isComplete: boolean;
  error?: StreamError;
}

/**
 * A message pending to be sent
 */
export interface PendingMessage {
  id: string;
  content: string;
  files?: EncodedFile[];
  status: 'pending' | 'sending' | 'failed';
  retryCount: number;
  error?: string;
}

/**
 * Encoded file for upload
 */
export interface EncodedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  previewUrl?: string;
}

/**
 * Stream error information
 */
export interface StreamError {
  message: string;
  code?: string;
  isRetryable?: boolean;
}

// =============================================================================
// State Slice Types
// =============================================================================

/**
 * Conversation state slice
 */
export interface ConversationState {
  items: Map<string, Conversation>;
  activeId: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Message state slice
 */
export interface MessageState {
  byConversation: Map<string, Message[]>;
  pendingMessages: Map<string, PendingMessage>;
  streamingMessage: StreamingMessage | null;
}

/**
 * UI state slice
 */
export interface UIState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  chatMode: 'single' | 'multi';
  isMobile: boolean;
  isTablet: boolean;
}

/**
 * Model state slice
 */
export interface ModelState {
  available: AIModelMetadata[];
  selectedId: string | null;
  selectedProvider: AIProviderType | null;
  enabledProviderTools: ProviderToolType[];
  supportsImages: boolean;
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * Conversation actions
 */
export type ConversationAction =
  | { type: 'LOAD_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_ACTIVE'; payload: string | null }
  | { type: 'CREATE'; payload: Conversation }
  | { type: 'UPDATE'; payload: { id: string; updates: Partial<Conversation> } }
  | { type: 'DELETE'; payload: string }
  | { type: 'PIN_TOGGLE'; payload: string }
  | { type: 'ARCHIVE'; payload: string }
  | { type: 'RESTORE'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

/**
 * Message actions
 */
export type MessageAction =
  | { type: 'LOAD_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { conversationId: string; messageId: string; updates: Partial<Message> } }
  | { type: 'DELETE_MESSAGES_FROM'; payload: { conversationId: string; fromIndex: number } }
  | { type: 'SET_PENDING'; payload: PendingMessage }
  | { type: 'CLEAR_PENDING'; payload: string }
  | { type: 'SET_STREAMING'; payload: StreamingMessage | null }
  | { type: 'UPDATE_STREAMING'; payload: Partial<StreamingMessage> };

/**
 * UI actions
 */
export type UIAction =
  | { type: 'SET_LEFT_SIDEBAR'; payload: boolean }
  | { type: 'SET_RIGHT_SIDEBAR'; payload: boolean }
  | { type: 'SET_CHAT_MODE'; payload: 'single' | 'multi' }
  | { type: 'SET_VIEWPORT'; payload: { isMobile: boolean; isTablet: boolean } };

/**
 * Model actions
 */
export type ModelAction =
  | { type: 'SET_AVAILABLE'; payload: AIModelMetadata[] }
  | { type: 'SELECT_MODEL'; payload: { id: string; provider: AIProviderType; supportsImages: boolean } }
  | { type: 'SET_PROVIDER_TOOLS'; payload: ProviderToolType[] }
  | { type: 'CLEAR_SELECTION' };

// =============================================================================
// Store Types
// =============================================================================

/**
 * Conversation action handlers
 */
export interface ConversationActions {
  loadConversations: (conversations: Conversation[]) => void;
  setActive: (id: string | null) => void;
  create: (conversation: Conversation) => void;
  update: (id: string, updates: Partial<Conversation>) => void;
  delete: (id: string) => void;
  togglePin: (id: string) => void;
  archive: (id: string) => void;
  restore: (id: string) => void;
  setSearch: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Message action handlers
 */
export interface MessageActions {
  loadMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessagesFrom: (conversationId: string, fromIndex: number) => void;
  setPending: (message: PendingMessage) => void;
  clearPending: (id: string) => void;
  setStreaming: (message: StreamingMessage | null) => void;
  updateStreaming: (updates: Partial<StreamingMessage>) => void;
}

/**
 * UI action handlers
 */
export interface UIActions {
  setLeftSidebar: (open: boolean) => void;
  setRightSidebar: (open: boolean) => void;
  setChatMode: (mode: 'single' | 'multi') => void;
  setViewport: (viewport: { isMobile: boolean; isTablet: boolean }) => void;
}

/**
 * Model action handlers
 */
export interface ModelActions {
  setAvailable: (models: AIModelMetadata[]) => void;
  selectModel: (id: string, provider: AIProviderType, supportsImages: boolean) => void;
  setProviderTools: (tools: ProviderToolType[]) => void;
  clearSelection: () => void;
}

/**
 * Combined chat store interface
 */
export interface ChatStore {
  // State slices
  conversations: ConversationState;
  messages: MessageState;
  ui: UIState;
  models: ModelState;

  // Actions
  actions: {
    conversations: ConversationActions;
    messages: MessageActions;
    ui: UIActions;
    models: ModelActions;
  };
}

// =============================================================================
// Initial State Factories
// =============================================================================

/**
 * Create initial conversation state
 */
export function createInitialConversationState(): ConversationState {
  return {
    items: new Map(),
    activeId: null,
    searchQuery: '',
    isLoading: false,
    error: null,
  };
}

/**
 * Create initial message state
 */
export function createInitialMessageState(): MessageState {
  return {
    byConversation: new Map(),
    pendingMessages: new Map(),
    streamingMessage: null,
  };
}

/**
 * Create initial UI state
 */
export function createInitialUIState(): UIState {
  return {
    leftSidebarOpen: true,
    rightSidebarOpen: false,
    chatMode: 'single',
    isMobile: false,
    isTablet: false,
  };
}

/**
 * Create initial model state
 */
export function createInitialModelState(): ModelState {
  return {
    available: [],
    selectedId: null,
    selectedProvider: null,
    enabledProviderTools: [],
    supportsImages: false,
  };
}

// =============================================================================
// Serialization Types (for persistence)
// =============================================================================

/**
 * Serializable conversation state (Maps converted to arrays)
 */
export interface SerializableConversationState {
  items: [string, Conversation][];
  activeId: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Serializable message state (Maps converted to arrays)
 */
export interface SerializableMessageState {
  byConversation: [string, Message[]][];
  pendingMessages: [string, PendingMessage][];
  streamingMessage: StreamingMessage | null;
}

/**
 * Serializable chat store state
 */
export interface SerializableChatState {
  conversations: SerializableConversationState;
  messages: SerializableMessageState;
  ui: UIState;
  models: ModelState;
}

/**
 * Serialize conversation state for persistence
 */
export function serializeConversationState(state: ConversationState): SerializableConversationState {
  return {
    ...state,
    items: Array.from(state.items.entries()),
  };
}

/**
 * Deserialize conversation state from persistence
 */
export function deserializeConversationState(state: SerializableConversationState): ConversationState {
  return {
    ...state,
    items: new Map(state.items),
  };
}

/**
 * Serialize message state for persistence
 */
export function serializeMessageState(state: MessageState): SerializableMessageState {
  return {
    ...state,
    byConversation: Array.from(state.byConversation.entries()),
    pendingMessages: Array.from(state.pendingMessages.entries()),
  };
}

/**
 * Deserialize message state from persistence
 */
export function deserializeMessageState(state: SerializableMessageState): MessageState {
  return {
    ...state,
    byConversation: new Map(state.byConversation),
    pendingMessages: new Map(state.pendingMessages),
  };
}
