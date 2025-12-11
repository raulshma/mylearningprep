"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Keyboard,
  ChevronRight,
  Sparkles,
  Circle,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getTopic, updateTopicStatus, type AnalogyStyle } from "@/lib/actions/topic";
import type { TopicStatus } from "@/lib/db/schemas/interview";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Calculate estimated reading time (average 200 words per minute)
function getReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return minutes === 1 ? "1 min read" : `${minutes} min read`;
}

import { RegenerateMenu } from "@/components/streaming/regenerate-menu";

// Dynamic import for components with Shiki (code highlighting) - prevents SSR issues
const MarkdownRenderer = dynamic(
  () => import("@/components/streaming/markdown-renderer"),
  { ssr: false }
);
const TopicContentDisplay = dynamic(
  () => import("@/components/interview/topic-content-display"),
  { ssr: false }
);
import { getInterview } from "@/lib/actions/interview";
import type { RevisionTopic, Interview } from "@/lib/db/schemas/interview";

// Stream event types for SSE parsing
interface StreamEvent<T = unknown> {
  type: "content" | "done" | "error";
  data?: T;
  topicId?: string;
  style?: string;
  error?: string;
}

/**
 * Helper function to process SSE stream
 */
async function processSSEStream<T>(
  response: Response,
  onContent: (data: T) => void,
  onDone: () => void,
  onError: (error: string) => void
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);
          try {
            const event: StreamEvent<T> = JSON.parse(jsonStr);

            if (event.type === "content" && event.data !== undefined) {
              onContent(event.data);
            } else if (event.type === "done") {
              onDone();
            } else if (event.type === "error") {
              onError(event.error || "Unknown error");
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

interface StreamStatusResponse {
  status: "none" | "active" | "completed" | "error";
  streamId?: string;
  createdAt?: number;
}

/**
 * Check if there's an active generation for a topic
 */
async function checkStreamStatus(
  interviewId: string,
  topicId: string
): Promise<StreamStatusResponse> {
  try {
    const moduleKey = `topic_${topicId}`;
    const response = await fetch(
      `/api/interview/${interviewId}/stream/${moduleKey}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      return { status: "none" };
    }

    return await response.json();
  } catch {
    return { status: "none" };
  }
}

const styleLabels: Record<AnalogyStyle, string> = {
  professional: "Professional",
  construction: "Analogy",
  simple: "Simple",
};

const styleDescriptions: Record<AnalogyStyle, string> = {
  professional: "Technical deep dive suitable for interviews",
  construction: "Relatable analogies to explain complex concepts",
  simple: "Simplified explanation for easy understanding",
};

const statusConfig: Record<TopicStatus, { label: string; icon: typeof Circle; color: string }> = {
  not_started: { label: "Not Started", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-yellow-500" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500" },
};

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;
  const topicId = params.topicId as string;
  const isMobile = useIsMobile();

  const [topic, setTopic] = useState<RevisionTopic | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] =
    useState<AnalogyStyle>("professional");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [topicStatus, setTopicStatus] = useState<TopicStatus>("not_started");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const resumeAttemptedRef = useRef(false);

  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Style change handler - defined before keyboard shortcuts that use it
  const handleStyleChangeRef = useRef<((style: AnalogyStyle, instructions?: string) => Promise<void>) | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Escape - go back
      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          router.push(`/interview/${interviewId}`);
        }
        return;
      }

      // c - open chat
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        router.push(`/interview/${interviewId}/topic/${topicId}/chat`);
        return;
      }

      // 1, 2, 3 - switch styles
      if (e.key === "1" && !isRegenerating) {
        handleStyleChangeRef.current?.("professional");
        return;
      }
      if (e.key === "2" && !isRegenerating) {
        handleStyleChangeRef.current?.("construction");
        return;
      }
      if (e.key === "3" && !isRegenerating) {
        handleStyleChangeRef.current?.("simple");
        return;
      }

      // ? - show shortcuts
      if (e.key === "?") {
        setShowShortcuts((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interviewId, topicId, isRegenerating, router, showShortcuts]);

  const handleCopyContent = useCallback(() => {
    if (topic) {
      navigator.clipboard.writeText(topic.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [topic]);

  const handleStatusChange = useCallback(async (newStatus: TopicStatus) => {
    if (newStatus === topicStatus || isUpdatingStatus) return;
    
    setIsUpdatingStatus(true);
    const previousStatus = topicStatus;
    setTopicStatus(newStatus); // Optimistic update
    
    try {
      const result = await updateTopicStatus(interviewId, topicId, newStatus);
      if (!result.success) {
        setTopicStatus(previousStatus); // Revert on error
        console.error("Failed to update status:", result.error);
      } else {
        // Invalidate cache so interview page shows updated status
        router.refresh();
      }
    } catch (err) {
      setTopicStatus(previousStatus); // Revert on error
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [interviewId, topicId, topicStatus, isUpdatingStatus, router]);

  // Load topic and interview data, and check for resumable streams
  useEffect(() => {
    async function loadData() {
      try {
        const [topicResult, interviewResult] = await Promise.all([
          getTopic(interviewId, topicId),
          getInterview(interviewId),
        ]);

        if (topicResult.success) {
          setTopic(topicResult.data);
          setSelectedStyle(topicResult.data.style);
          setTopicStatus(topicResult.data.status ?? "not_started");
        } else {
          setError(topicResult.error.message);
        }

        if (interviewResult.success) {
          setInterview(interviewResult.data);
        }
      } catch (err) {
        console.error("Failed to load topic:", err);
        setError("Failed to load topic");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [interviewId, topicId]);

  // Try to resume any active stream on mount using polling
  useEffect(() => {
    if (isLoading || resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const checkAndPoll = async () => {
      const streamStatus = await checkStreamStatus(interviewId, topicId);

      if (streamStatus.status === "active") {
        // Found an active generation - show loading state and poll for completion
        setIsRegenerating(true);

        const pollInterval = setInterval(async () => {
          const status = await checkStreamStatus(interviewId, topicId);

          if (status.status === "completed") {
            clearInterval(pollInterval);
            const result = await getTopic(interviewId, topicId);
            if (result.success) {
              setTopic(result.data);
              setStreamingContent("");
            }
            setIsRegenerating(false);
          } else if (status.status === "error" || status.status === "none") {
            clearInterval(pollInterval);
            setIsRegenerating(false);
          }
        }, 2000); // Poll every 2 seconds

        // Safety timeout - stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsRegenerating(false);
        }, 5 * 60 * 1000);
      } else if (streamStatus.status === "completed") {
        // Generation just completed - refresh data
        const result = await getTopic(interviewId, topicId);
        if (result.success) {
          setTopic(result.data);
        }
      }
    };

    checkAndPoll();
  }, [isLoading, interviewId, topicId]);

  const handleStyleChange = useCallback(
    async (newStyle: AnalogyStyle, instructions?: string) => {
      if (newStyle === selectedStyle && !instructions) return;
      if (isRegenerating) return;

      setSelectedStyle(newStyle);

      // If no custom instructions, check styleCache on topic for instant switching
      if (!instructions && topic?.styleCache?.[newStyle]) {
        // Found cached content - use it instantly without regenerating
        setTopic((prev) =>
          prev
            ? { ...prev, content: prev.styleCache![newStyle]!, style: newStyle }
            : prev
        );
        return;
      }

      setIsRegenerating(true);
      setStreamingContent("");

      try {
        const response = await fetch(
          `/api/interview/${interviewId}/topic/${topicId}/regenerate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              style: newStyle,
              instructions,
            }),
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to regenerate");
        }

        await processSSEStream(
          response,
          (data: string) => setStreamingContent(data),
          async () => {
            const result = await getTopic(interviewId, topicId);
            if (result.success) {
              setTopic(result.data);
              setStreamingContent("");
            }
          },
          () => {
            // On error, revert to previous style
            if (topic) {
              setSelectedStyle(topic.style);
            }
          }
        );
      } catch (err) {
        console.error("Failed to regenerate analogy:", err);
        // Revert to previous style on error
        if (topic) {
          setSelectedStyle(topic.style);
        }
      } finally {
        setIsRegenerating(false);
      }
    },
    [interviewId, topicId, selectedStyle, isRegenerating, topic]
  );

  // Keep ref updated for keyboard shortcuts
  useEffect(() => {
    handleStyleChangeRef.current = handleStyleChange;
  }, [handleStyleChange]);

  const handleRegenerateWithInstructions = useCallback(
    async (instructions: string) => {
      await handleStyleChange(selectedStyle, instructions);
    },
    [selectedStyle, handleStyleChange]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-3">Unable to Load Topic</h1>
          <p className="text-muted-foreground mb-8">
            {error || "The topic you requested could not be found or there was an error loading it."}
          </p>
          <Link href={`/interview/${interviewId}`}>
            <Button size="lg" className="rounded-full px-8">Return to Interview</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show streaming content when regenerating, otherwise show saved content
  const isStreaming = isRegenerating && streamingContent.length > 0;
  const displayContent = isStreaming ? streamingContent : topic.content;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10 selection:text-primary">
      {/* Navigation Bar */}
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-border/50 shadow-sm"
            : "bg-transparent border-transparent"
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "circOut" }}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/interview/${interviewId}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-foreground/5 w-10 h-10"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Back to Interview (Esc)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AnimatePresence>
              {scrolled && (
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-md"
                >
                  {topic.title}
                </motion.h1>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-foreground/5 w-10 h-10"
                    onClick={handleCopyContent}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy Content</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-foreground/5 w-10 h-10"
                    onClick={() => setShowShortcuts(true)}
                  >
                    <Keyboard className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Shortcuts (?)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Link href={`/interview/${interviewId}/topic/${topicId}/chat`}>
              <Button
                variant="default"
                size="sm"
                className="rounded-full px-4 h-9 bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-lg shadow-foreground/5"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Ask AI</span>
                <span className="sm:hidden">Chat</span>
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="pt-24 pb-20 px-4 md:px-6 max-w-5xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 relative"
        >


          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium flex-wrap">
              <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full backdrop-blur-md border border-border/50">
                <Clock className="w-3.5 h-3.5" />
                {getReadingTime(topic.content)}
              </span>
              <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full backdrop-blur-md border border-border/50 capitalize">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500/70" />
                {topic.confidence} Confidence
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={cn(
                      "flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full backdrop-blur-md border border-border/50 hover:bg-secondary/80 transition-colors cursor-pointer",
                      isUpdatingStatus && "opacity-50 pointer-events-none"
                    )}
                    disabled={isUpdatingStatus}
                  >
                    {(() => {
                      const config = statusConfig[topicStatus];
                      const StatusIcon = config.icon;
                      return (
                        <>
                          <StatusIcon className={cn("w-3.5 h-3.5", config.color)} />
                          <span className={config.color}>{config.label}</span>
                        </>
                      );
                    })()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(Object.keys(statusConfig) as TopicStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          topicStatus === status && "bg-secondary"
                        )}
                      >
                        <StatusIcon className={cn("w-4 h-4", config.color)} />
                        {config.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              {topic.title}
            </h1>

            {interview && (
              <p className="text-lg text-muted-foreground max-w-2xl">
                Interview preparation for <span className="text-foreground font-medium">{interview.jobDetails.title}</span> at <span className="text-foreground font-medium">{interview.jobDetails.company}</span>
              </p>
            )}
          </div>
        </motion.div>

        {/* Style Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mb-8 sticky top-20 z-40"
        >
          <div className="bg-secondary/80 backdrop-blur-xl border border-border/50 p-1.5 rounded-full inline-flex shadow-sm overflow-x-auto max-w-full no-scrollbar">
            {(Object.keys(styleLabels) as AnalogyStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => handleStyleChange(style)}
                disabled={isRegenerating}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap relative",
                  selectedStyle === style
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {selectedStyle === style && (
                  <motion.div
                    layoutId="activeStyle"
                    className="absolute inset-0 bg-foreground rounded-full shadow-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {isRegenerating && selectedStyle === style && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {styleLabels[style]}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <Card className="border-none shadow-xl shadow-black/5 bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-border/50">
            <CardContent className="p-6 md:p-10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Explanation</h2>
                    <p className="text-xs text-muted-foreground">{styleDescriptions[selectedStyle]}</p>
                  </div>
                </div>

                {isRegenerating && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {streamingContent ? "Streaming..." : "Thinking..."}
                  </div>
                )}
              </div>

              {isRegenerating && !streamingContent ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-50" />
                  <p>Crafting your {styleLabels[selectedStyle].toLowerCase()} explanation...</p>
                </div>
              ) : (
                <TopicContentDisplay
                  topic={{
                    ...topic,
                    content: displayContent,
                  }}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                  showMetadata={true}
                />
              )}
            </CardContent>

            {/* Footer Actions */}
            <div className="bg-secondary/30 border-t border-border/40 p-4 md:p-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <RegenerateMenu
                  onRegenerate={() => handleStyleChange(selectedStyle)}
                  onRegenerateWithInstructions={handleRegenerateWithInstructions}
                  disabled={isRegenerating}
                  label="Regenerate"
                  contextHint="topic explanation"
                />
              </div>
              <Link
                href={`/interview/${interviewId}/topic/${topicId}/chat`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full h-11 rounded-xl border-border/60 hover:bg-secondary/80 hover:border-border transition-all">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask Follow-up Questions
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
              onClick={() => setShowShortcuts(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 px-4"
            >
              <Card className="border-border/50 shadow-2xl bg-card/90 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Keyboard className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
                  </div>

                  <div className="space-y-1">
                    {[
                      { key: "Esc", label: "Go back" },
                      { key: "C", label: "Open chat" },
                      { key: "1", label: "Professional style" },
                      { key: "2", label: "Analogy style" },
                      { key: "3", label: "Simple style" },
                      { key: "?", label: "Toggle shortcuts" },
                    ].map((shortcut) => (
                      <div key={shortcut.key} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                        <span className="text-sm text-muted-foreground">{shortcut.label}</span>
                        <kbd className="px-2.5 py-1 bg-background border border-border rounded-md text-xs font-mono font-medium shadow-sm min-w-[24px] text-center">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-6 rounded-xl"
                    onClick={() => setShowShortcuts(false)}
                  >
                    Close
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
