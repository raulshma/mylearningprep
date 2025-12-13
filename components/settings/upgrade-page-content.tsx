"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Infinity,
  Settings,
  X,
  HelpCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Clock,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  createCheckout,
  createPortalSession,
  downgradeSubscription,
  cancelSubscriptionAction,
} from "@/lib/actions/stripe";
import { useSharedHeader } from "@/components/dashboard/shared-header-context";
import {
  PRICING_TIERS,
  COMPARISON_FEATURES,
  formatPrice,
  type PricingTier,
} from "@/lib/pricing-data";

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "upgrade" | "downgrade";
  fromPlan: string;
  toPlan: PricingTier;
  isLoading: boolean;
  onConfirm: () => void;
}

function PlanChangeDialog({
  open,
  onOpenChange,
  type,
  fromPlan,
  toPlan,
  isLoading,
  onConfirm,
}: PlanChangeDialogProps) {
  const isUpgrade = type === "upgrade";
  const isCancel = toPlan.id === "free";

  const getIcon = () => {
    if (isCancel) return <AlertCircle className="w-12 h-12 text-destructive" />;
    if (isUpgrade) return <ArrowUp className="w-12 h-12 text-primary" />;
    return <ArrowDown className="w-12 h-12 text-amber-500" />;
  };

  const getTitle = () => {
    if (isCancel) return "Cancel Subscription";
    if (isUpgrade) return `Upgrade to ${toPlan.name}`;
    return `Downgrade to ${toPlan.name}`;
  };

  const getDescription = () => {
    if (isCancel) {
      return "Your subscription will remain active until the end of your current billing period. After that, you'll be moved to the Free plan.";
    }
    if (isUpgrade) {
      return `You'll be charged the prorated difference immediately and gain access to all ${toPlan.name} features right away.`;
    }
    return `Your plan will change to ${toPlan.name} at the end of your current billing period. You'll keep your current features until then.`;
  };

  const getPriceChange = () => {
    const currentTier = PRICING_TIERS.find(
      (t) => t.id === fromPlan.toLowerCase(),
    );
    if (!currentTier) return null;

    const diff = toPlan.price - currentTier.price;
    if (diff === 0) return null;

    return {
      from: currentTier.price,
      to: toPlan.price,
      diff: Math.abs(diff),
      isIncrease: diff > 0,
    };
  };

  const priceChange = getPriceChange();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 overflow-hidden bg-card/95  border-white/10"
      >
        <div className="flex flex-col items-center text-center p-8">
          {/* Icon with animated background */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isCancel
                ? "bg-destructive/10"
                : isUpgrade
                  ? "bg-primary/10"
                  : "bg-amber-500/10"
              }`}
          >
            {getIcon()}
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            {getTitle()}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm"
          >
            {getDescription()}
          </motion.p>

          {/* Price comparison */}
          {priceChange && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-secondary/30 w-full"
            >
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <p className="text-lg font-semibold text-muted-foreground line-through">
                  ${priceChange.from}/mo
                </p>
              </div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${priceChange.isIncrease ? "bg-primary/20" : "bg-amber-500/20"
                  }`}
              >
                {priceChange.isIncrease ? (
                  <ArrowUp className="w-4 h-4 text-primary" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">New</p>
                <p
                  className={`text-lg font-semibold ${priceChange.isIncrease ? "text-primary" : "text-amber-500"}`}
                >
                  ${priceChange.to}/mo
                </p>
              </div>
            </motion.div>
          )}

          {/* Key features for upgrade */}
          {isUpgrade && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="w-full mb-6"
            >
              <p className="text-xs text-muted-foreground mb-3">
                What you&apos;ll get
              </p>
              <div className="space-y-2">
                {toPlan.previewFeatures.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* What you'll lose for downgrade */}
          {!isUpgrade && !isCancel && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="w-full mb-6"
            >
              <p className="text-xs text-muted-foreground mb-3">
                Features you&apos;ll lose
              </p>
              <div className="space-y-2">
                {PRICING_TIERS.find((t) => t.id === fromPlan.toLowerCase())
                  ?.features.filter(
                    (f) =>
                      f.included &&
                      !toPlan.features.find((tf) => tf.name === f.name)
                        ?.included,
                  )
                  .slice(0, 3)
                  .map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <X className="w-4 h-4 text-destructive/70 shrink-0" />
                      <span>{feature.name}</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Action buttons - Apple style footer */}
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
              className={`flex-1 py-4 text-sm font-medium transition-colors disabled:opacity-50 ${isCancel
                  ? "text-destructive hover:bg-destructive/10"
                  : isUpgrade
                    ? "text-primary hover:bg-primary/10"
                    : "text-amber-500 hover:bg-amber-500/10"
                }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : isCancel ? (
                "Cancel Subscription"
              ) : isUpgrade ? (
                "Confirm Upgrade"
              ) : (
                "Confirm Downgrade"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UpgradePageContentProps {
  profile: {
    plan: string;
    hasStripeSubscription: boolean;
    subscriptionCancelAt?: string | null;
  };
}

export function UpgradePageContent({ profile }: UpgradePageContentProps) {
  const { setHeader } = useSharedHeader();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: "upgrade" | "downgrade";
    targetTier: PricingTier | null;
  }>({ open: false, type: "upgrade", targetTier: null });

  useEffect(() => {
    setHeader({
      title: "Upgrade Plan",
      description: "Unlock the full potential of MyLearningPrep",
      badge: "Pricing",
      badgeIcon: Sparkles,
    });
  }, [setHeader]);

  const openPlanChangeDialog = (
    tier: PricingTier,
    type: "upgrade" | "downgrade",
  ) => {
    setDialogState({ open: true, type, targetTier: tier });
  };

  const handleConfirmPlanChange = async () => {
    if (!dialogState.targetTier) return;

    setIsLoading(true);
    try {
      if (dialogState.type === "upgrade") {
        const planEnum = dialogState.targetTier.id === "pro" ? "PRO" : "MAX";
        const result = await createCheckout(planEnum);
        if (result.success) {
          if (result.upgraded) {
            window.location.href = "/dashboard?checkout=success&upgraded=true";
          } else if (result.url) {
            window.location.href = result.url;
          }
        }
      } else {
        const targetPlan =
          dialogState.targetTier.id === "free" ? "FREE" : "PRO";
        const result =
          targetPlan === "FREE"
            ? await cancelSubscriptionAction()
            : await downgradeSubscription(targetPlan as "PRO");

        if (result.success) {
          window.location.reload();
        } else {
          console.error("Plan change failed:", result.error);
        }
      }
    } catch (error) {
      console.error("Failed to change plan:", error);
    } finally {
      setIsLoading(false);
      setDialogState((prev) => ({ ...prev, open: false }));
    }
  };

  // Check if user can downgrade to a specific tier
  const canDowngradeTo = (tierId: string): boolean => {
    if (!profile.hasStripeSubscription) return false;
    if (profile.plan === "MAX" && tierId === "pro") return true;
    if ((profile.plan === "MAX" || profile.plan === "PRO") && tierId === "free")
      return true;
    return false;
  };

  // Check if user can upgrade to a specific tier
  const canUpgradeTo = (tierId: string): boolean => {
    if (tierId === "free") return false;
    if (profile.plan === "FREE" && (tierId === "pro" || tierId === "max"))
      return true;
    if (profile.plan === "PRO" && tierId === "max") return true;
    return false;
  };

  const handleManage = async () => {
    setIsLoading(true);
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to open portal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if a tier is the current plan
  const isCurrentPlan = (tier: PricingTier) => {
    if (tier.id === "free" && profile.plan === "FREE") return true;
    if (tier.id === "pro" && profile.plan === "PRO") return true;
    if (tier.id === "max" && profile.plan === "MAX") return true;
    return false;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {PRICING_TIERS.map((tier, index) => {
          const isCurrent = isCurrentPlan(tier);
          const isPro = tier.id === "pro";
          const isMax = tier.id === "max";

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-4xl overflow-hidden flex flex-col h-full ${isMax
                  ? "p-[4px] bg-purple-500/50 shadow-2xl shadow-primary/20"
                  : isPro
                    ? "p-8 border border-primary/50 bg-card/50  shadow-xl shadow-primary/10"
                    : "p-8 border border-white/10 bg-card/30 "
                }`}
            >
              {isMax && (
                <div className="absolute inset-0 bg-primary/10 blur-xl" />
              )}

              {/* Inner container for Max plan to create the border effect */}
              <div
                className={`relative z-10 flex flex-col h-full ${isMax ? "bg-card/90  rounded-4xl p-8" : ""}`}
              >
                {/* Background Icon */}
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  {tier.id === "free" && <Shield className="w-32 h-32" />}
                  {tier.id === "pro" && <Zap className="w-32 h-32" />}
                  {tier.id === "max" && (
                    <Infinity className="w-32 h-32 text-primary" />
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-foreground">
                      {tier.name}
                    </h3>
                    {tier.badge && (
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 px-3 py-1 rounded-full">
                        {tier.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground min-h-[40px]">
                    {tier.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold text-foreground">
                    {formatPrice(tier.price)}
                  </span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${feature.included
                            ? isMax
                              ? "bg-primary/20"
                              : "bg-secondary/50"
                            : "bg-transparent"
                          }`}
                      >
                        {feature.included ? (
                          <Check
                            className={`w-3 h-3 ${isMax ? "text-primary" : "text-foreground"}`}
                          />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground/50" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground/70"}`}
                      >
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

                <div className="mt-auto space-y-3">
                  {isCurrent ? (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full h-12 rounded-full border-white/10 bg-white/5"
                    >
                      Current Plan
                    </Button>
                  ) : canDowngradeTo(tier.id) ? (
                    <Button
                      onClick={() => openPlanChangeDialog(tier, "downgrade")}
                      disabled={isLoading || !!profile.subscriptionCancelAt}
                      variant="outline"
                      className="w-full h-12 rounded-full border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                    >
                      {profile.subscriptionCancelAt
                        ? "Cancellation Pending"
                        : "Downgrade"}
                    </Button>
                  ) : canUpgradeTo(tier.id) ? (
                    <Button
                      onClick={() => openPlanChangeDialog(tier, "upgrade")}
                      disabled={isLoading}
                      variant={isMax ? "default" : "outline"}
                      className={`w-full h-12 rounded-full transition-all ${isMax
                          ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
                          : "border-primary/20 hover:bg-primary/10 hover:text-primary"
                        }`}
                    >
                      {isMax ? (
                        <Sparkles className="w-4 h-4 mr-2" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      {tier.cta}
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full h-12 rounded-full border-white/10 bg-white/5"
                    >
                      {tier.id === "free" ? "Current Plan" : tier.cta}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {profile.subscriptionCancelAt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 max-w-2xl mx-auto"
        >
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 ">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <CalendarClock className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-1">
                  Subscription Ending Soon
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your {profile.plan} plan is scheduled to end on{" "}
                  <span className="font-medium text-foreground">
                    {new Date(profile.subscriptionCancelAt).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </span>
                </p>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-400">
                    You still have full access to all {profile.plan} features
                    until then
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {profile.hasStripeSubscription && (
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
      )}

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-16 p-8 rounded-4xl bg-card/30  border border-white/5"
      >
        <h3 className="text-xl font-bold text-center mb-8">
          Feature Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                  Feature
                </th>
                {PRICING_TIERS.map((tier) => (
                  <th
                    key={tier.id}
                    className={`text-center py-4 px-6 text-sm font-bold ${tier.id === "max" ? "text-primary" : "text-foreground"}`}
                  >
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMPARISON_FEATURES.map((feature, index) => (
                <tr key={index}>
                  <td className="py-4 px-6 text-sm font-medium">
                    {feature.name}
                  </td>
                  <td className="text-center py-4 px-6 text-sm text-muted-foreground">
                    {typeof feature.free === "boolean" ? (
                      feature.free ? (
                        <Check className="w-4 h-4 mx-auto text-foreground" />
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )
                    ) : (
                      feature.free
                    )}
                  </td>
                  <td className="text-center py-4 px-6 text-sm text-foreground">
                    {typeof feature.pro === "boolean" ? (
                      feature.pro ? (
                        <Check className="w-4 h-4 mx-auto text-foreground" />
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )
                    ) : (
                      feature.pro
                    )}
                  </td>
                  <td className="text-center py-4 px-6 text-sm font-bold text-foreground">
                    {typeof feature.max === "boolean" ? (
                      feature.max ? (
                        <Check className="w-4 h-4 mx-auto text-primary" />
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )
                    ) : (
                      feature.max
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Plan Change Confirmation Dialog */}
      {dialogState.targetTier && (
        <PlanChangeDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
          type={dialogState.type}
          fromPlan={profile.plan}
          toPlan={dialogState.targetTier}
          isLoading={isLoading}
          onConfirm={handleConfirmPlanChange}
        />
      )}
    </div>
  );
}
