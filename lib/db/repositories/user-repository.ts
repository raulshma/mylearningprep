import { ObjectId } from 'mongodb';
import { getUsersCollection } from '../collections';
import { User, UserPlan, CreateUser, UserPreferences } from '../schemas/user';

export interface UserRepository {
  create(data: Omit<CreateUser, 'iterations' | 'interviews'> & { iterations?: Partial<CreateUser['iterations']>; interviews?: Partial<NonNullable<CreateUser['interviews']>> }): Promise<User>;
  findByClerkId(clerkId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<User | null>;
  updatePlan(clerkId: string, plan: UserPlan, newIterationLimit: number, newInterviewLimit: number): Promise<User | null>;
  updateStripeCustomerId(clerkId: string, stripeCustomerId: string): Promise<User | null>;
  incrementIteration(clerkId: string): Promise<User | null>;
  incrementInterview(clerkId: string): Promise<User | null>;
  resetIterations(clerkId: string): Promise<User | null>;
  resetInterviews(clerkId: string): Promise<User | null>;
  updatePreferences(clerkId: string, preferences: Partial<UserPreferences>): Promise<User | null>;
}

function getDefaultResetDate(): Date {
  const now = new Date();
  const resetDate = new Date(now);
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  resetDate.setHours(0, 0, 0, 0);
  return resetDate;
}

function getPlanIterationLimit(plan: UserPlan): number {
  switch (plan) {
    case 'FREE':
      return 5;
    case 'PRO':
      return 50;
    case 'MAX':
      return 500;
    default:
      return 5;
  }
}

function getPlanInterviewLimit(plan: UserPlan): number {
  switch (plan) {
    case 'FREE':
      return 3;
    case 'PRO':
      return 25;
    case 'MAX':
      return 100;
    default:
      return 3;
  }
}

export const userRepository: UserRepository = {
  async create(data) {
    const collection = await getUsersCollection();
    const now = new Date();
    const id = new ObjectId().toString();
    
    const plan = data.plan ?? 'FREE';
    const iterationLimit = data.iterations?.limit ?? getPlanIterationLimit(plan);
    const interviewLimit = data.interviews?.limit ?? getPlanInterviewLimit(plan);
    
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
      preferences: data.preferences ?? {
        theme: 'dark',
        defaultAnalogy: 'professional',
      },
      suspended: false,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(user);
    return user;
  },

  async findByClerkId(clerkId: string) {
    const collection = await getUsersCollection();
    const user = await collection.findOne({ clerkId });
    return user as User | null;
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

  async updatePlan(clerkId: string, plan: UserPlan, newIterationLimit: number, newInterviewLimit: number) {
    const collection = await getUsersCollection();
    const now = new Date();
    
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
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );
    
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

  async incrementIteration(clerkId: string) {
    const collection = await getUsersCollection();
    const now = new Date();
    
    const result = await collection.findOneAndUpdate(
      { clerkId },
      {
        $inc: { 'iterations.count': 1 },
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
};
