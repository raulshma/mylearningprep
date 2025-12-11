/**
 * Conversation Switch Hook
 *
 * Provides optimized conversation switching with caching for
 * fast conversation switches (< 200ms target).
 *
 * Requirements: 10.4 - Display new conversation within 200ms
 */

import { useCallback, useRef } from 'react';
import { useChatStore } from '@/lib/store/chat';
import { conversationCacheService, persistenceService } from '@/lib/services/chat';
import type { Conversation, Message } from '@/lib/store/chat/types';

// =============================================================================
// Types
// =============================================================================

export interface ConversationSwitchResult {
  success: boolean;
  fromCache: boolean;
  loadTimeMs: number;
  error?: string;
}

export interface UseConversationSwitchOptions {
  /** Callback when switch starts */
  onSwitchStart?: (conversationId: string) => void;
  /** Callback when switch completes */
  onSwitchComplete?: (result: ConversationSwitchResult) => void;
  /** Callback when switch fails */
  onSwitchError?: (error: Error) => void;
}

export interface UseConversationSwitchReturn {
  /** Switch to a conversation by ID */
  switchToConversation: (conversationId: string) => Promise<ConversationSwitchResult>;
  /** Preload a conversation into cache */
  preloadConversation: (conversationId: string) => Promise<void>;
  /** Check if a conversation is cached */
  isConversationCached: (conversationId: string) => boolean;
  /** Invalidate cached conversation */
  invalidateCache: (conversationId: string) => void;
  /** Clear all cache */
  clearCache: () => void;
  /** Whether a switch is in progress */
  isSwitching: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for optimized conversation switching with caching
 */
export function useConversationSwitch(
  options: UseConversationSwitchOptions = {}
): UseConversationSwitchReturn {
  const { onSwitchStart, onSwitchComplete, onSwitchError } = options;
  
  const isSwitchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get store actions
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const setConversationsLoading = useChatStore((state) => state.setConversationsLoading);

  /**
   * Switch to a conversation, using cache if available
   */
  const switchToConversation = useCallback(
    async (conversationId: string): Promise<ConversationSwitchResult> => {
      const startTime = performance.now();
      
      // Cancel any in-progress switch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      isSwitchingRef.current = true;
      onSwitchStart?.(conversationId);

      try {
        // Check cache first for fast switch
        const cached = conversationCacheService.getCached(conversationId);
        
        if (cached) {
          // Cache hit - immediate switch
          setActiveConversation(conversationId);
          loadMessages(conversationId, cached.messages);
          
          const loadTimeMs = performance.now() - startTime;
          const result: ConversationSwitchResult = {
            success: true,
            fromCache: true,
            loadTimeMs,
          };
          
          onSwitchComplete?.(result);
          isSwitchingRef.current = false;
          
          // Refresh from server in background (stale-while-revalidate)
          refreshConversationInBackground(conversationId);
          
          return result;
        }

        // Cache miss - load from server
        setConversationsLoading(true);
        
        const data = await persistenceService.loadConversation(conversationId);
        
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          return {
            success: false,
            fromCache: false,
            loadTimeMs: performance.now() - startTime,
            error: 'Switch cancelled',
          };
        }

        if (!data) {
          throw new Error('Conversation not found');
        }

        // Update store
        setActiveConversation(conversationId);
        loadMessages(conversationId, data.messages);
        
        // Cache for future switches
        conversationCacheService.cache(conversationId, data.conversation, data.messages);
        
        setConversationsLoading(false);
        
        const loadTimeMs = performance.now() - startTime;
        const result: ConversationSwitchResult = {
          success: true,
          fromCache: false,
          loadTimeMs,
        };
        
        onSwitchComplete?.(result);
        isSwitchingRef.current = false;
        
        return result;
      } catch (error) {
        setConversationsLoading(false);
        isSwitchingRef.current = false;
        
        const err = error instanceof Error ? error : new Error(String(error));
        onSwitchError?.(err);
        
        return {
          success: false,
          fromCache: false,
          loadTimeMs: performance.now() - startTime,
          error: err.message,
        };
      }
    },
    // Note: refreshConversationInBackground is intentionally not in deps
    // as it's a fire-and-forget background operation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setActiveConversation, loadMessages, setConversationsLoading, onSwitchStart, onSwitchComplete, onSwitchError]
  );

  /**
   * Refresh conversation data in background without blocking UI
   */
  const refreshConversationInBackground = useCallback(
    async (conversationId: string) => {
      try {
        const data = await persistenceService.loadConversation(conversationId);
        if (data) {
          // Update cache with fresh data
          conversationCacheService.cache(conversationId, data.conversation, data.messages);
          
          // Update store if still viewing this conversation
          const currentActiveId = useChatStore.getState().conversations.activeId;
          if (currentActiveId === conversationId) {
            loadMessages(conversationId, data.messages);
          }
        }
      } catch (error) {
        // Silent fail for background refresh
        console.warn('Background conversation refresh failed:', error);
      }
    },
    [loadMessages]
  );

  /**
   * Preload a conversation into cache
   */
  const preloadConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      // Skip if already cached
      if (conversationCacheService.isCached(conversationId)) {
        return;
      }

      try {
        const data = await persistenceService.loadConversation(conversationId);
        if (data) {
          conversationCacheService.cache(conversationId, data.conversation, data.messages);
        }
      } catch (error) {
        // Silent fail for preload
        console.warn('Conversation preload failed:', error);
      }
    },
    []
  );

  /**
   * Check if a conversation is cached
   */
  const isConversationCached = useCallback(
    (conversationId: string): boolean => {
      return conversationCacheService.isCached(conversationId);
    },
    []
  );

  /**
   * Invalidate cached conversation
   */
  const invalidateCache = useCallback(
    (conversationId: string): void => {
      conversationCacheService.invalidate(conversationId);
    },
    []
  );

  /**
   * Clear all cache
   */
  const clearCache = useCallback((): void => {
    conversationCacheService.clearAll();
  }, []);

  return {
    switchToConversation,
    preloadConversation,
    isConversationCached,
    invalidateCache,
    clearCache,
    isSwitching: isSwitchingRef.current,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Update cache when a message is added to a conversation
 * Call this after successfully sending/receiving a message
 */
export function updateCacheWithMessage(conversationId: string, message: Message): void {
  conversationCacheService.addMessage(conversationId, message);
}

/**
 * Update cache when conversation metadata changes
 */
export function updateCacheWithConversation(
  conversationId: string,
  updates: Partial<Conversation>
): void {
  conversationCacheService.updateConversation(conversationId, updates);
}

/**
 * Invalidate cache when conversation is deleted
 */
export function invalidateCacheOnDelete(conversationId: string): void {
  conversationCacheService.invalidate(conversationId);
}
