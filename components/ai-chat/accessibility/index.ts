/**
 * Accessibility Components for AI Chat
 * 
 * This module exports components and utilities for making the chat interface
 * accessible to users with disabilities.
 * 
 * Requirements: 14.1 - Keyboard navigation
 * Requirements: 14.2 - Screen reader announcements
 * Requirements: 14.3 - ARIA labels and roles
 * Requirements: 14.4 - Loading state accessibility
 * Requirements: 14.5 - Error accessibility
 */

export {
  AriaLiveProvider,
  useAriaLive,
  LiveRegion,
  LoadingAnnouncer,
  ErrorAnnouncer,
  MessageAnnouncer,
  type AriaLivePoliteness,
  type Announcement,
  type AriaLiveContextValue,
} from "./aria-live-region";

export { SkipLink, SkipLinks, DEFAULT_CHAT_SKIP_LINKS } from "./skip-link";

export { VisuallyHidden } from "./visually-hidden";
