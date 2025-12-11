import type { SubscriptionPlan } from '@/lib/actions/stripe';
import { GENERATION_LIMITS } from '@/lib/db/schemas/user';

export interface PlanFeature {
  name: string;
  included: boolean;
  tooltip?: string;
  upcoming?: boolean;
}

export interface PlanLimits {
  interviews: number;
  iterations: number;
}

export interface PricingTier {
  id: 'free' | 'pro' | 'max';
  name: string;
  price: number;
  period: string;
  description: string;
  shortDescription: string;
  features: PlanFeature[];
  previewFeatures: string[]; // Simplified features for landing page
  limits: PlanLimits;
  cta: string;
  href?: string;
  plan?: SubscriptionPlan;
  badge?: string;
  featured?: boolean;
}

export interface ComparisonFeature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
  max: string | boolean;
  upcoming?: boolean;
}

export const FREE_INTERVIEW_LIMIT = 3;
export const PRO_INTERVIEW_LIMIT = 10;
export const MAX_INTERVIEW_LIMIT = 50;

export const FREE_ITERATION_LIMIT = 20;
export const PRO_ITERATION_LIMIT = 100;
export const MAX_ITERATION_LIMIT = 250;

export const FREE_CHAT_MESSAGE_LIMIT = 5;
export const PRO_CHAT_MESSAGE_LIMIT = 100;
export const MAX_CHAT_MESSAGE_LIMIT = 300;

/**
 * Iteration costs for different AI actions
 * These define how many iterations each action consumes
 */
export const ITERATION_COSTS = {
  /** Full generation actions (topics, MCQs, rapid-fire, etc.) */
  FULL_GENERATION: 1,
  /** Chat messages (topic chat, AI assistant) */
  CHAT_MESSAGE: 0.33,
  /** AI tools (mock interview, system design, etc.) */
  AI_TOOL: 1,
} as const;

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/month',
    description: 'Perfect for trying out the platform',
    shortDescription: 'Try it out',
    limits: {
      interviews: FREE_INTERVIEW_LIMIT,
      iterations: FREE_ITERATION_LIMIT,
    },
    features: [
      { name: `${FREE_INTERVIEW_LIMIT} interviews/month`, included: true },
      { name: `${FREE_ITERATION_LIMIT} iterations/month`, included: true },
      { name: `${FREE_CHAT_MESSAGE_LIMIT} AI chat messages/month`, included: true, tooltip: 'Chat with AI assistant for interview guidance' },
      { name: 'Basic AI generation', included: true },
      { name: 'Community preps access', included: true },
      { name: 'Standard analogies', included: true },
      { name: 'AI tools (search, trends, etc.)', included: false, tooltip: 'Advanced AI tools including web search, tech trends analysis, and more' },
      { name: 'PDF export', included: false },
      { name: 'Custom theme', included: false },
      { name: 'Priority generation', included: false },
      { name: 'BYOK option', included: false },
    ],
    previewFeatures: [
      `${FREE_INTERVIEW_LIMIT} interviews/month`,
      `${FREE_CHAT_MESSAGE_LIMIT} AI chat messages`,
      'Basic AI generation',
      'Community access',
    ],
    cta: 'Get Started',
    href: '/onboarding',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: '/month',
    description: 'For active job seekers',
    shortDescription: 'For active job seekers',
    badge: 'Most Popular',
    limits: {
      interviews: PRO_INTERVIEW_LIMIT,
      iterations: PRO_ITERATION_LIMIT,
    },
    features: [
      { name: `${PRO_INTERVIEW_LIMIT} interviews/month`, included: true },
      { name: `${PRO_ITERATION_LIMIT} iterations/month`, included: true },
      { name: `${PRO_CHAT_MESSAGE_LIMIT} AI chat messages/month`, included: true, tooltip: 'Chat with AI assistant with advanced tools' },
      { name: 'Advanced AI generation', included: true },
      { name: 'Community preps access', included: true },
      { name: 'All analogy levels', included: true },
      { name: 'AI tools (search, trends, etc.)', included: true, tooltip: 'Web search & crawl, tech trends analysis, mock interviews, and more' },
      { name: 'PDF export', included: true },
      { name: 'Custom theme', included: true },
      { name: 'Analytics & Insights', included: true, tooltip: 'Track your preparation progress with visualizations' },
      { name: 'Priority generation', included: true },
      { name: 'BYOK option', included: false },
    ],
    previewFeatures: [
      `${PRO_INTERVIEW_LIMIT} interviews/month`,
      `${PRO_CHAT_MESSAGE_LIMIT} AI chat messages`,
      'AI tools & web search',
      'Analytics & Insights',
      'Export to PDF',
    ],
    cta: 'Subscribe to Pro',
    plan: 'PRO',
    featured: true,
  },
  {
    id: 'max',
    name: 'Max',
    price: 39,
    period: '/month',
    description: 'For power users and teams',
    shortDescription: 'For power users',
    limits: {
      interviews: MAX_INTERVIEW_LIMIT,
      iterations: MAX_ITERATION_LIMIT,
    },
    features: [
      { name: `${MAX_INTERVIEW_LIMIT} interviews/month`, included: true },
      { name: `${MAX_ITERATION_LIMIT} iterations/month`, included: true },
      { name: `${MAX_CHAT_MESSAGE_LIMIT} AI chat messages/month`, included: true, tooltip: 'Unlimited AI chat with all tools and model selection' },
      { name: 'Everything in Pro', included: true },
      { name: 'AI tools (search, trends, etc.)', included: true, tooltip: 'All AI tools with higher quotas and priority processing' },
      { name: 'Customizable generation', included: true, tooltip: `Fine-tune the number of topics (${GENERATION_LIMITS.topics.min}-${GENERATION_LIMITS.topics.max}), MCQs (${GENERATION_LIMITS.mcqs.min}-${GENERATION_LIMITS.mcqs.max}), and rapid-fire questions (${GENERATION_LIMITS.rapidFire.min}-${GENERATION_LIMITS.rapidFire.max}) per interview` },
      { name: 'BYOK option', included: true, tooltip: 'Bring Your Own Key - use your own OpenRouter API key' },
      { name: 'Analytics & Insights', included: true },
      { name: 'AI Usage Dashboard', included: true, tooltip: 'Monitor AI requests, token usage, costs, and performance metrics' },
      { name: 'Custom system prompts', included: true },
      { name: 'Priority support', included: true },
      { name: 'API access', included: true, upcoming: true },
      { name: 'Team collaboration', included: true, upcoming: true },
    ],
    previewFeatures: [
      `${MAX_INTERVIEW_LIMIT} interviews/month`,
      `${MAX_CHAT_MESSAGE_LIMIT} AI chat messages`,
      'Customizable generation',
      'BYOK option',
      'AI Usage Dashboard',
    ],
    cta: 'Subscribe to Max',
    plan: 'MAX',
  },
];

