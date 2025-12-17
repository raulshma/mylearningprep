'use client';

import { Check, X, Loader2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-data';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'upgrade' | 'downgrade';
  fromPlan: string;
  toPlan: PricingTier;
  isLoading: boolean;
  onConfirm: () => void;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  type,
  fromPlan,
  toPlan,
  isLoading,
  onConfirm,
}: PlanChangeDialogProps) {
  const isUpgrade = type === 'upgrade';
  const isCancel = toPlan.id === 'free';

  const getIcon = () => {
    if (isCancel) return <AlertCircle className="w-12 h-12 text-destructive" />;
    if (isUpgrade) return <ArrowUp className="w-12 h-12 text-primary" />;
    return <ArrowDown className="w-12 h-12 text-amber-500" />;
  };

  const getTitle = () => {
    if (isCancel) return 'Cancel Subscription';
    if (isUpgrade) return `Upgrade to ${toPlan.name}`;
    return `Downgrade to ${toPlan.name}`;
  };

  const getDescription = () => {
    const baseDesc = isCancel
      ? 'Your subscription will remain active until the end of your current billing period. After that, you\'ll be moved to the Free plan.'
      : isUpgrade
        ? `You'll be charged the prorated difference immediately and gain access to all ${toPlan.name} features right away.`
        : `Your plan will change to ${toPlan.name} at the end of your current billing period. You'll keep your current features until then.`;
    
    return `${baseDesc} (This is a test environment - no real charges will be made)`;
  };

  const getPriceChange = () => {
    const currentTier = PRICING_TIERS.find(t => t.id === fromPlan.toLowerCase());
    if (!currentTier) return null;

    const diff = toPlan.price - currentTier.price;
    if (diff === 0) return null;

    return {
      from: currentTier.price,
      to: toPlan.price,
      isIncrease: diff > 0,
    };
  };

  const priceChange = getPriceChange();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 overflow-hidden bg-card/95 border-white/10"
      >
        <div className="flex flex-col items-center text-center p-8">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
              isCancel ? 'bg-destructive/10' : isUpgrade ? 'bg-primary/10' : 'bg-amber-500/10'
            }`}
          >
            {getIcon()}
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">{getTitle()}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
            {getDescription()}
          </p>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 mb-6 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Test Environment: No real payment will be processed.
            </p>
          </div>

          {priceChange && (
            <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-secondary/30 w-full">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <p className="text-lg font-semibold text-muted-foreground line-through">
                  ${priceChange.from}/mo
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                priceChange.isIncrease ? 'bg-primary/20' : 'bg-amber-500/20'
              }`}>
                {priceChange.isIncrease ? (
                  <ArrowUp className="w-4 h-4 text-primary" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">New</p>
                <p className={`text-lg font-semibold ${
                  priceChange.isIncrease ? 'text-primary' : 'text-amber-500'
                }`}>
                  ${priceChange.to}/mo
                </p>
              </div>
            </div>
          )}

          {isUpgrade && (
            <div className="w-full mb-6">
              <p className="text-xs text-muted-foreground mb-3">What you&apos;ll get</p>
              <div className="space-y-2">
                {toPlan.previewFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isUpgrade && !isCancel && (
            <div className="w-full mb-6">
              <p className="text-xs text-muted-foreground mb-3">Features you&apos;ll lose</p>
              <div className="space-y-2">
                {PRICING_TIERS.find(t => t.id === fromPlan.toLowerCase())
                  ?.features.filter(f => 
                    f.included && !toPlan.features.find(tf => tf.name === f.name)?.included
                  )
                  .slice(0, 3)
                  .map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <X className="w-4 h-4 text-destructive/70 shrink-0" />
                      <span>{feature.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/5 bg-secondary/20">
          <div className="flex">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 py-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors border-r border-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-4 text-sm font-medium transition-colors disabled:opacity-50 ${
                isCancel
                  ? 'text-destructive hover:bg-destructive/10'
                  : isUpgrade
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-amber-500 hover:bg-amber-500/10'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : isCancel ? (
                'Cancel Subscription'
              ) : isUpgrade ? (
                'Confirm Upgrade'
              ) : (
                'Confirm Downgrade'
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
