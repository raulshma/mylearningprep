"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, PanelLeftClose, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatHistorySidebar } from "./chat-history-sidebar";
import { AIChatMain } from "./chat-main";
import { ToolsSidebar } from "./tools-sidebar";
import { ArchivedConversationsModal } from "./archived-conversations-modal";
import {
  togglePinConversation,
  archiveConversation,
  deleteConversation,
} from "@/lib/actions/ai-chat-actions";
import type { AIConversation } from "@/lib/db/schemas/ai-conversation";
import type { UserPlan } from "@/lib/db/schemas/user";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { useSharedHeader } from "@/components/dashboard/shared-header-context";

interface AIChatPageContentProps {
  initialConversations: AIConversation[];
  userPlan: UserPlan;
}

export function AIChatPageContent({
  initialConversations,
  userPlan,
}: AIChatPageContentProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  // Compute initial sidebar states based on screen size
  // Left sidebar: open on desktop, closed on mobile
  // Right sidebar: always closed by default
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  // Track previous screen size to detect changes
  const prevIsMobileRef = useRef(isMobile);
  const prevIsTabletRef = useRef(isTablet);

  // Get main layout sidebar control
  const { setCollapsed: setMainSidebarCollapsed } = useSidebar();
  const { hideHeader } = useSharedHeader();
  const hasCollapsedMainSidebar = useRef(false);

  // Auto-collapse the main layout sidebar and hide header when AI Chat page loads
  useEffect(() => {
    if (!hasCollapsedMainSidebar.current) {
      setMainSidebarCollapsed(true);
      hideHeader();
      hasCollapsedMainSidebar.current = true;
    }
  }, [setMainSidebarCollapsed, hideHeader]);

  // Handle screen size changes via resize event listener (avoids setState in effect)
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = prevIsMobileRef.current;
      const wasTablet = prevIsTabletRef.current;
      const nowMobile = window.innerWidth <= 768;
      const nowTablet = window.innerWidth <= 1024;

      // Only update if screen size category changed
      if (nowMobile !== wasMobile || nowTablet !== wasTablet) {
        if (nowMobile) {
          setLeftSidebarOpen(false);
          setRightSidebarOpen(false);
        } else if (nowTablet && !wasTablet) {
          setRightSidebarOpen(false);
        } else if (!nowMobile && wasMobile) {
          // Transitioning from mobile to desktop - open left sidebar
          setLeftSidebarOpen(true);
        }
      }

      prevIsMobileRef.current = nowMobile;
      prevIsTabletRef.current = nowTablet;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle new conversation - now just clears active conversation
  // Actual conversation is created on first message via API
  const handleNewConversation = useCallback(() => {
    setActiveConversationId(undefined);
    if (isMobile) setLeftSidebarOpen(false);
  }, [isMobile]);

  // Handle conversation created from first message
  const handleConversationCreated = useCallback((id: string, title: string) => {
    const newConversation: AIConversation = {
      _id: id,
      userId: "",
      title,
      messages: [],
      isPinned: false,
      isArchived: false,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(id);
  }, []);

  // Handle restored conversation from archive
  const handleRestoreConversation = useCallback((conversation: AIConversation) => {
    setConversations((prev) => [conversation, ...prev]);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    if (isMobile) setLeftSidebarOpen(false);
  }, [isMobile]);

  const handlePinConversation = useCallback(async (id: string) => {
    await togglePinConversation(id);
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  }, []);

  const handleArchiveConversation = useCallback(async (id: string) => {
    await archiveConversation(id);
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(undefined);
    }
  }, [activeConversationId]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(undefined);
    }
  }, [activeConversationId]);

  const handleToolSelect = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    // If no active conversation, the chat will use this prompt
    if (isMobile) setRightSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && (leftSidebarOpen || rightSidebarOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => {
              setLeftSidebarOpen(false);
              setRightSidebarOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar - Chat History */}
      <AnimatePresence mode="wait">
        {leftSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: 320, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "shrink-0 h-full py-4 pl-4",
              isMobile && "fixed left-0 top-16 bottom-0 z-50 w-72 py-0 pl-0"
            )}
          >
            <div className="h-full w-full rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm overflow-hidden">
              <ChatHistorySidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onPinConversation={handlePinConversation}
                onArchiveConversation={handleArchiveConversation}
                onDeleteConversation={handleDeleteConversation}
                onToggleCollapse={!isMobile ? () => setLeftSidebarOpen(false) : undefined}
                onOpenArchived={() => setArchivedModalOpen(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full py-4 px-2 relative">
        {/* Mobile Header */}
        {(isMobile || isTablet) && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            >
              {leftSidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <span className="font-semibold">AI Chat</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              {rightSidebarOpen ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}

        <div className="h-full rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col relative">
          <AIChatMain
            conversationId={activeConversationId}
            initialPrompt={pendingPrompt}
            onPromptUsed={() => setPendingPrompt(null)}
            onNewConversation={handleNewConversation}
            onConversationCreated={handleConversationCreated}
            onConversationUpdate={(id, title) => {
              setConversations((prev) =>
                prev.map((c) =>
                  c._id === id ? { ...c, title, lastMessageAt: new Date() } : c
                )
              );
            }}
            userPlan={userPlan}
          />

          {/* Collapsed Left Sidebar Toggle (Desktop only) */}
          {!isMobile && !leftSidebarOpen && (
            <div className="absolute left-4 top-4 z-30">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setLeftSidebarOpen(true)}
                className="h-8 w-8 rounded-full shadow-sm bg-background/80 backdrop-blur-sm hover:bg-background"
                title="Show History"
              >
                <PanelLeftClose className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}

          {/* Collapsed Right Sidebar Toggle (Desktop only) */}
          {!isMobile && !rightSidebarOpen && (
            <div className="absolute right-4 top-4 z-30">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setRightSidebarOpen(true)}
                className="h-8 w-8 rounded-full shadow-sm bg-background/80 backdrop-blur-sm hover:bg-background"
                title="Show Tools"
              >
                <PanelRightClose className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Tools */}
      <AnimatePresence mode="wait">
        {rightSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: 20 }}
            animate={{ width: 320, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "shrink-0 h-full py-4 pr-4",
              isMobile && "fixed right-0 top-16 bottom-0 z-50 w-72 py-0 pr-0"
            )}
          >
            <div className="h-full w-full rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm overflow-hidden">
              <ToolsSidebar
                onToolSelect={handleToolSelect}
                onToggleCollapse={
                  !isMobile ? () => setRightSidebarOpen(false) : undefined
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archived Conversations Modal */}
      <ArchivedConversationsModal
        open={archivedModalOpen}
        onOpenChange={setArchivedModalOpen}
        onRestore={handleRestoreConversation}
      />
    </div>
  );
}
