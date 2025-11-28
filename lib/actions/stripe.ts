'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { createCheckoutSession, createCustomerPortalSession, upgradeSubscription, getSubscription } from '@/lib/services/stripe';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { getAuthUserId } from '@/lib/auth/get-user';
import { MAX_ITERATION_LIMIT, MAX_INTERVIEW_LIMIT } from '@/lib/pricing-data';

export type SubscriptionPlan = 'PRO' | 'MAX';

export interface CheckoutResult {
  success: boolean;
  url?: string;
  upgraded?: boolean;
  error?: string;
}

export async function createCheckout(plan: SubscriptionPlan): Promise<CheckoutResult> {
  try {
    const { userId: clerkId } = await auth();
    const user = await currentUser();

    if (!clerkId || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get or create user in our database
    let dbUser = await userRepository.findByClerkId(clerkId);
    if (!dbUser) {
      dbUser = await userRepository.create({
        clerkId,
        plan: 'FREE',
        preferences: {
          theme: 'dark',
          defaultAnalogy: 'professional',
        },
      });
    }

    // Check if user has an active subscription and wants to upgrade
    if (dbUser.stripeSubscriptionId && dbUser.plan === 'PRO' && plan === 'MAX') {
      // Verify the subscription is still active
      const subscription = await getSubscription(dbUser.stripeSubscriptionId);
      if (subscription && subscription.status === 'active' && !subscription.cancel_at_period_end) {
        // Upgrade with proration instead of creating new checkout
        await upgradeSubscription({
          subscriptionId: dbUser.stripeSubscriptionId,
          newPlan: plan,
          clerkId,
        });
        
        // Update the plan in database immediately (don't wait for webhook)
        await userRepository.updatePlan(clerkId, 'MAX', MAX_ITERATION_LIMIT, MAX_INTERVIEW_LIMIT);
        
        return { success: true, upgraded: true };
      }
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return { success: false, error: 'No email address found' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const url = await createCheckoutSession({
      userId: dbUser._id,
      clerkId,
      email,
      plan,
      successUrl: `${appUrl}/dashboard?checkout=success`,
      cancelUrl: `${appUrl}/pricing?checkout=cancelled`,
    });

    return { success: true, url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return { success: false, error: message };
  }
}


export async function createPortalSession(): Promise<CheckoutResult> {
  try {
    const clerkId = await getAuthUserId();
    const dbUser = await userRepository.findByClerkId(clerkId);
    
    if (!dbUser?.stripeCustomerId) {
      return { success: false, error: 'No subscription found' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const url = await createCustomerPortalSession(
      dbUser.stripeCustomerId,
      `${appUrl}/settings`
    );

    return { success: true, url };
  } catch (error) {
    console.error('Error creating portal session:', error);
    const message = error instanceof Error ? error.message : 'Failed to create portal session';
    return { success: false, error: message };
  }
}

/**
 * @deprecated Use getSettingsPageData() from user.ts for settings page
 * Kept for backward compatibility with other pages
 */
export async function getUserSubscriptionStatus() {
  try {
    const clerkId = await getAuthUserId();
    const dbUser = await userRepository.findByClerkId(clerkId);
    
    if (!dbUser) {
      return { plan: 'FREE' as const, hasSubscription: false };
    }

    return {
      plan: dbUser.plan,
      hasSubscription: !!dbUser.stripeCustomerId,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { plan: 'FREE' as const, hasSubscription: false };
  }
}
