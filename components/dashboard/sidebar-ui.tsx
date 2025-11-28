"use client";

import { Logo } from "@/components/ui/logo";
import { ViewTransitionLink } from "@/components/transitions/view-transition-link";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUsage } from "./sidebar-usage";
import { SidebarUser } from "./sidebar-user";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";
import type { SidebarData } from "./sidebar";

interface SidebarUiProps {
  data: SidebarData;
}

export function SidebarUi({ data }: SidebarUiProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        "bg-white dark:bg-black/20 backdrop-blur-md border-r border-border dark:border-white/10 flex flex-col h-screen sticky top-0 z-50 transition-all duration-300",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Subtle tint overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-transparent dark:from-white/5 dark:via-transparent dark:to-white/5 pointer-events-none" />

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 z-50 p-1 bg-background border border-border rounded-full shadow-sm hover:bg-accent transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Logo Section */}
      <div
        className={cn(
          "relative p-8 pb-6",
          isCollapsed && "px-4 pb-6 flex justify-center"
        )}
      >
        <ViewTransitionLink href="/" viewTransitionName="logo">
          {isCollapsed ? (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                S
              </span>
            </div>
          ) : (
            <Logo />
          )}
        </ViewTransitionLink>
      </div>

      {/* Navigation */}
      <div className="relative flex-1 overflow-y-auto px-4 scrollbar-hide">
        <SidebarNav isAdmin={data.isAdmin} isMaxPlan={data.usage.plan === 'MAX'} isCollapsed={isCollapsed} />
      </div>

      {/* Bottom Section */}
      <div className={cn("relative p-4 space-y-4", isCollapsed && "px-2")}>
        {/* Usage Stats - Hide when collapsed */}
        {!isCollapsed && (
          <div className="px-2">
            <SidebarUsage
              iterations={data.usage.iterations}
              interviews={data.usage.interviews}
              plan={data.usage.plan}
              isByok={data.usage.isByok}
            />
          </div>
        )}

        {/* Plan Badge - Hide when collapsed */}
        {!isCollapsed && (
          <div className="px-4 py-3 bg-muted dark:bg-white/5 rounded-2xl border border-border dark:border-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${data.usage.plan === "FREE"
                      ? "bg-muted-foreground"
                      : data.usage.plan === "PRO"
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                />
                <span className="text-xs font-medium text-foreground">
                  {data.usage.isByok ? "BYOK" : data.usage.plan} Plan
                </span>
              </div>
              {data.usage.plan === "FREE" && !data.usage.isByok && (
                <ViewTransitionLink
                  href="/settings/upgrade"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Upgrade</span>
                </ViewTransitionLink>
              )}
            </div>
          </div>
        )}

        {/* User Section */}
        <SidebarUser
          firstName={data.user.firstName}
          lastName={data.user.lastName}
          email={data.user.email}
          imageUrl={data.user.imageUrl}
          isCollapsed={isCollapsed}
        />
      </div>
    </aside>
  );
}
