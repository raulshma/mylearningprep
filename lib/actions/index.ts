/**
 * Server Actions Index
 * Re-exports all server actions for convenient imports
 */

// Interview actions
export {
  createInterview,
  generateModule,
  addMoreContent,
  deleteInterview,
  getInterview,
  getUserInterviews,
  type ActionResult,
  type CreateInterviewActionInput,
} from './interview';

// User actions
export {
  getOrCreateUser,
  checkIterationLimit,
  updatePreferences,
  getCurrentUser,
  getIterationStatus,
} from './user';

// Topic actions
export {
  regenerateAnalogy,
  getTopic,
  type AnalogyStyle,
} from './topic';

// Public plan actions
export {
  togglePublic,
  getPublicPlan,
  isInterviewPublic,
  type PublicInterview,
} from './public';

// Stripe actions
export {
  createCheckout,
  createPortalSession,
  getUserSubscriptionStatus,
  type SubscriptionPlan,
  type CheckoutResult,
} from './stripe';

// Admin actions
export {
  getAdminStats,
  getAILogs,
  getAILogById,
  toggleSearchTool,
  getSearchToolStatus,
  getAIUsageByAction,
  getRecentAIActivity,
  getUsageTrends,
  getPopularTopics,
  getPlanDistribution,
  getDailyActiveUsers,
  getTokenUsageTrends,
  getTopCompanies,
  getModelUsageDistribution,
  type AdminStats,
  type AILogWithDetails,
  type UsageTrendData,
  type PopularTopicData,
  type PlanDistribution,
  type DailyActiveUsers,
  type TokenUsageTrend,
} from './admin';
