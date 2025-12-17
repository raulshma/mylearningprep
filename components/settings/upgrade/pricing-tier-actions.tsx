'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Loader2 } from 'lucide-react';
import { createCheckout, downgradeSubscription, cancelSubscriptionAction } from '@/lib/actions/stripe';
import type { PricingTier } from '@/lib/pricing-data';
import { PlanChangeDialog } from './plan-change-dialog';

interface PricingTierActionsProps {
  tier: PricingTier;
  currentPlan: string;
  isCurrent: boolean;
  hasStripeSubscription: boolean;
  subscriptionCancelAt?: string | null;
}

export function PricingTierActions({
  tier,
  currentPlan,
  isCurrent,
  hasStripeSubscription,
  subscriptionCancelAt,
}: PricingTierActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: 'upgrade' | 'downgrade';
  }>({ open: false, type: 'upgrade' });

  const isMax = tier.id === 'max';

  const canDowngradeTo = (tierId: string): boolean => {
    if (!hasStripeSubscription) return false;
    if (currentPlan === 'MAX' && tierId === 'pro') return true;
    if ((currentPlan === 'MAX' || currentPlan === 'PRO') && tierId === 'free') return true;
    return false;
  };

  const canUpgradeTo = (tierId: string): boolean => {
    if (tierId === 'free') return false;
    if (currentPlan === 'FREE' && (tierId === 'pro' || tierId === 'max')) return true;
    if (currentPlan === 'PRO' && tierId === 'max') return true;
    return false;
  };

  const handleConfirmPlanChange = async () => {
    setIsLoading(true);
    try {
      if (dialogState.type === 'upgrade') {
        const planEnum = tier.id === 'pro' ? 'PRO' : 'MAX';
        const result = await createCheckout(planEnum);
        if (result.success) {
          if (result.upgraded) {
            window.location.href = '/dashboard?checkout=success&upgraded=true';
          } else if (result.url) {
            window.location.href = result.url;
          }
        }
      } else {
        const targetPlan = tier.id === 'free' ? 'FREE' : 'PRO';
        const result = targetPlan === 'FREE'
          ? await cancelSubscriptionAction()
          : await downgradeSubscription(targetPlan as 'PRO');

        if (result.success) {
          window.location.reload();
        } else {
          console.error('Plan change failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Failed to change plan:', error);
    } finally {
      setIsLoading(false);
      setDialogState((prev) => ({ ...prev, open: false }));
    }
  };

  const handleOpenChange = (open: boolean) => {
    setDialogState((prev) => ({ ...prev, open }));
  };

  if (isCurrent) {
    return (
      <Button
        disabled
        variant="outline"
        className="w-full h-12 rounded-full border-white/10 bg-white/5"
      >
        Current Plan
      </Button>
    );
  }

  if (canDowngradeTo(tier.id)) {
    return (
      <>
        <Button
          onClick={() => setDialogState({ open: true, type: 'downgrade' })}
          disabled={isLoading || !!subscriptionCancelAt}
          variant="outline"
          className="w-full h-12 rounded-full border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {subscriptionCancelAt ? 'Cancellation Pending' : 'Downgrade'}
        </Button>
        {dialogState.open && (
          <PlanChangeDialog
            open={dialogState.open}
            onOpenChange={handleOpenChange}
            type={dialogState.type}
            fromPlan={currentPlan}
            toPlan={tier}
            isLoading={isLoading}
            onConfirm={handleConfirmPlanChange}
          />
        )}
      </>
    );
  }

  if (canUpgradeTo(tier.id)) {
    return (
      <>
        <Button
          onClick={() => setDialogState({ open: true, type: 'upgrade' })}
          disabled={isLoading}
          variant={isMax ? 'default' : 'outline'}
          className={`w-full h-12 rounded-full transition-all ${
            isMax
              ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]'
              : 'border-primary/20 hover:bg-primary/10 hover:text-primary'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isMax ? (
            <Sparkles className="w-4 h-4 mr-2" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          {tier.cta}
        </Button>
        {dialogState.open && (
          <PlanChangeDialog
            open={dialogState.open}
            onOpenChange={handleOpenChange}
            type={dialogState.type}
            fromPlan={currentPlan}
            toPlan={tier}
            isLoading={isLoading}
            onConfirm={handleConfirmPlanChange}
          />
        )}
      </>
    );
  }

  return (
    <Button
      disabled
      variant="outline"
      className="w-full h-12 rounded-full border-white/10 bg-white/5"
    >
      {tier.id === 'free' ? 'Current Plan' : tier.cta}
    </Button>
  );
}
