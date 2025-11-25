"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Zap,
  HelpCircle,
  MessageSquare,
  CheckCircle,
  XCircle,
  Lightbulb,
} from "lucide-react"
import Link from "next/link"

const mockContent = {
  deepdive: {
    title: "React Hooks: A Deep Dive",
    sections: [
      {
        title: "What are Hooks?",
        content:
          "Hooks are functions that let you 'hook into' React state and lifecycle features from function components. They were introduced in React 16.8 to allow you to use state and other React features without writing a class.",
        analogy: {
          eli5: "Think of hooks like tools in a toolbox. Before hooks, you needed a big complex machine (class components) to do anything. Now, you can just grab the specific tool you need.",
          standard:
            "Hooks are like middleware for your components - they let you inject specific behaviors (state, effects, context) at any point in your component's logic.",
          expert:
            "Hooks leverage JavaScript closures to maintain state between renders while allowing React to batch updates and optimize reconciliation.",
        },
      },
      {
        title: "useState in Detail",
        content:
          "useState is a Hook that lets you add React state to function components. It returns a pair: the current state value and a function that lets you update it.",
        analogy: {
          eli5: "It's like a sticky note that remembers something. You can read what's on it, and you can also erase it and write something new.",
          standard:
            "useState is like a controlled variable with a setter that triggers a re-render. Think of it as reactive data binding.",
          expert:
            "useState uses a linked list internally, maintaining state across renders through fiber reconciliation. Each useState call corresponds to a node in this list.",
        },
      },
    ],
  },
  rapidfire: {
    title: "Rapid Fire: React Hooks",
    questions: [
      {
        question: "What problem do Hooks solve?",
        answer:
          "Hooks solve the problem of sharing stateful logic between components without changing component hierarchy.",
      },
      {
        question: "Can you use Hooks in class components?",
        answer: "No, Hooks can only be used in function components or custom Hooks.",
      },
      {
        question: "What are the rules of Hooks?",
        answer: "1) Only call Hooks at the top level. 2) Only call Hooks from React functions.",
      },
      {
        question: "What's the difference between useEffect and useLayoutEffect?",
        answer:
          "useEffect runs asynchronously after render, useLayoutEffect runs synchronously after all DOM mutations.",
      },
    ],
  },
  mcq: {
    title: "Multiple Choice Quiz: React Hooks",
    questions: [
      {
        id: "q1",
        question: "What is the primary purpose of the useEffect Hook?",
        options: [
          { id: "a", text: "To manage component state" },
          { id: "b", text: "To perform side effects in function components" },
          { id: "c", text: "To create reusable logic" },
          { id: "d", text: "To optimize rendering performance" },
        ],
        correctAnswer: "b",
        explanation:
          "useEffect is designed for performing side effects like data fetching, subscriptions, or manually changing the DOM. useState manages state, custom hooks create reusable logic, and useMemo/useCallback optimize performance.",
        difficulty: "beginner",
      },
      {
        id: "q2",
        question: "What happens if you call useState inside a condition?",
        options: [
          { id: "a", text: "It works fine" },
          { id: "b", text: "React throws an error" },
          { id: "c", text: "The state is undefined" },
          { id: "d", text: "The component doesn't render" },
        ],
        correctAnswer: "b",
        explanation:
          "Calling hooks conditionally violates the Rules of Hooks. React relies on the order of hook calls to maintain state correctly. Conditional hooks would cause the order to change between renders.",
        difficulty: "intermediate",
      },
      {
        id: "q3",
        question: "Which hook would you use to access DOM nodes directly?",
        options: [
          { id: "a", text: "useState" },
          { id: "b", text: "useEffect" },
          { id: "c", text: "useRef" },
          { id: "d", text: "useContext" },
        ],
        correctAnswer: "c",
        explanation:
          "useRef returns a mutable ref object whose .current property can hold a DOM node reference. Unlike state, updating a ref doesn't cause a re-render.",
        difficulty: "beginner",
      },
    ],
  },
}

