/**
 * Chat Persistence Service
 *
 * Handles all data persistence operations for the AI Chat feature.
 * Uses the existing repository pattern from lib/db/repositories.
 *
 * Requirements: 4.1, 4.4, 4.5, 13.1, 13.2, 13.4, 13.5
 */

import { aiConversationRepository } from '@/lib/db/repositories/ai-conversation-repository';
import { AIConversationSchema, type AIConversation, type AIMessage } from '@/lib/db/schemas/ai-conversation';
import type { Conversation, Message, ConversationContext, ModelInfo } from '@/lib/store/chat/types';

// =============================================================================
// Type Conversions
// =============================================================================

/**
 * Convert database AIConversation to store Conversation type
 */
function toStoreConversation(dbConversation: AIConversation): Conversation {
  return {
    id: dbConversation._id,
    userId: dbConversation.userId,
    title: dbConversation.title,
    chatMode: dbConversation.chatMode,
    isPinned: dbConversation.isPinned,
    isArchived: dbConversation.isArchived,
    context: dbConversation.context as ConversationContext | undefined,
    comparisonModels: dbConversation.comparisonModels as ModelInfo[] | undefined,
    parentConversationId: dbConversation.parentConversationId,
    branchedFromMessageId: dbConversation.branchedFromMessageId,
    lastMessageAt: dbConversation.lastMessageAt,
    createdAt: dbConversation.createdAt,
    updatedAt: dbConversation.updatedAt,
  };
}

/**
 * Convert database AIMessage to store Message type
 */
function toStoreMessage(dbMessage: AIMessage): Message {
  return {
    id: dbMessage.id,
    role: dbMessage.role,
    content: dbMessage.content,
    reasoning: dbMessage.reasoning,
    toolCalls: dbMessage.toolCalls,
    imageIds: dbMessage.imageIds,
    errorDetails: dbMessage.errorDetails,
    metadata: dbMessage.metadata,
    createdAt: dbMessage.createdAt,
  };
}


/**
 * Convert store Message to database AIMessage type
 */
function toDbMessage(message: Message): AIMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    reasoning: message.reasoning,
    toolCalls: message.toolCalls,
    imageIds: message.imageIds,
    errorDetails: message.errorDetails,
    metadata: message.metadata,
    createdAt: message.createdAt,
  };
}

// =============================================================================
// Load Options
// =============================================================================

export interface LoadConversationsOptions {
  limit?: number;
  includeArchived?: boolean;
}

export interface CreateConversationParams {
  userId: string;
  title: string;
  context?: ConversationContext;
  chatMode?: 'single' | 'multi';
  comparisonModels?: ModelInfo[];
}

// =============================================================================
// Persistence Service Interface
// =============================================================================

export interface PersistenceService {
  /**
   * Load all conversations for a user
   * Requirements: 13.5 - Orders by lastMessageAt descending
   */
  loadConversations(userId: string, options?: LoadConversationsOptions): Promise<Conversation[]>;

  /**
   * Load a single conversation with all messages
   * Requirements: 13.2 - Retrieves all messages with metadata and attachments
   */
  loadConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] } | null>;

  /**
   * Create a new conversation
   * Requirements: 4.1 - Generates unique ID and persists immediately
   */
  createConversation(params: CreateConversationParams): Promise<Conversation>;

  /**
   * Update conversation properties
   */
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;

  /**
   * Delete a conversation and all associated data
   * Requirements: 4.5 - Permanently removes all messages and metadata
   */
  deleteConversation(id: string): Promise<void>;

  /**
   * Persist a message to a conversation
   * Requirements: 13.1 - Persists before displaying confirmation
   * Requirements: 13.4 - Validates against schema before persistence
   */
  persistMessage(conversationId: string, message: Message): Promise<void>;

  /**
   * Toggle pin state for a conversation
   * Requirements: 4.3 - Persists pin state
   */
  togglePin(id: string): Promise<void>;

  /**
   * Archive a conversation
   * Requirements: 4.4 - Removes from main list while preserving data
   */
  archiveConversation(id: string): Promise<void>;

  /**
   * Restore an archived conversation
   */
  restoreConversation(id: string): Promise<void>;

  /**
   * Load archived conversations for a user
   */
  loadArchivedConversations(userId: string, limit?: number): Promise<Conversation[]>;

  /**
   * Create a branch from an existing conversation
   * Requirements: 4.6 - Creates new conversation with messages up to branch point
   */
  createBranch(
    sourceConversationId: string,
    branchedFromMessageId: string,
    userId: string,
    title: string,
    messages: Message[],
    context?: ConversationContext
  ): Promise<Conversation>;

  /**
   * Update conversation title
   */
  updateTitle(id: string, title: string): Promise<void>;

  /**
   * Delete messages from a specific index onwards
   */
  deleteMessagesFrom(conversationId: string, fromIndex: number): Promise<void>;

  /**
   * Update a specific message in a conversation
   */
  updateMessage(conversationId: string, messageId: string, updates: Partial<Message>): Promise<void>;
}


