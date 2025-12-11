"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, PanelLeftClose, PanelRightClose, Layers, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatHistorySidebar } from "./chat-history-sidebar";
import { AIChatMain } from "./chat-main";
import { MultiModelChatMain } from "./multi-model";
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

type ChatMode = "single" | "multi";

interface AIChatPageContentProps {
  initialConversations: AIConversation[];
  userPlan: UserPlan;
}

export function AIChatPageContent({
  initialConversations,
  userPlan,
}: AIChatPageContentProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("ai-chat-mode");
      if (savedMode === "multi" && userPlan === "MAX") return "multi";
    }
    return "single";
  });
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(() => {
    // Check URL params first
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const conversationParam = params.get("conversation");
      if (conversationParam) {
        return conversationParam;
      }
      // Fall back to last conversation from localStorage
      const lastConversationId = localStorage.getItem("lastAIChatConversationId");
      if (lastConversationId && initialConversations.some(c => c._id === lastConversationId)) {
        return lastConversationId;
      }
    }
    return undefined;
  });
  const [shouldEditLastMessage, setShouldEditLastMessage] = useState(false);
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

  // Handle branch conversation callback
  useEffect(() => {
    const handleBranchConversation = async (branchedConversationId: string) => {
      // Fetch the branched conversation
      const { getConversation } = await import("@/lib/actions/ai-chat-actions");
      const result = await getConversation(branchedConversationId);
      
      if (result.success) {
        // Add to conversations list if not already there
        setConversations((prev) => {
          const exists = prev.some(c => c._id === branchedConversationId);
          if (exists) return prev;
          return [result.data, ...prev];
        });
        
        // Switch to the branched conversation with edit mode
        setActiveConversationId(branchedConversationId);
        setShouldEditLastMessage(true);
        
        // Save to localStorage
        localStorage.setItem("lastAIChatConversationId", branchedConversationId);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set("conversation", branchedConversationId);
        window.history.replaceState({}, "", url);
      }
    };

    // Attach to window for child components to call
    (window as any).onBranchConversation = handleBranchConversation;

    return () => {
      delete (window as any).onBranchConversation;
    };
  }, []);

  // Reset edit mode when conversation changes
  useEffect(() => {
    setShouldEditLastMessage(false);
  }, [activeConversationId]);

  // Handle new conversation - now just clears active conversation
  // Actual conversation is created on first message via API
  const handleNewConversation = useCallback(() => {
    setActiveConversationId(undefined);
    // Clear from localStorage and URL
    localStorage.removeItem("lastAIChatConversationId");
    const url = new URL(window.location.href);
    url.searchParams.delete("conversation");
    window.history.replaceState({}, "", url);
    if (isMobile) setLeftSidebarOpen(false);
  }, [isMobile]);

  // Handle conversation created from first message
  const handleConversationCreated = useCallback((id: string, title: string, mode: ChatMode = "single") => {
    const newConversation: AIConversation = {
      _id: id,
      userId: "",
      title,
      messages: [],
      chatMode: mode,
      isPinned: false,
      isArchived: false,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(id);
    // Save to localStorage
    localStorage.setItem("lastAIChatConversationId", id);
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("conversation", id);
    window.history.replaceState({}, "", url);
  }, []);

  // Handle restored conversation from archive
  const handleRestoreConversation = useCallback((conversation: AIConversation) => {
    setConversations((prev) => [conversation, ...prev]);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    // Save to localStorage
    localStorage.setItem("lastAIChatConversationId", id);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set("conversation", id);
    window.history.replaceState({}, "", url);
    if (isMobile) setLeftSidebarOpen(false);
    
    // Switch to the conversation's chat mode if MAX plan
    if (userPlan === "MAX") {
      const conversation = conversations.find((c) => c._id === id);
      const mode = conversation?.chatMode ?? "single";
      setChatMode(mode);
      localStorage.setItem("ai-chat-mode", mode);
    }
  }, [isMobile, userPlan, conversations]);

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
      // Clear last conversation from localStorage
      localStorage.removeItem("lastAIChatConversationId");
    }
  }, [activeConversationId]);

  const handleRenameConversation = useCallback(async (id: string, newTitle: string) => {
    const { updateConversationTitle } = await import("@/lib/actions/ai-chat-actions");
    const result = await updateConversationTitle(id, newTitle);
    if (result.success) {
      setConversations((prev) =>
        prev.map((c) => (c._id === id ? { ...c, title: newTitle } : c))
      );
    }
  }, []);

  const handleChatModeChange = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    localStorage.setItem("ai-chat-mode", mode);
  }, []);

  const handleToolSelect = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    // If no active conversation, the chat will use this prompt
    if (isMobile) setRightSidebarOpen(false);
  }, [isMobile]);

  const handleConversationUpdate = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c._id === id ? { ...c, title, lastMessageAt: new Date() } : c
      )
    );
  }, []);

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
                onRenameConversation={handleRenameConversation}
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
            <span className="font-semibold">
              {chatMode === "multi" ? "Multi-Model Chat" : "AI Chat"}
            </span>
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
          {/* Chat Mode Toggle (MAX plan only) */}
          {userPlan === "MAX" && !isMobile && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
              <div className="flex items-center gap-1 p-1 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50">
                <Button
                  variant={chatMode === "single" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleChatModeChange("single")}
                  className="h-7 rounded-full px-3 text-xs gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Single
                </Button>
                <Button
                  variant={chatMode === "multi" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleChatModeChange("multi")}
                  className="h-7 rounded-full px-3 text-xs gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Compare
                </Button>
              </div>
            </div>
          )}

          {chatMode === "multi" && userPlan === "MAX" ? (
            <MultiModelChatMain
              conversationId={activeConversationId}
              onConversationCreated={(id, title) => handleConversationCreated(id, title, "multi")}
            />
          ) : (
            <AIChatMain
              conversationId={activeConversationId}
              initialPrompt={pendingPrompt}
              shouldEditLastMessage={shouldEditLastMessage}
              onPromptUsed={() => setPendingPrompt(null)}
              onNewConversation={handleNewConversation}
              onConversationCreated={handleConversationCreated}
              onConversationUpdate={handleConversationUpdate}
              userPlan={userPlan}
            />
          )}

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
          {!isMobile && !rightSidebarOpen && chatMode === "single" && (
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
