"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { ViewTransitionLink } from "@/components/transitions/view-transition-link";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUsage } from "./sidebar-usage";
import { SidebarSignOut } from "./sidebar-signout";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebarContext, type SidebarData } from "./sidebar-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface SidebarClientProps {
  initialData: SidebarData;
}

function NavSkeleton() {
  return (
    <nav className="flex-1 p-4">
      <ul className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function UsageSkeleton() {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SidebarClient({ initialData }: SidebarClientProps) {
  const { data, isLoaded, updateData } = useSidebarContext();

  // Sync server data to context (only updates if changed)
  useEffect(() => {
    updateData(initialData);
  }, [initialData, updateData]);

  // Use context data if loaded, otherwise show skeleton only on first load
  const displayData = data ?? initialData;
  const showSkeleton = !isLoaded && !data;

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <ViewTransitionLink href="/" viewTransitionName="logo">
          <Logo />
        </ViewTransitionLink>
      </div>

      {showSkeleton ? (
        <NavSkeleton />
      ) : (
        <SidebarNav isAdmin={displayData.isAdmin} />
      )}

      <div className="p-4 border-t border-border space-y-4">
        {showSkeleton ? (
          <UsageSkeleton />
        ) : (
          <SidebarUsage
            iterations={displayData.usage.iterations}
            interviews={displayData.usage.interviews}
            plan={displayData.usage.plan}
            isByok={displayData.usage.isByok}
          />
        )}

        <div className="flex items-center justify-between">
          <SidebarSignOut />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
