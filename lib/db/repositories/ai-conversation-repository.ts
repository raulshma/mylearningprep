import { ObjectId } from "mongodb";
import { cache } from "react";
import { getAIConversationsCollection } from "../collections";
import type { AIConversation, AIMessage } from "../schemas/ai-conversation";

export interface AIConversationRepository {
  create(
    userId: string,
    title: string,
    context?: AIConversation["context"]
  ): Promise<AIConversation>;
  findById(id: string): Promise<AIConversation | null>;
  findByUser(
    userId: string,
    options?: { limit?: number; includeArchived?: boolean }
  ): Promise<AIConversation[]>;
  updateTitle(id: string, title: string): Promise<void>;
  addMessage(id: string, message: AIMessage): Promise<void>;
  addMessages(id: string, messages: AIMessage[]): Promise<void>;
  updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<AIMessage>
  ): Promise<void>;
  togglePin(id: string): Promise<void>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  findArchivedByUser(userId: string, limit?: number): Promise<AIConversation[]>;
  getRecentConversations(
    userId: string,
    limit?: number
  ): Promise<AIConversation[]>;
}

export const aiConversationRepository: AIConversationRepository = {
  create: cache(async (userId, title, context) => {
    const collection = await getAIConversationsCollection();
    const now = new Date();

    const conversation: AIConversation = {
      _id: new ObjectId().toString(),
      userId,
      title,
      messages: [],
      context,
      isPinned: false,
      isArchived: false,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(conversation);
    return conversation;
  }),

  findById: cache(async (id) => {
    const collection = await getAIConversationsCollection();
    const conversation = await collection.findOne({ _id: id });
    return conversation as AIConversation | null;
  }),

  findByUser: cache(async (userId, options = {}) => {
    const collection = await getAIConversationsCollection();
    const { limit = 50, includeArchived = false } = options;

    const query: Record<string, unknown> = { userId };
    if (!includeArchived) {
      query.isArchived = false;
    }

    const conversations = await collection
      .find(query)
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .limit(limit)
      .toArray();

    return conversations as AIConversation[];
  }),

  async updateTitle(id, title) {
    const collection = await getAIConversationsCollection();
    await collection.updateOne(
      { _id: id },
      { $set: { title, updatedAt: new Date() } }
    );
  },

  async addMessage(id, message) {
    const collection = await getAIConversationsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: id },
      {
         
        $push: { messages: message } as any,
        $set: { lastMessageAt: now, updatedAt: now },
      }
    );
  },

  async addMessages(id, messages) {
    const collection = await getAIConversationsCollection();
    const now = new Date();

    await collection.updateOne(
      { _id: id },
      {
         
        $push: { messages: { $each: messages } } as any,
        $set: { lastMessageAt: now, updatedAt: now },
      }
    );
  },

  async updateMessage(conversationId, messageId, updates) {
    const collection = await getAIConversationsCollection();

    // Build update object for nested array element
    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      setFields[`messages.$[msg].${key}`] = value;
    }
    setFields.updatedAt = new Date();

    await collection.updateOne(
      { _id: conversationId },
      { $set: setFields },
      { arrayFilters: [{ "msg.id": messageId }] }
    );
  },

  async togglePin(id) {
    const collection = await getAIConversationsCollection();
    const conversation = await collection.findOne({ _id: id });
    if (conversation) {
      await collection.updateOne(
        { _id: id },
        { $set: { isPinned: !conversation.isPinned, updatedAt: new Date() } }
      );
    }
  },

  async archive(id) {
    const collection = await getAIConversationsCollection();
    await collection.updateOne(
      { _id: id },
      { $set: { isArchived: true, updatedAt: new Date() } }
    );
  },

  async restore(id) {
    const collection = await getAIConversationsCollection();
    await collection.updateOne(
      { _id: id },
      { $set: { isArchived: false, updatedAt: new Date() } }
    );
  },

  async delete(id) {
    const collection = await getAIConversationsCollection();
    await collection.deleteOne({ _id: id });
  },

  getRecentConversations: cache(async (userId, limit = 10) => {
    const collection = await getAIConversationsCollection();
    const conversations = await collection
      .find({ userId, isArchived: false })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .toArray();

    return conversations as AIConversation[];
  }),

  findArchivedByUser: cache(async (userId, limit = 50) => {
    const collection = await getAIConversationsCollection();
    const conversations = await collection
      .find({ userId, isArchived: true })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .toArray();

    return conversations as AIConversation[];
  }),
};
