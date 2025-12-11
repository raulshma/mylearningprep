/**
 * Conversation Cache Service
 *
 * Provides caching for recently viewed conversations to optimize
 * conversation switching performance.
 *
 * Requirements: 10.4 - Display new conversation within 200ms
 */

import type { Conversation, Message } from '@/lib/store/chat/types';

// =============================================================================
// Types
// =============================================================================

interface CachedConversation {
  conversation: Conversation;
  messages: Message[];
  cachedAt: number;
  accessedAt: number;
}

interface CacheConfig {
  /** Maximum number of conversations to cache */
  maxSize: number;
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl: number;
}

// =============================================================================
// LRU Cache Implementation
// =============================================================================

/**
 * LRU (Least Recently Used) cache for conversations
 * Automatically evicts least recently accessed items when full
 */
class ConversationLRUCache {
  private cache: Map<string, CachedConversation>;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = {
      maxSize: config.maxSize ?? 10,
      ttl: config.ttl ?? 5 * 60 * 1000, // 5 minutes default
    };
  }

  /**
   * Get a cached conversation by ID
   * Updates access time on hit
   */
  get(id: string): CachedConversation | null {
    const cached = this.cache.get(id);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - cached.cachedAt > this.config.ttl) {
      this.cache.delete(id);
      return null;
    }

    // Update access time (LRU tracking)
    cached.accessedAt = now;
    
    // Move to end of Map (most recently used)
    this.cache.delete(id);
    this.cache.set(id, cached);

    return cached;
  }

  /**
   * Cache a conversation with its messages
   */
  set(id: string, conversation: Conversation, messages: Message[]): void {
    const now = Date.now();

    // If already exists, update it
    if (this.cache.has(id)) {
      this.cache.delete(id);
    }

    // Evict LRU items if at capacity
    while (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(id, {
      conversation,
      messages,
      cachedAt: now,
      accessedAt: now,
    });
  }

  /**
   * Update cached conversation metadata without replacing messages
   */
  updateConversation(id: string, updates: Partial<Conversation>): void {
    const cached = this.cache.get(id);
    if (cached) {
      cached.conversation = { ...cached.conversation, ...updates };
      cached.accessedAt = Date.now();
    }
  }

  /**
   * Update cached messages for a conversation
   */
  updateMessages(id: string, messages: Message[]): void {
    const cached = this.cache.get(id);
    if (cached) {
      cached.messages = messages;
      cached.accessedAt = Date.now();
    }
  }

  /**
   * Add a message to cached conversation
   */
  addMessage(id: string, message: Message): void {
    const cached = this.cache.get(id);
    if (cached) {
      cached.messages = [...cached.messages, message];
      cached.accessedAt = Date.now();
    }
  }

  /**
   * Check if a conversation is cached
   */
  has(id: string): boolean {
    const cached = this.cache.get(id);
    if (!cached) return false;
    
    // Check expiration
    if (Date.now() - cached.cachedAt > this.config.ttl) {
      this.cache.delete(id);
      return false;
    }
    
    return true;
  }

  /**
   * Remove a conversation from cache
   */
  delete(id: string): boolean {
    return this.cache.delete(id);
  }

  /**
   * Clear all cached conversations
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
    };
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    
    for (const [id, cached] of this.cache.entries()) {
      if (now - cached.cachedAt > this.config.ttl) {
        this.cache.delete(id);
        pruned++;
      }
    }
    
    return pruned;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Global conversation cache instance
 * Caches up to 10 recently viewed conversations for 5 minutes
 */
export const conversationCache = new ConversationLRUCache({
  maxSize: 10,
  ttl: 5 * 60 * 1000, // 5 minutes
});

// =============================================================================
// Cache Service Interface
// =============================================================================

export interface ConversationCacheService {
  /**
   * Get cached conversation data
   * Returns null if not cached or expired
   */
  getCached(id: string): { conversation: Conversation; messages: Message[] } | null;

  /**
   * Cache conversation data
   */
  cache(id: string, conversation: Conversation, messages: Message[]): void;

  /**
   * Update cached conversation metadata
   */
  updateConversation(id: string, updates: Partial<Conversation>): void;

  /**
   * Update cached messages
   */
  updateMessages(id: string, messages: Message[]): void;

  /**
   * Add message to cached conversation
   */
  addMessage(id: string, message: Message): void;

  /**
   * Check if conversation is cached
   */
  isCached(id: string): boolean;

  /**
   * Invalidate cached conversation
   */
  invalidate(id: string): void;

  /**
   * Clear all cache
   */
  clearAll(): void;

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number };
}

/**
 * Conversation cache service implementation
 */
export const conversationCacheService: ConversationCacheService = {
  getCached(id: string) {
    const cached = conversationCache.get(id);
    if (!cached) return null;
    return {
      conversation: cached.conversation,
      messages: cached.messages,
    };
  },

  cache(id: string, conversation: Conversation, messages: Message[]) {
    conversationCache.set(id, conversation, messages);
  },

  updateConversation(id: string, updates: Partial<Conversation>) {
    conversationCache.updateConversation(id, updates);
  },

  updateMessages(id: string, messages: Message[]) {
    conversationCache.updateMessages(id, messages);
  },

  addMessage(id: string, message: Message) {
    conversationCache.addMessage(id, message);
  },

  isCached(id: string) {
    return conversationCache.has(id);
  },

  invalidate(id: string) {
    conversationCache.delete(id);
  },

  clearAll() {
    conversationCache.clear();
  },

  getStats() {
    return conversationCache.getStats();
  },
};

// Export the LRU cache class for testing
export { ConversationLRUCache };
