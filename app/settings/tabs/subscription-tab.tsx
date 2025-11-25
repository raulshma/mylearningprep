"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ExternalLink, Loader2 } from "lucide-react";
import { createPortalSession } from "@/lib/actions/stripe";

interface SubscriptionTabProps {
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

export function SubscriptionTab({
  profile,
  subscription,
}: SubscriptionTabProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const plan = profile.plan;
  const iterations = profile.iterations;
  const interviews = profile.interviews;
  const iterationsPercentage =
    iterations.limit > 0
      ? Math.min((iterations.count / iterations.limit) * 100, 100)
      : 0;
  const interviewsPercentage =
    interviews.limit > 0
      ? Math.min((interviews.count / interviews.limit) * 100, 100)
      : 0;

  const handleManageSubscription = async () => {
    if (!profile.hasStripeSubscription) {
      router.push("/pricing");
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

  const getPlanDescription = (plan: string) => {
    switch (plan) {
      case "FREE":
        return "You're on the Free plan";
      case "PRO":
        return "You're on the Pro plan";
      case "MAX":
        return "You're on the Max plan";
      default:
        return "You're on the Free plan";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono text-lg">Current Plan</CardTitle>
              <CardDescription>{getPlanDescription(plan)}</CardDescription>
            </div>
            <Badge>{plan}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Monthly Usage
              </p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Iterations</span>
                    <span>{iterations.count} / {iterations.limit}</span>
                  </div>
                  <div className="h-2 bg-muted">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${iterationsPercentage}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Interviews</span>
                    <span>{interviews.count} / {interviews.limit}</span>
                  </div>
                  <div className="h-2 bg-muted">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${interviewsPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {plan !== "MAX" && (
                <Button onClick={() => router.push("/pricing")}>
                  {plan === "FREE" ? "Upgrade to Pro" : "Upgrade to Max"}
                </Button>
              )}
              {profile.hasStripeSubscription && (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Manage in Stripe
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {profile.hasStripeSubscription && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Billing</CardTitle>
            <CardDescription>
              Manage your billing and invoices through Stripe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              View Billing History
            </Button>
          </CardContent>
        </Card>
      )}

      {!profile.hasStripeSubscription && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono text-lg">
              Upgrade Your Plan
            </CardTitle>
            <CardDescription>Get more iterations and features</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro or Max to unlock more interview preps and AI
              interactions.
            </p>
            <Button onClick={() => router.push("/pricing")}>View Plans</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
