"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, Settings, CreditCard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/new", label: "New Interview", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/upgrade", label: "Upgrade", icon: CreditCard },
];

interface SidebarNavProps {
  isAdmin?: boolean;
}

export function SidebarNav({ isAdmin = false }: SidebarNavProps) {
  const pathname = usePathname();

  const items = isAdmin 
    ? [...navItems, { href: "/admin", label: "Admin", icon: Shield }]
    : navItems;

  return (
    <nav className="flex-1 p-4">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
