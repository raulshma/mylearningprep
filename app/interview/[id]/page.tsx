"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { TimelineHeader } from "@/components/interview/timeline-header";
import { TimelineSidebar } from "@/components/interview/timeline-sidebar";
import {
  StreamingCard,
  type StreamingCardStatus,
} from "@/components/streaming/streaming-card";
import {
  ToolStatus,
  type ToolStatusStep,
} from "@/components/streaming/tool-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  BookOpen,
  HelpCircle,
  Zap,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getInterview,
  getAIConcurrencyLimit,
} from "@/lib/actions/interview";
import { runWithConcurrencyLimit } from "@/lib/utils/concurrency-limiter";
import type {
  Interview,
  RevisionTopic,
  MCQ,
  RapidFire,
  ModuleType,
} from "@/lib/db/schemas/interview";
import Link from "next/link";

// Dynamic import for Shiki (code highlighting) - prevents SSR issues
const MarkdownRenderer = dynamic(
  () => import("@/components/streaming/markdown-renderer"),
  { ssr: false }
);

type ModuleStatus = {
  openingBrief: StreamingCardStatus;
  revisionTopics: StreamingCardStatus;
  mcqs: StreamingCardStatus;
  rapidFire: StreamingCardStatus;
};

type ModuleKey = keyof ModuleStatus;

// Stream event types for SSE parsing
interface StreamEvent<T = unknown> {
  type: "content" | "done" | "error";
  data?: T;
  module?: string;
  error?: string;
}

/**
 * Helper function to process SSE stream from API routes
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
 * Check if there's an active generation for a module
 */
async function checkStreamStatus(
  interviewId: string,
  module: string
): Promise<StreamStatusResponse> {
  try {
    const response = await fetch(`/api/interview/${interviewId}/stream/${module}`, {
      credentials: "include",
    });

    if (!response.ok) {
      return { status: "none" };
    }

    return await response.json();
  } catch {
    return { status: "none" };
  }
}

