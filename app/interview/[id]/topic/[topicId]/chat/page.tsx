"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Send,
  RefreshCw,
  Lightbulb,
  Code,
  BookOpen,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Square,
  ChevronDown,
  Briefcase,
  Building2,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import Link from "next/link";
import { getTopic } from "@/lib/actions/topic";
import { getInterview } from "@/lib/actions/interview";
import type { RevisionTopic, Interview } from "@/lib/db/schemas/interview";

const MarkdownRenderer = dynamic(
  () => import("@/components/streaming/markdown-renderer"),
  { ssr: false }
);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

const quickActions = [
  {
    icon: Lightbulb,
    label: "Simplify",
    prompt: "Can you explain this more simply?",
  },
  { icon: Code, label: "Example", prompt: "Show me a practical code example" },
  {
    icon: BookOpen,
    label: "Real-world",
    prompt: "How is this used in production?",
  },
  {
    icon: RefreshCw,
    label: "Different view",
    prompt: "Explain from a different angle",
  },
];

function formatTime(date?: Date): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export default function ChatPage() {
  const params = useParams();
  const interviewId = params.id as string;
  const topicId = params.topicId as string;

  const [topic, setTopic] = useState<RevisionTopic | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contentCopied, setContentCopied] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [topicResult, interviewResult, chatResponse] = await Promise.all([
          getTopic(interviewId, topicId),
          getInterview(interviewId),
          fetch(`/api/interview/${interviewId}/topic/${topicId}/chat`).then(
            (r) => (r.ok ? r.json() : { messages: [] })
          ),
        ]);

        if (topicResult.success) {
          setTopic(topicResult.data);
          if (chatResponse.messages?.length > 0) {
            setMessages(
              chatResponse.messages.map(
                (m: {
                  id: string;
                  role: string;
                  content: string;
                  createdAt?: string;
                }) => ({
                  id: m.id,
                  role: m.role as "user" | "assistant",
                  content: m.content,
                  createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
                })
              )
            );
          } else {
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content: `Hey! I'm here to help you master **${topicResult.data.title}**.\n\nAsk me anything — I can explain concepts differently, show code examples, or dive deeper into specifics.`,
                createdAt: new Date(),
              },
            ]);
          }
        } else {
          setError(topicResult.error.message);
        }
        if (interviewResult.success) setInterview(interviewResult.data);
      } catch {
        setError("Failed to load topic data");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [interviewId, topicId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll detection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const copyTopicContent = () => {
    if (topic) {
      navigator.clipboard.writeText(topic.content);
      setContentCopied(true);
      setTimeout(() => setContentCopied(false), 2000);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const now = new Date();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      createdAt: now,
    };
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: now,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `/api/interview/${interviewId}/topic/${topicId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...messages.filter((m) => m.id !== "welcome"),
              userMessage,
            ].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [input, isStreaming, messages, interviewId, topicId]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const copyMessage = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) return null;

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "Topic not found"}
          </p>
          <Link href={`/interview/${interviewId}`}>
            <Button className="rounded-full px-6">Back to Interview</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Sidebar - Topic Context */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="hidden lg:flex flex-col border-r border-border/50 bg-muted/20 backdrop-blur-sm overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border/50">
              <Link
                href={`/interview/${interviewId}/topic/${topicId}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to topic</span>
              </Link>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-auto p-5 space-y-6">
              {/* Topic Title */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-foreground leading-snug">
                    {topic.title}
                  </h2>
                  <button
                    onClick={copyTopicContent}
                    className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                  >
                    {contentCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      topic.confidence === "high"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : topic.confidence === "medium"
                        ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {topic.confidence} confidence
                  </span>
                  {topic.style && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                      {topic.style}
                    </span>
                  )}
                </div>
              </div>

              {/* Content Preview */}
              <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Content Preview
                </h3>
                <div className="text-sm text-foreground/80 leading-relaxed">
                  <MarkdownRenderer
                    content={
                      topic.content.slice(0, 400) +
                      (topic.content.length > 400 ? "..." : "")
                    }
                    isStreaming={false}
                    className="prose-sm"
                  />
                </div>
                {topic.content.length > 400 && (
                  <Link
                    href={`/interview/${interviewId}/topic/${topicId}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-3 transition-colors"
                  >
                    Read full content
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Why This Topic */}
              <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Why This Topic
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {topic.reason}
                </p>
              </div>

              {/* Interview Context */}
              {interview && (
                <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 p-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Interview Context
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {interview.jobDetails.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Position
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {interview.jobDetails.company}
                        </p>
                        <p className="text-xs text-muted-foreground">Company</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Toggle sidebar button - desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex rounded-full hover:bg-muted/80 transition-colors min-h-[44px] min-w-[44px]"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeft className="w-5 h-5" />
                )}
              </Button>

              {/* Back button - mobile */}
              <Link
                href={`/interview/${interviewId}/topic/${topicId}`}
                className="lg:hidden"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-muted/80 transition-colors min-h-[44px] min-w-[44px]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground leading-tight line-clamp-1">
                    {topic.title}
                  </h1>
                  <p className="text-xs text-muted-foreground">AI Assistant</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto px-4 py-6 pb-[200px] lg:pb-[180px]"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const isLast = index === messages.length - 1;
                const showTyping =
                  isStreaming && isLast && !isUser && !message.content;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`group max-w-[85%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Message bubble */}
                      <div
                        className={`relative px-4 py-3 ${
                          isUser
                            ? "bg-foreground text-background rounded-[20px] rounded-br-md"
                            : "bg-muted/60 backdrop-blur-sm text-foreground rounded-[20px] rounded-bl-md border border-border/30"
                        }`}
                      >
                        {showTyping ? (
                          <div className="flex items-center gap-1.5 py-1 px-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-muted-foreground/60"
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.4, 1, 0.4],
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  delay: i * 0.15,
                                }}
                              />
                            ))}
                          </div>
                        ) : isUser ? (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : (
                          <MarkdownRenderer
                            content={message.content}
                            isStreaming={isStreaming && isLast}
                            className="text-[15px] leading-relaxed prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2"
                          />
                        )}
                      </div>

                      {/* Meta row */}
                      <div
                        className={`flex items-center gap-2 mt-1.5 px-1 ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.createdAt && message.id !== "welcome" && (
                          <span className="text-[11px] text-muted-foreground/70">
                            {formatTime(message.createdAt)}
                          </span>
                        )}
                        {message.content && !showTyping && (
                          <button
                            onClick={() =>
                              copyMessage(message.id, message.content)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-md"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollDown && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="fixed bottom-[220px] lg:bottom-[200px] left-1/2 -translate-x-1/2 z-40 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 pb-safe lg:left-auto lg:right-0"
          style={{ left: sidebarOpen ? "380px" : "0" }}
        >
          <div className="backdrop-blur-xl bg-background/80 border-t border-border/50">
            <div className="max-w-3xl mx-auto px-4 py-4">
              {/* Quick actions */}
              <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
                {quickActions.map((action) => (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setInput(action.prompt);
                      textareaRef.current?.focus();
                    }}
                    disabled={isStreaming}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 hover:bg-muted border border-border/50 text-sm text-foreground whitespace-nowrap transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    <action.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{action.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Input field */}
              <form onSubmit={handleSubmit}>
                <div className="relative flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything..."
                      className="min-h-[52px] max-h-32 resize-none rounded-2xl bg-muted/40 border-border/50 focus:border-primary/50 focus:ring-primary/20 pr-4 py-3.5 text-[15px] placeholder:text-muted-foreground/60"
                      disabled={isStreaming}
                      rows={1}
                    />
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isStreaming ? (
                      <Button
                        type="button"
                        onClick={stopGeneration}
                        className="rounded-full w-12 h-12 bg-destructive hover:bg-destructive/90 shadow-lg"
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={!input.trim()}
                        className="rounded-full w-12 h-12 bg-foreground hover:bg-foreground/90 text-background shadow-lg disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                </div>
                <p className="text-[11px] text-muted-foreground/60 text-center mt-2 hidden md:block">
                  Enter to send · Shift+Enter for new line
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
