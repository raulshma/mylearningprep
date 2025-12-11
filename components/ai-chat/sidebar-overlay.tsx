"use client";

/**
 * Sidebar Overlay Component
 *
 * Provides responsive sidebar behavior with overlay mode for mobile devices.
 * On mobile, sidebars appear as modal overlays with backdrop.
 * On desktop, sidebars appear inline.
 *
 * Requirements: 12.1 - Collapse sidebars into overlay panels on mobile
 * Requirements: 12.4 - Display sidebars as modal overlays with backdrop on mobile
 *
 * @module components/ai-chat/sidebar-overlay
 */

import { memo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

// =============================================================================
// Types
// =============================================================================

/**
 * Position of the sidebar
 */
export type SidebarPosition = "left" | "right";

/**
 * Props for the SidebarOverlay component
 */
export interface SidebarOverlayProps {
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback when the sidebar should close */
  onClose: () => void;
  /** Position of the sidebar */
  position: SidebarPosition;
  /** Width of the sidebar in pixels (default: 320) */
  width?: number;
  /** Content to render inside the sidebar */
  children: React.ReactNode;
  /** Additional class name for the sidebar container */
  className?: string;
  /** Whether to show the backdrop on mobile (default: true) */
  showBackdrop?: boolean;
  /** Z-index for the sidebar (default: 50) */
  zIndex?: number;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

/**
 * Props for the Backdrop component
 */
export interface BackdropProps {
  /** Whether the backdrop is visible */
  isVisible: boolean;
  /** Callback when backdrop is clicked */
  onClick: () => void;
  /** Z-index for the backdrop */
  zIndex: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_WIDTH = 320;
const DEFAULT_Z_INDEX = 50;

// Animation configurations
const sidebarTransition = {
  type: "tween" as const,
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1] as const,
};

const backdropTransition = {
  duration: 0.15,
};

// =============================================================================
// Backdrop Component
// =============================================================================

/**
 * Backdrop overlay for mobile sidebar
 */
export const Backdrop = memo(function Backdrop({
  isVisible,
  onClick,
  zIndex,
}: BackdropProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          style={{ zIndex: zIndex - 1 }}
          onClick={onClick}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}
    </AnimatePresence>
  );
});

// =============================================================================
// Sidebar Overlay Component
// =============================================================================

/**
 * Responsive sidebar with overlay behavior on mobile
 *
 * On mobile devices (< 768px):
 * - Renders as a fixed overlay with backdrop
 * - Closes on backdrop click
 * - Closes on Escape key press
 *
 * On desktop devices (>= 768px):
 * - Renders inline with animation
 * - No backdrop
 *
 * @example
 * ```tsx
 * <SidebarOverlay
 *   isOpen={leftSidebarOpen}
 *   onClose={() => setLeftSidebarOpen(false)}
 *   position="left"
 *   ariaLabel="Chat history"
 * >
 *   <ChatHistorySidebar />
 * </SidebarOverlay>
 * ```
 */
export const SidebarOverlay = memo(function SidebarOverlay({
  isOpen,
  onClose,
  position,
  width = DEFAULT_WIDTH,
  children,
  className,
  showBackdrop = true,
  zIndex = DEFAULT_Z_INDEX,
  ariaLabel,
}: SidebarOverlayProps) {
  const { isMobile, shouldShowBackdrop } = useResponsiveLayout();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Determine if we should show backdrop (mobile only)
  const displayBackdrop = showBackdrop && shouldShowBackdrop && isOpen;

  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isOpen, onClose]);

  // Handle click outside on mobile
  const handleBackdropClick = useCallback(() => {
    if (isMobile) {
      onClose();
    }
  }, [isMobile, onClose]);

  // Focus trap for accessibility on mobile
  useEffect(() => {
    if (!isMobile || !isOpen || !sidebarRef.current) return;

    // Focus the sidebar when it opens
    const firstFocusable = sidebarRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [isMobile, isOpen]);

  // Animation variants based on position
  const getAnimationProps = () => {
    const isLeft = position === "left";
    return {
      initial: {
        width: 0,
        opacity: 0,
        x: isLeft ? -10 : 10,
      },
      animate: {
        width,
        opacity: 1,
        x: 0,
      },
      exit: {
        width: 0,
        opacity: 0,
        x: isLeft ? -10 : 10,
      },
    };
  };

  // Mobile-specific styles
  const getMobileStyles = (): React.CSSProperties => {
    if (!isMobile) return {};

    return {
      position: "fixed",
      top: 64, // Account for mobile header
      bottom: 0,
      [position]: 0,
      width: Math.min(width, 288), // Cap at 288px on mobile
      zIndex,
      padding: 0,
    };
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <Backdrop
        isVisible={displayBackdrop}
        onClick={handleBackdropClick}
        zIndex={zIndex}
      />

      {/* Sidebar */}
      <AnimatePresence mode="popLayout">
        {isOpen && (
          <motion.div
            ref={sidebarRef}
            {...getAnimationProps()}
            transition={sidebarTransition}
            className={cn(
              "shrink-0 h-full",
              position === "left" ? "py-4 pl-4" : "py-4 pr-4",
              isMobile && "py-0 pl-0 pr-0",
              className
            )}
            style={getMobileStyles()}
            role="complementary"
            aria-label={ariaLabel}
            data-testid={`sidebar-${position}`}
            data-mobile={isMobile}
          >
            <div className="h-full w-full rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm overflow-hidden">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// =============================================================================
// Hook for Sidebar State Management
// =============================================================================

/**
 * Hook to manage sidebar open/close state with responsive behavior
 *
 * @param initialOpen - Initial open state (default: true for desktop, false for mobile)
 * @returns Sidebar state and actions
 */
export function useSidebarState(initialOpen?: boolean) {
  const { isMobile } = useResponsiveLayout();
  const [isOpen, setIsOpen] = useState(() => {
    if (initialOpen !== undefined) return initialOpen;
    // Default: open on desktop, closed on mobile
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  // Track previous mobile state to handle transitions
  const prevIsMobileRef = useRef(isMobile);

  // Auto-close on mobile, auto-open on desktop transition
  // Use resize event listener instead of effect with setState
  useEffect(() => {
    const handleResize = () => {
      const nowMobile = window.innerWidth < 768;
      const wasMobile = prevIsMobileRef.current;

      if (nowMobile && !wasMobile) {
        // Transitioning to mobile - close sidebar
        setIsOpen(false);
      } else if (!nowMobile && wasMobile) {
        // Transitioning to desktop - open sidebar
        setIsOpen(true);
      }

      prevIsMobileRef.current = nowMobile;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    isMobile,
    open,
    close,
    toggle,
    setIsOpen,
  };
}

// Need to import useState for the hook
import { useState } from "react";

export default SidebarOverlay;
