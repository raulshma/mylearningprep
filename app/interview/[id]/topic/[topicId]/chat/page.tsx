"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Send, RefreshCw, Lightbulb, Code, BookOpen, Copy, Check, History, Sparkles } from "lucide-react"
import Link from "next/link"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "I'm here to help you understand React Hooks better. What specific aspect would you like to explore? You can ask me to:\n\n• Explain a concept differently\n• Give more examples\n• Compare with other patterns\n• Deep dive into implementation details",
    timestamp: new Date(Date.now() - 60000),
  },
]

const quickActions = [
  { icon: Lightbulb, label: "Simplify", prompt: "Can you explain this more simply?" },
  { icon: Code, label: "Code Example", prompt: "Show me a code example" },
  { icon: BookOpen, label: "Real-world Use", prompt: "How is this used in production apps?" },
  { icon: RefreshCw, label: "Different Angle", prompt: "Explain this from a different perspective" },
]

const contentPreview = {
  title: "React Hooks: useState",
  content:
    "useState is a Hook that lets you add React state to function components. It returns a pair: the current state value and a function that lets you update it.",
  analogy:
    "Think of useState like a sticky note that remembers something. You can read what's on it, and you can also erase it and write something new.",
}

export default function ChatRefinementPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Great question! Let me explain useState with a different analogy.\n\nImagine a light switch in your room. The switch has two states: ON and OFF. When you flip the switch, the light changes state.\n\n```jsx\nconst [isOn, setIsOn] = useState(false);\n\nfunction toggleLight() {\n  setIsOn(!isOn);\n}\n```\n\nThe `isOn` variable is like the current position of the switch. The `setIsOn` function is like your hand flipping the switch. Every time you call `setIsOn`, React re-renders the component with the new state.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(contentPreview.content + "\n\n" + contentPreview.analogy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Content Preview */}
      <aside className="w-96 border-r border-border flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-border">
          <Link
            href="/interview/1/topic/react-hooks"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to topic</span>
          </Link>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-foreground">{contentPreview.title}</h2>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{contentPreview.content}</p>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  Analogy
                </Badge>
              </div>
              <Card className="bg-muted border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground font-mono leading-relaxed">{contentPreview.analogy}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              Version History
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 border border-border hover:border-muted-foreground transition-colors">
                <p className="text-sm text-foreground">Current version</p>
                <p className="text-xs text-muted-foreground">Just now</p>
              </button>
              <button className="w-full text-left p-3 border border-border hover:border-muted-foreground transition-colors">
                <p className="text-sm text-muted-foreground">Previous version</p>
                <p className="text-xs text-muted-foreground">5 min ago</p>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Panel - Chat */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-border flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h1 className="font-mono text-foreground">AI Assistant</h1>
                <p className="text-xs text-muted-foreground">Refining: React Hooks</p>
              </div>
            </div>
            <Badge variant="secondary" className="font-mono">
              Intermediate Mode
            </Badge>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] ${
                    message.role === "user" ? "bg-foreground text-background" : "bg-card border border-border"
                  } p-4`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user" ? "text-background/60" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-border p-4">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-muted-foreground mb-3">Quick actions:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  className="text-xs"
                >
                  <action.icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask a follow-up question..."
              className="font-mono"
            />
            <Button onClick={handleSend} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
