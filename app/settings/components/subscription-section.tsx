'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2, Zap, TrendingUp } from "lucide-react";
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
    return "bg-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border p-6 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <CreditCard className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h2 className="font-mono text-lg text-foreground">Subscription</h2>
            <p className="text-xs text-muted-foreground">Plan & usage</p>
          </div>
        </div>
        <Badge variant={profile.plan === "MAX" ? "default" : "secondary"}>
          {profile.plan}
        </Badge>
      </div>

      <div className="space-y-5">
        {/* Usage meters */}
        <div className="space-y-4">
          <div className="p-4 bg-secondary/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-foreground">Iterations</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {iterations.count} / {iterations.limit}
              </span>
            </div>
            <div className="h-2 bg-muted overflow-hidden">
              <motion.div
                className={`h-full ${getProgressColor(iterationsPercentage)}`}
                initial={{ width: 0 }}
                animate={{ width: `${iterationsPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="p-4 bg-secondary/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-foreground">Interviews</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {interviews.count} / {interviews.limit}
              </span>
            </div>
            <div className="h-2 bg-muted overflow-hidden">
              <motion.div
                className={`h-full ${getProgressColor(interviewsPercentage)}`}
                initial={{ width: 0 }}
                animate={{ width: `${interviewsPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {profile.plan !== "MAX" && (
            <Button 
              onClick={() => router.push("/settings/upgrade")}
              className="flex-1"
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
              className="flex-1 bg-transparent"
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
          <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
            Upgrade to unlock more interviews and AI iterations.
          </p>
        )}
      </div>
    </motion.div>
  );
}
