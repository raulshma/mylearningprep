"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSidebar } from "./mobile-sidebar";
import { MobileHeader } from "./mobile-header";
import type { SidebarData } from "./sidebar";

import { SidebarProvider, useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

interface ResponsiveSidebarLayoutProps {
  children: React.ReactNode;
  sidebarData: SidebarData;
  /** Server-rendered desktop sidebar */
  desktopSidebar: React.ReactNode;
}

function ResponsiveSidebarLayoutContent({
  children,
  sidebarData,
  desktopSidebar,
}: ResponsiveSidebarLayoutProps) {
  const isMobile = useIsMobile();
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Background pattern - spans full width behind sidebar */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-secondary/5" />
      </div>

      {/* Desktop sidebar - hidden on mobile via CSS */}
      <div
        className={cn(
          "hidden md:block flex-shrink-0 relative z-20 transition-all duration-300",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        {desktopSidebar}
      </div>

      {/* Mobile layout & Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full relative z-10">
        {/* Mobile header with hamburger menu */}
        {isMobile && (
          <MobileHeader
            menuTrigger={
              <MobileSidebar
                isAdmin={sidebarData.isAdmin}
                usage={sidebarData.usage}
                user={sidebarData.user}
              />
            }
          />
        )}

        {/* Main content */}
        {children}
      </div>
    </div>
  );
}

export function ResponsiveSidebarLayout(props: ResponsiveSidebarLayoutProps) {
  return (
    <SidebarProvider>
      <ResponsiveSidebarLayoutContent {...props} />
    </SidebarProvider>
  );
}
