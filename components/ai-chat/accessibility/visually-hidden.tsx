"use client";

/**
 * Visually Hidden Component
 * 
 * Hides content visually while keeping it accessible to screen readers.
 * Useful for providing additional context to assistive technologies.
 * 
 * Requirements: 14.3 - Provide appropriate ARIA labels and roles
 */

import { memo, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  /** Content to hide visually */
  children: ReactNode;
  /** HTML element to render as */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Whether to show content when focused (for skip links) */
  focusable?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Visually hides content while keeping it accessible to screen readers
 * 
 * @example
 * ```tsx
 * // Hide label for icon-only button
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 * 
 * // Provide additional context
 * <VisuallyHidden>
 *   You have 5 unread messages
 * </VisuallyHidden>
 * ```
 */
export const VisuallyHidden = memo(function VisuallyHidden({
  children,
  as: Component = "span",
  focusable = false,
  className,
  ...props
}: VisuallyHiddenProps) {
  return (
    <Component
      className={cn(
        // Screen reader only styles
        "sr-only",
        // If focusable, show on focus
        focusable && "focus:not-sr-only focus:absolute",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

export default VisuallyHidden;
