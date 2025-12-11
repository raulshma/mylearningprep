/**
 * Conversation Slice Reducer
 *
 * Pure reducer function for managing conversation state.
 * Handles all conversation-related actions and provides selectors.
 */

import type {
  ConversationState,
  ConversationAction,
  Conversation,
} from '../types';
import { createInitialConversationState } from '../types';

// =============================================================================
// Reducer
// =============================================================================

/**
 * Pure reducer function for conversation state
 * Given the same state and action, always produces the same result
 */
export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'LOAD_CONVERSATIONS': {
      const items = new Map<string, Conversation>();
      for (const conversation of action.payload) {
        items.set(conversation.id, conversation);
      }
      return {
        ...state,
        items,
        isLoading: false,
        error: null,
      };
    }

    case 'SET_ACTIVE': {
      return {
        ...state,
        activeId: action.payload,
      };
    }

    case 'CREATE': {
      const newItems = new Map(state.items);
      newItems.set(action.payload.id, action.payload);
      return {
        ...state,
        items: newItems,
      };
    }

    case 'UPDATE': {
      const existing = state.items.get(action.payload.id);
      if (!existing) {
        return state;
      }
      const newItems = new Map(state.items);
      newItems.set(action.payload.id, {
        ...existing,
        ...action.payload.updates,
        updatedAt: new Date(),
      });
      return {
        ...state,
        items: newItems,
      };
    }

    case 'DELETE': {
      const newItems = new Map(state.items);
      newItems.delete(action.payload);
      return {
        ...state,
        items: newItems,
        // Clear active if deleted conversation was active
        activeId: state.activeId === action.payload ? null : state.activeId,
      };
    }

    case 'PIN_TOGGLE': {
      const existing = state.items.get(action.payload);
      if (!existing) {
        return state;
      }
      const newItems = new Map(state.items);
      newItems.set(action.payload, {
        ...existing,
        isPinned: !existing.isPinned,
        updatedAt: new Date(),
      });
      return {
        ...state,
        items: newItems,
      };
    }

    case 'ARCHIVE': {
      const existing = state.items.get(action.payload);
      if (!existing) {
        return state;
      }
      const newItems = new Map(state.items);
      newItems.set(action.payload, {
        ...existing,
        isArchived: true,
        updatedAt: new Date(),
      });
      return {
        ...state,
        items: newItems,
      };
    }

    case 'RESTORE': {
      const existing = state.items.get(action.payload);
      if (!existing) {
        return state;
      }
      const newItems = new Map(state.items);
      newItems.set(action.payload, {
        ...existing,
        isArchived: false,
        updatedAt: new Date(),
      });
      return {
        ...state,
        items: newItems,
      };
    }

    case 'SET_SEARCH': {
      return {
        ...state,
        searchQuery: action.payload,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload,
        isLoading: false,
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
// Selectors
// =============================================================================

/**
 * Get all conversations as an array
 */
export function selectAllConversations(state: ConversationState): Conversation[] {
  return Array.from(state.items.values());
}

/**
 * Get active (non-archived) conversations
 */
export function selectActiveConversations(state: ConversationState): Conversation[] {
  return Array.from(state.items.values()).filter((c) => !c.isArchived);
}

/**
 * Get archived conversations
 */
export function selectArchivedConversations(state: ConversationState): Conversation[] {
  return Array.from(state.items.values()).filter((c) => c.isArchived);
}

/**
 * Get pinned conversations (non-archived)
 */
export function selectPinnedConversations(state: ConversationState): Conversation[] {
  return Array.from(state.items.values()).filter((c) => c.isPinned && !c.isArchived);
}

/**
 * Get the currently active conversation
 */
export function selectCurrentConversation(state: ConversationState): Conversation | null {
  if (!state.activeId) {
    return null;
  }
  return state.items.get(state.activeId) ?? null;
}

/**
 * Get a conversation by ID
 */
export function selectConversationById(
  state: ConversationState,
  id: string
): Conversation | null {
  return state.items.get(id) ?? null;
}

/**
 * Filter conversations by search query
 * Searches in title only for performance
 */
export function selectFilteredConversations(
  state: ConversationState,
  query: string
): Conversation[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return selectActiveConversations(state);
  }

  return Array.from(state.items.values()).filter(
    (c) => !c.isArchived && c.title.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get conversations sorted with pinned first, then by lastMessageAt descending
 */
export function selectSortedConversations(state: ConversationState): Conversation[] {
  const active = selectActiveConversations(state);
  return sortConversations(active);
}

/**
 * Get filtered and sorted conversations
 * Combines search filtering with proper sorting
 */
export function selectFilteredAndSortedConversations(
  state: ConversationState
): Conversation[] {
  const filtered = selectFilteredConversations(state, state.searchQuery);
  return sortConversations(filtered);
}

/**
 * Sort conversations: pinned first, then by lastMessageAt descending
 */
export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    // Pinned conversations come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Within same pin status, sort by lastMessageAt descending
    return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
  });
}

/**
 * Get conversation count (non-archived)
 */
export function selectConversationCount(state: ConversationState): number {
  return selectActiveConversations(state).length;
}

/**
 * Check if a conversation exists
 */
export function selectConversationExists(
  state: ConversationState,
  id: string
): boolean {
  return state.items.has(id);
}

// =============================================================================
// Initial State
// =============================================================================

export { createInitialConversationState };
