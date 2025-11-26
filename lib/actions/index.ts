/**
 * Server Actions Index
 * Re-exports all server actions for convenient imports
 *
 * NOTE: Streaming functions (generateModule, addMoreContent, regenerateAnalogy)
 * have been migrated to API routes for resumable stream support.
 * See /api/interview/[id]/generate, /api/interview/[id]/add-more, and
 * /api/interview/[id]/topic/[topicId]/regenerate
 */

// Interview actions
export {
  createInterview,
  createInterviewFromPrompt,
  deleteInterview,
  getInterview,
  getUserInterviews,
  getAIConcurrencyLimit,
  type ActionResult,
  type CreateInterviewActionInput,
  type CreateInterviewFromPromptInput,
} from "./interview";

// User actions
export {
  getOrCreateUser,
  checkIterationLimit,
  updatePreferences,
  getCurrentUser,
  getIterationStatus,
} from "./user";

// Topic actions
export { getTopic, type AnalogyStyle } from "./topic";

// Public plan actions
export {
  togglePublic,
  getPublicPlan,
  isInterviewPublic,
  type PublicInterview,
} from "./public";

// Stripe actions
export {
  createCheckout,
  createPortalSession,
  getUserSubscriptionStatus,
  type SubscriptionPlan,
  type CheckoutResult,
} from "./stripe";

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
} from "./admin";
