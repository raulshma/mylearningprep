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
  "/ai-chat": "pr-0 py-0", // No padding for AI Chat
  default: "p-4 md:p-6 lg:p-8", // All-around padding for other pages
} as const;

export function SidebarPageWrapper({ children }: SidebarPageWrapperProps) {
  const pathname = usePathname();

  // Determine padding based on current route
  const paddingClass =
    pathname === "/ai-chat" || pathname?.includes("/ai-chat")
      ? paddingConfig["/ai-chat"]
      : paddingConfig.default;

  return (
    <main className="flex-1 relative min-w-0 max-w-full z-10">
      <div
        className={`relative ${paddingClass} overflow-x-hidden w-full max-w-full`}
      >
        <SharedHeader />
        {children}
      </div>
    </main>
  );
}
