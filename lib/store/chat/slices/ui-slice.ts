/**
 * UI Slice Reducer
 *
 * Pure reducer function for managing UI state.
 * Handles sidebar states, chat mode, and viewport information.
 */

import type { UIState, UIAction } from '../types';
import { createInitialUIState } from '../types';

// =============================================================================
// Reducer
// =============================================================================

/**
 * Pure reducer function for UI state
 * Given the same state and action, always produces the same result
 */
export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_LEFT_SIDEBAR': {
      return {
        ...state,
        leftSidebarOpen: action.payload,
      };
    }

    case 'SET_RIGHT_SIDEBAR': {
      return {
        ...state,
        rightSidebarOpen: action.payload,
      };
    }

    case 'SET_CHAT_MODE': {
      return {
        ...state,
        chatMode: action.payload,
      };
    }

    case 'SET_VIEWPORT': {
      return {
        ...state,
        isMobile: action.payload.isMobile,
        isTablet: action.payload.isTablet,
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
 * Check if left sidebar is open
 */
export function selectLeftSidebarOpen(state: UIState): boolean {
  return state.leftSidebarOpen;
}

/**
 * Check if right sidebar is open
 */
export function selectRightSidebarOpen(state: UIState): boolean {
  return state.rightSidebarOpen;
}

/**
 * Get current chat mode
 */
export function selectChatMode(state: UIState): 'single' | 'multi' {
  return state.chatMode;
}

/**
 * Check if in multi-model mode
 */
export function selectIsMultiModelMode(state: UIState): boolean {
  return state.chatMode === 'multi';
}

/**
 * Check if viewport is mobile
 */
export function selectIsMobile(state: UIState): boolean {
  return state.isMobile;
}

/**
 * Check if viewport is tablet
 */
export function selectIsTablet(state: UIState): boolean {
  return state.isTablet;
}

/**
 * Check if viewport is desktop (not mobile and not tablet)
 */
export function selectIsDesktop(state: UIState): boolean {
  return !state.isMobile && !state.isTablet;
}

/**
 * Get effective sidebar visibility based on viewport
 * On mobile, sidebars should be treated as overlays
 */
export function selectEffectiveLeftSidebarOpen(state: UIState): boolean {
  // On mobile, sidebar is always an overlay that can be toggled
  // On desktop, it follows the leftSidebarOpen state
  return state.leftSidebarOpen;
}

/**
 * Get effective right sidebar visibility based on viewport
 */
export function selectEffectiveRightSidebarOpen(state: UIState): boolean {
  return state.rightSidebarOpen;
}

/**
 * Check if any sidebar is open (useful for backdrop on mobile)
 */
export function selectAnySidebarOpen(state: UIState): boolean {
  return state.leftSidebarOpen || state.rightSidebarOpen;
}

/**
 * Get viewport type as a string
 */
export function selectViewportType(state: UIState): 'mobile' | 'tablet' | 'desktop' {
  if (state.isMobile) return 'mobile';
  if (state.isTablet) return 'tablet';
  return 'desktop';
}

// =============================================================================
// Initial State
// =============================================================================

export { createInitialUIState };
