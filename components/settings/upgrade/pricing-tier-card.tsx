import { Check, X, HelpCircle, Shield, Zap, Infinity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PricingTier } from '@/lib/pricing-data';
import { PricingTierActions } from './pricing-tier-actions';

interface PricingTierCardProps {
  tier: PricingTier;
  index: number;
  currentPlan: string;
  hasStripeSubscription: boolean;
  subscriptionCancelAt?: string | null;
}

function TierIcon({ tierId }: { tierId: string }) {
  if (tierId === 'free') return <Shield className="w-32 h-32" />;
  if (tierId === 'pro') return <Zap className="w-32 h-32" />;
  return <Infinity className="w-32 h-32 text-primary" />;
}

export function PricingTierCard({
  tier,
  index,
  currentPlan,
  hasStripeSubscription,
  subscriptionCancelAt,
}: PricingTierCardProps) {
  const isPro = tier.id === 'pro';
  const isMax = tier.id === 'max';
  
  const isCurrent = 
    (tier.id === 'free' && currentPlan === 'FREE') ||
    (tier.id === 'pro' && currentPlan === 'PRO') ||
    (tier.id === 'max' && currentPlan === 'MAX');

  return (
    <div
      className={`relative rounded-4xl overflow-hidden flex flex-col h-full animate-fade-in-up ${
        isMax
          ? 'p-[4px] bg-purple-500/50 shadow-2xl shadow-primary/20'
          : isPro
            ? 'p-8 border border-primary/50 bg-card/50 shadow-xl shadow-primary/10'
            : 'p-8 border border-white/10 bg-card/30'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {isMax && <div className="absolute inset-0 bg-primary/10 blur-xl" />}

      <div className={`relative z-10 flex flex-col h-full ${isMax ? 'bg-card/90 rounded-4xl p-8' : ''}`}>
        {/* Background Icon */}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TierIcon tierId={tier.id} />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
            {tier.badge && (
              <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 px-3 py-1 rounded-full">
                {tier.badge}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground min-h-[40px]">{tier.description}</p>
        </div>

        <div className="flex items-baseline gap-1 mb-8">
          <span className="text-4xl font-bold text-foreground">
            {tier.price === 0 ? '$0' : `$${tier.price}`}
          </span>
          <span className="text-muted-foreground">{tier.period}</span>
        </div>

        <div className="space-y-4 mb-8 flex-grow">
          {tier.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  feature.included
                    ? isMax
                      ? 'bg-primary/20'
                      : 'bg-secondary/50'
                    : 'bg-transparent'
                }`}
              >
                {feature.included ? (
                  <Check className={`w-3 h-3 ${isMax ? 'text-primary' : 'text-foreground'}`} />
                ) : (
                  <X className="w-3 h-3 text-muted-foreground/50" />
                )}
              </div>
              <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                {feature.name}
                {feature.tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 inline ml-1.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{feature.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <PricingTierActions
            tier={tier}
            currentPlan={currentPlan}
            isCurrent={isCurrent}
            hasStripeSubscription={hasStripeSubscription}
            subscriptionCancelAt={subscriptionCancelAt}
          />
        </div>
      </div>
    </div>
  );
}
