"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Plus,
  Bot,
  User,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Square,
  ArrowUp,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { ThinkingIndicator } from "./thinking-indicator";
import { ModelSelector } from "./model-selector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ActiveTools } from "@/components/streaming/tool-status";
import { MarkdownRenderer } from "@/components/streaming/markdown-renderer";
import {
  useAIAssistant,
  ASSISTANT_SUGGESTIONS,
  type SuggestionCategory,
} from "@/hooks/use-ai-assistant";
import { generateConversationTitle } from "@/lib/actions/ai-chat-actions";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import type { UserPlan } from "@/lib/db/schemas/user";

/**
 * Extract text content from UIMessage parts
 */
function getMessageTextContent(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Extract reasoning content from UIMessage parts
 */
function getMessageReasoning(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => {
      // Access reasoning text from the part
      const reasoningPart = part as { type: "reasoning"; text: string };
      return reasoningPart.text || "";
    })
    .join("");
}

/**
 * Get tool parts from a message
 */
function getToolParts(message: UIMessage) {
  return message.parts.filter(
    (part): part is Extract<typeof part, { type: `tool-${string}` }> =>
      part.type.startsWith("tool-")
  );
}

/**
 * Get file parts (images) from a message
 */
function getFileParts(message: UIMessage) {
  return message.parts.filter(
    (part): part is { type: "file"; mediaType: string; url: string; filename?: string } =>
      part.type === "file"
  );
}

/**
 * Format tool output for readable display
 */
