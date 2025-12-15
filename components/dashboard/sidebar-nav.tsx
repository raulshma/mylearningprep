"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  Plus,
  Settings,
  CreditCard,
  Shield,
  ChevronRight,
  BarChart3,
  Activity,
  MessageSquare,
  Map,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Your interviews",
  },
  {
    href: "/dashboard/new",
    label: "New Interview",
    icon: Plus,
    description: "Start preparing",
  },
  {
    href: "/roadmaps",
    label: "Roadmaps",
    icon: Map,
    description: "Learning paths",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Preferences",
  },
  {
    href: "/settings/upgrade",
    label: "Upgrade",
    icon: CreditCard,
    description: "Get more",
  },
];

const aiChatItem = {
  href: "/ai-chat",
  label: "AI Chat",
  icon: MessageSquare,
  description: "Chat assistant",
};

const analyticsItem = {
  href: "/settings/analytics",
  label: "Analytics",
  icon: BarChart3,
  description: "Your insights",
};

const usageItem = {
  href: "/settings/usage",
  label: "AI Usage",
  icon: Activity,
  description: "Request logs",
};

const adminItem = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
  description: "Manage users",
};

interface SidebarNavProps {
  isAdmin?: boolean;
  isMaxPlan?: boolean;
  isProPlan?: boolean;
}

export function SidebarNav({
  isAdmin = false,
  isMaxPlan = false,
  isProPlan = false,
  isCollapsed = false,
}: SidebarNavProps & { isCollapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  let items = [...navItems];
  // AI Chat is available for all users (with different limits per plan)
  items = [...items, aiChatItem];
  // Analytics is available for PRO+ users
  if (isProPlan || isMaxPlan) {
    items = [...items, analyticsItem];
  }
  // Usage is MAX exclusive
  if (isMaxPlan) {
    items = [...items, usageItem];
  }
  if (isAdmin) {
    items = [...items, adminItem];
  }

  const isActiveRoute = (href: string) => {
    // Exact match for specific routes
    if (
      href === "/dashboard" ||
      href === "/settings" ||
      href === "/settings/upgrade"
    ) {
      return pathname === href;
    }
    // For other routes, use startsWith
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    // Don't navigate if already on this route
    if (isActiveRoute(href)) return;
    
    setLoadingHref(href);
    
    startTransition(() => {
      router.push(href);
    });
  };

  // Reset loading state when navigation completes
  const isLoading = (href: string) => isPending && loadingHref === href;

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = isActiveRoute(item.href);
        const loading = isLoading(item.href);

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300",
                active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                {/* Spinner - shown when loading */}
                <Loader2
                  className={cn(
                    "w-5 h-5 absolute animate-spin transition-opacity duration-200",
                    loading ? "opacity-100" : "opacity-0",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                />
                {/* Icon - hidden when loading */}
                <item.icon
                  className={cn(
                    "w-5 h-5 absolute transition-all duration-200 group-hover:scale-110",
                    loading ? "opacity-0 scale-75" : "opacity-100 scale-100",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
              </div>
              {!isCollapsed && <span>{item.label}</span>}

              {!isCollapsed && active && (
                <ChevronRight className="w-4 h-4 ml-auto text-primary-foreground/50" />
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