export default function InterviewWorkspacePage() {
  const params = useParams();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({
    openingBrief: "idle",
    revisionTopics: "idle",
    mcqs: "idle",
    rapidFire: "idle",
  });

  const [toolStatus, setToolStatus] = useState<ToolStatusStep>("idle");

  // Streaming content state
  const [streamingBrief, setStreamingBrief] = useState<string>("");
  const [streamingTopics, setStreamingTopics] = useState<RevisionTopic[]>([]);
  const [streamingMcqs, setStreamingMcqs] = useState<MCQ[]>([]);
  const [streamingRapidFire, setStreamingRapidFire] = useState<RapidFire[]>([]);

  // Track if initial generation has started to prevent duplicate runs
  const generationStartedRef = useRef(false);
  const resumeAttemptedRef = useRef(false);

  // Load interview data and check for resumable streams
  useEffect(() => {
    async function loadInterview() {
      try {
        const result = await getInterview(interviewId);
        if (result.success) {
          setInterview(result.data);
          // Set initial status based on existing content
          setModuleStatus({
            openingBrief: result.data.modules.openingBrief
              ? "complete"
              : "idle",
            revisionTopics:
              result.data.modules.revisionTopics.length > 0
                ? "complete"
                : "idle",
            mcqs: result.data.modules.mcqs.length > 0 ? "complete" : "idle",
            rapidFire:
              result.data.modules.rapidFire.length > 0 ? "complete" : "idle",
          });
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        console.error("Failed to load interview:", err);
        setError("Failed to load interview");
      } finally {
        setIsLoading(false);
      }
    }

    loadInterview();
  }, [interviewId]);

  // Try to resume any active streams on mount using polling
  useEffect(() => {
    if (!interview || isLoading || resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const checkAndPollModules = async () => {
      const modules: ModuleType[] = ["openingBrief", "revisionTopics", "mcqs", "rapidFire"];
      
      for (const module of modules) {
        const streamStatus = await checkStreamStatus(interviewId, module);
        
        if (streamStatus.status === "active") {
          // Found an active generation - show loading state and poll for completion
          setModuleStatus((prev) => ({ ...prev, [module]: "loading" }));
          setToolStatus("generating");
          
          // Poll until generation completes
          const pollInterval = setInterval(async () => {
            const status = await checkStreamStatus(interviewId, module);
            
            if (status.status === "completed") {
              clearInterval(pollInterval);
              // Refresh interview data to get the generated content
              const result = await getInterview(interviewId);
              if (result.success) {
                setInterview(result.data);
                setModuleStatus((prev) => ({ ...prev, [module]: "complete" }));
              }
              setToolStatus("complete");
            } else if (status.status === "error" || status.status === "none") {
              clearInterval(pollInterval);
              setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
              setToolStatus("idle");
            }
          }, 2000); // Poll every 2 seconds
          
          // Safety timeout - stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 5 * 60 * 1000);
        } else if (streamStatus.status === "completed") {
          // Generation just completed - refresh data
          const result = await getInterview(interviewId);
          if (result.success) {
            setInterview(result.data);
            setModuleStatus((prev) => ({ ...prev, [module]: "complete" }));
          }
        }
      }
    };

    checkAndPollModules();
  }, [interview, isLoading, interviewId]);

  // Generate all modules on first load if empty (runs only once)
  useEffect(() => {
    if (!interview || isLoading || generationStartedRef.current) return;

    const hasNoContent =
      !interview.modules.openingBrief &&
      interview.modules.revisionTopics.length === 0 &&
      interview.modules.mcqs.length === 0 &&
      interview.modules.rapidFire.length === 0;

    if (hasNoContent) {
      generationStartedRef.current = true;
      generateAllModules();
    }
  }, [interview, isLoading]);

  const generateAllModules = async () => {
    if (!interview) return;

    // Get the admin-configured concurrency limit (default: 2)
    const concurrencyLimit = await getAIConcurrencyLimit();

    // Generate modules with controlled concurrency
    const moduleTasks = [
      () => handleGenerateModule("openingBrief"),
      () => handleGenerateModule("revisionTopics"),
      () => handleGenerateModule("mcqs"),
      () => handleGenerateModule("rapidFire"),
    ];

    await runWithConcurrencyLimit(moduleTasks, concurrencyLimit);
  };

  const handleGenerateModule = async (module: ModuleKey, instructions?: string) => {
    setModuleStatus((prev) => ({ ...prev, [module]: "loading" }));
    setToolStatus("generating");

    try {
      const response = await fetch(`/api/interview/${interviewId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module,
          instructions,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate module");
      }

      setModuleStatus((prev) => ({ ...prev, [module]: "streaming" }));

      await processSSEStream(
        response,
        (data: unknown) => {
          switch (module) {
            case "openingBrief":
              setStreamingBrief(data as string);
              break;
            case "revisionTopics":
              setStreamingTopics(data as RevisionTopic[]);
              break;
            case "mcqs":
              setStreamingMcqs(data as MCQ[]);
              break;
            case "rapidFire":
              setStreamingRapidFire(data as RapidFire[]);
              break;
          }
        },
        async () => {
          setModuleStatus((prev) => ({ ...prev, [module]: "complete" }));
          setToolStatus("complete");
          // Refresh interview data
          const result = await getInterview(interviewId);
          if (result.success) {
            setInterview(result.data);
          }
        },
        () => {
          setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
          setToolStatus("idle");
        }
      );
    } catch (err) {
      console.error(`Failed to generate ${module}:`, err);
      setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
      setToolStatus("idle");
    }
  };

  const handleAddMore = async (
    module: "mcqs" | "rapidFire" | "revisionTopics",
    instructions?: string
  ) => {
    setModuleStatus((prev) => ({ ...prev, [module]: "loading" }));

    try {
      const response = await fetch(`/api/interview/${interviewId}/add-more`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module,
          count: 5,
          instructions,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add more content");
      }

      setModuleStatus((prev) => ({ ...prev, [module]: "streaming" }));

      await processSSEStream(
        response,
        (data: unknown) => {
          switch (module) {
            case "revisionTopics":
              setStreamingTopics([
                ...(interview?.modules.revisionTopics || []),
                ...(data as RevisionTopic[]),
              ]);
              break;
            case "mcqs":
              setStreamingMcqs([
                ...(interview?.modules.mcqs || []),
                ...(data as MCQ[]),
              ]);
              break;
            case "rapidFire":
              setStreamingRapidFire([
                ...(interview?.modules.rapidFire || []),
                ...(data as RapidFire[]),
              ]);
              break;
          }
        },
        async () => {
          setModuleStatus((prev) => ({ ...prev, [module]: "complete" }));
          // Refresh interview data
          const result = await getInterview(interviewId);
          if (result.success) {
            setInterview(result.data);
          }
        },
        () => {
          setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
        }
      );
    } catch (err) {
      console.error(`Failed to add more ${module}:`, err);
      setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
    }
  };

  const getProgress = useCallback(() => {
    if (!interview) return 0;
    const modules = [
      !!interview.modules.openingBrief,
      interview.modules.revisionTopics.length > 0,
      interview.modules.mcqs.length > 0,
      interview.modules.rapidFire.length > 0,
    ];
    return Math.round((modules.filter(Boolean).length / 4) * 100);
  }, [interview]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-mono text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">
            {error || "Interview not found"}
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const openingBrief = interview.modules.openingBrief;
  const revisionTopics =
    moduleStatus.revisionTopics === "streaming"
      ? streamingTopics
      : interview.modules.revisionTopics;
  const mcqs =
    moduleStatus.mcqs === "streaming" ? streamingMcqs : interview.modules.mcqs;
  const rapidFire =
    moduleStatus.rapidFire === "streaming"
      ? streamingRapidFire
      : interview.modules.rapidFire;

  return (
    <div className="min-h-screen bg-background">
      <TimelineHeader
        role={interview.jobDetails.title}
        company={interview.jobDetails.company}
        date={new Date(interview.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
        daysUntil={7}
        progress={getProgress()}
      />

      <div className="flex">
        <TimelineSidebar
          interviewId={interviewId}
          topics={revisionTopics}
          moduleStatus={moduleStatus.revisionTopics}
        />

        <main className="flex-1 p-6 space-y-6">
          {/* Tool Status Indicator */}
          {toolStatus !== "idle" && (
            <div className="flex justify-end">
              <ToolStatus status={toolStatus} />
            </div>
          )}

          {/* Opening Brief Card */}
          <StreamingCard
            title="Opening Brief"
            icon={Target}
            status={moduleStatus.openingBrief}
            onRetry={
              moduleStatus.openingBrief === "error" || 
              (moduleStatus.openingBrief === "idle" && !openingBrief)
                ? () => handleGenerateModule("openingBrief")
                : undefined
            }
            onAddMore={
              moduleStatus.openingBrief === "complete"
                ? () => handleGenerateModule("openingBrief")
                : undefined
            }
            onAddMoreWithInstructions={
              moduleStatus.openingBrief === "complete"
                ? (instructions) =>
                    handleGenerateModule("openingBrief", instructions)
                : undefined
            }
            addMoreLabel="Regenerate"
            streamingMessage={
              moduleStatus.openingBrief === "loading"
                ? "Analyzing your profile..."
                : "Writing brief..."
            }
          >
            {moduleStatus.openingBrief === "streaming" ? (
              <div className="space-y-2">
                <MarkdownRenderer
                  content={streamingBrief}
                  isStreaming={true}
                  className="text-muted-foreground leading-relaxed"
                />
              </div>
            ) : openingBrief ? (
              <>
                <div className="text-muted-foreground leading-relaxed mb-4">
                  <MarkdownRenderer
                    content={openingBrief.content}
                    isStreaming={false}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Experience Match
                    </p>
                    <p className="font-mono text-foreground">
                      {openingBrief.experienceMatch}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Key Skills
                    </p>
                    <p className="font-mono text-foreground text-sm">
                      {openingBrief.keySkills.slice(0, 3).join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Prep Time
                    </p>
                    <p className="font-mono text-foreground">
                      {openingBrief.prepTime}
                    </p>
                  </div>
                </div>
              </>
            ) : moduleStatus.openingBrief === "idle" ? (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  No opening brief generated yet.
                </p>
                <Button variant="outline" size="sm" onClick={() => handleGenerateModule("openingBrief")}>
                  Generate
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No opening brief generated yet.
              </p>
            )}
          </StreamingCard>

          {/* Revision Topics Card */}
          <StreamingCard
            title="Revision Topics"
            icon={BookOpen}
            status={moduleStatus.revisionTopics}
            onRetry={
              moduleStatus.revisionTopics === "error" ||
              (moduleStatus.revisionTopics === "idle" && revisionTopics.length === 0)
                ? () => handleGenerateModule("revisionTopics")
                : undefined
            }
            onAddMore={
              moduleStatus.revisionTopics === "complete"
                ? () => handleAddMore("revisionTopics")
                : undefined
            }
            onAddMoreWithInstructions={
              moduleStatus.revisionTopics === "complete"
                ? (instructions) =>
                    handleAddMore("revisionTopics", instructions)
                : undefined
            }
            streamedCount={
              moduleStatus.revisionTopics === "streaming"
                ? streamingTopics.length
                : undefined
            }
            streamingMessage={
              moduleStatus.revisionTopics === "loading"
                ? "Identifying key topics..."
                : undefined
            }
          >
            {revisionTopics.length > 0 ? (
              <div className="space-y-3">
                {revisionTopics.map((topic, index) => (
                  <Link
                    key={topic.id || `topic-${index}`}
                    href={`/interview/${interviewId}/topic/${topic.id}`}
                    className="block"
                    style={{
                      animation:
                        moduleStatus.revisionTopics === "streaming"
                          ? `fadeSlideIn 0.3s ease-out ${index * 0.05}s both`
                          : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between p-3 border border-border hover:border-muted-foreground transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 ${
                            topic.confidence === "low"
                              ? "bg-red-500"
                              : topic.confidence === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-mono text-foreground">
                            {topic.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {topic.reason}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {topic.confidence}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : moduleStatus.revisionTopics === "idle" ? (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  No revision topics generated yet.
                </p>
                <Button variant="outline" size="sm" onClick={() => handleGenerateModule("revisionTopics")}>
                  Generate
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No revision topics generated yet.
              </p>
            )}
          </StreamingCard>

          {/* MCQs Card */}
          <StreamingCard
            title="Multiple Choice Questions"
            icon={HelpCircle}
            status={moduleStatus.mcqs}
            onRetry={
              moduleStatus.mcqs === "error" ||
              (moduleStatus.mcqs === "idle" && mcqs.length === 0)
                ? () => handleGenerateModule("mcqs")
                : undefined
            }
            onAddMore={
              moduleStatus.mcqs === "complete"
                ? () => handleAddMore("mcqs")
                : undefined
            }
            onAddMoreWithInstructions={
              moduleStatus.mcqs === "complete"
                ? (instructions) => handleAddMore("mcqs", instructions)
                : undefined
            }
            streamedCount={
              moduleStatus.mcqs === "streaming"
                ? streamingMcqs.length
                : undefined
            }
            streamingMessage={
              moduleStatus.mcqs === "loading"
                ? "Crafting questions..."
                : undefined
            }
          >
            {mcqs.length > 0 ? (
              <div className="space-y-3">
                {mcqs.map((mcq, index) => (
                  <div
                    key={mcq.id || `mcq-${index}`}
                    className="p-3 border border-border hover:border-muted-foreground transition-colors"
                    style={{
                      animation:
                        moduleStatus.mcqs === "streaming"
                          ? `fadeSlideIn 0.3s ease-out ${index * 0.05}s both`
                          : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-mono text-foreground">
                        {index + 1}. {mcq.question}
                      </p>
                      {mcq.source === "search" && (
                        <Badge
                          variant="outline"
                          className="text-xs ml-2 flex-shrink-0"
                        >
                          Web
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {mcq.options?.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 border ${
                            option === mcq.answer
                              ? "border-green-500/50 bg-green-500/10"
                              : "border-border"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : moduleStatus.mcqs === "idle" ? (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">No MCQs generated yet.</p>
                <Button variant="outline" size="sm" onClick={() => handleGenerateModule("mcqs")}>
                  Generate
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No MCQs generated yet.</p>
            )}
          </StreamingCard>

          {/* Rapid Fire Card */}
          <StreamingCard
            title="Rapid Fire Questions"
            icon={Zap}
            status={moduleStatus.rapidFire}
            onRetry={
              moduleStatus.rapidFire === "error" ||
              (moduleStatus.rapidFire === "idle" && rapidFire.length === 0)
                ? () => handleGenerateModule("rapidFire")
                : undefined
            }
            onAddMore={
              moduleStatus.rapidFire === "complete"
                ? () => handleAddMore("rapidFire")
                : undefined
            }
            onAddMoreWithInstructions={
              moduleStatus.rapidFire === "complete"
                ? (instructions) => handleAddMore("rapidFire", instructions)
                : undefined
            }
            streamedCount={
              moduleStatus.rapidFire === "streaming"
                ? streamingRapidFire.length
                : undefined
            }
            streamingMessage={
              moduleStatus.rapidFire === "loading"
                ? "Preparing rapid fire..."
                : undefined
            }
          >
            {rapidFire.length > 0 ? (
              <div className="space-y-2">
                {rapidFire.map((q, index) => (
                  <div
                    key={q.id || `rapid-${index}`}
                    className="p-3 border border-border hover:border-muted-foreground transition-colors"
                    style={{
                      animation:
                        moduleStatus.rapidFire === "streaming"
                          ? `fadeSlideIn 0.3s ease-out ${index * 0.03}s both`
                          : undefined,
                    }}
                  >
                    <p className="text-sm font-mono text-foreground mb-1">
                      {index + 1}. {q.question}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground/70">A:</span> {q.answer}
                    </p>
                  </div>
                ))}
              </div>
            ) : moduleStatus.rapidFire === "idle" ? (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  No rapid fire questions generated yet.
                </p>
                <Button variant="outline" size="sm" onClick={() => handleGenerateModule("rapidFire")}>
                  Generate
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No rapid fire questions generated yet.
              </p>
            )}
          </StreamingCard>
        </main>
      </div>
    </div>
  );
}
