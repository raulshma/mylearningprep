"use client";

/**
 * ARIA Live Region Component
 * 
 * Provides accessible announcements for screen readers when dynamic content changes.
 * Implements ARIA live regions for loading states, errors, and new messages.
 * 
 * Requirements: 14.2 - Announce new messages and status changes
 * Requirements: 14.4 - Communicate loading progress to assistive technologies
 * Requirements: 14.5 - Announce errors to screen reader users
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, memo, type ReactNode } from "react";

// =============================================================================
// Types
// =============================================================================

export type AriaLivePoliteness = "polite" | "assertive" | "off";

export interface Announcement {
  /** Unique ID for the announcement */
  id: string;
  /** Message to announce */
  message: string;
  /** Politeness level */
  politeness: AriaLivePoliteness;
  /** Timestamp when announced */
  timestamp: number;
}

export interface AriaLiveContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, politeness?: AriaLivePoliteness) => void;
  /** Announce a polite message (non-interrupting) */
  announcePolite: (message: string) => void;
  /** Announce an assertive message (interrupting) */
  announceAssertive: (message: string) => void;
  /** Clear all announcements */
  clearAnnouncements: () => void;
}

// =============================================================================
// Context
// =============================================================================

const AriaLiveContext = createContext<AriaLiveContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface AriaLiveProviderProps {
  children: ReactNode;
  /** Delay before clearing announcements (ms) */
  clearDelay?: number;
}

/**
 * Provider component that manages ARIA live region announcements
 * 
 * @example
 * ```tsx
 * <AriaLiveProvider>
 *   <App />
 * </AriaLiveProvider>
 * ```
 */
export function AriaLiveProvider({ 
  children, 
  clearDelay = 1000 
}: AriaLiveProviderProps) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear announcements after delay
  const scheduleClear = useCallback(() => {
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }
    clearTimeoutRef.current = setTimeout(() => {
      setPoliteMessage("");
      setAssertiveMessage("");
    }, clearDelay);
  }, [clearDelay]);
  
  // Announce a message
  const announce = useCallback((message: string, politeness: AriaLivePoliteness = "polite") => {
    if (politeness === "off" || !message) return;
    
    if (politeness === "assertive") {
      setAssertiveMessage(message);
    } else {
      setPoliteMessage(message);
    }
    
    scheduleClear();
  }, [scheduleClear]);
  
  // Convenience methods
  const announcePolite = useCallback((message: string) => {
    announce(message, "polite");
  }, [announce]);
  
  const announceAssertive = useCallback((message: string) => {
    announce(message, "assertive");
  }, [announce]);
  
  // Clear all announcements
  const clearAnnouncements = useCallback(() => {
    setPoliteMessage("");
    setAssertiveMessage("");
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);
  
  const value: AriaLiveContextValue = {
    announce,
    announcePolite,
    announceAssertive,
    clearAnnouncements,
  };
  
  return (
    <AriaLiveContext.Provider value={value}>
      {children}
      {/* Polite live region - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive live region - for urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AriaLiveContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access ARIA live region announcements
 * 
 * @example
 * ```tsx
 * const { announce, announceAssertive } = useAriaLive();
 * 
 * // Announce loading state
 * announce("Loading messages...");
 * 
 * // Announce error (urgent)
 * announceAssertive("Error: Failed to send message");
 * ```
 */
export function useAriaLive(): AriaLiveContextValue {
  const context = useContext(AriaLiveContext);
  
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      announce: () => {},
      announcePolite: () => {},
      announceAssertive: () => {},
      clearAnnouncements: () => {},
    };
  }
  
  return context;
}

// =============================================================================
// Standalone Live Region Component
// =============================================================================

interface LiveRegionProps {
  /** Message to announce */
  message: string;
  /** Politeness level */
  politeness?: AriaLivePoliteness;
  /** Whether to use role="alert" for assertive announcements */
  useAlert?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Standalone ARIA live region component
 * Use when you need a dedicated live region for a specific component
 */
export const LiveRegion = memo(function LiveRegion({
  message,
  politeness = "polite",
  useAlert = false,
  className = "sr-only",
}: LiveRegionProps) {
  const role = useAlert && politeness === "assertive" ? "alert" : "status";
  
  return (
    <div
      role={role}
      aria-live={politeness}
      aria-atomic="true"
      className={className}
    >
      {message}
    </div>
  );
});

// =============================================================================
// Loading Announcer Component
// =============================================================================

interface LoadingAnnouncerProps {
  /** Whether loading is in progress */
  isLoading: boolean;
  /** Message to announce when loading starts */
  loadingMessage?: string;
  /** Message to announce when loading completes */
  completeMessage?: string;
}

/**
 * Component that announces loading state changes
 * 
 * Requirements: 14.4 - Communicate loading progress to assistive technologies
 */
export const LoadingAnnouncer = memo(function LoadingAnnouncer({
  isLoading,
  loadingMessage = "Loading...",
  completeMessage = "Loading complete",
}: LoadingAnnouncerProps) {
  const { announcePolite } = useAriaLive();
  const wasLoadingRef = useRef(false);
  
  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      announcePolite(loadingMessage);
    } else if (!isLoading && wasLoadingRef.current) {
      announcePolite(completeMessage);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, loadingMessage, completeMessage, announcePolite]);
  
  return null;
});

// =============================================================================
// Error Announcer Component
// =============================================================================

interface ErrorAnnouncerProps {
  /** Error message to announce */
  error: string | null | undefined;
  /** Prefix for the error message */
  prefix?: string;
}

/**
 * Component that announces errors to screen readers
 * 
 * Requirements: 14.5 - Announce errors to screen reader users
 */
export const ErrorAnnouncer = memo(function ErrorAnnouncer({
  error,
  prefix = "Error:",
}: ErrorAnnouncerProps) {
  const { announceAssertive } = useAriaLive();
  const previousErrorRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (error && error !== previousErrorRef.current) {
      announceAssertive(`${prefix} ${error}`);
    }
    previousErrorRef.current = error ?? null;
  }, [error, prefix, announceAssertive]);
  
  return null;
});

// =============================================================================
// Message Announcer Component
// =============================================================================

interface MessageAnnouncerProps {
  /** Number of messages */
  messageCount: number;
  /** Whether a new message was received */
  hasNewMessage?: boolean;
  /** Role of the last message sender */
  lastMessageRole?: "user" | "assistant";
}

/**
 * Component that announces new messages
 * 
 * Requirements: 14.2 - Announce new messages and status changes
 */
export const MessageAnnouncer = memo(function MessageAnnouncer({
  messageCount,
  hasNewMessage = false,
  lastMessageRole,
}: MessageAnnouncerProps) {
  const { announcePolite } = useAriaLive();
  const previousCountRef = useRef(messageCount);
  
  useEffect(() => {
    if (messageCount > previousCountRef.current && hasNewMessage) {
      const sender = lastMessageRole === "assistant" ? "AI assistant" : "You";
      announcePolite(`New message from ${sender}`);
    }
    previousCountRef.current = messageCount;
  }, [messageCount, hasNewMessage, lastMessageRole, announcePolite]);
  
  return null;
});

export default AriaLiveProvider;
