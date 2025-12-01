"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Archive,
  MoreHorizontal,
  MessageSquare,
  Sparkles,
  Clock,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AIConversation } from "@/lib/db/schemas/ai-conversation";

interface ChatHistorySidebarProps {
  conversations: AIConversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onPinConversation: (id: string) => void;
  onArchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onToggleCollapse?: () => void;
  onOpenArchived?: () => void;
}

export function ChatHistorySidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onPinConversation,
  onArchiveConversation,
  onDeleteConversation,
  onToggleCollapse,
  onOpenArchived,
}: ChatHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const recentConversations = filteredConversations.filter((c) => !c.isPinned);

  // Group by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groupByDate = (convs: AIConversation[]) => {
    const groups: { label: string; items: AIConversation[] }[] = [];

    const todayItems = convs.filter(
      (c) => new Date(c.lastMessageAt).toDateString() === today.toDateString()
    );
    const yesterdayItems = convs.filter(
      (c) =>
        new Date(c.lastMessageAt).toDateString() === yesterday.toDateString()
    );
    const lastWeekItems = convs.filter((c) => {
      const date = new Date(c.lastMessageAt);
      return (
        date > lastWeek &&
        date.toDateString() !== today.toDateString() &&
        date.toDateString() !== yesterday.toDateString()
      );
    });
    const olderItems = convs.filter((c) => new Date(c.lastMessageAt) <= lastWeek);

    if (todayItems.length) groups.push({ label: "Today", items: todayItems });
    if (yesterdayItems.length)
      groups.push({ label: "Yesterday", items: yesterdayItems });
    if (lastWeekItems.length)
      groups.push({ label: "Last 7 days", items: lastWeekItems });
    if (olderItems.length) groups.push({ label: "Older", items: olderItems });

    return groups;
  };

  const groupedRecent = groupByDate(recentConversations);

  return (
    <div className="flex flex-col h-full bg-transparent w-full">
      {/* Header */}
      <div className="p-4 space-y-3 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Chats</span>
          </div>
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* New Chat Button */}
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-9 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 pb-4">
          {/* Pinned */}
          {pinnedConversations.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                <Pin className="h-3 w-3" />
                Pinned
              </div>
              {pinnedConversations.map((conversation) => (
                <ConversationItem
                  key={conversation._id}
                  conversation={conversation}
                  isActive={conversation._id === activeConversationId}
                  onSelect={() => onSelectConversation(conversation._id)}
                  onPin={() => onPinConversation(conversation._id)}
                  onArchive={() => onArchiveConversation(conversation._id)}
                  onDelete={() => onDeleteConversation(conversation._id)}
                />
              ))}
            </div>
          )}

          {/* Grouped by date */}
          {groupedRecent.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                {group.label}
              </div>
              {group.items.map((conversation) => (
                <ConversationItem
                  key={conversation._id}
                  conversation={conversation}
                  isActive={conversation._id === activeConversationId}
                  onSelect={() => onSelectConversation(conversation._id)}
                  onPin={() => onPinConversation(conversation._id)}
                  onArchive={() => onArchiveConversation(conversation._id)}
                  onDelete={() => onDeleteConversation(conversation._id)}
                />
              ))}
            </div>
          ))}

          {/* Empty state */}
          {filteredConversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
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
          )}

          {/* Archived conversations button */}
          {onOpenArchived && (
            <div className="pt-2 border-t border-border/40 mt-4">
              <button
                onClick={onOpenArchived}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
                View archived conversations
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: AIConversation;
  isActive: boolean;
  onSelect: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onPin,
  onArchive,
  onDelete,
}: ConversationItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
      onClick={onSelect}
    >
      <div className={cn(
        "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
        isActive ? "bg-primary/20" : "bg-muted group-hover:bg-muted/80"
      )}>
        <MessageSquare
          className={cn(
            "h-4 w-4",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate mb-0.5",
            isActive && "text-primary"
          )}
        >
          {conversation.title}
        </p>
        {conversation.messages.length > 0 && (
          <p className={cn(
            "text-xs truncate transition-colors",
            isActive ? "text-primary/70" : "text-muted-foreground/70"
          )}>
            {conversation.messages[conversation.messages.length - 1]?.content?.slice(0, 40)}...
          </p>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100",
              isActive ? "hover:bg-primary/20 text-primary" : "hover:bg-background/80"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1">
          <DropdownMenuItem onClick={onPin} className="rounded-lg">
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
          <DropdownMenuItem onClick={onArchive} className="rounded-lg">
            <Archive className="h-4 w-4 mr-2" />
            Archive Conversation
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive rounded-lg">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
