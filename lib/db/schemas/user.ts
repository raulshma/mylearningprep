import { z } from 'zod';

export const UserPlanSchema = z.enum(['FREE', 'PRO', 'MAX']);

export const UserIterationsSchema = z.object({
  count: z.number().int().min(0).default(0),
  limit: z.number().int().min(0).default(5),
  resetDate: z.date(),
});

export const UserInterviewsSchema = z.object({
  count: z.number().int().min(0).default(0),
  limit: z.number().int().min(0).default(3),
  resetDate: z.date(),
});

export const UserChatMessagesSchema = z.object({
  count: z.number().int().min(0).default(0),
  limit: z.number().int().min(0).default(5),
  resetDate: z.date(),
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).default('dark'),
  defaultAnalogy: z.enum(['professional', 'construction', 'simple']).default('professional'),
});

export const UserSchema = z.object({
  _id: z.string(),
  clerkId: z.string(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  plan: UserPlanSchema.default('FREE'),
  iterations: UserIterationsSchema,
  interviews: UserInterviewsSchema.optional(),
  chatMessages: UserChatMessagesSchema.optional(),
  preferences: UserPreferencesSchema,
  suspended: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = UserSchema.omit({ 
  _id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  suspended: z.boolean().default(false).optional(),
});

export type UserPlan = z.infer<typeof UserPlanSchema>;
export type UserIterations = z.infer<typeof UserIterationsSchema>;
export type UserInterviews = z.infer<typeof UserInterviewsSchema>;
export type UserChatMessages = z.infer<typeof UserChatMessagesSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
