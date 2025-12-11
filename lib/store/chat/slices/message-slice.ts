/**
 * Message Slice Reducer
 *
 * Pure reducer function for managing message state.
 * Handles all message-related actions and provides selectors.
 */

import type {
  MessageState,
  MessageAction,
  Message,
  PendingMessage,
  StreamingMessage,
} from '../types';
import { createInitialMessageState } from '../types';

// =============================================================================
// Reducer
// =============================================================================

/**
 * Pure reducer function for message state
 * Given the same state and action, always produces the same result
 */
export function messageReducer(
  state: MessageState,
  action: MessageAction
): MessageState {
  switch (action.type) {
    case 'LOAD_MESSAGES': {
      const newByConversation = new Map(state.byConversation);
      // Sort messages by createdAt to ensure chronological order
      const sortedMessages = sortMessagesByDate([...action.payload.messages]);
      newByConversation.set(action.payload.conversationId, sortedMessages);
      return {
        ...state,
        byConversation: newByConversation,
      };
    }

    case 'ADD_MESSAGE': {
      const newByConversation = new Map(state.byConversation);
      const existing = newByConversation.get(action.payload.conversationId) ?? [];
      // Add message and maintain chronological order
      const updated = sortMessagesByDate([...existing, action.payload.message]);
      newByConversation.set(action.payload.conversationId, updated);
      return {
        ...state,
        byConversation: newByConversation,
      };
    }

    case 'UPDATE_MESSAGE': {
      const messages = state.byConversation.get(action.payload.conversationId);
      if (!messages) {
        return state;
      }

      const messageIndex = messages.findIndex(
        (m) => m.id === action.payload.messageId
      );
      if (messageIndex === -1) {
        return state;
      }

      const newByConversation = new Map(state.byConversation);
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...messages[messageIndex],
        ...action.payload.updates,
      };
      newByConversation.set(action.payload.conversationId, updatedMessages);

      return {
        ...state,
        byConversation: newByConversation,
      };
    }

    case 'DELETE_MESSAGES_FROM': {
      const messages = state.byConversation.get(action.payload.conversationId);
      if (!messages) {
        return state;
      }

      const newByConversation = new Map(state.byConversation);
      // Keep only messages before the specified index
      const truncated = messages.slice(0, action.payload.fromIndex);
      newByConversation.set(action.payload.conversationId, truncated);

      return {
        ...state,
        byConversation: newByConversation,
      };
    }

    case 'SET_PENDING': {
      const newPendingMessages = new Map(state.pendingMessages);
      newPendingMessages.set(action.payload.id, action.payload);
      return {
        ...state,
        pendingMessages: newPendingMessages,
      };
    }

    case 'CLEAR_PENDING': {
      const newPendingMessages = new Map(state.pendingMessages);
      newPendingMessages.delete(action.payload);
      return {
        ...state,
        pendingMessages: newPendingMessages,
      };
    }

    case 'SET_STREAMING': {
      return {
        ...state,
        streamingMessage: action.payload,
      };
    }

    case 'UPDATE_STREAMING': {
      if (!state.streamingMessage) {
        return state;
      }
      return {
        ...state,
        streamingMessage: {
          ...state.streamingMessage,
          ...action.payload,
        },
      };
    }

    default: {
      // Exhaustive check - TypeScript will error if we miss a case
      const _exhaustive: never = action;
      return state;
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sort messages by createdAt in ascending order (chronological)
 */
export function sortMessagesByDate(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}

// =============================================================================
// Selectors
// =============================================================================

/**
 * Get messages for a specific conversation
 */
export function selectMessagesByConversation(
  state: MessageState,
  conversationId: string
): Message[] {
  return state.byConversation.get(conversationId) ?? [];
}

/**
 * Get message count for a conversation
 */
export function selectMessageCount(
  state: MessageState,
  conversationId: string
): number {
  return selectMessagesByConversation(state, conversationId).length;
}

/**
 * Get the last message in a conversation
 */
export function selectLastMessage(
  state: MessageState,
  conversationId: string
): Message | null {
  const messages = selectMessagesByConversation(state, conversationId);
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

/**
 * Get a specific message by ID
 */
export function selectMessageById(
  state: MessageState,
  conversationId: string,
  messageId: string
): Message | null {
  const messages = selectMessagesByConversation(state, conversationId);
  return messages.find((m) => m.id === messageId) ?? null;
}

/**
 * Get the index of a message in a conversation
 */
export function selectMessageIndex(
  state: MessageState,
  conversationId: string,
  messageId: string
): number {
  const messages = selectMessagesByConversation(state, conversationId);
  return messages.findIndex((m) => m.id === messageId);
}

/**
 * Get all pending messages
 */
export function selectAllPendingMessages(state: MessageState): PendingMessage[] {
  return Array.from(state.pendingMessages.values());
}

/**
 * Get a pending message by ID
 */
export function selectPendingMessage(
  state: MessageState,
  id: string
): PendingMessage | null {
  return state.pendingMessages.get(id) ?? null;
}

/**
 * Check if there's an active streaming message
 */
export function selectIsStreaming(state: MessageState): boolean {
  return state.streamingMessage !== null && !state.streamingMessage.isComplete;
}

/**
 * Get the current streaming message
 */
export function selectStreamingMessage(
  state: MessageState
): StreamingMessage | null {
  return state.streamingMessage;
}

/**
 * Get streaming message for a specific conversation
 */
export function selectStreamingMessageForConversation(
  state: MessageState,
  conversationId: string
): StreamingMessage | null {
  if (
    state.streamingMessage &&
    state.streamingMessage.conversationId === conversationId
  ) {
    return state.streamingMessage;
  }
  return null;
}

/**
 * Get user messages only for a conversation
 */
export function selectUserMessages(
  state: MessageState,
  conversationId: string
): Message[] {
  return selectMessagesByConversation(state, conversationId).filter(
    (m) => m.role === 'user'
  );
}

/**
 * Get assistant messages only for a conversation
 */
export function selectAssistantMessages(
  state: MessageState,
  conversationId: string
): Message[] {
  return selectMessagesByConversation(state, conversationId).filter(
    (m) => m.role === 'assistant'
  );
}

/**
 * Check if messages are loaded for a conversation
 */
export function selectMessagesLoaded(
  state: MessageState,
  conversationId: string
): boolean {
  return state.byConversation.has(conversationId);
}

// =============================================================================
// Initial State
// =============================================================================

export { createInitialMessageState };
