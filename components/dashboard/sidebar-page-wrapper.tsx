"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SharedHeader } from "./shared-header";

interface SidebarPageWrapperProps {
  children: ReactNode;
}

/**
 * Padding configuration by route
 * Some pages like AI Chat need no padding to utilize full width
 */
const paddingConfig = {
  none: "pr-0 py-0", // No padding
  small: "p-1 md:p-2 lg:p-4",
  default: "p-4 md:p-6 lg:p-8", // All-around padding for other pages
} as const;

/**
 * Wraps page content with a shared header and applies route-sensitive padding for the sidebar layout.
 *
 * The component adds a safe-area-aware bottom padding to the outer wrapper and selects one of three
 * padding presets based on the current pathname: no padding for `/ai-chat` routes, small padding
 * for exact `/journeys/{id}` pages, and the default padding for all other routes.
 *
 * @param children - Page content rendered beneath the shared header
 * @returns A JSX element containing the shared header and the provided children with appropriate layout padding
 */
export function SidebarPageWrapper({ children }: SidebarPageWrapperProps) {
  const pathname = usePathname();

  // Determine padding based on current route
  let paddingClass: string = paddingConfig.default;

  if (pathname === "/ai-chat" || pathname?.includes("/ai-chat")) {
    paddingClass = paddingConfig.none;
  } else if (pathname && /^\/journeys\/[^/]+$/.test(pathname)) {
    // Apply small padding ONLY to the journey ID page (viewer + sidebar layout)
    // This excludes nested routes like /journeys/[slug]/learn/...
    paddingClass = paddingConfig.small;
  }

  return (
    <main className="flex-1 relative min-w-0 max-w-full z-10 pb-[calc(env(safe-area-inset-bottom,0px)+76px)] md:pb-0">
      <div
        className={`relative ${paddingClass} overflow-x-hidden w-full max-w-full`}
      >
        <SharedHeader />
        {children}
      </div>
    </main>
  );
}