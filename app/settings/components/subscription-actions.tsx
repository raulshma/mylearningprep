'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Zap } from "lucide-react";
import { createPortalSession } from "@/lib/actions/stripe";

interface SubscriptionActionsProps {
  plan: string;
  hasStripeSubscription: boolean;
}

export function SubscriptionActions({ plan, hasStripeSubscription }: SubscriptionActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!hasStripeSubscription) {
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

  return (
    <div className="flex flex-col sm:flex-row gap-4 pt-2">
      {plan !== "MAX" && (
        <Button
          onClick={() => router.push("/settings/upgrade")}
          className="flex-1 h-11 rounded-full font-medium shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Zap className="w-4 h-4 mr-2" />
          {plan === "FREE" ? "Upgrade to Pro" : "Upgrade to Max"}
        </Button>
      )}
      {hasStripeSubscription && (
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
  );
}
