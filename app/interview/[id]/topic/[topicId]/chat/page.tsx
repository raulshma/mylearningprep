"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Send,
  RefreshCw,
  Lightbulb,
  Code,
  BookOpen,
  Copy,
  Check,
  History,
  Sparkles,
  Loader2,
  AlertCircle,
  Square,
  Trash2,
  Download,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { getTopic } from "@/lib/actions/topic"
import { getInterview } from "@/lib/actions/interview"
import type { RevisionTopic, Interview } from "@/lib/db/schemas/interview"

const MarkdownRenderer = dynamic(
  () => import("@/components/streaming/markdown-renderer"),
  { ssr: false }
)

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt?: Date
}

const quickActions = [
  { icon: Lightbulb, label: "Simplify", prompt: "Can you explain this more simply?" },
  { icon: Code, label: "Code Example", prompt: "Show me a practical code example" },
  { icon: BookOpen, label: "Real-world Use", prompt: "How is this used in production apps?" },
  { icon: RefreshCw, label: "Different Angle", prompt: "Explain this from a different perspective" },
]

function formatTimestamp(date?: Date): string {
  if (!date) return ""
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date))
}

function exportChatAsMarkdown(messages: Message[], topicTitle: string): void {
  const content = messages
    .filter((m) => m.id !== "welcome")
    .map((m) => {
      const role = m.role === "user" ? "**You**" : "**Assistant**"
      const time = m.createdAt ? ` (${formatTimestamp(m.createdAt)})` : ""
      return `### ${role}${time}\n\n${m.content}`
    })
    .join("\n\n---\n\n")

  const markdown = `# Chat: ${topicTitle}\n\nExported on ${new Date().toLocaleDateString()}\n\n---\n\n${content}`
  
  const blob = new Blob([markdown], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `chat-${topicTitle.toLowerCase().replace(/\s+/g, "-")}.md`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ChatRefinementPage() {
  const params = useParams()
  const interviewId = params.id as string
  const topicId = params.topicId as string

  const [topic, setTopic] = useState<RevisionTopic | null>(null)
  const [interview, setInterview] = useState<Interview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load topic, interview data, and existing chat messages
  useEffect(() => {
    async function loadData() {
      try {
        const [topicResult, interviewResult, chatResponse] = await Promise.all([
          getTopic(interviewId, topicId),
          getInterview(interviewId),
          fetch(`/api/interview/${interviewId}/topic/${topicId}/chat`).then((r) =>
            r.ok ? r.json() : { messages: [] }
          ),
        ])

        if (topicResult.success) {
          setTopic(topicResult.data)

          // Load existing messages or show welcome message
          if (chatResponse.messages && chatResponse.messages.length > 0) {
            setMessages(
              chatResponse.messages.map((m: { id: string; role: string; content: string; createdAt?: string }) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
                createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
              }))
            )
          } else {
            // Set initial welcome message for new chats
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content: `I'm here to help you understand **${topicResult.data.title}** better. What specific aspect would you like to explore?\n\nYou can ask me to:\n- Explain a concept differently\n- Give more examples\n- Compare with other patterns\n- Deep dive into implementation details`,
                createdAt: new Date(),
              },
            ])
          }
        } else {
          setError(topicResult.error.message)
        }

        if (interviewResult.success) {
          setInterview(interviewResult.data)
        }
      } catch (err) {
        console.error("Failed to load data:", err)
        setError("Failed to load topic data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [interviewId, topicId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    const now = new Date()
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      createdAt: now,
    }

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: now,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput("")
    setIsStreaming(true)

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(
        `/api/interview/${interviewId}/topic/${topicId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages.filter(m => m.id !== "welcome"), userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortControllerRef.current.signal,
        }
      )

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let accumulatedContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedContent += chunk

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: accumulatedContent }
              : m
          )
        )
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      console.error("Chat error:", err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "Sorry, I encountered an error. Please try again." }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [input, isStreaming, messages, interviewId, topicId])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
    }
  }, [])

  const clearChat = useCallback(() => {
    if (topic) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `I'm here to help you understand **${topic.title}** better. What specific aspect would you like to explore?\n\nYou can ask me to:\n- Explain a concept differently\n- Give more examples\n- Compare with other patterns\n- Deep dive into implementation details`,
          createdAt: new Date(),
        },
      ])
    }
  }, [topic])

  const copyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, newline on Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const handleExportChat = () => {
    if (topic) {
      exportChatAsMarkdown(messages, topic.title)
    }
  }

  const handleCopy = () => {
    if (topic) {
      navigator.clipboard.writeText(topic.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    // Use Next.js loading.tsx skeleton instead
    return null
  }

  if (error || !topic) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-mono text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error || "Topic not found"}</p>
          <Link href={`/interview/${interviewId}`}>
            <Button>Back to Interview</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Panel - Content Preview */}
      <aside className="w-96 border-r border-border flex-col hidden lg:flex flex-shrink-0">
        <div className="p-4 border-b border-border">
          <Link
            href={`/interview/${interviewId}/topic/${topicId}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to topic</span>
          </Link>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-foreground">{topic.title}</h2>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <MarkdownRenderer
                  content={topic.content.slice(0, 500) + (topic.content.length > 500 ? "..." : "")}
                  isStreaming={false}
                  className="text-sm text-muted-foreground"
                />
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {topic.confidence} confidence
                </Badge>
              </div>
              <Card className="bg-muted border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground font-mono leading-relaxed">{topic.reason}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {interview && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Interview Context
              </h3>
              <div className="space-y-2">
                <div className="p-3 border border-border">
                  <p className="text-sm text-foreground">{interview.jobDetails.title}</p>
                  <p className="text-xs text-muted-foreground">{interview.jobDetails.company}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right Panel - Chat */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border p-3 md:p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <Link href={`/interview/${interviewId}/topic/${topicId}`} className="lg:hidden">
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="w-8 h-8 border border-border flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h1 className="font-mono text-foreground">AI Assistant</h1>
                <p className="text-xs text-muted-foreground">Refining: {topic.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExportChat}
                      disabled={messages.filter((m) => m.id !== "welcome").length === 0}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export chat as Markdown</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearChat}
                      disabled={isStreaming || messages.filter((m) => m.id !== "welcome").length === 0}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear chat history</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Badge variant="secondary" className="font-mono capitalize text-xs md:text-sm">
                {topic.style || "professional"}
              </Badge>
            </div>
          </div>
        </header>

        {/* Messages - Mobile: minimal padding for max space, Desktop: max-w-2xl centered */}
        <div className="flex-1 overflow-auto px-2 py-3 md:p-6 pb-[180px] lg:pb-6">
          <div className="w-full md:max-w-2xl md:mx-auto space-y-3 md:space-y-6">
            {messages.map((message, index) => {
              const isLastAssistant =
                message.role === "assistant" && index === messages.length - 1
              const showStreamingIndicator = isStreaming && isLastAssistant && message.content === ""
              const isWelcome = message.id === "welcome"

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[95%] md:max-w-[85%] group relative`}>
                    <div
                      className={`${
                        message.role === "user"
                          ? "bg-foreground text-background"
                          : "bg-card border border-border"
                      } p-3 md:p-4`}
                    >
                      {showStreamingIndicator ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                            style={{ animationDelay: "150ms" }}
                          />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      ) : message.role === "assistant" ? (
                        <MarkdownRenderer
                          content={message.content}
                          isStreaming={isStreaming && isLastAssistant}
                          className="text-sm md:text-base"
                        />
                      ) : (
                        <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      )}
                    </div>
                    {/* Message footer with timestamp and copy */}
                    <div
                      className={`flex items-center gap-2 mt-1 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.createdAt && !isWelcome && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(message.createdAt)}
                        </span>
                      )}
                      {message.content && !showStreamingIndicator && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyMessage(message.id, message.content)}
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Actions and Input - Fixed at bottom on mobile/tablet, static on desktop */}
        <div className="fixed bottom-0 left-0 right-0 lg:static bg-background border-t border-border flex-shrink-0 pb-safe">
          {/* Quick Actions */}
          <div className="px-2 py-2 md:p-4 border-b border-border md:border-b-0">
            <div className="w-full md:max-w-2xl md:mx-auto">
              <p className="text-xs text-muted-foreground mb-1.5 md:mb-3">Quick actions:</p>
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-1 md:mb-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isStreaming}
                    className="text-xs min-h-[40px] md:min-h-0 px-2 md:px-3"
                  >
                    <action.icon className="w-3 h-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="px-2 py-2 md:p-4">
            <form onSubmit={handleSubmit} className="w-full md:max-w-2xl md:mx-auto">
              <div className="flex gap-2 md:gap-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a follow-up question..."
                    className="font-mono min-h-[44px] max-h-32 resize-none pr-10 text-sm md:text-base"
                    disabled={isStreaming}
                    rows={1}
                  />
                </div>
                {isStreaming ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={stopGeneration}
                    className="self-end min-h-[44px] min-w-[44px]"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!input.trim()}
                    className="self-end min-h-[44px] min-w-[44px]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center hidden md:block">
                Press Enter to send • Shift+Enter for new line
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
