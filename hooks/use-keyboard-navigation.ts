"use client";

/**
 * Keyboard Navigation Hook for AI Chat
 * 
 * Provides keyboard shortcuts and navigation for the chat interface.
 * Implements logical tab order and common action shortcuts.
 * 
 * Requirements: 14.1 - Provide logical tab order through all interactive elements
 */

import { useEffect, useCallback, useRef } from "react";

// =============================================================================
// Types
// =============================================================================

export interface KeyboardShortcut {
  /** Key combination (e.g., "ctrl+n", "escape", "ctrl+shift+s") */
  key: string;
  /** Description of the shortcut action */
  description: string;
  /** Callback when shortcut is triggered */
  action: () => void;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

export interface UseKeyboardNavigationOptions {
  /** Shortcuts to register */
  shortcuts?: KeyboardShortcut[];
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Callback when focus moves to a new element */
  onFocusChange?: (element: HTMLElement) => void;
}

export interface UseKeyboardNavigationReturn {
  /** Register a new shortcut */
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  /** Unregister a shortcut */
  unregisterShortcut: (key: string) => void;
  /** Focus the next focusable element */
  focusNext: () => void;
  /** Focus the previous focusable element */
  focusPrevious: () => void;
  /** Focus a specific element by selector */
  focusElement: (selector: string) => void;
  /** Get all registered shortcuts */
  getShortcuts: () => KeyboardShortcut[];
}

// =============================================================================
// Constants
// =============================================================================

/** Selector for focusable elements */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([disabled])',
  '[role="option"]',
  '[role="menuitem"]',
].join(', ');

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a key combination string into its components
 */
function parseKeyCombo(combo: string): {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
} {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  
  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
  };
}

/**
 * Check if a keyboard event matches a key combination
 */
function matchesKeyCombo(event: KeyboardEvent, combo: string): boolean {
  const parsed = parseKeyCombo(combo);
  const eventKey = event.key.toLowerCase();
  
  // Handle special keys
  const keyMatches = 
    eventKey === parsed.key ||
    event.code.toLowerCase() === parsed.key ||
    event.code.toLowerCase() === `key${parsed.key}`;
  
  return (
    keyMatches &&
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta
  );
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => {
      // Check if element is visible
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        el.offsetParent !== null
      );
    });
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing keyboard navigation and shortcuts in the chat interface
 * 
 * @example
 * ```tsx
 * const { registerShortcut, focusNext } = useKeyboardNavigation({
 *   shortcuts: [
 *     { key: 'ctrl+n', description: 'New chat', action: handleNewChat },
 *     { key: 'escape', description: 'Close sidebar', action: closeSidebar },
 *   ],
 * });
 * ```
 */
export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn {
  const { shortcuts: initialShortcuts = [], enabled = true, onFocusChange } = options;
  
  // Store shortcuts in a ref to avoid re-renders
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map());
  
  // Initialize shortcuts
  useEffect(() => {
    initialShortcuts.forEach(shortcut => {
      shortcutsRef.current.set(shortcut.key.toLowerCase(), shortcut);
    });
  }, [initialShortcuts]);
  
  // Register a new shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current.set(shortcut.key.toLowerCase(), shortcut);
  }, []);
  
  // Unregister a shortcut
  const unregisterShortcut = useCallback((key: string) => {
    shortcutsRef.current.delete(key.toLowerCase());
  }, []);
  
  // Get all shortcuts
  const getShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.values());
  }, []);
  
  // Focus the next focusable element
  const focusNext = useCallback(() => {
    const focusable = getFocusableElements();
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusable.length;
    const nextElement = focusable[nextIndex];
    
    if (nextElement) {
      nextElement.focus();
      onFocusChange?.(nextElement);
    }
  }, [onFocusChange]);
  
  // Focus the previous focusable element
  const focusPrevious = useCallback(() => {
    const focusable = getFocusableElements();
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
    const prevElement = focusable[prevIndex];
    
    if (prevElement) {
      prevElement.focus();
      onFocusChange?.(prevElement);
    }
  }, [onFocusChange]);
  
  // Focus a specific element by selector
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.focus();
      onFocusChange?.(element);
    }
  }, [onFocusChange]);
  
  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs (unless it's Escape)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      // Check each registered shortcut
      for (const [key, shortcut] of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        
        if (matchesKeyCombo(event, key)) {
          // Allow Escape in inputs, but not other shortcuts
          if (isInput && key !== 'escape') continue;
          
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
  
  return {
    registerShortcut,
    unregisterShortcut,
    focusNext,
    focusPrevious,
    focusElement,
    getShortcuts,
  };
}

// =============================================================================
// Default Chat Shortcuts
// =============================================================================

/**
 * Default keyboard shortcuts for the chat interface
 */
export const DEFAULT_CHAT_SHORTCUTS = {
  NEW_CHAT: 'ctrl+n',
  FOCUS_INPUT: 'ctrl+/',
  TOGGLE_LEFT_SIDEBAR: 'ctrl+b',
  TOGGLE_RIGHT_SIDEBAR: 'ctrl+.',
  CLOSE_MODAL: 'escape',
  SEND_MESSAGE: 'enter',
  NEWLINE: 'shift+enter',
} as const;

/**
 * Get shortcut descriptions for help display
 */
export function getShortcutDescriptions(): { key: string; description: string }[] {
  return [
    { key: 'Ctrl + N', description: 'Start a new chat' },
    { key: 'Ctrl + /', description: 'Focus the message input' },
    { key: 'Ctrl + B', description: 'Toggle conversation sidebar' },
    { key: 'Ctrl + .', description: 'Toggle tools sidebar' },
    { key: 'Escape', description: 'Close modal or sidebar' },
    { key: 'Enter', description: 'Send message' },
    { key: 'Shift + Enter', description: 'New line in message' },
    { key: 'Tab', description: 'Navigate to next element' },
    { key: 'Shift + Tab', description: 'Navigate to previous element' },
  ];
}
