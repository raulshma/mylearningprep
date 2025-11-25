import Stripe from 'stripe';
import { UserPlan } from '@/lib/db/schemas/user';

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
  plan: UserPlan;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO || '',
    iterationLimit: 50,
    interviewLimit: 25,
    plan: 'PRO',
  },
  MAX: {
    name: 'Max',
    priceId: process.env.STRIPE_PRICE_MAX || '',
    iterationLimit: 500,
    interviewLimit: 100,
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
      return 5;
    case 'PRO':
      return 50;
    case 'MAX':
      return 500;
    default:
      return 5;
  }
}

export function getPlanInterviewLimit(plan: UserPlan): number {
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

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
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
