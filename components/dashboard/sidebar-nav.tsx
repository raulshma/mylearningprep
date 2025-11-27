"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Settings,
  CreditCard,
  Shield,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewTransitionLink } from "@/components/transitions/view-transition-link";

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
    href: "/learning/new",
    label: "Learning Path",
    icon: GraduationCap,
    description: "Learn topics",
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

const adminItem = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
  description: "Manage users",
};

interface SidebarNavProps {
  isAdmin?: boolean;
}

export function SidebarNav({ isAdmin = false }: SidebarNavProps) {
  const pathname = usePathname();

  const items = isAdmin ? [...navItems, adminItem] : navItems;

  const isActiveRoute = (href: string) => {
    // Exact match for specific routes
    if (href === "/dashboard" || href === "/settings" || href === "/settings/upgrade") {
      return pathname === href;
    }
    // For other routes, use startsWith
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="p-3">
      <div className="mb-1 px-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
          Navigation
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const active = isActiveRoute(item.href);

          return (
            <li key={item.href}>
              <ViewTransitionLink
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground" />
                )}

                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-6 transition-colors",
                    active
                      ? "bg-foreground/10"
                      : "bg-transparent group-hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm">{item.label}</div>
                </div>

                <ChevronRight
                  className={cn(
                    "w-3 h-3 transition-all duration-200",
                    active
                      ? "opacity-100 text-foreground"
                      : "opacity-0 group-hover:opacity-50 text-muted-foreground"
                  )}
                />
              </ViewTransitionLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
