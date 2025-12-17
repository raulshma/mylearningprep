"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map as MapIcon,
  Plus,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SidebarData } from "./sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/constants";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUsage } from "./sidebar-usage";
import { SidebarUser } from "./sidebar-user";

interface MobileBottomNavProps {
  sidebarData: SidebarData;
}

/**
 * Determine whether a navigation link should be considered active for the current pathname.
 *
 * Treats `/dashboard`, `/dashboard/new`, `/journeys`, and `/ai-chat` as requiring exact matches;
 * for other routes, a link is active when `pathname` equals `href` or starts with `href + '/'`.
 *
 * @param pathname - The current location pathname (e.g., from the router)
 * @param href - The link href to test for activity
 * @returns `true` if the link should be considered active, `false` otherwise
 */
function isActiveRoute(pathname: string, href: string) {
  // Exact match for specific routes
  if (
    href === "/dashboard" ||
    href === "/dashboard/new" ||
    href === "/journeys" ||
    href === "/ai-chat"
  ) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Renders a navigation item as a vertically stacked icon and label linking to the given route.
 *
 * @param href - Destination URL for the navigation item.
 * @param label - Text label displayed beneath the icon.
 * @param icon - Icon component to render above the label; receives a `className` prop for sizing and color.
 * @param active - Whether the item is active; applies active styling and sets `aria-current="page"`.
 * @returns A Link element containing the icon and label styled for the mobile bottom navigation.
 */
function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 min-h-[44px] px-2 rounded-xl transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          active ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span className="text-[11px] leading-none font-medium">{label}</span>
    </Link>
  );
}

/**
 * Render the mobile bottom navigation bar for small screens with primary navigation items, a prominent "New" action, and a "More" sheet containing full navigation, usage, and user details.
 *
 * @param sidebarData - Data used to determine admin status, plan/usage details, and user information shown in the More sheet
 * @returns The navigation element containing the mobile dashboard controls and the expandable More sheet
 */
export function MobileBottomNav({ sidebarData }: MobileBottomNavProps) {
  const pathname = usePathname() ?? "/";

  const isProPlan = sidebarData.usage.plan === "PRO";
  const isMaxPlan = sidebarData.usage.plan === "MAX";

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border/60 bg-background/85 backdrop-blur-xl",
        "pt-2 pb-safe"
      )}
      aria-label="Primary"
      data-mobile-bottom-nav
    >
      <div className="grid grid-cols-5 items-end px-2 pb-2">
        <NavItem
          href="/dashboard"
          label="Home"
          icon={LayoutDashboard}
          active={isActiveRoute(pathname, "/dashboard")}
        />

        <NavItem
          href="/journeys"
          label="Journeys"
          icon={MapIcon}
          active={isActiveRoute(pathname, "/journeys")}
        />

        {/* Center action */}
        <Link
          href="/dashboard/new"
          className="flex flex-col items-center justify-center gap-1 min-h-[44px] px-2"
          aria-label="Start a new interview"
        >
          <div className="-mt-5">
            <Button
              size="icon"
              className={cn(
                "h-12 w-12 rounded-2xl shadow-lg",
                "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <span className="text-[11px] leading-none font-medium text-muted-foreground">
            New
          </span>
        </Link>

        <NavItem
          href="/ai-chat"
          label="AI Chat"
          icon={MessageSquare}
          active={isActiveRoute(pathname, "/ai-chat")}
        />

        {/* More sheet: contains the full navigation + usage + user */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-h-[44px] px-2 rounded-xl transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Open menu"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[11px] leading-none font-medium">More</span>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="p-0 bg-background border-t border-border max-h-[85vh]"
          >
            <SheetHeader className="px-6 pt-6 pb-4">
              <SheetTitle>{APP_NAME}</SheetTitle>
            </SheetHeader>

            <div className="px-4 pb-4 overflow-y-auto">
              <div className="rounded-2xl border border-border/60 bg-background/50 overflow-hidden">
                <div className="p-3">
                  <SidebarNav
                    isAdmin={sidebarData.isAdmin}
                    isProPlan={isProPlan}
                    isMaxPlan={isMaxPlan}
                    isCollapsed={false}
                  />
                </div>

                <div className="border-t border-border/60 p-4">
                  <SidebarUsage
                    iterations={sidebarData.usage.iterations}
                    interviews={sidebarData.usage.interviews}
                    plan={sidebarData.usage.plan}
                    isByok={sidebarData.usage.isByok}
                  />
                </div>

                <div className="border-t border-border/60 p-4">
                  <SidebarUser
                    firstName={sidebarData.user.firstName}
                    lastName={sidebarData.user.lastName}
                    email={sidebarData.user.email}
                    imageUrl={sidebarData.user.imageUrl}
                  />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}