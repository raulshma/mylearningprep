"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

/**
 * Detects whether the app is running as an installed Progressive Web App (PWA).
 *
 * Safely returns `false` when executed outside a browser environment (for example, during server-side rendering).
 *
 * @returns `true` if the app is running as an installed PWA (standalone display mode or iOS standalone), `false` otherwise.
 */
function isRunningAsPwa(): boolean {
  // Chrome/Edge/Android
  if (typeof window !== "undefined") {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;

    // iOS Safari installed web app
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone) return true;
  }

  return false;
}

/**
 * Redirects authenticated users to /dashboard when the app is running as an installed PWA.
 *
 * Does not perform navigation in regular browser tabs; renders nothing otherwise.
 *
 * @returns The component renders `null`.
 */
export function PwaSignedInRedirect() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    if (!isRunningAsPwa()) return;

    router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  return null;
}