"use client";

/**
 * Skip Link Component
 * 
 * Provides skip links for keyboard users to bypass navigation and jump
 * directly to main content areas.
 * 
 * Requirements: 14.1 - Provide logical tab order through all interactive elements
 */

import { memo } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string;
  /** Label for the skip link */
  label: string;
  /** Additional class name */
  className?: string;
}

interface SkipLinksProps {
  /** Array of skip link configurations */
  links: Array<{ targetId: string; label: string }>;
  /** Additional class name for the container */
  className?: string;
}

// =============================================================================
// Skip Link Component
// =============================================================================

/**
 * Individual skip link that becomes visible on focus
 * 
 * @example
 * ```tsx
 * <SkipLink targetId="main-content" label="Skip to main content" />
 * ```
 */
export const SkipLink = memo(function SkipLink({
  targetId,
  label,
  className,
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Visually hidden by default
        "sr-only",
        // Visible when focused
        "focus:not-sr-only focus:absolute focus:z-[100]",
        "focus:top-4 focus:left-4",
        "focus:px-4 focus:py-2",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-lg focus:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "focus:font-medium focus:text-sm",
        className
      )}
    >
      {label}
    </a>
  );
});

// =============================================================================
// Skip Links Container
// =============================================================================

/**
 * Container for multiple skip links
 * 
 * @example
 * ```tsx
 * <SkipLinks
 *   links={[
 *     { targetId: "chat-input", label: "Skip to chat input" },
 *     { targetId: "message-list", label: "Skip to messages" },
 *     { targetId: "conversation-list", label: "Skip to conversations" },
 *   ]}
 * />
 * ```
 */
export const SkipLinks = memo(function SkipLinks({
  links,
  className,
}: SkipLinksProps) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Skip links"
      className={cn("contents", className)}
    >
      {links.map((link) => (
        <SkipLink
          key={link.targetId}
          targetId={link.targetId}
          label={link.label}
        />
      ))}
    </nav>
  );
});

// =============================================================================
// Default Skip Links for Chat
// =============================================================================

/**
 * Default skip links configuration for the chat interface
 */
export const DEFAULT_CHAT_SKIP_LINKS = [
  { targetId: "chat-input", label: "Skip to chat input" },
  { targetId: "message-list", label: "Skip to messages" },
  { targetId: "conversation-sidebar", label: "Skip to conversations" },
  { targetId: "tools-sidebar", label: "Skip to tools" },
];

export default SkipLink;