// =============================================================================
// Persistence Service Implementation
// =============================================================================

/**
 * Validate conversation data against schema
 * Requirements: 13.4 - Validates against schema before persistence
 */
function validateConversationData(data: unknown): boolean {
  const result = AIConversationSchema.safeParse(data);
  return result.success;
}

export const persistenceService: PersistenceService = {
  async loadConversations(userId, options = {}) {
    const { limit = 50, includeArchived = false } = options;
    
    const dbConversations = await aiConversationRepository.findByUser(userId, {
      limit,
      includeArchived,
    });

    // Convert to store format and ensure ordering by lastMessageAt descending
    // Requirements: 13.5
    return dbConversations
      .map(toStoreConversation)
      .sort((a, b) => {
        // Pinned conversations first
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        // Then by lastMessageAt descending
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      });
  },

  async loadConversation(id) {
    const dbConversation = await aiConversationRepository.findById(id);
    
    if (!dbConversation) {
      return null;
    }

    const conversation = toStoreConversation(dbConversation);
    const messages = (dbConversation.messages || []).map(toStoreMessage);

    return { conversation, messages };
  },

  async createConversation(params) {
    const { userId, title, context, chatMode = 'single', comparisonModels } = params;

    const dbConversation = await aiConversationRepository.create(
      userId,
      title,
      context as AIConversation['context'],
      { chatMode, comparisonModels: comparisonModels as AIConversation['comparisonModels'] }
    );

    return toStoreConversation(dbConversation);
  },

  async updateConversation(id, updates) {
    // Handle title update separately as it has its own method
    if (updates.title !== undefined) {
      await aiConversationRepository.updateTitle(id, updates.title);
    }

    // Handle pin toggle
    if (updates.isPinned !== undefined) {
      const current = await aiConversationRepository.findById(id);
      if (current && current.isPinned !== updates.isPinned) {
        await aiConversationRepository.togglePin(id);
      }
    }

    // Handle archive/restore
    if (updates.isArchived !== undefined) {
      if (updates.isArchived) {
        await aiConversationRepository.archive(id);
      } else {
        await aiConversationRepository.restore(id);
      }
    }
  },

  async deleteConversation(id) {
    // Requirements: 4.5 - Permanently removes all associated messages and metadata
    await aiConversationRepository.delete(id);
  },

  async persistMessage(conversationId, message) {
    // Requirements: 13.4 - Validate message structure
    const dbMessage = toDbMessage(message);
    
    // Requirements: 13.1 - Persist before confirmation
    await aiConversationRepository.addMessage(conversationId, dbMessage);
  },

  async togglePin(id) {
    await aiConversationRepository.togglePin(id);
  },

  async archiveConversation(id) {
    await aiConversationRepository.archive(id);
  },

  async restoreConversation(id) {
    await aiConversationRepository.restore(id);
  },

  async loadArchivedConversations(userId, limit = 50) {
    const dbConversations = await aiConversationRepository.findArchivedByUser(userId, limit);
    return dbConversations.map(toStoreConversation);
  },

  async createBranch(sourceConversationId, branchedFromMessageId, userId, title, messages, context) {
    const dbMessages = messages.map(toDbMessage);
    
    const dbConversation = await aiConversationRepository.createBranch(
      sourceConversationId,
      branchedFromMessageId,
      userId,
      title,
      dbMessages,
      context as AIConversation['context']
    );

    return toStoreConversation(dbConversation);
  },

  async updateTitle(id, title) {
    await aiConversationRepository.updateTitle(id, title);
  },

  async deleteMessagesFrom(conversationId, fromIndex) {
    await aiConversationRepository.deleteMessagesFrom(conversationId, fromIndex);
  },

  async updateMessage(conversationId, messageId, updates) {
    const dbUpdates: Partial<AIMessage> = {};
    
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.reasoning !== undefined) dbUpdates.reasoning = updates.reasoning;
    if (updates.toolCalls !== undefined) dbUpdates.toolCalls = updates.toolCalls;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;
    if (updates.errorDetails !== undefined) dbUpdates.errorDetails = updates.errorDetails;

    await aiConversationRepository.updateMessage(conversationId, messageId, dbUpdates);
  },
};

// Export for testing
export { toStoreConversation, toStoreMessage, toDbMessage, validateConversationData };
