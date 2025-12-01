import Stripe from 'stripe';
import { UserPlan } from '@/lib/db/schemas/user';
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

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
});

export interface PlanConfig {
  name: string;
  priceId: string;
  iterationLimit: number;
  interviewLimit: number;
  chatMessageLimit: number;
  plan: UserPlan;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO || '',
    iterationLimit: PRO_ITERATION_LIMIT,
    interviewLimit: PRO_INTERVIEW_LIMIT,
    chatMessageLimit: PRO_CHAT_MESSAGE_LIMIT,
    plan: 'PRO',
  },
  MAX: {
    name: 'Max',
    priceId: process.env.STRIPE_PRICE_MAX || '',
    iterationLimit: MAX_ITERATION_LIMIT,
    interviewLimit: MAX_INTERVIEW_LIMIT,
    chatMessageLimit: MAX_CHAT_MESSAGE_LIMIT,
    plan: 'MAX',
  },
};

export function getPlanFromPriceId(priceId: string): PlanConfig | null {
  for (const config of Object.values(PLAN_CONFIGS)) {
    if (config.priceId === priceId) {
      return config;
    }
  }
  return null;
}

export function getPlanLimit(plan: UserPlan): number {
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

export function getPlanInterviewLimit(plan: UserPlan): number {
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

export function getPlanChatMessageLimit(plan: UserPlan): number {
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


export interface CreateCheckoutSessionParams {
  userId: string;
  clerkId: string;
  email: string;
  plan: 'PRO' | 'MAX';
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  const { userId, clerkId, email, plan, successUrl, cancelUrl } = params;

  const planConfig = PLAN_CONFIGS[plan];
  if (!planConfig || !planConfig.priceId) {
    throw new Error(`Invalid plan or missing price ID for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      clerkId,
      plan,
    },
    subscription_data: {
      metadata: {
        userId,
        clerkId,
        plan,
      },
    },
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return session.url;
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export interface UpgradeSubscriptionParams {
  subscriptionId: string;
  newPlan: 'PRO' | 'MAX';
  clerkId: string;
}

export async function upgradeSubscription(params: UpgradeSubscriptionParams): Promise<Stripe.Subscription> {
  const { subscriptionId, newPlan, clerkId } = params;

  const planConfig = PLAN_CONFIGS[newPlan];
  if (!planConfig || !planConfig.priceId) {
    throw new Error(`Invalid plan or missing price ID for plan: ${newPlan}`);
  }

  // Get the current subscription to find the item ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItemId = subscription.items.data[0]?.id;

  if (!subscriptionItemId) {
    throw new Error('No subscription item found');
  }

  // Update the subscription with proration
  // Using 'always_invoice' to immediately charge the prorated difference
  // This creates and pays an invoice right away for the upgrade cost
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscriptionItemId,
        price: planConfig.priceId,
      },
    ],
    proration_behavior: 'always_invoice',
    payment_behavior: 'pending_if_incomplete',
    metadata: {
      clerkId,
      plan: newPlan,
    },
  });

  return updatedSubscription;
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Get subscription period end timestamp
 * Handles different Stripe API versions where current_period_end might be typed differently
 */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number {
   
  return (subscription as any).current_period_end as number;
}

export interface DowngradeSubscriptionParams {
  subscriptionId: string;
  newPlan: 'PRO' | 'FREE';
  clerkId: string;
}

export async function downgradeSubscription(params: DowngradeSubscriptionParams): Promise<Stripe.Subscription> {
  const { subscriptionId, newPlan, clerkId } = params;

  // If downgrading to FREE, cancel the subscription at period end
  if (newPlan === 'FREE') {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        clerkId,
        pendingDowngrade: 'FREE',
      },
    });
  }

  // Downgrading to PRO (from MAX)
  const planConfig = PLAN_CONFIGS[newPlan];
  if (!planConfig || !planConfig.priceId) {
    throw new Error(`Invalid plan or missing price ID for plan: ${newPlan}`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItemId = subscription.items.data[0]?.id;

  if (!subscriptionItemId) {
    throw new Error('No subscription item found');
  }

  // Schedule the downgrade for the end of the current billing period
  // Using 'none' proration to apply the change at next renewal
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscriptionItemId,
        price: planConfig.priceId,
      },
    ],
    proration_behavior: 'none',
    billing_cycle_anchor: 'unchanged',
    metadata: {
      clerkId,
      plan: newPlan,
    },
  });

  return updatedSubscription;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
