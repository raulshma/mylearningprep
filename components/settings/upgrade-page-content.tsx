'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles, Zap, Shield, Infinity, Settings, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createCheckout, createPortalSession } from '@/lib/actions/stripe';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';
import { PRICING_TIERS, COMPARISON_FEATURES, formatPrice, type PricingTier } from '@/lib/pricing-data';

interface UpgradePageContentProps {
  profile: {
    plan: string;
    hasStripeSubscription: boolean;
  };
}

export function UpgradePageContent({ profile }: UpgradePageContentProps) {
  const { setHeader } = useSharedHeader();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setHeader({
      title: 'Upgrade Plan',
      description: 'Unlock the full potential of Syntax State',
      badge: 'Pricing',
      badgeIcon: Sparkles,
    });
  }, [setHeader]);

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    setIsLoading(true);
    try {
      // Map pricing tier ID to subscription plan enum
      const planEnum = planId === 'pro' ? 'PRO' : 'MAX';
      const result = await createCheckout(planEnum);
      if (result.success) {
        if (result.upgraded) {
          // Prorated upgrade completed - redirect to dashboard with success
          window.location.href = '/dashboard?checkout=success&upgraded=true';
        } else if (result.url) {
          window.location.href = result.url;
        }
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManage = async () => {
    setIsLoading(true);
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if a tier is the current plan
  const isCurrentPlan = (tier: PricingTier) => {
    if (tier.id === 'free' && profile.plan === 'FREE') return true;
    if (tier.id === 'pro' && profile.plan === 'PRO') return true;
    if (tier.id === 'max' && profile.plan === 'MAX') return true;
    return false;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {PRICING_TIERS.map((tier, index) => {
          const isCurrent = isCurrentPlan(tier);
          const isPro = tier.id === 'pro';
          const isMax = tier.id === 'max';

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-[2.5rem] overflow-hidden flex flex-col h-full ${isMax
                ? 'p-[4px] bg-gradient-to-b from-primary/50 to-purple-500/50 shadow-2xl shadow-primary/20'
                : isPro
                  ? 'p-8 border border-primary/50 bg-card/50 backdrop-blur-xl shadow-xl shadow-primary/10'
                  : 'p-8 border border-white/10 bg-card/30 backdrop-blur-xl'
                }`}
            >
              {isMax && (
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-purple-500/20 blur-xl" />
              )}

              {/* Inner container for Max plan to create the border effect */}
              <div className={`relative z-10 flex flex-col h-full ${isMax ? 'bg-card/90 backdrop-blur-xl rounded-[2.4rem] p-8' : ''}`}>

                {/* Background Icon */}
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  {tier.id === 'free' && <Shield className="w-32 h-32" />}
                  {tier.id === 'pro' && <Zap className="w-32 h-32" />}
                  {tier.id === 'max' && <Infinity className="w-32 h-32 text-primary" />}
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
                  <span className="text-4xl font-bold text-foreground">{formatPrice(tier.price)}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${feature.included
                        ? isMax ? 'bg-primary/20' : 'bg-secondary/50'
                        : 'bg-transparent'
                        }`}>
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
                  {isCurrent ? (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full h-12 rounded-full border-white/10 bg-white/5"
                    >
                      Current Plan
                    </Button>
                  ) : tier.id === 'free' ? (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full h-12 rounded-full border-white/10 bg-white/5"
                    >
                      Downgrade
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={isLoading}
                      variant={isMax ? 'default' : 'outline'}
                      className={`w-full h-12 rounded-full transition-all ${isMax
                        ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]'
                        : 'border-primary/20 hover:bg-primary/10 hover:text-primary'
                        }`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : isMax ? (
                        <Sparkles className="w-4 h-4 mr-2" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      {tier.cta}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {
        profile.hasStripeSubscription && (
          <div className="mt-12 flex justify-center">
            <Button
              onClick={handleManage}
              disabled={isLoading}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Manage Billing & Subscription
            </Button>
          </div>
        )
      }

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-16 p-8 rounded-[2.5rem] bg-card/30 backdrop-blur-xl border border-white/5"
      >
        <h3 className="text-xl font-bold text-center mb-8">Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Feature</th>
                {PRICING_TIERS.map(tier => (
                  <th key={tier.id} className={`text-center py-4 px-6 text-sm font-bold ${tier.id === 'max' ? 'text-primary' : 'text-foreground'}`}>
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMPARISON_FEATURES.map((feature, index) => (
                <tr key={index}>
                  <td className="py-4 px-6 text-sm font-medium">{feature.name}</td>
                  <td className="text-center py-4 px-6 text-sm text-muted-foreground">
                    {typeof feature.free === 'boolean' ? (
                      feature.free ? <Check className="w-4 h-4 mx-auto text-foreground" /> : <span className="text-muted-foreground/30">-</span>
                    ) : feature.free}
                  </td>
                  <td className="text-center py-4 px-6 text-sm text-foreground">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? <Check className="w-4 h-4 mx-auto text-foreground" /> : <span className="text-muted-foreground/30">-</span>
                    ) : feature.pro}
                  </td>
                  <td className="text-center py-4 px-6 text-sm font-bold text-foreground">
                    {typeof feature.max === 'boolean' ? (
                      feature.max ? <Check className="w-4 h-4 mx-auto text-primary" /> : <span className="text-muted-foreground/30">-</span>
                    ) : feature.max}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div >
  );
}