function formatToolResult(output: unknown, toolName: string): React.ReactNode {
  if (output == null) return null;

  if (typeof output === "string") {
    return <span>{output}</span>;
  }

  if (typeof output === "object") {
    const obj = output as Record<string, unknown>;

    // Search results
    if (toolName === "searchWeb" && Array.isArray(obj.results)) {
      return (
        <div className="space-y-2">
          <div className="text-muted-foreground">
            Found {obj.results.length} results:
          </div>
          {obj.results
            .slice(0, 3)
            .map(
              (
                result: { title?: string; url?: string; snippet?: string },
                i: number
              ) => (
                <div key={i} className="pl-2 border-l-2 border-primary/30">
                  <div className="font-medium">{result.title}</div>
                  {result.snippet && (
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {result.snippet}
                    </div>
                  )}
                </div>
              )
            )}
          {obj.results.length > 3 && (
            <div className="text-muted-foreground">
              ...and {obj.results.length - 3} more
            </div>
          )}
        </div>
      );
    }

    // Tech trends
    if (toolName === "analyzeTechTrends" && obj.trends) {
      const trends = obj.trends as Array<{
        technology?: string;
        trend?: string;
        recommendation?: string;
      }>;
      return (
        <div className="space-y-2">
          {trends.map((trend, i: number) => (
            <div key={i} className="pl-2 border-l-2 border-primary/30">
              <div className="font-medium">{trend.technology}</div>
              {trend.trend && <div className="text-xs">{trend.trend}</div>}
              {trend.recommendation && (
                <div className="text-muted-foreground text-xs mt-0.5">
                  💡 {trend.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Interview questions
    if (
      toolName === "generateInterviewQuestions" &&
      Array.isArray(obj.questions)
    ) {
      return (
        <div className="space-y-1.5">
          {obj.questions
            .slice(0, 5)
            .map((q: { question?: string; difficulty?: string }, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary font-medium">{i + 1}.</span>
                <div>
                  <span>{q.question}</span>
                  {q.difficulty && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] py-0 px-1"
                    >
                      {q.difficulty}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          {obj.questions.length > 5 && (
            <div className="text-muted-foreground">
              ...and {obj.questions.length - 5} more questions
            </div>
          )}
        </div>
      );
    }

    // Default object display
    const entries = Object.entries(obj).filter(([, v]) => v != null);
    if (entries.length === 0)
      return <span className="text-muted-foreground">No data</span>;

    return (
      <div className="space-y-1">
        {entries.slice(0, 5).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, " $1").trim()}:
            </span>
            <span className="flex-1">
              {typeof value === "object"
                ? Array.isArray(value)
                  ? `${value.length} items`
                  : JSON.stringify(value).slice(0, 50) + "..."
                : String(value).slice(0, 100)}
            </span>
          </div>
        ))}
        {entries.length > 5 && (
          <div className="text-muted-foreground">
            ...and {entries.length - 5} more fields
          </div>
        )}
      </div>
    );
  }

  return <span>{String(output)}</span>;
}

/**
 * Tool invocation display component
 */
function ToolInvocation({
  part,
}: {
  part: {
    type: string;
    toolCallId: string;
    state: string;
    input?: unknown;
    output?: unknown;
    errorText?: string;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = part.type.replace("tool-", "");
  const isComplete = part.state === "output-available";
  const isError = part.state === "output-error";
  const isStreaming =
    part.state === "input-streaming" || part.state === "input-available";

  return (
    <div className="rounded-2xl bg-muted/30 text-xs overflow-hidden border border-border/50">
      <button
        type="button"
        onClick={() => isComplete && setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-start gap-2 p-3 w-full text-left",
          isComplete && "hover:bg-muted/50 cursor-pointer"
        )}
      >
        <div
          className={cn(
            "shrink-0 p-1.5 rounded-lg",
            isComplete
              ? "bg-green-500/20 text-green-600"
              : isError
              ? "bg-red-500/20 text-red-600"
              : "bg-primary/20 text-primary"
          )}
        >
          {isComplete ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : isError ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <Wrench className="h-3.5 w-3.5 animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">
              {toolName.replace(/([A-Z])/g, " $1").trim()}
            </span>
            {isStreaming && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {isComplete && (
              <ChevronRight
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            )}
          </div>
          {part.input != null && !isComplete && (
            <div className="text-muted-foreground mt-1 truncate">
              {(() => {
                const inputStr =
                  typeof part.input === "object"
                    ? JSON.stringify(part.input)
                    : String(part.input);
                return inputStr.length > 100
                  ? inputStr.slice(0, 100) + "..."
                  : inputStr;
              })()}
            </div>
          )}
          {isError && part.errorText && (
            <div className="text-red-500 mt-1">{part.errorText}</div>
          )}
        </div>
      </button>

      {isComplete && isExpanded && part.output != null && (
        <div className="border-t border-border/50 p-3 bg-background/50">
          {formatToolResult(part.output, toolName)}
        </div>
      )}
    </div>
  );
}

interface AIChatMainProps {
  conversationId?: string;
  interviewId?: string;
  learningPathId?: string;
  initialPrompt?: string | null;
  onPromptUsed?: () => void;
  onNewConversation?: () => void;
  onConversationCreated?: (id: string, title: string) => void;
  onConversationUpdate?: (id: string, title: string) => void;
  userPlan?: UserPlan;
}

export function AIChatMain({
  conversationId,
  interviewId,
  learningPathId,
  initialPrompt,
  onPromptUsed,
  onNewConversation,
  onConversationCreated,
  onConversationUpdate,
  userPlan,
}: AIChatMainProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptUsedRef = useRef(false);
  const isUserScrollingRef = useRef(false);

  // Model selection state (MAX plan only)
  const isMaxPlan = userPlan === "MAX";
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelSupportsImages, setModelSupportsImages] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  const {
    messages,
    input,
    setInput,
    isLoading,
    activeTools,
    sendMessage,
    stop,
    reset,
  } = useAIAssistant({
    interviewId,
    learningPathId,
    conversationId,
    selectedModelId: isMaxPlan ? selectedModelId : undefined,
    onError: (error) => {
      console.error("Assistant error:", error);
    },
  });

  // Handle model selection
  const handleModelSelect = useCallback((modelId: string, supportsImages: boolean) => {
    setSelectedModelId(modelId);
    setModelSupportsImages(supportsImages);
    // Clear attached files if new model doesn't support images
    if (!supportsImages) {
      setAttachedFiles([]);
      setFilePreviews([]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    });

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Remove attached file
  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Cleanup file previews on unmount
  useEffect(() => {
    const currentPreviews = filePreviews;
    return () => {
      currentPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleGeneratedRef = useRef(false);

  // Handle initial prompt from tools sidebar
  useEffect(() => {
    if (initialPrompt && !promptUsedRef.current && !isLoading) {
      promptUsedRef.current = true;
      setInput(initialPrompt);
      onPromptUsed?.();
    }
  }, [initialPrompt, isLoading, setInput, onPromptUsed]);

  // Reset prompt used flag when prompt changes
  useEffect(() => {
    if (!initialPrompt) {
      promptUsedRef.current = false;
    }
  }, [initialPrompt]);

  // Generate AI-powered title from first user message
  useEffect(() => {
    if (
      conversationId &&
      messages.length === 1 &&
      messages[0].role === "user" &&
      !titleGeneratedRef.current
    ) {
      titleGeneratedRef.current = true;
      const messageContent = getMessageTextContent(messages[0]);
      if (messageContent) {
        // Immediately show a truncated title while AI generates the real one
        const tempTitle =
          messageContent.slice(0, 40) +
          (messageContent.length > 40 ? "..." : "");
        onConversationUpdate?.(conversationId, tempTitle);

        // Generate AI title in background
        generateConversationTitle(conversationId, messageContent).then(
          (result) => {
            if (result.success && result.data) {
              onConversationUpdate?.(conversationId, result.data);
            }
          }
        );
      }
    }
  }, [conversationId, messages, onConversationUpdate]);

  // Reset title generation flag when conversation changes
  useEffect(() => {
    if (!conversationId) {
      titleGeneratedRef.current = false;
    }
  }, [conversationId]);

  const suggestionCategory: SuggestionCategory = learningPathId
    ? "learning"
    : interviewId
    ? "interview"
    : "general";

  const suggestions = ASSISTANT_SUGGESTIONS[suggestionCategory];

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!isUserScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTools, scrollToBottom]);

  // Detect user scrolling to pause auto-scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Check if user scrolled away from bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      isUserScrollingRef.current = !isNearBottom;

      // Reset after user stops scrolling near bottom
      clearTimeout(scrollTimeout);
      if (isNearBottom) {
        scrollTimeout = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 150);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    // Check if MAX plan user has selected a model
    if (isMaxPlan && !selectedModelId) {
      return;
    }

    setInput("");
    
    // Convert files to FileList-like structure for the hook
    const filesToSend = attachedFiles.length > 0 ? attachedFiles : undefined;
    
    // Clear attached files after sending
    setAttachedFiles([]);
    setFilePreviews([]);
    
    await sendMessage(content, filesToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    if (isMaxPlan && !selectedModelId) return;
    await sendMessage(suggestion, undefined);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 pl-8 md:pl-0">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Chat</h1>
            <p className="text-xs text-muted-foreground">
              Your intelligent interview assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-8 md:pr-0">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                onNewConversation?.();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex p-6 rounded-3xl bg-linear-to-br from-primary/10 to-primary/5 mb-8 shadow-sm">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3 tracking-tight">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground mb-12 max-w-md mx-auto text-lg">
                I can help with interview prep, analyze tech trends, generate
                questions, and more.
              </p>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {suggestions.slice(0, 4).map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-5 text-left rounded-2xl border border-border/50 bg-card/50 hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md"
                  >
                    <p className="text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors">
                      {suggestion}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border/50"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Bot className="h-5 w-5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex-1 space-y-3 max-w-[85%]",
                      message.role === "user" && "text-right"
                    )}
                  >
                    {/* Reasoning/Thinking indicator for assistant */}
                    {message.role === "assistant" &&
                      getMessageReasoning(message) && (
                        <ThinkingIndicator
                          reasoning={getMessageReasoning(message)}
                          isStreaming={
                            isLoading &&
                            message.id === messages[messages.length - 1]?.id &&
                            !getMessageTextContent(message)
                          }
                        />
                      )}
                    {/* Image attachments for user messages */}
                    {message.role === "user" && getFileParts(message).length > 0 && (
                      <div className={cn(
                        "flex flex-wrap gap-2",
                        message.role === "user" && "justify-end"
                      )}>
                        {getFileParts(message).map((part, index) => (
                          part.mediaType?.startsWith("image/") && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={index}
                              src={part.url}
                              alt={part.filename || `Image ${index + 1}`}
                              className="max-w-[200px] max-h-[200px] rounded-xl border border-border/50 object-cover"
                            />
                          )
                        ))}
                      </div>
                    )}
                    {/* Text content */}
                    {getMessageTextContent(message) && (
                      <div
                        className={cn(
                          "inline-block rounded-[20px] px-5 py-3.5 text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted/50 border border-border/50 rounded-tl-none"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <MarkdownRenderer
                            content={getMessageTextContent(message)}
                            className="prose-sm"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-left">
                            {getMessageTextContent(message)}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Tool invocations */}
                    {message.role === "assistant" &&
                      getToolParts(message).length > 0 && (
                        <div className="space-y-2 text-left">
                          {getToolParts(message).map((part) => (
                            <ToolInvocation key={part.toolCallId} part={part} />
                          ))}
                        </div>
                      )}
                  </div>
                </motion.div>
              ))}

              {/* Active tools indicator */}
              {activeTools.length > 0 && (
                <div className="flex gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-muted border border-border/50">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <ActiveTools
                      tools={activeTools.map((t) => ({
                        toolName: t.toolName,
                        status: t.status,
                        input: t.input,
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && activeTools.length === 0 && (
                <div className="flex gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-muted border border-border/50">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-3 px-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 backdrop-blur-md border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          {/* Model selector prompt for MAX users without selection */}
          {isMaxPlan && !selectedModelId && (
            <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Please select an AI model to start chatting
              </p>
            </div>
          )}

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {filePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Attachment ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-xl border border-border/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-muted/30 rounded-3xl border border-border/50 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 p-2 shadow-sm">
            {/* Model selector and image button */}
            <div className="flex items-center gap-1 pb-1.5 pl-1.5">
              {isMaxPlan && (
                <ModelSelector
                  selectedModelId={selectedModelId}
                  onModelSelect={handleModelSelect}
                  disabled={isLoading}
                />
              )}
              {isMaxPlan && modelSupportsImages && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    title="Attach image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isMaxPlan && !selectedModelId ? "Select a model first..." : "Ask me anything about interviews..."}
              className="min-h-12 max-h-[200px] border-0 bg-transparent focus-visible:ring-0 resize-none text-sm px-3 py-3"
              rows={1}
              disabled={isLoading || (isMaxPlan && !selectedModelId)}
            />
            <div className="flex items-center gap-1 pb-1.5 pr-1.5">
              {isLoading ? (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={stop}
                  className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || (isMaxPlan && !selectedModelId)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-300 shadow-sm",
                    input.trim() && (!isMaxPlan || selectedModelId)
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground/70 mt-3 font-medium">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
