"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Settings,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/constants";

const SHOW_ON_PREFIXES = ["/interview", "/learning", "/plan"];

/**
 * Determine whether a navigation href should be considered active for the current pathname.
 *
 * For most routes an href is active when the pathname equals the href or starts with `href + "/"`.
 * For the dashboard-like routes `/dashboard`, `/dashboard/new`, `/journeys`, and `/ai-chat` only an exact pathname match counts as active.
 *
 * @param pathname - The current location pathname (e.g., `"/dashboard/settings"`).
 * @param href - The route href to test for activity (e.g., `"/dashboard"`).
 * @returns `true` if the href is active for the given pathname, `false` otherwise.
 */
function isActiveRoute(pathname: string, href: string) {
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
 * Renders a navigation link displaying an icon and label, with styles and accessibility reflecting the active state.
 *
 * @param icon - React component used as the item's icon; receives an optional `className` prop for styling.
 * @param active - When true, applies active styles and sets `aria-current="page"`.
 * @returns The rendered navigation link element.
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
 * Renders the mobile bottom navigation bar for authenticated app routes that are not inside the sidebar layout.
 *
 * The bar appears only on mobile when the user is signed in and the current path starts with one of the configured prefixes. It includes Home, Journeys, a central "New" action, AI Chat, and a "More" sheet with Settings, conditional Admin, and Sign Out. While visible, the component adds the `has-mobile-bottom-nav` class to the document body to reserve layout space.
 *
 * @returns The navigation element when it should be shown, `null` otherwise.
 */
export function MobileBottomNavGlobal() {
  const pathname = usePathname() ?? "/";
  const isMobile = useIsMobile();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const shouldRender =
    isMobile &&
    isLoaded &&
    isSignedIn &&
    SHOW_ON_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  React.useEffect(() => {
    // Add padding to avoid the fixed bottom nav overlapping page content.
    if (!shouldRender) {
      document.body.classList.remove("has-mobile-bottom-nav");
      return;
    }

    document.body.classList.add("has-mobile-bottom-nav");
    return () => {
      document.body.classList.remove("has-mobile-bottom-nav");
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  const isAdmin = (user?.publicMetadata?.role as string | undefined) === "admin";

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
          icon={Map}
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

            <div className="px-4 pb-6 overflow-y-auto">
              <div className="rounded-2xl border border-border/60 bg-background/50 overflow-hidden">
                <div className="p-2">
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
                  >
                    <Settings className="h-4 w-4 text-primary" />
                    Settings
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
                    >
                      <span className="h-4 w-4 rounded bg-primary/15 border border-primary/20" />
                      Admin
                    </Link>
                  )}
                </div>

                <div className="border-t border-border/60 p-2">
                  <button
                    type="button"
                    onClick={() => signOut({ redirectUrl: "/" })}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}