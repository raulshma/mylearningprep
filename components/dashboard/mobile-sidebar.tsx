"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/ui/logo";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUsage } from "./sidebar-usage";
import { SidebarUser } from "./sidebar-user";

interface MobileSidebarProps {
  isAdmin: boolean;
  usage: {
    iterations: { count: number; limit: number };
    interviews: { count: number; limit: number };
    plan: string;
    isByok: boolean;
  };
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

export function MobileSidebar({ isAdmin, usage, user }: MobileSidebarProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close sheet when pathname changes (navigation occurred)
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden min-h-[44px] min-w-[44px]"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0 bg-white dark:bg-black/20 backdrop-blur-md border-r border-border dark:border-white/10"
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        {/* Subtle tint overlay */}
        <div className="absolute inset-0 dark:bg-white/[0.02] pointer-events-none" />

        {/* Logo Section */}
        <div className="relative p-6">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        {/* Navigation */}
        <div className="relative flex-1 overflow-y-auto">
          <SidebarNav isAdmin={isAdmin} isProPlan={usage.plan === 'PRO'} isMaxPlan={usage.plan === 'MAX'} />
        </div>

        {/* Bottom Section */}
        <div className="relative mt-auto">
          {/* Usage Stats */}
          <div className="p-4">
            <SidebarUsage
              iterations={usage.iterations}
              interviews={usage.interviews}
              plan={usage.plan}
              isByok={usage.isByok}
            />
          </div>

          {/* Plan Badge */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 ${
                    usage.plan === "FREE"
                      ? "bg-muted-foreground"
                      : usage.plan === "PRO"
                      ? "bg-blue-500"
                      : "bg-amber-500"
                  }`}
                />
                <span className="text-xs font-mono text-muted-foreground">
                  {usage.isByok ? "BYOK" : usage.plan} plan
                </span>
              </div>
              {usage.plan === "FREE" && !usage.isByok && (
                <Link
                  href="/settings/upgrade"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-foreground transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Upgrade</span>
                </Link>
              )}
            </div>
          </div>

          {/* User Section */}
          <SidebarUser
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
            imageUrl={user.imageUrl}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
