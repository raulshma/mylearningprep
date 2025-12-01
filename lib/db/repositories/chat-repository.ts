import { ObjectId } from "mongodb";
import { getTopicChatsCollection } from "../collections";
import type { TopicChat, ChatMessage } from "../schemas/chat";

export interface ChatRepository {
  findOrCreate(
    interviewId: string,
    topicId: string,
    userId: string
  ): Promise<TopicChat>;
  addMessage(
    interviewId: string,
    topicId: string,
    message: ChatMessage
  ): Promise<void>;
  addMessages(
    interviewId: string,
    topicId: string,
    messages: ChatMessage[]
  ): Promise<void>;
  getMessages(interviewId: string, topicId: string): Promise<ChatMessage[]>;
}

export const chatRepository: ChatRepository = {
  async findOrCreate(interviewId, topicId, userId) {
    const collection = await getTopicChatsCollection();
    const now = new Date();

    // Try to find existing chat
    const existing = await collection.findOne({ interviewId, topicId });
    if (existing) {
      return existing as TopicChat;
    }

    // Create new chat
    const id = new ObjectId().toString();
    const chat: TopicChat = {
      _id: id,
      interviewId,
      topicId,
      userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(chat);
    return chat;
  },

  async addMessage(interviewId, topicId, message) {
    const collection = await getTopicChatsCollection();
    const now = new Date();

    await collection.updateOne(
      { interviewId, topicId },
      {
         
        $push: { messages: message } as any,
        $set: { updatedAt: now },
      }
    );
  },

  async addMessages(interviewId, topicId, messages) {
    const collection = await getTopicChatsCollection();
    const now = new Date();

    await collection.updateOne(
      { interviewId, topicId },
      {
         
        $push: { messages: { $each: messages } } as any,
        $set: { updatedAt: now },
      }
    );
  },

  async getMessages(interviewId, topicId) {
    const collection = await getTopicChatsCollection();
    const chat = await collection.findOne({ interviewId, topicId });
    return (chat?.messages as ChatMessage[]) ?? [];
  },
};
