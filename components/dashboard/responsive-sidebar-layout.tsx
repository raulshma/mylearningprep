"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "./mobile-header";
import type { SidebarData } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";

import { SidebarProvider, useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";
import { PixelPetOverlay } from "@/components/pixel-pet/pixel-pet-overlay";

interface ResponsiveSidebarLayoutProps {
  children: React.ReactNode;
  sidebarData: SidebarData;
  /** Server-rendered desktop sidebar */
  desktopSidebar: React.ReactNode;
}

/**
 * Render a responsive app shell that shows a desktop sidebar on larger screens, a mobile header and bottom navigation on small screens, and a PixelPet overlay.
 *
 * @param sidebarData - Configuration for the sidebar and PixelPet overlay (includes pixelPet preferences and usage plan)
 * @param desktopSidebar - Pre-rendered React node to use as the desktop sidebar
 * @returns A React element representing the responsive layout with main content, navigation components appropriate to the viewport, and the PixelPet overlay configured from `sidebarData`
 */
function ResponsiveSidebarLayoutContent({
  children,
  sidebarData,
  desktopSidebar,
}: ResponsiveSidebarLayoutProps) {
  const isMobile = useIsMobile();
  const { isCollapsed } = useSidebar();

  return (
    <div
      className="flex min-h-screen bg-background relative"
      data-pet-surface="app-shell"
      data-pet-edge-container
      data-pet-edge-id="app-shell"
    >
      {/* Background pattern - spans full width behind sidebar */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-secondary/5" />
      </div>

      {/* Desktop sidebar - hidden on mobile via CSS */}
      <div
        data-desktop-sidebar
        data-pet-edge-container
        data-pet-edge-id="sidebar"
        className={cn(
          "hidden md:block flex-shrink-0 relative z-20 transition-all duration-300",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        {desktopSidebar}
      </div>

      {/* Mobile layout & Main content */}
      <div
        className="flex-1 flex flex-col min-w-0 w-full max-w-full relative z-10"
        data-pet-edge-container
        data-pet-edge-id="content"
      >
        {/* Mobile header (navigation is handled by bottom tab bar) */}
        {isMobile && (
          <MobileHeader />
        )}

        {/* Main content */}
        {children}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && <MobileBottomNav sidebarData={sidebarData} />}

      <PixelPetOverlay
        initialPreferences={sidebarData.pixelPet}
        plan={sidebarData.usage.plan}
      />
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