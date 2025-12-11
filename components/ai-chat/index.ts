/**
 * AI Chat Components Module
 *
 * Central export point for all AI Chat UI components.
 * These components implement the presentation layer for the chat feature.
 *
 * ## Architecture
 *
 * Components are organized by concern:
 * - **Main Components**: Page containers and primary UI elements
 * - **Conversation Components**: Sidebar, list, and item management
 * - **Message Components**: Message display, streaming, and editing
 * - **Input Components**: Chat input, file attachments, model selection
 * - **Multi-Model Components**: Comparison mode UI
 * - **Tool Components**: Tool sidebar and invocation display
 * - **Accessibility Components**: ARIA support and keyboard navigation
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   AIChatPageContent,
 *   ChatInput,
 *   MessageBubble,
 *   ConversationSidebar,
 * } from '@/components/ai-chat';
 *
 * function MyPage() {
 *   return <AIChatPageContent initialConversations={[]} userPlan="free" />;
 * }
 * ```
 *
 * @module components/ai-chat
 */

// =============================================================================
// Main Components
// =============================================================================

/**
 * Main chat interface component
 * Handles message display and input for single-model mode
 */
export { AIChatMain } from "./chat-main";

/**
 * Legacy chat history sidebar
 * @deprecated Use ConversationSidebar instead
 */
export { ChatHistorySidebar } from "./chat-history-sidebar";

/**
 * Tools sidebar with available AI tools
 * Includes tool cards and selection handling
 */
export {
  ToolsSidebar,
  ToolCard,
  useToolsSidebar,
  tools,
  getToolById,
  getAllToolIds,
  type Tool,
  type ToolsSidebarProps,
  type ToolCardProps,
} from "./tools-sidebar";

/**
 * Main page content container
 * Composes all chat UI elements and manages layout
 */
export { AIChatPageContent } from "./ai-chat-page-content";

/**
 * Modal for viewing and restoring archived conversations
 */
export { ArchivedConversationsModal } from "./archived-conversations-modal";

/**
 * Virtualized message list for performance with large conversations
 * Uses windowing to render only visible messages
 */
export { VirtualizedMessageList } from "./virtualized-message-list";

// =============================================================================
// Multi-Model Components
// =============================================================================

/**
 * Multi-model comparison components
 * For MAX plan users to compare responses from multiple AI models
 */
export {
  /** Main container for multi-model chat mode */
  MultiModelChatMain,
  /** Model selection UI for comparison mode */
  MultiModelSelector,
  /** Individual model response display */
  MultiModelResponse,
} from "./multi-model";

// =============================================================================
// Conversation Management Components
// =============================================================================

/**
 * Conversation management components
 * Handle conversation list, selection, and actions
 */
export {
  /** Sidebar container with search and conversation list */
  ConversationSidebar,
  /** Virtualized list of conversations */
  ConversationList,
  /** Individual conversation item with actions */
  ConversationItem,
  /** Create a branch from an existing conversation */
  branchConversation,
  /** Conversation action type */
  type ConversationAction,
} from "./conversation";

// =============================================================================
// Message Components
// =============================================================================

/**
 * Message bubble component
 * Renders individual messages with content, tools, and actions
 */
export { MessageBubble } from "./message/message-bubble";

/**
 * Tool invocation display within messages
 */
export { ToolInvocation } from "./message/tool-invocation";

/**
 * Message metadata display
 * Shows token counts, latency, and model info
 */
export { MessageMetadataDisplay } from "./message-metadata";

// =============================================================================
// Input Components
// =============================================================================

/**
 * Chat input component
 * Handles text input, file attachments, and send actions
 */
export { ChatInput } from "./input/chat-input";

/**
 * Empty state display
 * Shown when no conversation is active
 */
export { ChatEmptyState } from "./empty-state/chat-empty-state";

/**
 * Thinking indicator
 * Shows AI reasoning process during streaming
 */
export { ThinkingIndicator } from "./thinking-indicator";

/**
 * Model selector dropdown
 * Groups models by provider with capability indicators
 */
export { ModelSelector } from "./model-selector";

/**
 * Provider tools selector
 * Toggle provider-specific features like Google Search
 */
export { ProviderToolsSelector, useProviderTools } from "./provider-tools-selector";

// =============================================================================
// Tool Display Components
// =============================================================================

/**
 * Tool invocation display components
 * Show tool status, input, output, and errors
 */
export {
  /** Main tool invocation display */
  ToolInvocationDisplay,
  /** Tool output in collapsible section */
  ToolOutputDisplay,
  /** Tool error display */
  ToolErrorDisplay,
  /** Tool input display */
  ToolInputDisplay,
  /** List of tool invocations */
  ToolInvocationList,
  /** Format tool name for display */
  formatToolName,
  /** Get status info for tool state */
  getToolStatusInfo,
  type ToolInvocationDisplayProps,
  type ToolOutputDisplayProps,
  type ToolInvocationState,
} from "./tools";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Message helper utilities
 * Extract content, reasoning, tools, and files from messages
 */
export {
  /** Get text content from a message */
  getMessageTextContent,
  /** Get reasoning content from a message */
  getMessageReasoning,
  /** Get tool parts from a message */
  getToolParts,
  /** Get file parts from a message */
  getFileParts,
  /** Check if message is an error */
  isErrorMessage,
  /** Get error content from a message */
  getErrorContent,
  type ToolPart,
  type FilePart,
} from "./utils/message-helpers";

// =============================================================================
// Skeleton Components
// =============================================================================

/**
 * Loading skeleton components
 * Show placeholder UI while content loads
 */
export {
  /** Full page skeleton */
  AIChatPageSkeleton,
  /** Chat history sidebar skeleton */
  ChatHistorySkeleton,
  /** Main chat area skeleton */
  ChatMainSkeleton,
  /** Messages list skeleton */
  ChatMessagesSkeleton,
  /** Tools sidebar skeleton */
  ToolsSidebarSkeleton,
} from "./chat-skeleton";

// =============================================================================
// Sidebar Overlay Components
// =============================================================================

/**
 * Sidebar overlay components for mobile
 * Handle modal sidebar behavior with backdrop
 */
export {
  /** Sidebar overlay wrapper */
  SidebarOverlay,
  /** Backdrop for modal sidebars */
  Backdrop,
  /** Hook for sidebar state management */
  useSidebarState,
  type SidebarOverlayProps,
  type SidebarPosition,
  type BackdropProps,
} from "./sidebar-overlay";

// =============================================================================
// Accessibility Components
// =============================================================================

/**
 * Accessibility components
 * ARIA support, skip links, and screen reader announcements
 */
export {
  /** Provider for ARIA live region announcements */
  AriaLiveProvider,
  /** Skip links for keyboard navigation */
  SkipLinks,
  /** Visually hidden content for screen readers */
  VisuallyHidden,
  /** Announce loading states to screen readers */
  LoadingAnnouncer,
  /** Announce errors to screen readers */
  ErrorAnnouncer,
  /** Hook for programmatic announcements */
  useAriaLive,
  /** Default skip links for chat interface */
  DEFAULT_CHAT_SKIP_LINKS,
} from "./accessibility";