export const COMPARISON_FEATURES: ComparisonFeature[] = [
  { name: 'Monthly Interviews', free: `${FREE_INTERVIEW_LIMIT}`, pro: `${PRO_INTERVIEW_LIMIT}`, max: `${MAX_INTERVIEW_LIMIT}` },
  { name: 'Monthly Iterations', free: `${FREE_ITERATION_LIMIT}`, pro: `${PRO_ITERATION_LIMIT}`, max: `${MAX_ITERATION_LIMIT}` },
  { name: 'AI Chat Messages', free: `${FREE_CHAT_MESSAGE_LIMIT}`, pro: `${PRO_CHAT_MESSAGE_LIMIT}`, max: `${MAX_CHAT_MESSAGE_LIMIT}` },
  { name: 'Revision Topics', free: `${GENERATION_LIMITS.topics.default}`, pro: `${GENERATION_LIMITS.topics.default}`, max: `${GENERATION_LIMITS.topics.min}-${GENERATION_LIMITS.topics.max} (customizable)` },
  { name: 'MCQs per Interview', free: `${GENERATION_LIMITS.mcqs.default}`, pro: `${GENERATION_LIMITS.mcqs.default}`, max: `${GENERATION_LIMITS.mcqs.min}-${GENERATION_LIMITS.mcqs.max} (customizable)` },
  { name: 'Rapid-Fire Questions', free: `${GENERATION_LIMITS.rapidFire.default}`, pro: `${GENERATION_LIMITS.rapidFire.default}`, max: `${GENERATION_LIMITS.rapidFire.min}-${GENERATION_LIMITS.rapidFire.max} (customizable)` },
  { name: 'AI Model', free: 'Standard', pro: 'Advanced', max: 'Advanced' },
  { name: 'AI Tools (Search, Trends, etc.)', free: false, pro: true, max: true },
  { name: 'PDF Export', free: false, pro: true, max: true },
  { name: 'Custom Theme', free: false, pro: true, max: true },
  { name: 'Analytics & Insights', free: false, pro: true, max: true },
  { name: 'AI Usage Dashboard', free: false, pro: false, max: true },
  { name: 'BYOK Support', free: false, pro: false, max: true },
  { name: 'API Access', free: false, pro: false, max: true, upcoming: true },
  { name: 'Team Collaboration', free: false, pro: false, max: true, upcoming: true },
  { name: 'Priority Support', free: false, pro: false, max: true },
];

export const PRICING_FAQS = [
  {
    question: 'What happens when I run out of free preps?',
    answer: "You'll be prompted to upgrade to Pro or wait until the next month when your free preps reset.",
  },
  {
    question: 'Can I cancel anytime?',
    answer: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.",
  },
  {
    question: 'What is BYOK?',
    answer: 'Bring Your Own Key lets you use your own OpenRouter API key, giving you more control over costs and model selection.',
  },
  {
    question: 'Do you offer refunds?',
    answer: "We offer a 14-day money-back guarantee if you're not satisfied with the product.",
  },
];

// Helper functions
export function getTierById(id: PricingTier['id']): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.id === id);
}

export function getTierByPlan(plan: SubscriptionPlan): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.plan === plan);
}

export function formatPrice(price: number): string {
  return price === 0 ? '$0' : `$${price}`;
}
