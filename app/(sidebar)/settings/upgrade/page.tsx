import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSettingsPageData } from '@/lib/actions/user';
import { PRICING_TIERS } from '@/lib/pricing-data';
import { PricingTierCard } from '@/components/settings/upgrade/pricing-tier-card';
import { ComparisonTable } from '@/components/settings/upgrade/comparison-table';
import { ManageBillingButton } from '@/components/settings/upgrade/manage-billing-button';
import { SubscriptionNotice } from '@/components/settings/upgrade/subscription-notice';
import { TestPaymentWarning } from '@/components/settings/upgrade/test-payment-warning';
import { UpgradeHeader } from './upgrade-header';

// Static content - pre-rendered at build time
function PricingGrid({ 
  currentPlan, 
  hasStripeSubscription, 
  subscriptionCancelAt 
}: { 
  currentPlan: string;
  hasStripeSubscription: boolean;
  subscriptionCancelAt?: string | null;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {PRICING_TIERS.map((tier, index) => (
        <PricingTierCard
          key={tier.id}
          tier={tier}
          index={index}
          currentPlan={currentPlan}
          hasStripeSubscription={hasStripeSubscription}
          subscriptionCancelAt={subscriptionCancelAt}
        />
      ))}
    </div>
  );
}

export default async function UpgradePage() {
  const result = await getSettingsPageData();

  if (!result.success) {
    redirect('/sign-in');
  }

  const { profile } = result.data;

  return (
    <>
      <UpgradeHeader />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Static warning - Server Component */}
        <TestPaymentWarning />

        {/* Pricing cards with interactive actions */}
        <PricingGrid
          currentPlan={profile.plan}
          hasStripeSubscription={profile.hasStripeSubscription}
          subscriptionCancelAt={profile.subscriptionCancelAt}
        />

        {/* Subscription cancellation notice - Server Component */}
        {profile.subscriptionCancelAt && (
          <SubscriptionNotice
            plan={profile.plan}
            subscriptionCancelAt={profile.subscriptionCancelAt}
          />
        )}

        {/* Manage billing button - Client Component */}
        {profile.hasStripeSubscription && (
          <div className="mt-12 flex justify-center">
            <ManageBillingButton />
          </div>
        )}

        {/* Comparison table - Server Component (static) */}
        <div className="mt-16">
          <ComparisonTable />
        </div>
      </div>
    </>
  );
}
