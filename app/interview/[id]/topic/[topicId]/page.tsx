"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Lightbulb,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getTopic, type AnalogyStyle } from "@/lib/actions/topic";

import { RegenerateMenu } from "@/components/streaming/regenerate-menu";

// Dynamic import for Shiki (code highlighting) - prevents SSR issues
const MarkdownRenderer = dynamic(
  () => import("@/components/streaming/markdown-renderer"),
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
  construction: "House Construction",
  simple: "ELI5 (Simple)",
};

const styleDescriptions: Record<AnalogyStyle, string> = {
  professional: "Technical explanation suitable for interviews",
  construction: "Explained using house building analogies",
  simple: "Explained like you're 5 years old",
};

export default function TopicDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;
  const topicId = params.topicId as string;

  const [topic, setTopic] = useState<RevisionTopic | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] =
    useState<AnalogyStyle>("professional");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");

  const resumeAttemptedRef = useRef(false);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-mono text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">
            {error || "Topic not found"}
          </p>
          <Link href={`/interview/${interviewId}`}>
            <Button>Back to Interview</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show streaming content when regenerating, otherwise show saved content
  const isStreaming = isRegenerating && streamingContent.length > 0;
  const displayContent = isStreaming ? streamingContent : topic.content;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/interview/${interviewId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="font-mono text-foreground">{topic.title}</h1>
                {interview && (
                  <p className="text-sm text-muted-foreground">
                    {interview.jobDetails.title} at{" "}
                    {interview.jobDetails.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={selectedStyle}
                onValueChange={(v) => handleStyleChange(v as AnalogyStyle)}
                disabled={isRegenerating}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(styleLabels) as AnalogyStyle[]).map((style) => (
                    <SelectItem key={style} value={style}>
                      <div className="flex flex-col items-start">
                        <span>{styleLabels[style]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link href={`/interview/${interviewId}/topic/${topicId}/chat`}>
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask AI
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          {/* Topic Info */}
          <div className="flex items-center gap-4">
            <Badge
              variant="secondary"
              className={`capitalize ${
                topic.confidence === "low"
                  ? "bg-red-500/10 text-red-500"
                  : topic.confidence === "medium"
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-green-500/10 text-green-500"
              }`}
            >
              {topic.confidence} confidence
            </Badge>
            <span className="text-sm text-muted-foreground">
              {topic.reason}
            </span>
          </div>

          {/* Main Content Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-mono text-lg text-foreground">Deep Dive</h2>
                {isRegenerating && (
                  <div className="flex items-center gap-2 ml-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {streamingContent
                        ? "Streaming response..."
                        : "Generating..."}
                    </span>
                  </div>
                )}
              </div>

              <div className="prose prose-invert max-w-none">
                {isRegenerating && !streamingContent ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      Preparing {styleLabels[selectedStyle].toLowerCase()}{" "}
                      explanation...
                    </span>
                  </div>
                ) : (
                  <MarkdownRenderer
                    content={displayContent}
                    isStreaming={isStreaming}
                  />
                )}
              </div>

              {/* Analogy Style Info */}
              <div className="border-t border-border pt-4 mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Explanation Style
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {styleLabels[selectedStyle]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {styleDescriptions[selectedStyle]}
                </p>

                {/* Style Selector Buttons */}
                <div className="flex gap-2 mt-4">
                  {(Object.keys(styleLabels) as AnalogyStyle[]).map((style) => (
                    <Button
                      key={style}
                      variant={selectedStyle === style ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStyleChange(style)}
                      disabled={isRegenerating}
                      className="flex-1"
                    >
                      {isRegenerating && selectedStyle === style ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : null}
                      {styleLabels[style]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <div className="flex-1">
              <RegenerateMenu
                onRegenerate={() => handleStyleChange(selectedStyle)}
                onRegenerateWithInstructions={handleRegenerateWithInstructions}
                disabled={isRegenerating}
                label="Regenerate Explanation"
                contextHint="topic explanation"
              />
            </div>
            <Link
              href={`/interview/${interviewId}/topic/${topicId}/chat`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask Follow-up Questions
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
