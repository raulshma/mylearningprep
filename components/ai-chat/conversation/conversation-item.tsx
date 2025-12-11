"use client";

/**
 * Conversation Item Component
 *
 * Displays a single conversation in the sidebar with actions.
 * Implements pin, archive, delete, rename, and branch actions.
 *
 * Requirements: 4.3, 4.4, 4.5
 * - 4.3: Pin state persisted and pinned items at top
 * - 4.4: Archive removes from main list while preserving data
 * - 4.5: Delete permanently removes all associated data
 */

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Pin,
  PinOff,
  Trash2,
  Archive,
  MoreHorizontal,
  MessageSquare,
  Pencil,
  Check,
  X,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/store/chat/types";

// =============================================================================
// Types
// =============================================================================

interface ConversationItemProps {
  /** The conversation to display */
  conversation: Conversation;
  /** Whether this conversation is currently active */
  isActive: boolean;
  /** Callback when the conversation is selected */
  onSelect: () => void;
  /** Callback to toggle pin state */
  onPin: () => void;
  /** Callback to archive the conversation */
  onArchive: () => void;
  /** Callback to delete the conversation */
  onDelete: () => void;
  /** Callback to rename the conversation */
  onRename: (newTitle: string) => void;
  /** Callback to branch from this conversation */
  onBranch?: (messageId: string) => void;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onPin,
  onArchive,
  onDelete,
  onRename,
  onBranch,
  className,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Track the title being edited separately from the conversation title
  // This allows us to reset to conversation.title when not editing
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive the display title: use edited title when editing, otherwise use conversation title
  const editTitle = isEditing && editedTitle !== null ? editedTitle : conversation.title;
  
  // Wrapper to update the edited title
  const setEditTitle = useCallback((title: string) => {
    setEditedTitle(title);
  }, []);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle rename submission
  const handleRename = useCallback(() => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== conversation.title) {
      onRename(trimmedTitle);
    }
    setIsEditing(false);
  }, [editTitle, conversation.title, onRename]);

  // Handle cancel editing
  const handleCancel = useCallback(() => {
    setEditedTitle(null); // Reset to use conversation.title
    setIsEditing(false);
  }, []);

  // Handle keyboard events in edit mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRename();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleRename, handleCancel]
  );

  // Start editing mode
  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedTitle(conversation.title); // Initialize with current title
    setIsEditing(true);
  }, [conversation.title]);

  // Handle pin action
  const handlePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPin();
    },
    [onPin]
  );

  // Handle archive action
  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onArchive();
    },
    [onArchive]
  );

  // Handle delete action
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete();
    },
    [onDelete]
  );

  // Handle branch action (branch from last message)
  const handleBranch = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Branch from the conversation - the actual message selection
      // would be handled by the parent component
      onBranch?.("");
    },
    [onBranch]
  );

  // Render edit mode
  if (isEditing) {
    return (
      <motion.div
        layout
        className={cn(
          "flex items-center gap-2 px-3 py-3 rounded-xl bg-muted/50 border border-border mx-1",
          className
        )}
        role="listitem"
      >
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRename}
          className="h-8 text-sm flex-1"
          maxLength={60}
          aria-label="Conversation title"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleRename}
          aria-label="Save title"
        >
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleCancel}
          aria-label="Cancel editing"
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </motion.div>
    );
  }

  // Render normal mode
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 mx-1",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={onSelect}
      role="option"
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          isActive ? "bg-primary/20" : "bg-muted group-hover:bg-muted/80"
        )}
      >
        <MessageSquare
          className={cn(
            "h-4 w-4",
            isActive
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate mb-0.5",
            isActive && "text-primary"
          )}
        >
          {conversation.title}
        </p>
        <p
          className={cn(
            "text-xs truncate transition-colors",
            isActive ? "text-primary/70" : "text-muted-foreground/70"
          )}
        >
          {formatRelativeTime(conversation.lastMessageAt)}
        </p>
      </div>

      {/* Pin indicator */}
      {conversation.isPinned && (
        <Pin
          className={cn(
            "h-3 w-3 shrink-0",
            isActive ? "text-primary/70" : "text-muted-foreground/50"
          )}
        />
      )}

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100",
              isActive
                ? "hover:bg-primary/20 text-primary"
                : "hover:bg-background/80"
            )}
            onClick={(e) => e.stopPropagation()}
            aria-label="Conversation actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1">
          <DropdownMenuItem onClick={startEditing} className="rounded-lg">
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePin} className="rounded-lg">
            {conversation.isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Unpin Conversation
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pin Conversation
              </>
            )}
          </DropdownMenuItem>
          {onBranch && (
            <DropdownMenuItem onClick={handleBranch} className="rounded-lg">
              <GitBranch className="h-4 w-4 mr-2" />
              Branch Conversation
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleArchive} className="rounded-lg">
            <Archive className="h-4 w-4 mr-2" />
            Archive Conversation
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive rounded-lg"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export default ConversationItem;
