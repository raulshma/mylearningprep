"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWA_INSTALL_DISMISSED_KEY = "pwa-install-dismissed";
const DISMISS_DURATION_DAYS = 7;

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("SW registration failed:", err));
    }

    // Check if already installed or dismissed recently
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;

    if (isStandalone) return;

    const dismissedAt = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed =
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_DURATION_DAYS) return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  useEffect(() => {
    if (!deferredPrompt) return;

    // Check if dismissed recently before showing toast
    const dismissedAt = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed =
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_DURATION_DAYS) return;
    }

    // Small delay to not interrupt initial page load
    const timer = setTimeout(() => {
      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 bg-background border border-border rounded-2xl p-4 shadow-lg w-full max-w-md">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Install MyLearningPrep</p>
              <p className="text-xs text-muted-foreground">
                Add to home screen for quick access
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  localStorage.setItem(
                    PWA_INSTALL_DISMISSED_KEY,
                    new Date().toISOString()
                  );
                  toast.dismiss(t);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                className="h-8"
                onClick={async () => {
                  toast.dismiss(t);
                  await deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === "accepted") {
                    toast.success("App installed successfully!");
                  }
                  setDeferredPrompt(null);
                }}
              >
                Install
              </Button>
            </div>
          </div>
        ),
        {
          duration: 15000,
          position: "bottom-center",
        }
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  return <>{children}</>;
}
