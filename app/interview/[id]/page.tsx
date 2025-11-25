import { TimelineHeader } from "@/components/interview/timeline-header"
import { TimelineSidebar } from "@/components/interview/timeline-sidebar"
import { TopicCard } from "@/components/interview/topic-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, Target, Search, ExternalLink } from "lucide-react"

const topics = [
  {
    id: "react-hooks",
    title: "React Hooks",
    description: "Understanding useState, useEffect, useContext, and custom hooks",
    status: "in-progress" as const,
    difficulty: "intermediate" as const,
    subtopics: [
      { name: "useState and state management", completed: true },
      { name: "useEffect lifecycle", completed: true },
      { name: "useContext and prop drilling", completed: false },
      { name: "Custom hooks patterns", completed: false },
    ],
    timeEstimate: "45 min",
  },
  {
    id: "system-design",
    title: "System Design: Chat Application",
    description: "Designing a scalable real-time chat system",
    status: "not-started" as const,
    difficulty: "advanced" as const,
    subtopics: [
      { name: "Requirements gathering", completed: false },
      { name: "High-level architecture", completed: false },
      { name: "Database design", completed: false },
      { name: "Real-time messaging", completed: false },
      { name: "Scaling strategies", completed: false },
    ],
    timeEstimate: "60 min",
  },
  {
    id: "typescript",
    title: "TypeScript Patterns",
    description: "Advanced TypeScript features and patterns",
    status: "completed" as const,
    difficulty: "intermediate" as const,
    subtopics: [
      { name: "Generics", completed: true },
      { name: "Utility types", completed: true },
      { name: "Type guards", completed: true },
      { name: "Discriminated unions", completed: true },
    ],
    timeEstimate: "30 min",
  },
]

const revisionTopics = [
  { id: 1, topic: "React Server Components", reason: "Listed in JD", confidence: "low" },
  { id: 2, topic: "GraphQL Subscriptions", reason: "Company tech stack", confidence: "medium" },
  { id: 3, topic: "Web Performance Optimization", reason: "Senior role expectation", confidence: "medium" },
]

const citations = [
  { title: "React Hooks Documentation", source: "react.dev", url: "#" },
  { title: "System Design Primer", source: "github.com", url: "#" },
  { title: "TypeScript Handbook", source: "typescriptlang.org", url: "#" },
]

export default function InterviewWorkspacePage() {
  return (
    <div className="min-h-screen bg-background">
      <TimelineHeader role="Senior Frontend Engineer" company="Stripe" date="Dec 5, 2024" daysUntil={9} progress={45} />

      <div className="flex">
        <TimelineSidebar />

        <main className="flex-1 p-6 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Opening Brief
                </CardTitle>
                <Badge variant="outline">AI Generated</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Based on your profile and the job description, you're interviewing for a Senior Frontend Engineer role
                at Stripe. The role emphasizes React expertise, TypeScript proficiency, and system design skills. Key
                focus areas include performance optimization, accessibility, and scalable architecture patterns.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Experience Match</p>
                  <p className="font-mono text-foreground">85%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Key Skills</p>
                  <p className="font-mono text-foreground">React, TS, Design</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prep Time</p>
                  <p className="font-mono text-foreground">~12 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Revision Topics
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revisionTopics.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-border hover:border-muted-foreground transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 ${
                          item.confidence === "low"
                            ? "bg-red-500"
                            : item.confidence === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-mono text-foreground">{item.topic}</p>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {item.confidence}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Topics Grid */}
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="all">All Topics</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {topics.map((topic) => (
                  <TopicCard key={topic.id} {...topic} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="in-progress" className="mt-0">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {topics
                  .filter((t) => t.status === "in-progress")
                  .map((topic) => (
                    <TopicCard key={topic.id} {...topic} />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {topics
                  .filter((t) => t.status === "completed")
                  .map((topic) => (
                    <TopicCard key={topic.id} {...topic} />
                  ))}
              </div>
            </TabsContent>
          </Tabs>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search & Citations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Sources used to generate your preparation materials:</p>
              <div className="space-y-2">
                {citations.map((citation, idx) => (
                  <a
                    key={idx}
                    href={citation.url}
                    className="flex items-center justify-between p-3 border border-border hover:border-muted-foreground transition-colors group"
                  >
                    <div>
                      <p className="text-sm text-foreground group-hover:underline">{citation.title}</p>
                      <p className="text-xs text-muted-foreground">{citation.source}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
