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

// Generation count limits and defaults (single source of truth)
export const GENERATION_LIMITS = {
  topics: { min: 5, max: 10, default: 8 },
  mcqs: { min: 5, max: 20, default: 10 },
  rapidFire: { min: 10, max: 40, default: 20 },
} as const;

// Convenience exports for backward compatibility
export const DEFAULT_TOPIC_COUNT = GENERATION_LIMITS.topics.default;
export const DEFAULT_MCQ_COUNT = GENERATION_LIMITS.mcqs.default;
export const DEFAULT_RAPID_FIRE_COUNT = GENERATION_LIMITS.rapidFire.default;

export const GenerationPreferencesSchema = z.object({
  topicCount: z.number().int().min(GENERATION_LIMITS.topics.min).max(GENERATION_LIMITS.topics.max).default(GENERATION_LIMITS.topics.default),
  mcqCount: z.number().int().min(GENERATION_LIMITS.mcqs.min).max(GENERATION_LIMITS.mcqs.max).default(GENERATION_LIMITS.mcqs.default),
  rapidFireCount: z.number().int().min(GENERATION_LIMITS.rapidFire.min).max(GENERATION_LIMITS.rapidFire.max).default(GENERATION_LIMITS.rapidFire.default),
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).default('dark'),
  defaultAnalogy: z.enum(['professional', 'construction', 'simple']).default('professional'),
  generation: GenerationPreferencesSchema.optional(),
});

// Pixel Pet Schemas
export const PixelPetIdSchema = z.enum([
  'pixel_dog',
  'pixel_plane',
  'pixel_toyota_corolla_e80',
]);

export const PixelPetEdgeSchema = z.enum(['top', 'right', 'bottom', 'left']);

export const PixelPetOffsetSchema = z.object({
  x: z.number().int().min(-200).max(200).default(0),
  y: z.number().int().min(-200).max(200).default(0),
});

export const PixelPetPositionSchema = z.object({
  x: z.number().default(100),
  y: z.number().default(100),
});

export const PixelPetPreferencesSchema = z.object({
  schemaVersion: z.number().int().min(1).default(1),
  enabled: z.boolean().default(false),
  selectedId: PixelPetIdSchema.default('pixel_dog'),
  /** Which opted-in edge container the pet is currently attached to */
  surfaceId: z.string().default('app-shell'),
  edge: PixelPetEdgeSchema.default('bottom'),
  /** Progress along the current edge, normalized to [0, 1] */
  progress: z.number().min(0).max(1).default(0.5),
  /** Small user-adjustable pixel offset applied after snapping */
  offset: PixelPetOffsetSchema.default({ x: 0, y: 0 }),
  /** Pet size multiplier (0.3 to 3.0) */
  size: z.number().min(0.3).max(3).default(1),
  /** Current position on screen */
  position: PixelPetPositionSchema.default({ x: 100, y: 100 }),
});

// Gamification Schemas
export const BadgeSchema = z.object({
  id: z.string(),
  earnedAt: z.date(),
});

export const CompletedLessonSchema = z.object({
  lessonId: z.string(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  sectionsCompleted: z.array(z.object({
    sectionId: z.string(),
    completedAt: z.date(),
    xpEarned: z.number(),
  })),
  quizAnswers: z.array(z.object({
    questionId: z.string(),
    selectedAnswer: z.string(),
    isCorrect: z.boolean(),
    answeredAt: z.date(),
  })).default([]),
  xpEarned: z.number(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  timeSpentSeconds: z.number().default(0),
});

export const UserGamificationSchema = z.object({
  totalXp: z.number().int().min(0).default(0),
  level: z.number().int().min(1).default(1),
  currentStreak: z.number().int().min(0).default(0),
  longestStreak: z.number().int().min(0).default(0),
  lastActivityDate: z.date().optional(),
  badges: z.array(BadgeSchema).default([]),
  completedLessons: z.array(CompletedLessonSchema).default([]),
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
  pixelPet: PixelPetPreferencesSchema.optional(),
  gamification: UserGamificationSchema.optional(),
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
export type GenerationPreferences = z.infer<typeof GenerationPreferencesSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UserGamification = z.infer<typeof UserGamificationSchema>;
export type CompletedLesson = z.infer<typeof CompletedLessonSchema>;
export type Badge = z.infer<typeof BadgeSchema>;

export type PixelPetId = z.infer<typeof PixelPetIdSchema>;
export type PixelPetEdge = z.infer<typeof PixelPetEdgeSchema>;
export type PixelPetOffset = z.infer<typeof PixelPetOffsetSchema>;
export type PixelPetPosition = z.infer<typeof PixelPetPositionSchema>;
export type PixelPetPreferences = z.infer<typeof PixelPetPreferencesSchema>;
