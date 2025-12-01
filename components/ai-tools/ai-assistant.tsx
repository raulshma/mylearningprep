"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  ChevronRight,
  Bot,
  User,
  Wrench,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActiveTools } from "@/components/streaming/tool-status";
import { MarkdownRenderer } from "@/components/streaming/markdown-renderer";
import {
  useAIAssistant,
  ASSISTANT_SUGGESTIONS,
  type SuggestionCategory,
} from "@/hooks/use-ai-assistant";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

/**
 * Extract text content from UIMessage parts
 */
function getMessageTextContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
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
 * Format tool output for readable display
 */
function formatToolResult(output: unknown, toolName: string): React.ReactNode {
  if (output == null) return null;
  
  // Handle string results
  if (typeof output === "string") {
    return <span>{output}</span>;
  }
  
  // Handle object results with structured display
  if (typeof output === "object") {
    const obj = output as Record<string, unknown>;
    
    // Special handling for search results
    if (toolName === "searchWeb" && Array.isArray(obj.results)) {
      return (
        <div className="space-y-2">
          <div className="text-muted-foreground">Found {obj.results.length} results:</div>
          {obj.results.slice(0, 3).map((result: { title?: string; url?: string; snippet?: string }, i: number) => (
            <div key={i} className="pl-2 border-l-2 border-primary/30">
              <div className="font-medium">{result.title}</div>
              {result.snippet && <div className="text-muted-foreground text-xs mt-0.5">{result.snippet}</div>}
            </div>
          ))}
          {obj.results.length > 3 && (
            <div className="text-muted-foreground">...and {obj.results.length - 3} more</div>
          )}
        </div>
      );
    }
    
    // Special handling for tech trends
    if (toolName === "analyzeTechTrends" && obj.trends) {
      const trends = obj.trends as Array<{ technology?: string; trend?: string; recommendation?: string }>;
      return (
        <div className="space-y-2">
          {trends.map((trend, i: number) => (
            <div key={i} className="pl-2 border-l-2 border-primary/30">
              <div className="font-medium">{trend.technology}</div>
              {trend.trend && <div className="text-xs">{trend.trend}</div>}
              {trend.recommendation && (
                <div className="text-muted-foreground text-xs mt-0.5">💡 {trend.recommendation}</div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Special handling for interview questions
    if (toolName === "generateInterviewQuestions" && Array.isArray(obj.questions)) {
      return (
        <div className="space-y-1.5">
          {obj.questions.slice(0, 5).map((q: { question?: string; difficulty?: string }, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary font-medium">{i + 1}.</span>
              <div>
                <span>{q.question}</span>
                {q.difficulty && (
                  <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">
                    {q.difficulty}
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {obj.questions.length > 5 && (
            <div className="text-muted-foreground">...and {obj.questions.length - 5} more questions</div>
          )}
        </div>
      );
    }
    
    // Default object display
    const entries = Object.entries(obj).filter(([, v]) => v != null);
    if (entries.length === 0) return <span className="text-muted-foreground">No data</span>;
    
    return (
      <div className="space-y-1">
        {entries.slice(0, 5).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
            <span className="flex-1">
              {typeof value === "object" 
                ? Array.isArray(value) 
                  ? `${value.length} items`
                  : JSON.stringify(value).slice(0, 50) + "..."
                : String(value).slice(0, 100)
              }
            </span>
          </div>
        ))}
        {entries.length > 5 && (
          <div className="text-muted-foreground">...and {entries.length - 5} more fields</div>
        )}
      </div>
    );
  }
  
  return <span>{String(output)}</span>;
}

/**
 * Render a single tool invocation
 */
function ToolInvocation({ part }: { part: { type: string; toolCallId: string; state: string; input?: unknown; output?: unknown; errorText?: string } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = part.type.replace("tool-", "");
  const isComplete = part.state === "output-available";
  const isError = part.state === "output-error";
  const isStreaming = part.state === "input-streaming" || part.state === "input-available";

  return (
    <div className="rounded-md bg-muted/50 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => isComplete && setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-start gap-2 p-2 w-full text-left",
          isComplete && "hover:bg-muted/80 cursor-pointer"
        )}
      >
        <div className={cn(
          "shrink-0 p-1 rounded",
          isComplete ? "bg-green-500/20 text-green-600" :
          isError ? "bg-red-500/20 text-red-600" :
          "bg-primary/20 text-primary"
        )}>
          {isComplete ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : isError ? (
            <AlertCircle className="h-3 w-3" />
          ) : (
            <Wrench className="h-3 w-3 animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{toolName.replace(/([A-Z])/g, " $1").trim()}</span>
            {isStreaming && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {isComplete && (
              <ChevronRight className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )} />
            )}
          </div>
          {part.input != null && !isComplete && (
            <div className="text-muted-foreground mt-1 truncate">
              {(() => {
                const inputStr = typeof part.input === "object"
                  ? JSON.stringify(part.input)
                  : String(part.input);
                return inputStr.length > 100 ? inputStr.slice(0, 100) + "..." : inputStr;
              })()}
            </div>
          )}
          {isError && part.errorText && (
            <div className="text-red-500 mt-1">{part.errorText}</div>
          )}
        </div>
      </button>
      
      {/* Formatted tool output */}
      {isComplete && isExpanded && part.output != null && (
        <div className="border-t border-border/50 p-3 bg-background/50">
          {formatToolResult(part.output, toolName)}
        </div>
      )}
    </div>
  );
}

interface AIAssistantPanelProps {
  interviewId?: string;
  learningPathId?: string;
  defaultOpen?: boolean;
  position?: "right" | "bottom";
  className?: string;
}

export function AIAssistantPanel({
  interviewId,
  learningPathId,
  defaultOpen = false,
  position = "right",
  className,
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    onError: (error) => {
      console.error("Assistant error:", error);
    },
  });

  // Determine suggestion category based on context
  const suggestionCategory: SuggestionCategory = learningPathId
    ? "learning"
    : interviewId
    ? "interview"
    : "general";

  const suggestions = ASSISTANT_SUGGESTIONS[suggestionCategory];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTools]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    setInput("");
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion);
  };

  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={cn(
                "fixed z-50 rounded-full shadow-lg",
                position === "right" ? "bottom-6 right-6" : "bottom-6 right-6",
                className
              )}
              onClick={() => setIsOpen(true)}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>AI Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed z-50 bg-background border rounded-xl shadow-2xl flex flex-col",
          position === "right"
            ? "bottom-6 right-6 w-[400px]"
            : "bottom-6 right-6 w-[500px]",
          isMinimized ? "h-14" : "h-[600px] max-h-[80vh]",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">AI Assistant</h3>
              {!isMinimized && (
                <p className="text-xs text-muted-foreground">
                  {interviewId
                    ? "Interview Prep Mode"
                    : learningPathId
                    ? "Learning Mode"
                    : "General Mode"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={reset}
                    disabled={messages.length === 0}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset conversation</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              <div className="py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h4 className="text-sm font-medium mb-2">
                      How can I help you today?
                    </h4>
                    <p className="text-xs text-muted-foreground mb-6">
                      I can help with interview prep, learning resources, and
                      more.
                    </p>
                    <div className="space-y-2">
                      {suggestions.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left text-xs p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors flex items-center gap-2 group"
                        >
                          <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                          <span className="line-clamp-1">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" && "flex-row-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="h-3.5 w-3.5" />
                        ) : (
                          <Bot className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "flex-1 space-y-2",
                          message.role === "user" && "text-right"
                        )}
                      >
                        {/* Text content */}
                        {getMessageTextContent(message) && (
                          <div
                            className={cn(
                              "inline-block rounded-lg px-3 py-2 text-sm",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            {message.role === "assistant" ? (
                              <MarkdownRenderer
                                content={getMessageTextContent(message)}
                                className="prose-sm"
                              />
                            ) : (
                              <p>{getMessageTextContent(message)}</p>
                            )}
                          </div>
                        )}
                        {/* Tool invocations */}
                        {message.role === "assistant" && getToolParts(message).length > 0 && (
                          <div className="space-y-1">
                            {getToolParts(message).map((part) => (
                              <ToolInvocation key={part.toolCallId} part={part} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Active tools indicator */}
                {activeTools.length > 0 && (
                  <div className="flex gap-3">
                    <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted">
                      <Bot className="h-3.5 w-3.5" />
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
                  <div className="flex gap-3">
                    <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t shrink-0">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="min-h-11 max-h-[120px] resize-none text-sm"
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  onClick={isLoading ? stop : handleSend}
                  disabled={!input.trim() && !isLoading}
                  className="shrink-0"
                >
                  {isLoading ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Inline AI Assistant for embedding in pages
 */
interface AIAssistantInlineProps {
  interviewId?: string;
  learningPathId?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function AIAssistantInline({
  interviewId,
  learningPathId,
  title = "AI Assistant",
  description = "Get personalized help with your preparation",
  className,
}: AIAssistantInlineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  });

  // Determine suggestion category
  const suggestionCategory: SuggestionCategory = learningPathId
    ? "learning"
    : interviewId
    ? "interview"
    : "general";

  const suggestions = ASSISTANT_SUGGESTIONS[suggestionCategory];

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTools]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    setInput("");
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "border rounded-xl bg-card flex flex-col h-[500px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Try asking:</p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  className="w-full text-left text-xs p-2.5 rounded-lg border bg-muted/50 hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="line-clamp-1">{suggestion}</span>
                </button>
              ))}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                </div>
                <div
                  className={cn(
                    "flex-1 space-y-2",
                    message.role === "user" && "text-right"
                  )}
                >
                  {/* Text content */}
                  {getMessageTextContent(message) && (
                    <div
                      className={cn(
                        "inline-block rounded-lg px-3 py-2 text-sm max-w-[85%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <MarkdownRenderer
                          content={getMessageTextContent(message)}
                          className="prose-sm"
                        />
                      ) : (
                        <p className="text-sm">{getMessageTextContent(message)}</p>
                      )}
                    </div>
                  )}
                  {/* Tool invocations */}
                  {message.role === "assistant" && getToolParts(message).length > 0 && (
                    <div className="space-y-1">
                      {getToolParts(message).map((part) => (
                        <ToolInvocation key={part.toolCallId} part={part} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Active tools */}
          {activeTools.length > 0 && (
            <div className="flex gap-3">
              <div className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-muted">
                <Bot className="h-3 w-3" />
              </div>
              <ActiveTools
                tools={activeTools.map((t) => ({
                  toolName: t.toolName,
                  status: t.status,
                  input: t.input,
                }))}
              />
            </div>
          )}

          {/* Loading */}
          {isLoading && activeTools.length === 0 && (
            <div className="flex gap-3">
              <div className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-muted">
                <Bot className="h-3 w-3" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="min-h-10 max-h-20 resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={isLoading ? stop : handleSend}
            disabled={!input.trim() && !isLoading}
            className="shrink-0 h-10 w-10"
          >
            {isLoading ? (
              <X className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
