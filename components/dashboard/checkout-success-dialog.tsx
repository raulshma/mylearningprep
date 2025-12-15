"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PartyPopper,
  Check,
  Sparkles,
  BarChart3,
  Key,
  Settings,
  FileDown,
  Palette,
  Wand2,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface CheckoutSuccessDialogProps {
  plan: string;
}

const PRO_FEATURES = [
  {
    icon: Wand2,
    label: "All Analogy Styles",
    description: "Professional, construction & simple",
  },
  {
    icon: FileDown,
    label: "PDF Export",
    description: "Download your prep materials",
  },
  {
    icon: Palette,
    label: "Custom Theme",
    description: "Personalize your workspace",
  },
  {
    icon: Sparkles,
    label: "Advanced AI",
    description: "Higher-quality generation",
  },
];

const MAX_FEATURES = [
  {
    icon: BarChart3,
    label: "Analytics & Insights",
    description: "Track your progress",
    href: "/settings/analytics",
  },
  {
    icon: Key,
    label: "Bring Your Own Key",
    description: "Use your OpenRouter API key",
  },
  {
    icon: Settings,
    label: "Custom Prompts",
    description: "Customize AI behavior",
  },
];

export function CheckoutSuccessDialog({ plan }: CheckoutSuccessDialogProps) {
  const searchParams = useSearchParams();
  const processedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [isUpgrade, setIsUpgrade] = useState(false);
  const [displayPlan, setDisplayPlan] = useState(plan);

  // Test payment notification
  const TestPaymentNotice = () => (
    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 mb-4">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
        ⚠️ Test Payment
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-400">
        This is a test environment. No real charges have been made.
      </p>
    </div>
  );

  // Use effect for state updates and URL cleanup
  React.useEffect(() => {
    if (processedRef.current) return;

    const checkout = searchParams.get("checkout");
    const upgraded = searchParams.get("upgraded");
    const urlPlan = searchParams.get("plan");

    if (checkout === "success") {
      processedRef.current = true;
      setOpen(true);
      setIsUpgrade(upgraded === "true");
      // Use plan from URL params (set during Stripe redirect) if available,
      // otherwise fall back to the prop (which may be stale before webhook processes)
      if (urlPlan && (urlPlan === "PRO" || urlPlan === "MAX")) {
        setDisplayPlan(urlPlan);
      }

      // Clean up URL without triggering navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("upgraded");
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  const handleClose = () => {
    setOpen(false);
  };

  const isPro = displayPlan === "PRO";
  const isMax = displayPlan === "MAX";
  const features = isMax ? [...PRO_FEATURES, ...MAX_FEATURES] : PRO_FEATURES;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
          >
            <PartyPopper className="w-8 h-8 text-white" />
          </motion.div>
          <DialogTitle className="text-2xl font-bold">
            {isUpgrade ? "Upgrade Complete!" : "Welcome to " + displayPlan + "!"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isUpgrade
              ? `You've successfully upgraded to the ${displayPlan} plan.`
              : `Thank you for subscribing to the ${displayPlan} plan!`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <TestPaymentNotice />
          <p className="text-sm font-medium text-muted-foreground text-center">
            You now have access to:
          </p>
          <div className="space-y-2">
            <AnimatePresence>
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {feature.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {isMax && (
            <Button asChild className="w-full rounded-full gap-2">
              <Link href="/settings/analytics">
                <BarChart3 className="w-4 h-4" />
                View Analytics
              </Link>
            </Button>
          )}
          <Button
            variant={isMax ? "outline" : "default"}
            onClick={handleClose}
            className="w-full rounded-full"
          >
            {isMax ? "Continue to Dashboard" : "Start Exploring"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
