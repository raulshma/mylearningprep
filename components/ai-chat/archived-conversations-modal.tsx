"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  RotateCcw,
  Trash2,
  MessageSquare,
  Loader2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getArchivedConversations,
  restoreConversation,
  deleteConversation,
} from "@/lib/actions/ai-chat-actions";
import type { AIConversation } from "@/lib/db/schemas/ai-conversation";

interface ArchivedConversationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (conversation: AIConversation) => void;
}

export function ArchivedConversationsModal({
  open,
  onOpenChange,
  onRestore,
}: ArchivedConversationsModalProps) {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load archived conversations when modal opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const result = await getArchivedConversations();
      if (!cancelled && result.success) {
        setConversations(result.data);
      }
      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleRestore = async (conversation: AIConversation) => {
    setActionLoading(conversation._id);
    const result = await restoreConversation(conversation._id);
    if (result.success) {
      setConversations((prev) => prev.filter((c) => c._id !== conversation._id));
      onRestore({ ...conversation, isArchived: false });
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    const result = await deleteConversation(id);
    if (result.success) {
      setConversations((prev) => prev.filter((c) => c._id !== id));
    }
    setActionLoading(null);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Archived Conversations
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archived chats..."
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No matching archived chats" : "No archived conversations"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredConversations.map((conversation) => (
                  <motion.div
                    key={conversation._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.messages.length} messages •{" "}
                        {new Date(conversation.lastMessageAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                        onClick={() => handleRestore(conversation)}
                        disabled={actionLoading === conversation._id}
                        title="Restore"
                      >
                        {actionLoading === conversation._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(conversation._id)}
                        disabled={actionLoading === conversation._id}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
