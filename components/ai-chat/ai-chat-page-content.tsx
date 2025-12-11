"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, PanelLeftClose, PanelRightClose, Layers, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatHistorySidebar } from "./chat-history-sidebar";
import { AIChatMain } from "./chat-main";
import { MultiModelChatMain } from "./multi-model";
import { ToolsSidebar } from "./tools-sidebar";
import { ArchivedConversationsModal } from "./archived-conversations-modal";
import {
  AriaLiveProvider,
  SkipLinks,
  DEFAULT_CHAT_SKIP_LINKS,
} from "./accessibility";
import {
  togglePinConversation,
  archiveConversation,
  deleteConversation,
} from "@/lib/actions/ai-chat-actions";
import type { AIConversation } from "@/lib/db/schemas/ai-conversation";
import type { UserPlan } from "@/lib/db/schemas/user";
import { cn } from "@/lib/utils";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useKeyboardNavigation, DEFAULT_CHAT_SHORTCUTS } from "@/hooks/use-keyboard-navigation";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { useSharedHeader } from "@/components/dashboard/shared-header-context";
import {
  useUI,
  useConversations,
  useUIActions,
  useConversationActions,
} from "@/lib/store/chat";
import type { Conversation } from "@/lib/store/chat/types";

// Faster animation config for snappier transitions
const sidebarTransition = { type: "tween" as const, duration: 0.15, ease: [0.4, 0, 0.2, 1] as const };

interface AIChatPageContentProps {
  initialConversations: AIConversation[];
  userPlan: UserPlan;
}

/**
 * Convert AIConversation from DB to store Conversation type
 */
function toStoreConversation(conv: AIConversation): Conversation {
  return {
    id: conv._id,
    userId: conv.userId,
    title: conv.title,
    chatMode: conv.chatMode ?? "single",
    isPinned: conv.isPinned ?? false,
    isArchived: conv.isArchived ?? false,
    context: conv.context,
    comparisonModels: conv.comparisonModels,
    parentConversationId: conv.parentConversationId,
    branchedFromMessageId: conv.branchedFromMessageId,
    lastMessageAt: conv.lastMessageAt ?? new Date(),
    createdAt: conv.createdAt ?? new Date(),
    updatedAt: conv.updatedAt ?? new Date(),
  };
}

/**
 * Convert store Conversation back to AIConversation format for components
 */
