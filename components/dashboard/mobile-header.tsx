"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";

interface MobileHeaderProps {
  /** Optional slot for a menu trigger (was used for the hamburger sidebar) */
  menuTrigger?: React.ReactNode;
  /** Optional title to display in the header */
  title?: string;
  /** Whether to show a back button instead of the logo */
  showBackButton?: boolean;
  /** Custom back URL (defaults to browser back) */
  backUrl?: string;
}

/**
 * Render a mobile-only header containing an optional menu trigger, centered title/logo or back button, and a balancing placeholder.
 *
 * @param menuTrigger - Optional element displayed at the left (e.g., a hamburger button); a fixed 44px placeholder is used when absent
 * @param title - Optional center title text; shown when `showBackButton` is false and a title is provided
 * @param showBackButton - When true, shows a back button in the center that navigates to `backUrl` or performs a browser back action
 * @param backUrl - Optional URL to navigate to when the back button is pressed; falls back to router.back() if not provided
 * @returns The header JSX element used as the mobile top navigation
 */
export function MobileHeader({
  menuTrigger,
  title,
  showBackButton = false,
  backUrl,
}: MobileHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <header data-mobile-header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b bg-background">
      {/* Left side: Menu trigger */}
      <div className="flex items-center gap-2">
        {menuTrigger ?? <div className="w-[44px]" />}
      </div>

      {/* Center: Logo or Title */}
      <div className="flex-1 flex items-center justify-center">
        {showBackButton ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="min-h-[44px] min-w-[44px] gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
        ) : title ? (
          <span className="font-mono text-sm truncate">{title}</span>
        ) : (
          <Link href="/">
            <Logo className="scale-90" />
          </Link>
        )}
      </div>

      {/* Right side: Placeholder for balance */}
      <div className="w-[44px]" />
    </header>
  );
}