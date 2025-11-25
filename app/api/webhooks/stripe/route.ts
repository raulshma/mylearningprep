import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { constructWebhookEvent, getPlanFromPriceId, getPlanLimit, getPlanInterviewLimit } from '@/lib/services/stripe';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { UserPlan } from '@/lib/db/schemas/user';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }


    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error processing webhook:', message);
    return NextResponse.json(
      { error: `Webhook handler error: ${message}` },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkId = session.metadata?.clerkId;
  const plan = session.metadata?.plan as UserPlan | undefined;
  const customerId = session.customer as string;

  if (!clerkId || !plan) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const iterationLimit = getPlanLimit(plan);
  const interviewLimit = getPlanInterviewLimit(plan);
  
  // Update user with new plan and Stripe customer ID
  const user = await userRepository.findByClerkId(clerkId);
  if (user) {
    await userRepository.updatePlan(clerkId, plan, iterationLimit, interviewLimit);
    
    // Update stripeCustomerId if not already set
    if (!user.stripeCustomerId && customerId) {
      await userRepository.updateStripeCustomerId(clerkId, customerId);
    }
    console.log(`User ${clerkId} upgraded to ${plan} plan`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const clerkId = subscription.metadata?.clerkId;
  
  if (!clerkId) {
    console.error('Missing clerkId in subscription metadata:', subscription.id);
    return;
  }

  // Check if subscription is being cancelled at period end
  if (subscription.cancel_at_period_end) {
    console.log(`Subscription ${subscription.id} will be cancelled at period end`);
    return;
  }

  // Get the price ID from the subscription items
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    console.error('No price ID found in subscription:', subscription.id);
    return;
  }

  const planConfig = getPlanFromPriceId(priceId);
  if (!planConfig) {
    console.error('Unknown price ID:', priceId);
    return;
  }

  // Update user plan
  await userRepository.updatePlan(clerkId, planConfig.plan, planConfig.iterationLimit, planConfig.interviewLimit);
  console.log(`User ${clerkId} subscription updated to ${planConfig.plan}`);
}


async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const clerkId = subscription.metadata?.clerkId;
  
  if (!clerkId) {
    console.error('Missing clerkId in subscription metadata:', subscription.id);
    return;
  }

  // Downgrade user to FREE plan
  await userRepository.updatePlan(clerkId, 'FREE', 5, 3);
  console.log(`User ${clerkId} downgraded to FREE plan after subscription cancellation`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Handle subscription renewal - reset iteration count
  if (invoice.billing_reason !== 'subscription_cycle') {
    // Not a renewal, skip
    return;
  }

  // Get subscription ID from the invoice lines
  const subscriptionLine = invoice.lines.data[0]?.subscription;
  if (!subscriptionLine) {
    console.error('No subscription found in invoice:', invoice.id);
    return;
  }

  // subscription can be string or Subscription object
  const subscriptionId = typeof subscriptionLine === 'string' 
    ? subscriptionLine 
    : subscriptionLine.id;

  // The clerkId should be in the subscription metadata
  // We need to fetch the subscription to get the metadata
  const stripe = (await import('@/lib/services/stripe')).stripe;
  const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const clerkId = fullSubscription.metadata?.clerkId;

  if (!clerkId) {
    console.error('Missing clerkId in subscription metadata for renewal:', subscriptionId);
    return;
  }

  // Reset iteration and interview counts on renewal
  await userRepository.resetIterations(clerkId);
  await userRepository.resetInterviews(clerkId);
  console.log(`User ${clerkId} iterations and interviews reset on subscription renewal`);
}