function toAIConversation(conv: Conversation): AIConversation {
  return {
    _id: conv.id,
    userId: conv.userId,
    title: conv.title,
    messages: [],
    chatMode: conv.chatMode,
    isPinned: conv.isPinned,
    isArchived: conv.isArchived,
    context: conv.context ? {
      ...conv.context,
      toolsUsed: conv.context.toolsUsed ?? [],
    } : undefined,
    comparisonModels: conv.comparisonModels,
    parentConversationId: conv.parentConversationId,
    branchedFromMessageId: conv.branchedFromMessageId,
    lastMessageAt: conv.lastMessageAt,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}


/**
 * AIChatPageContent - Main container for the AI Chat feature
 * 
 * Refactored to use centralized store for state management.
 * Requirements: 1.3, 2.1, 2.2 - Centralized state, single-responsibility components
 */
export function AIChatPageContent({
  initialConversations,
  userPlan,
}: AIChatPageContentProps) {
  // Store state - centralized state management (Requirements: 1.1, 1.2, 1.3)
  const ui = useUI();
  const conversationsState = useConversations();
  const uiActions = useUIActions();
  const conversationActions = useConversationActions();
  
  // Local state for modal and pending prompt (not persisted to store)
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [shouldEditLastMessage, setShouldEditLastMessage] = useState(false);
  
  // Use the responsive layout hook for viewport detection
  // Requirements: 12.1, 12.2 - Detect mobile/tablet/desktop breakpoints
  const { isMobile, isTablet, shouldShowBackdrop } = useResponsiveLayout();

  // Track previous screen size to detect changes
  const prevIsMobileRef = useRef(isMobile);
  const prevIsTabletRef = useRef(isTablet);
  const hasInitializedRef = useRef(false);

  // Get main layout sidebar control
  const { setCollapsed: setMainSidebarCollapsed } = useSidebar();
  const { hideHeader } = useSharedHeader();
  const hasCollapsedMainSidebar = useRef(false);

  // Initialize store with initial conversations on mount
  useEffect(() => {
    if (!hasInitializedRef.current && initialConversations.length > 0) {
      const storeConversations = initialConversations.map(toStoreConversation);
      conversationActions.load(storeConversations);
      hasInitializedRef.current = true;
      
      // Set initial active conversation from URL or localStorage
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const conversationParam = params.get("conversation");
        if (conversationParam) {
          conversationActions.setActive(conversationParam);
        } else {
          const lastConversationId = localStorage.getItem("lastAIChatConversationId");
          if (lastConversationId && initialConversations.some(c => c._id === lastConversationId)) {
            conversationActions.setActive(lastConversationId);
          }
        }
      }
      
      // Set initial chat mode from localStorage
      if (typeof window !== "undefined" && userPlan === "MAX") {
        const savedMode = localStorage.getItem("ai-chat-mode");
        if (savedMode === "multi") {
          uiActions.setChatMode("multi");
        }
      }
      
      // Set initial sidebar state based on screen size
      if (typeof window !== "undefined") {
        const isDesktop = window.innerWidth > 768;
        uiActions.setLeftSidebar(isDesktop);
        uiActions.setViewport({ isMobile: !isDesktop, isTablet: window.innerWidth <= 1024 });
      }
    }
  }, [initialConversations, conversationActions, uiActions, userPlan]);

  // Auto-collapse the main layout sidebar and hide header when AI Chat page loads
  useEffect(() => {
    if (!hasCollapsedMainSidebar.current) {
      setMainSidebarCollapsed(true);
      hideHeader();
      hasCollapsedMainSidebar.current = true;
    }
  }, [setMainSidebarCollapsed, hideHeader]);

  // Sync viewport state with responsive layout hook
  useEffect(() => {
    uiActions.setViewport({ isMobile, isTablet });
  }, [isMobile, isTablet, uiActions]);

  // Handle screen size changes via resize event listener
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = prevIsMobileRef.current;
      const wasTablet = prevIsTabletRef.current;
      const nowMobile = window.innerWidth <= 768;
      const nowTablet = window.innerWidth <= 1024;

      if (nowMobile !== wasMobile || nowTablet !== wasTablet) {
        if (nowMobile) {
          uiActions.setLeftSidebar(false);
          uiActions.setRightSidebar(false);
        } else if (nowTablet && !wasTablet) {
          uiActions.setRightSidebar(false);
        } else if (!nowMobile && wasMobile) {
          uiActions.setLeftSidebar(true);
        }
      }

      prevIsMobileRef.current = nowMobile;
      prevIsTabletRef.current = nowTablet;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [uiActions]);

  // Handle branch conversation callback
  useEffect(() => {
    const handleBranchConversation = async (branchedConversationId: string) => {
      const { getConversation } = await import("@/lib/actions/ai-chat-actions");
      const result = await getConversation(branchedConversationId);
      
      if (result.success) {
        conversationActions.create(toStoreConversation(result.data));
        conversationActions.setActive(branchedConversationId);
        setShouldEditLastMessage(true);
        
        localStorage.setItem("lastAIChatConversationId", branchedConversationId);
        const url = new URL(window.location.href);
        url.searchParams.set("conversation", branchedConversationId);
        window.history.replaceState({}, "", url);
      }
    };

    (window as any).onBranchConversation = handleBranchConversation;
    return () => {
      delete (window as any).onBranchConversation;
    };
  }, [conversationActions]);

  // Reset edit mode when conversation changes
  useEffect(() => {
    setShouldEditLastMessage(false);
  }, [conversationsState.activeId]);

  // Handle new conversation
  const handleNewConversation = useCallback(() => {
    conversationActions.setActive(null);
    localStorage.removeItem("lastAIChatConversationId");
    const url = new URL(window.location.href);
    url.searchParams.delete("conversation");
    window.history.replaceState({}, "", url);
    if (isMobile) uiActions.setLeftSidebar(false);
  }, [isMobile, conversationActions, uiActions]);

  // Keyboard navigation setup
  // Requirements: 14.1 - Provide logical tab order through all interactive elements
  useKeyboardNavigation({
    enabled: true,
    shortcuts: [
      {
        key: DEFAULT_CHAT_SHORTCUTS.NEW_CHAT,
        description: "Start a new chat",
        action: handleNewConversation,
      },
      {
        key: DEFAULT_CHAT_SHORTCUTS.FOCUS_INPUT,
        description: "Focus the message input",
        action: () => {
          const input = document.querySelector<HTMLTextAreaElement>('#chat-input textarea');
          input?.focus();
        },
      },
      {
        key: DEFAULT_CHAT_SHORTCUTS.TOGGLE_LEFT_SIDEBAR,
        description: "Toggle conversation sidebar",
        action: () => uiActions.setLeftSidebar(!ui.leftSidebarOpen),
      },
      {
        key: DEFAULT_CHAT_SHORTCUTS.TOGGLE_RIGHT_SIDEBAR,
        description: "Toggle tools sidebar",
        action: () => uiActions.setRightSidebar(!ui.rightSidebarOpen),
      },
      {
        key: DEFAULT_CHAT_SHORTCUTS.CLOSE_MODAL,
        description: "Close modal or sidebar",
        action: () => {
          if (archivedModalOpen) {
            setArchivedModalOpen(false);
          } else if (isMobile) {
            uiActions.setLeftSidebar(false);
            uiActions.setRightSidebar(false);
          }
        },
      },
    ],
  });

  // Handle conversation created from first message
  const handleConversationCreated = useCallback((id: string, title: string, mode: "single" | "multi" = "single") => {
    const newConversation: Conversation = {
      id,
      userId: "",
      title,
      chatMode: mode,
      isPinned: false,
      isArchived: false,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    conversationActions.create(newConversation);
    conversationActions.setActive(id);
    localStorage.setItem("lastAIChatConversationId", id);
    const url = new URL(window.location.href);
    url.searchParams.set("conversation", id);
    window.history.replaceState({}, "", url);
  }, [conversationActions]);

  // Handle restored conversation from archive
  const handleRestoreConversation = useCallback((conversation: AIConversation) => {
    conversationActions.create(toStoreConversation(conversation));
  }, [conversationActions]);

  const handleSelectConversation = useCallback((id: string) => {
    conversationActions.setActive(id);
    localStorage.setItem("lastAIChatConversationId", id);
    const url = new URL(window.location.href);
    url.searchParams.set("conversation", id);
    window.history.replaceState({}, "", url);
    if (isMobile) uiActions.setLeftSidebar(false);
    
    if (userPlan === "MAX") {
      const conversation = conversationsState.items.get(id);
      const mode = conversation?.chatMode ?? "single";
      uiActions.setChatMode(mode);
      localStorage.setItem("ai-chat-mode", mode);
    }
  }, [isMobile, userPlan, conversationsState.items, conversationActions, uiActions]);

  const handlePinConversation = useCallback(async (id: string) => {
    await togglePinConversation(id);
    conversationActions.togglePin(id);
  }, [conversationActions]);

  const handleArchiveConversation = useCallback(async (id: string) => {
    await archiveConversation(id);
    conversationActions.archive(id);
    if (conversationsState.activeId === id) {
      conversationActions.setActive(null);
    }
  }, [conversationsState.activeId, conversationActions]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    conversationActions.delete(id);
    if (conversationsState.activeId === id) {
      conversationActions.setActive(null);
      localStorage.removeItem("lastAIChatConversationId");
    }
  }, [conversationsState.activeId, conversationActions]);

  const handleRenameConversation = useCallback(async (id: string, newTitle: string) => {
    const { updateConversationTitle } = await import("@/lib/actions/ai-chat-actions");
    const result = await updateConversationTitle(id, newTitle);
    if (result.success) {
      conversationActions.update(id, { title: newTitle });
    }
  }, [conversationActions]);

  const handleChatModeChange = useCallback((mode: "single" | "multi") => {
    uiActions.setChatMode(mode);
    localStorage.setItem("ai-chat-mode", mode);
  }, [uiActions]);

  const handleToolSelect = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    if (isMobile) uiActions.setRightSidebar(false);
  }, [isMobile, uiActions]);

  const handleConversationUpdate = useCallback((id: string, title: string) => {
    conversationActions.update(id, { title, lastMessageAt: new Date() });
  }, [conversationActions]);

  // Convert store conversations to AIConversation format for child components
  const conversations = useMemo(() => {
    return Array.from(conversationsState.items.values())
      .filter(c => !c.isArchived)
      .map(toAIConversation);
  }, [conversationsState.items]);


  return (
    <AriaLiveProvider>
      {/* Skip links for keyboard navigation */}
      <SkipLinks links={DEFAULT_CHAT_SKIP_LINKS} />
      
      <div 
        className="flex h-screen overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50"
        role="application"
        aria-label="AI Chat Interface"
      >
        {/* Mobile overlay backdrop */}
        <AnimatePresence>
          {shouldShowBackdrop && (ui.leftSidebarOpen || ui.rightSidebarOpen) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => {
                uiActions.setLeftSidebar(false);
                uiActions.setRightSidebar(false);
              }}
              aria-hidden="true"
              data-testid="mobile-sidebar-backdrop"
            />
          )}
        </AnimatePresence>

        {/* Left Sidebar - Chat History */}
        <AnimatePresence mode="popLayout">
          {ui.leftSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0, x: -10 }}
              animate={{ width: 320, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -10 }}
              transition={sidebarTransition}
              className={cn(
                "shrink-0 h-full py-4 pl-4",
                isMobile && "fixed left-0 top-16 bottom-0 z-50 w-72 py-0 pl-0"
              )}
              id="conversation-sidebar"
              role="complementary"
              aria-label="Conversation history"
            >
              <div className="h-full w-full rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm overflow-hidden">
                <ChatHistorySidebar
                  conversations={conversations}
                  activeConversationId={conversationsState.activeId ?? undefined}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={handleNewConversation}
                  onPinConversation={handlePinConversation}
                  onArchiveConversation={handleArchiveConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onRenameConversation={handleRenameConversation}
                  onToggleCollapse={!isMobile ? () => uiActions.setLeftSidebar(false) : undefined}
                  onOpenArchived={() => setArchivedModalOpen(true)}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <main 
          className="flex-1 flex flex-col min-w-0 h-full py-2 px-2 relative"
          id="main-content"
          role="main"
          aria-label="Chat messages"
        >
          {/* Mobile Header */}
          {(isMobile || isTablet) && (
            <header 
              className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border/50"
              role="banner"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => uiActions.setLeftSidebar(!ui.leftSidebarOpen)}
                aria-label={ui.leftSidebarOpen ? "Close conversation sidebar" : "Open conversation sidebar"}
                aria-expanded={ui.leftSidebarOpen}
                aria-controls="conversation-sidebar"
              >
                {ui.leftSidebarOpen ? (
                  <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
              <h1 className="font-semibold">
                {ui.chatMode === "multi" ? "Multi-Model Chat" : "AI Chat"}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => uiActions.setRightSidebar(!ui.rightSidebarOpen)}
                aria-label={ui.rightSidebarOpen ? "Close tools sidebar" : "Open tools sidebar"}
                aria-expanded={ui.rightSidebarOpen}
                aria-controls="tools-sidebar"
              >
                {ui.rightSidebarOpen ? (
                  <PanelRightClose className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </header>
          )}

          <div className="h-full rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col relative border-none">
            {/* Chat Mode Toggle (MAX plan only) */}
            {userPlan === "MAX" && !isMobile && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
                <div className="flex items-center gap-1 p-1 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50">
                  <Button
                    variant={ui.chatMode === "single" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleChatModeChange("single")}
                    className="h-7 rounded-full px-3 text-xs gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Single
                  </Button>
                  <Button
                    variant={ui.chatMode === "multi" ? "default" : "ghost"}
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

            {/* Keep both components mounted but hidden to avoid remount lag */}
            <div className={cn("h-full", ui.chatMode !== "single" && "hidden")}>
              <AIChatMain
                conversationId={conversationsState.activeId ?? undefined}
                initialPrompt={ui.chatMode === "single" ? pendingPrompt : null}
                shouldEditLastMessage={ui.chatMode === "single" && shouldEditLastMessage}
                onPromptUsed={() => setPendingPrompt(null)}
                onNewConversation={handleNewConversation}
                onConversationCreated={handleConversationCreated}
                onConversationUpdate={handleConversationUpdate}
                userPlan={userPlan}
              />
            </div>
            {userPlan === "MAX" && (
              <div className={cn("h-full", ui.chatMode !== "multi" && "hidden")}>
                <MultiModelChatMain
                  conversationId={conversationsState.activeId ?? undefined}
                  onConversationCreated={(id, title) => handleConversationCreated(id, title, "multi")}
                />
              </div>
            )}

            {/* Collapsed Left Sidebar Toggle (Desktop only) */}
            {!isMobile && !ui.leftSidebarOpen && (
              <div className="absolute left-4 top-4 z-30">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => uiActions.setLeftSidebar(true)}
                  className="h-8 w-8 rounded-full shadow-sm bg-background/80 backdrop-blur-sm hover:bg-background"
                  aria-label="Show conversation history"
                  aria-expanded={false}
                  aria-controls="conversation-sidebar"
                >
                  <PanelLeftClose className="h-4 w-4 rotate-180" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Collapsed Right Sidebar Toggle (Desktop only) */}
            {!isMobile && !ui.rightSidebarOpen && ui.chatMode === "single" && (
              <div className="absolute right-4 top-4 z-30">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => uiActions.setRightSidebar(true)}
                  className="h-8 w-8 rounded-full shadow-sm bg-background/80 backdrop-blur-sm hover:bg-background"
                  aria-label="Show AI tools"
                  aria-expanded={false}
                  aria-controls="tools-sidebar"
                >
                  <PanelRightClose className="h-4 w-4 rotate-180" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Tools */}
        <AnimatePresence mode="popLayout">
          {ui.rightSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0, x: 10 }}
              animate={{ width: 320, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: 10 }}
              transition={sidebarTransition}
              className={cn(
                "shrink-0 h-full py-4 pr-4",
                isMobile && "fixed right-0 top-16 bottom-0 z-50 w-72 py-0 pr-0"
              )}
              id="tools-sidebar"
              role="complementary"
              aria-label="AI Tools"
            >
              <div className="h-full w-full rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm overflow-hidden">
                <ToolsSidebar
                  onToolSelect={handleToolSelect}
                  onToggleCollapse={!isMobile ? () => uiActions.setRightSidebar(false) : undefined}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Archived Conversations Modal */}
        <ArchivedConversationsModal
          open={archivedModalOpen}
          onOpenChange={setArchivedModalOpen}
          onRestore={handleRestoreConversation}
        />
      </div>
    </AriaLiveProvider>
  );
}
