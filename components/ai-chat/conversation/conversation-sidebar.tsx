"use client";

/**
 * Conversation Sidebar Container
 *
 * Composes ConversationList and search input.
 * Handles new conversation creation and connects to the store.
 *
 * Requirements: 4.1
 * - 4.1: Create new conversation with unique ID and persist immediately
 */

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Plus, Search, Sparkles, PanelLeftClose, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChatStore, useConversationActions } from "@/lib/store/chat/store";
import {
  createConversation,
  togglePinConversation,
  archiveConversation,
  deleteConversation,
  updateConversationTitle,
  branchConversation as branchConversationAction,
} from "@/lib/actions/ai-chat-actions";
import { ConversationList, type ConversationAction } from "./conversation-list";
import { getLastMessageId } from "./branch-utils";

// =============================================================================
// Types
// =============================================================================

interface ConversationSidebarProps {
  /** User ID for creating conversations */
  userId: string;
  /** Callback when sidebar collapse is toggled */
  onToggleCollapse?: () => void;
  /** Callback to open archived conversations modal */
  onOpenArchived?: () => void;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Debounce Hook
// =============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// Component
// =============================================================================

export const ConversationSidebar = memo(function ConversationSidebar({
  userId,
  onToggleCollapse,
  onOpenArchived,
  className,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query for performance
  // Requirements: 4.2 - Filter within 100ms
  const debouncedSearchQuery = useDebounce(searchQuery, 100);

  // Get store actions
  const conversationActions = useConversationActions();
  const setSearchQueryInStore = useChatStore((state) => state.setSearchQuery);

  // Sync debounced search query to store
  useEffect(() => {
    setSearchQueryInStore(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQueryInStore]);

  // Handle new conversation creation
  // Requirements: 4.1 - Generate unique ID and persist immediately
  const handleNewConversation = useCallback(async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      // Create conversation via server action
      const result = await createConversation("New Chat");

      if (!result.success) {
        throw new Error(result.error);
      }

      const newConversation = result.data;

      // Add to store and set as active
      conversationActions.create({
        id: newConversation._id,
        userId: newConversation.userId,
        title: newConversation.title,
        chatMode: newConversation.chatMode,
        isPinned: newConversation.isPinned,
        isArchived: newConversation.isArchived,
        context: newConversation.context,
        comparisonModels: newConversation.comparisonModels,
        parentConversationId: newConversation.parentConversationId,
        branchedFromMessageId: newConversation.branchedFromMessageId,
        lastMessageAt: new Date(newConversation.lastMessageAt),
        createdAt: new Date(newConversation.createdAt),
        updatedAt: new Date(newConversation.updatedAt),
      });
      conversationActions.setActive(newConversation._id);

      // Clear search when creating new conversation
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to create conversation:", error);
      conversationActions.setError("Failed to create conversation");
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, conversationActions]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (id: string) => {
      conversationActions.setActive(id);
    },
    [conversationActions]
  );

  // Handle conversation actions
  const handleConversationAction = useCallback(
    async (id: string, action: ConversationAction) => {
      try {
        switch (action.type) {
          case "pin": {
            const result = await togglePinConversation(id);
            if (!result.success) throw new Error(result.error);
            conversationActions.togglePin(id);
            break;
          }

          case "archive": {
            const result = await archiveConversation(id);
            if (!result.success) throw new Error(result.error);
            conversationActions.archive(id);
            break;
          }

          case "delete": {
            const result = await deleteConversation(id);
            if (!result.success) throw new Error(result.error);
            conversationActions.delete(id);
            break;
          }

          case "rename": {
            const result = await updateConversationTitle(id, action.title);
            if (!result.success) throw new Error(result.error);
            conversationActions.update(id, { title: action.title });
            break;
          }

          case "branch": {
            // Get the conversation and its messages from the store
            const messageState = useChatStore.getState().messages;
            const messages = messageState.byConversation.get(id) || [];

            if (messages.length === 0) {
              conversationActions.setError("Cannot branch empty conversation");
              break;
            }

            // Use provided messageId or default to last message
            const branchMessageId = action.messageId || getLastMessageId(messages);
            if (!branchMessageId) {
              conversationActions.setError("No message to branch from");
              break;
            }

            // Create the branch via server action
            const result = await branchConversationAction(id, branchMessageId);
            if (!result.success) throw new Error(result.error);

            const branchedConversation = result.data;

            // Add branched conversation to store
            conversationActions.create({
              id: branchedConversation._id,
              userId: branchedConversation.userId,
              title: branchedConversation.title,
              chatMode: branchedConversation.chatMode,
              isPinned: branchedConversation.isPinned,
              isArchived: branchedConversation.isArchived,
              context: branchedConversation.context,
              comparisonModels: branchedConversation.comparisonModels,
              parentConversationId: branchedConversation.parentConversationId,
              branchedFromMessageId: branchedConversation.branchedFromMessageId,
              lastMessageAt: new Date(branchedConversation.lastMessageAt),
              createdAt: new Date(branchedConversation.createdAt),
              updatedAt: new Date(branchedConversation.updatedAt),
            });

            // Load messages for the branched conversation (they're included in the response)
            const branchedMessages = branchedConversation.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              reasoning: m.reasoning,
              toolCalls: m.toolCalls,
              imageIds: m.imageIds,
              errorDetails: m.errorDetails,
              metadata: m.metadata,
              createdAt: m.createdAt,
            }));
            const messageActions = useChatStore.getState();
            messageActions.loadMessages(branchedConversation._id, branchedMessages);

            // Set the branched conversation as active
            conversationActions.setActive(branchedConversation._id);
            break;
          }
        }
      } catch (error) {
        console.error(`Failed to ${action.type} conversation:`, error);
        conversationActions.setError(`Failed to ${action.type} conversation`);
      }
    },
    [conversationActions]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn("flex flex-col h-full bg-transparent w-full", className)}
      role="navigation"
      aria-label="Chat conversations"
    >
      {/* Header */}
      <div className="p-4 space-y-3 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Chats</span>
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* New Chat Button */}
        <Button
          onClick={handleNewConversation}
          disabled={isCreating}
          className="w-full justify-start gap-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          variant="outline"
          aria-label="Start new chat"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating..." : "New Chat"}
        </Button>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search chats..."
            className="pl-9 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ConversationList
        searchQuery={debouncedSearchQuery}
        onSelect={handleSelectConversation}
        onAction={handleConversationAction}
        className="flex-1 px-2"
      />

      {/* Archived Conversations Button */}
      {onOpenArchived && (
        <div className="p-4 border-t border-border/40">
          <button
            onClick={onOpenArchived}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            aria-label="View archived conversations"
          >
            <Archive className="h-3.5 w-3.5" />
            View archived conversations
          </button>
        </div>
      )}
    </div>
  );
});

export default ConversationSidebar;
