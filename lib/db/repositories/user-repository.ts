import { ObjectId } from 'mongodb';
import { cache } from 'react';
import { getUsersCollection } from '../collections';
import {
  User,
  UserPlan,
  CreateUser,
  UserPreferences,
  GenerationPreferences,
  PixelPetPreferences,
  PixelPetId,
  PixelPetEdge,
  PixelPetOffset,
} from '../schemas/user';

export interface UserRepository {
  create(data: Omit<CreateUser, 'iterations' | 'interviews'> & { iterations?: Partial<CreateUser['iterations']>; interviews?: Partial<NonNullable<CreateUser['interviews']>> }): Promise<User>;
  findByClerkId(clerkId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<User | null>;
  updatePlan(clerkId: string, plan: UserPlan, newIterationLimit: number, newInterviewLimit: number, newChatMessageLimit: number): Promise<User | null>;
  updateStripeCustomerId(clerkId: string, stripeCustomerId: string): Promise<User | null>;
  updateStripeSubscriptionId(clerkId: string, stripeSubscriptionId: string): Promise<User | null>;
  clearStripeSubscriptionId(clerkId: string): Promise<User | null>;
  incrementIteration(clerkId: string, amount?: number): Promise<User | null>;
  incrementInterview(clerkId: string): Promise<User | null>;
  incrementChatMessage(clerkId: string): Promise<User | null>;
  resetIterations(clerkId: string): Promise<User | null>;
  resetInterviews(clerkId: string): Promise<User | null>;
  resetChatMessages(clerkId: string): Promise<User | null>;
  updatePreferences(clerkId: string, preferences: Partial<UserPreferences>): Promise<User | null>;
  updateGenerationPreferences(clerkId: string, generation: Partial<GenerationPreferences>): Promise<User | null>;
  updatePixelPetPreferences(
    clerkId: string,
    pixelPet: Partial<
      Pick<PixelPetPreferences, 'enabled' | 'schemaVersion' | 'size'> & {
        selectedId: PixelPetId;
        surfaceId: string;
        edge: PixelPetEdge;
        progress: number;
        offset: Partial<PixelPetOffset>;
        position: { x: number; y: number };
      }
    >
  ): Promise<User | null>;
  handlePlanChange(clerkId: string, newPlan: UserPlan, previousPlan: UserPlan): Promise<void>;
  getChatMessageUsage(clerkId: string): Promise<{ count: number; limit: number; remaining: number } | null>;
}

function getDefaultResetDate(): Date {
  const now = new Date();
  const resetDate = new Date(now);
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  resetDate.setHours(0, 0, 0, 0);
  return resetDate;
}

function getDefaultPixelPetPreferences(): PixelPetPreferences {
  return {
    schemaVersion: 1,
    enabled: false,
    selectedId: 'pixel_dog',
    surfaceId: 'app-shell',
    edge: 'bottom',
    progress: 0.5,
    offset: { x: 0, y: 0 },
    size: 1,
    position: { x: 100, y: 100 },
  };
}

import {
  FREE_INTERVIEW_LIMIT,
  PRO_INTERVIEW_LIMIT,
  MAX_INTERVIEW_LIMIT,
  FREE_ITERATION_LIMIT,
  PRO_ITERATION_LIMIT,
  MAX_ITERATION_LIMIT,
  FREE_CHAT_MESSAGE_LIMIT,
  PRO_CHAT_MESSAGE_LIMIT,
  MAX_CHAT_MESSAGE_LIMIT,
} from '@/lib/pricing-data';

function getPlanIterationLimit(plan: UserPlan): number {
  switch (plan) {
    case 'FREE':
      return FREE_ITERATION_LIMIT;
    case 'PRO':
      return PRO_ITERATION_LIMIT;
    case 'MAX':
      return MAX_ITERATION_LIMIT;
    default:
      return FREE_ITERATION_LIMIT;
  }
}

function getPlanInterviewLimit(plan: UserPlan): number {
  switch (plan) {
    case 'FREE':
      return FREE_INTERVIEW_LIMIT;
    case 'PRO':
      return PRO_INTERVIEW_LIMIT;
    case 'MAX':
      return MAX_INTERVIEW_LIMIT;
    default:
      return FREE_INTERVIEW_LIMIT;
  }
}

function getPlanChatMessageLimit(plan: UserPlan): number {
  switch (plan) {
    case 'FREE':
      return FREE_CHAT_MESSAGE_LIMIT;
    case 'PRO':
      return PRO_CHAT_MESSAGE_LIMIT;
    case 'MAX':
      return MAX_CHAT_MESSAGE_LIMIT;
    default:
      return FREE_CHAT_MESSAGE_LIMIT;
  }
}

/**
 * Cached findByClerkId - deduplicates DB calls within a single request
 */
const findByClerkIdCached = cache(async (clerkId: string): Promise<User | null> => {
  const collection = await getUsersCollection();
  const user = await collection.findOne({ clerkId });
  return user as User | null;
});

export const userRepository: UserRepository = {
  async create(data) {
    const collection = await getUsersCollection();
    const now = new Date();
    const id = new ObjectId().toString();

    const plan = data.plan ?? 'FREE';
    const iterationLimit = data.iterations?.limit ?? getPlanIterationLimit(plan);
    const interviewLimit = data.interviews?.limit ?? getPlanInterviewLimit(plan);
    const chatMessageLimit = getPlanChatMessageLimit(plan);

    const user: User = {
      _id: id,
      clerkId: data.clerkId,
      stripeCustomerId: data.stripeCustomerId,
      plan,
      iterations: {
        count: data.iterations?.count ?? 0,
        limit: iterationLimit,
        resetDate: data.iterations?.resetDate ?? getDefaultResetDate(),
      },
      interviews: {
        count: data.interviews?.count ?? 0,
        limit: interviewLimit,
        resetDate: data.interviews?.resetDate ?? getDefaultResetDate(),
      },
      chatMessages: {
        count: 0,
        limit: chatMessageLimit,
        resetDate: getDefaultResetDate(),
      },
      preferences: data.preferences ?? {
        theme: 'dark',
        defaultAnalogy: 'professional',
      },
      pixelPet: data.pixelPet ?? getDefaultPixelPetPreferences(),
      suspended: false,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(user);
    return user;
  },

  async findByClerkId(clerkId: string) {
    return findByClerkIdCached(clerkId);
  },

  async findById(id: string) {
    const collection = await getUsersCollection();
    const user = await collection.findOne({ _id: id });
    return user as User | null;
  },

  async findByStripeCustomerId(stripeCustomerId: string) {
    const collection = await getUsersCollection();
    const user = await collection.findOne({ stripeCustomerId });
    return user as User | null;
  },

  async updatePlan(clerkId: string, plan: UserPlan, newIterationLimit: number, newInterviewLimit: number, newChatMessageLimit: number) {
    const collection = await getUsersCollection();
    const now = new Date();

    // Get the current user to check previous plan
    const currentUser = await collection.findOne({ clerkId });
    const previousPlan = currentUser?.plan as UserPlan | undefined;

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          plan,
          'iterations.limit': newIterationLimit,
          'iterations.count': 0,
          'iterations.resetDate': getDefaultResetDate(),
          'interviews.limit': newInterviewLimit,
          'interviews.count': 0,
          'interviews.resetDate': getDefaultResetDate(),
          'chatMessages.limit': newChatMessageLimit,
          'chatMessages.count': 0,
          'chatMessages.resetDate': getDefaultResetDate(),
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    // Handle plan-specific cleanup (e.g., clear BYOK on downgrade from MAX)
    if (previousPlan && previousPlan !== plan) {
      await userRepository.handlePlanChange(clerkId, plan, previousPlan);
    }

    return result as User | null;
  },

  async updateStripeCustomerId(clerkId: string, stripeCustomerId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          stripeCustomerId,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async updateStripeSubscriptionId(clerkId: string, stripeSubscriptionId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          stripeSubscriptionId,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async clearStripeSubscriptionId(clerkId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $unset: { stripeSubscriptionId: '' },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async incrementIteration(clerkId: string, amount: number = 1) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $inc: { 'iterations.count': amount },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async incrementInterview(clerkId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $inc: { 'interviews.count': 1 },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async resetIterations(clerkId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          'iterations.count': 0,
          'iterations.resetDate': getDefaultResetDate(),
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async resetInterviews(clerkId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          'interviews.count': 0,
          'interviews.resetDate': getDefaultResetDate(),
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async incrementChatMessage(clerkId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $inc: { 'chatMessages.count': 1 },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async resetChatMessages(clerkId: string) {
    const collection = await getUsersCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          'chatMessages.count': 0,
          'chatMessages.resetDate': getDefaultResetDate(),
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async getChatMessageUsage(clerkId: string) {
    const user = await findByClerkIdCached(clerkId);
    if (!user) return null;

    const chatMessages = user.chatMessages ?? {
      count: 0,
      limit: getPlanChatMessageLimit(user.plan),
      resetDate: getDefaultResetDate(),
    };

    return {
      count: chatMessages.count,
      limit: chatMessages.limit,
      remaining: Math.max(0, chatMessages.limit - chatMessages.count),
    };
  },

  async updatePreferences(clerkId: string, preferences: Partial<UserPreferences>) {
    const collection = await getUsersCollection();
    const now = new Date();

    const updateFields: Record<string, unknown> = { updatedAt: now };

    if (preferences.theme !== undefined) {
      updateFields['preferences.theme'] = preferences.theme;
    }
    if (preferences.defaultAnalogy !== undefined) {
      updateFields['preferences.defaultAnalogy'] = preferences.defaultAnalogy;
    }

    const result = await collection.findOneAndUpdate(
      { clerkId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async updateGenerationPreferences(clerkId: string, generation: Partial<GenerationPreferences>) {
    const collection = await getUsersCollection();
    const now = new Date();

    const updateFields: Record<string, unknown> = { updatedAt: now };

    if (generation.topicCount !== undefined) {
      updateFields['preferences.generation.topicCount'] = generation.topicCount;
    }
    if (generation.mcqCount !== undefined) {
      updateFields['preferences.generation.mcqCount'] = generation.mcqCount;
    }
    if (generation.rapidFireCount !== undefined) {
      updateFields['preferences.generation.rapidFireCount'] = generation.rapidFireCount;
    }

    const result = await collection.findOneAndUpdate(
      { clerkId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async updatePixelPetPreferences(clerkId, pixelPet) {
    const collection = await getUsersCollection();
    const now = new Date();

    const updateFields: Record<string, unknown> = { updatedAt: now };

    if (pixelPet.schemaVersion !== undefined) {
      updateFields['pixelPet.schemaVersion'] = pixelPet.schemaVersion;
    }
    if (pixelPet.enabled !== undefined) {
      updateFields['pixelPet.enabled'] = pixelPet.enabled;
    }
    if (pixelPet.selectedId !== undefined) {
      updateFields['pixelPet.selectedId'] = pixelPet.selectedId;
    }
    if (pixelPet.surfaceId !== undefined) {
      updateFields['pixelPet.surfaceId'] = pixelPet.surfaceId;
    }
    if (pixelPet.edge !== undefined) {
      updateFields['pixelPet.edge'] = pixelPet.edge;
    }
    if (pixelPet.progress !== undefined) {
      updateFields['pixelPet.progress'] = pixelPet.progress;
    }
    if (pixelPet.offset?.x !== undefined) {
      updateFields['pixelPet.offset.x'] = pixelPet.offset.x;
    }
    if (pixelPet.offset?.y !== undefined) {
      updateFields['pixelPet.offset.y'] = pixelPet.offset.y;
    }
    if (pixelPet.size !== undefined) {
      updateFields['pixelPet.size'] = pixelPet.size;
    }
    if (pixelPet.position?.x !== undefined) {
      updateFields['pixelPet.position.x'] = pixelPet.position.x;
    }
    if (pixelPet.position?.y !== undefined) {
      updateFields['pixelPet.position.y'] = pixelPet.position.y;
    }

    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $set: updateFields,
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  },

  async handlePlanChange(clerkId: string, newPlan: UserPlan, previousPlan: UserPlan) {
    // If downgrading from MAX, clear BYOK configuration
    if (previousPlan === 'MAX' && newPlan !== 'MAX') {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        
        const clerkUser = await client.users.getUser(clerkId);
        const existingMetadata = clerkUser.privateMetadata || {};

        // Clear BYOK tier configuration when downgrading from MAX
        await client.users.updateUserMetadata(clerkId, {
          privateMetadata: {
            ...existingMetadata,
            byokTierConfig: null,
          },
        });
      } catch (error) {
        console.error('handlePlanChange: Failed to clear BYOK config on downgrade:', error);
        // Don't throw - plan change should succeed even if BYOK cleanup fails
      }
    }
  },
};
