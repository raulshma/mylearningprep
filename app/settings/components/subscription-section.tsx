'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2, Zap, TrendingUp, Sparkles } from "lucide-react";
import { createPortalSession } from "@/lib/actions/stripe";

interface SubscriptionSectionProps {
  profile: {
    plan: string;
    iterations: { count: number; limit: number; resetDate: Date };
    interviews: { count: number; limit: number; resetDate: Date };
    hasStripeSubscription: boolean;
  };
  subscription: {
    plan: string;
    hasSubscription: boolean;
  };
}

export function SubscriptionSection({ profile, subscription }: SubscriptionSectionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const iterations = profile.iterations;
  const interviews = profile.interviews;
  const iterationsPercentage = iterations.limit > 0
    ? Math.min((iterations.count / iterations.limit) * 100, 100)
    : 0;
  const interviewsPercentage = interviews.limit > 0
    ? Math.min((interviews.count / interviews.limit) * 100, 100)
    : 0;

  const handleManageSubscription = async () => {
    if (!profile.hasStripeSubscription) {
      router.push("/settings/upgrade");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card/50  border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Subscription</h2>
            <p className="text-sm text-muted-foreground">Plan & usage</p>
          </div>
        </div>
        <Badge
          variant={profile.plan === "MAX" ? "default" : "secondary"}
          className="self-start sm:self-auto px-4 py-1.5 rounded-full text-sm font-medium"
        >
          {profile.plan === "MAX" && <Sparkles className="w-3 h-3 mr-2" />}
          {profile.plan} Plan
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Usage meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-sm font-medium text-foreground">Iterations</span>
              </div>
              <span className="text-xs font-mono font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-white/5">
                {Number(iterations.count.toFixed(2))} / {iterations.limit}
              </span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className={`h-full rounded-full ${getProgressColor(iterationsPercentage)}`}
                initial={{ width: 0 }}
                animate={{ width: `${iterationsPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm font-medium text-foreground">Interviews</span>
              </div>
              <span className="text-xs font-mono font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-white/5">
                {interviews.count} / {interviews.limit}
              </span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className={`h-full rounded-full ${getProgressColor(interviewsPercentage)}`}
                initial={{ width: 0 }}
                animate={{ width: `${interviewsPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          {profile.plan !== "MAX" && (
            <Button
              onClick={() => router.push("/settings/upgrade")}
              className="flex-1 h-11 rounded-full font-medium shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Zap className="w-4 h-4 mr-2" />
              {profile.plan === "FREE" ? "Upgrade to Pro" : "Upgrade to Max"}
            </Button>
          )}
          {profile.hasStripeSubscription && (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isLoading}
              className="flex-1 h-11 rounded-full bg-transparent border-white/10 hover:bg-secondary/50 hover:border-primary/20 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Manage Billing
            </Button>
          )}
        </div>

        {!profile.hasStripeSubscription && profile.plan === "FREE" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Upgrade to unlock more interviews and AI iterations.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
