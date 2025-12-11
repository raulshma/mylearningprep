"use client";

/**
 * Conversation List Component
 *
 * Displays a virtualized list of conversations with search filtering.
 * Connects to the chat store for conversation data.
 *
 * Requirements: 4.2, 4.3
 * - 4.2: Search filtering within 100ms for up to 1000 conversations
 * - 4.3: Pinned conversations displayed at top
 */

import { memo, useMemo, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Clock, Pin, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store/chat/store";
import { selectFilteredAndSortedConversations } from "@/lib/store/chat/slices/conversation-slice";
import type { Conversation } from "@/lib/store/chat/types";
import { ConversationItem } from "./conversation-item";

// =============================================================================
// Types
// =============================================================================

interface ConversationListProps {
  /** Debounced search query */
  searchQuery: string;
  /** Callback when a conversation is selected */
  onSelect: (id: string) => void;
  /** Callback for conversation actions */
  onAction: (id: string, action: ConversationAction) => void;
  /** Optional class name */
  className?: string;
}

export type ConversationAction =
  | { type: "pin" }
  | { type: "archive" }
  | { type: "delete" }
  | { type: "rename"; title: string }
  | { type: "branch"; messageId: string };

// =============================================================================
// Date Grouping Helpers
// =============================================================================

interface ConversationGroup {
  label: string;
  items: Conversation[];
}

/**
 * Group conversations by date for display
 */
function groupByDate(conversations: Conversation[]): ConversationGroup[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: ConversationGroup[] = [];

  const todayItems = conversations.filter(
    (c) => new Date(c.lastMessageAt).toDateString() === today.toDateString()
  );
  const yesterdayItems = conversations.filter(
    (c) => new Date(c.lastMessageAt).toDateString() === yesterday.toDateString()
  );
  const lastWeekItems = conversations.filter((c) => {
    const date = new Date(c.lastMessageAt);
    return (
      date > lastWeek &&
      date.toDateString() !== today.toDateString() &&
      date.toDateString() !== yesterday.toDateString()
    );
  });
  const olderItems = conversations.filter(
    (c) => new Date(c.lastMessageAt) <= lastWeek
  );

  if (todayItems.length) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length)
    groups.push({ label: "Yesterday", items: yesterdayItems });
  if (lastWeekItems.length)
    groups.push({ label: "Last 7 days", items: lastWeekItems });
  if (olderItems.length) groups.push({ label: "Older", items: olderItems });

  return groups;
}

// =============================================================================
// Virtualized List Item Types
// =============================================================================

type VirtualItem =
  | { type: "header"; label: string; isPinned?: boolean }
  | { type: "conversation"; conversation: Conversation };

// =============================================================================
// Component
// =============================================================================

export const ConversationList = memo(function ConversationList({
  searchQuery,
  onSelect,
  onAction,
  className,
}: ConversationListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Get conversation state from store
  const conversationState = useChatStore((state) => state.conversations);
  const activeId = conversationState.activeId;

  // Filter and sort conversations based on search query
  // Requirements: 4.2 - Filter within 100ms for up to 1000 conversations
  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return selectFilteredAndSortedConversations(conversationState);
    }

    // Filter by search query
    const filtered = Array.from(conversationState.items.values()).filter(
      (c) => !c.isArchived && c.title.toLowerCase().includes(normalizedQuery)
    );

    // Sort: pinned first, then by lastMessageAt descending
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    });
  }, [conversationState, searchQuery]);

  // Separate pinned and unpinned conversations
  // Requirements: 4.3 - Pinned conversations at top
  const { pinnedConversations, unpinnedConversations } = useMemo(() => {
    const pinned = filteredConversations.filter((c) => c.isPinned);
    const unpinned = filteredConversations.filter((c) => !c.isPinned);
    return { pinnedConversations: pinned, unpinnedConversations: unpinned };
  }, [filteredConversations]);

  // Group unpinned conversations by date
  const groupedUnpinned = useMemo(
    () => groupByDate(unpinnedConversations),
    [unpinnedConversations]
  );

  // Build flat list of virtual items for virtualization
  const virtualItems = useMemo<VirtualItem[]>(() => {
    const items: VirtualItem[] = [];

    // Add pinned section
    if (pinnedConversations.length > 0) {
      items.push({ type: "header", label: "Pinned", isPinned: true });
      for (const conv of pinnedConversations) {
        items.push({ type: "conversation", conversation: conv });
      }
    }

    // Add date-grouped sections
    for (const group of groupedUnpinned) {
      items.push({ type: "header", label: group.label });
      for (const conv of group.items) {
        items.push({ type: "conversation", conversation: conv });
      }
    }

    return items;
  }, [pinnedConversations, groupedUnpinned]);

  // Set up virtualizer for large lists
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer is intentionally used; React Compiler auto-skips memoization
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      // Headers are smaller than conversation items
      return item?.type === "header" ? 32 : 64;
    },
    overscan: 5,
  });

  // Handle conversation selection
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
    },
    [onSelect]
  );

  // Handle conversation actions
  const handleAction = useCallback(
    (id: string, action: ConversationAction) => {
      onAction(id, action);
    },
    [onAction]
  );

  // Empty state
  if (virtualItems.length === 0) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center py-12 px-4", className)}
        role="status"
        aria-label={searchQuery ? "No conversations found" : "No conversations yet"}
      >
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4" aria-hidden="true">
          <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {searchQuery ? "No chats found" : "No conversations yet"}
        </p>
        {!searchQuery && (
          <p className="text-xs text-muted-foreground mt-1">
            Start a new chat to begin your journey
          </p>
        )}
      </div>
    );
  }

  // Render virtualized list
  return (
    <div
      ref={parentRef}
      className={cn("flex-1 overflow-auto", className)}
      role="listbox"
      aria-label="Conversations"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = virtualItems[virtualRow.index];
          
          if (item.type === "header") {
            return (
              <div
                key={`header-${item.label}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70"
                role="presentation"
                aria-hidden="true"
              >
                {item.isPinned ? (
                  <Pin className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Clock className="h-3 w-3" aria-hidden="true" />
                )}
                {item.label}
              </div>
            );
          }

          return (
            <div
              key={item.conversation.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ConversationItem
                conversation={item.conversation}
                isActive={item.conversation.id === activeId}
                onSelect={() => handleSelect(item.conversation.id)}
                onPin={() => handleAction(item.conversation.id, { type: "pin" })}
                onArchive={() => handleAction(item.conversation.id, { type: "archive" })}
                onDelete={() => handleAction(item.conversation.id, { type: "delete" })}
                onRename={(title) => handleAction(item.conversation.id, { type: "rename", title })}
                onBranch={(messageId) => handleAction(item.conversation.id, { type: "branch", messageId })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ConversationList;