export default function TopicDetailPage() {
  const [mode, setMode] = useState<"deepdive" | "rapidfire" | "mcq">("deepdive")
  const [analogyLevel, setAnalogyLevel] = useState<"eli5" | "standard" | "expert">("standard")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({})
  const [mcqSubmitted, setMcqSubmitted] = useState<Record<string, boolean>>({})
  const [currentMcq, setCurrentMcq] = useState(0)

  const handleMcqSelect = (questionId: string, optionId: string) => {
    if (!mcqSubmitted[questionId]) {
      setMcqAnswers({ ...mcqAnswers, [questionId]: optionId })
    }
  }

  const handleMcqSubmit = (questionId: string) => {
    setMcqSubmitted({ ...mcqSubmitted, [questionId]: true })
  }

  const currentMcqQuestion = mockContent.mcq.questions[currentMcq]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/interview/1">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="font-mono text-foreground">React Hooks</h1>
                <p className="text-sm text-muted-foreground">Senior Frontend Engineer at Stripe</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={analogyLevel} onValueChange={(v) => setAnalogyLevel(v as typeof analogyLevel)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eli5">ELI5</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
              <Link href="/interview/1/topic/react-hooks/chat">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask AI
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Selector */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-2">
        <Button variant={mode === "deepdive" ? "default" : "ghost"} size="sm" onClick={() => setMode("deepdive")}>
          <BookOpen className="w-4 h-4 mr-2" />
          Deep Dive
        </Button>
        <Button variant={mode === "rapidfire" ? "default" : "ghost"} size="sm" onClick={() => setMode("rapidfire")}>
          <Zap className="w-4 h-4 mr-2" />
          Rapid Fire
        </Button>
        <Button variant={mode === "mcq" ? "default" : "ghost"} size="sm" onClick={() => setMode("mcq")}>
          <HelpCircle className="w-4 h-4 mr-2" />
          MCQ
        </Button>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        {mode === "deepdive" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-mono text-foreground">{mockContent.deepdive.title}</h2>
              <Badge variant="secondary">{analogyLevel} mode</Badge>
            </div>

            {mockContent.deepdive.sections.map((section, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-mono text-lg text-foreground mb-4">{section.title}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{section.content}</p>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Analogy</span>
                      <Badge variant="outline" className="text-xs">
                        {analogyLevel}
                      </Badge>
                    </div>
                    <p className="text-foreground bg-muted p-4 font-mono text-sm leading-relaxed">
                      {section.analogy[analogyLevel]}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {mode === "rapidfire" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-mono text-foreground">{mockContent.rapidfire.title}</h2>
              <span className="text-sm text-muted-foreground">
                {currentQuestion + 1} of {mockContent.rapidfire.questions.length}
              </span>
            </div>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <div className="min-h-[200px] flex flex-col justify-center">
                  <p className="text-xl text-foreground mb-8 font-mono text-center">
                    {mockContent.rapidfire.questions[currentQuestion].question}
                  </p>

                  {showAnswer ? (
                    <div className="bg-muted p-6 mb-6">
                      <p className="text-foreground leading-relaxed text-center">
                        {mockContent.rapidfire.questions[currentQuestion].answer}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Button onClick={() => setShowAnswer(true)} size="lg">
                        Flip Card
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentQuestion(Math.max(0, currentQuestion - 1))
                      setShowAnswer(false)
                    }}
                    disabled={currentQuestion === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    onClick={() => {
                      setCurrentQuestion(Math.min(mockContent.rapidfire.questions.length - 1, currentQuestion + 1))
                      setShowAnswer(false)
                    }}
                    disabled={currentQuestion === mockContent.rapidfire.questions.length - 1}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2">
              {mockContent.rapidfire.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentQuestion(index)
                    setShowAnswer(false)
                  }}
                  className={`w-2 h-2 ${index === currentQuestion ? "bg-foreground" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        )}

        {mode === "mcq" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-mono text-foreground">{mockContent.mcq.title}</h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {currentMcqQuestion.difficulty}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {currentMcq + 1} of {mockContent.mcq.questions.length}
                </span>
              </div>
            </div>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <p className="text-lg text-foreground mb-6 font-mono">{currentMcqQuestion.question}</p>

                <div className="space-y-3 mb-6">
                  {currentMcqQuestion.options.map((option) => {
                    const isSelected = mcqAnswers[currentMcqQuestion.id] === option.id
                    const isSubmitted = mcqSubmitted[currentMcqQuestion.id]
                    const isCorrect = option.id === currentMcqQuestion.correctAnswer

                    let borderClass = "border-border hover:border-muted-foreground"
                    if (isSelected && !isSubmitted) {
                      borderClass = "border-foreground bg-muted/30"
                    } else if (isSubmitted) {
                      if (isCorrect) {
                        borderClass = "border-green-500 bg-green-500/10"
                      } else if (isSelected && !isCorrect) {
                        borderClass = "border-red-500 bg-red-500/10"
                      }
                    }

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleMcqSelect(currentMcqQuestion.id, option.id)}
                        disabled={isSubmitted}
                        className={`w-full p-4 border text-left transition-colors flex items-center gap-3 ${borderClass} ${isSubmitted ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span
                          className={`w-6 h-6 border flex items-center justify-center text-xs font-mono ${
                            isSelected ? "border-foreground bg-foreground text-background" : "border-border"
                          }`}
                        >
                          {option.id.toUpperCase()}
                        </span>
                        <span className="text-foreground flex-1">{option.text}</span>
                        {isSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                      </button>
                    )
                  })}
                </div>

                {/* Explanation shown after submit */}
                {mcqSubmitted[currentMcqQuestion.id] && (
                  <div className="bg-muted p-4 mb-6 border-l-2 border-foreground">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Explanation</p>
                    <p className="text-sm text-foreground leading-relaxed">{currentMcqQuestion.explanation}</p>
                  </div>
                )}

                {!mcqSubmitted[currentMcqQuestion.id] ? (
                  <Button
                    onClick={() => handleMcqSubmit(currentMcqQuestion.id)}
                    disabled={!mcqAnswers[currentMcqQuestion.id]}
                    className="w-full"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentMcq(Math.max(0, currentMcq - 1))}
                      disabled={currentMcq === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentMcq(Math.min(mockContent.mcq.questions.length - 1, currentMcq + 1))}
                      disabled={currentMcq === mockContent.mcq.questions.length - 1}
                    >
                      Next Question
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress indicators */}
            <div className="flex items-center justify-center gap-2">
              {mockContent.mcq.questions.map((q, index) => {
                const answered = mcqSubmitted[q.id]
                const correct = answered && mcqAnswers[q.id] === q.correctAnswer
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentMcq(index)}
                    className={`w-3 h-3 ${
                      index === currentMcq
                        ? "bg-foreground"
                        : answered
                          ? correct
                            ? "bg-green-500"
                            : "bg-red-500"
                          : "bg-muted"
                    }`}
                  />
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
