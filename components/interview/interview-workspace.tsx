"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { InterviewHeader } from "@/components/interview/interview-header";
import { InterviewSidebar } from "@/components/interview/interview-sidebar";
import { ModuleCard } from "@/components/interview/module-card";
import { ModuleProgress } from "@/components/interview/module-progress";
import { type StreamingCardStatus } from "@/components/streaming/streaming-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Target,
  BookOpen,
  HelpCircle,
  Zap,
  Sparkles,
  Brain,
  Eye,
  EyeOff,
} from "lucide-react";
import { getInterview, getAIConcurrencyLimit } from "@/lib/actions/interview";
import { runWithConcurrencyLimit } from "@/lib/utils/concurrency-limiter";
import type {
  Interview,
  RevisionTopic,
  MCQ,
  RapidFire,
  ModuleType,
} from "@/lib/db/schemas/interview";
import Link from "next/link";

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

interface StreamEvent<T = unknown> {
  type: "content" | "done" | "error";
  data?: T;
  module?: string;
  error?: string;
}

async function processSSEStream<T>(
  response: Response,
  onContent: (data: T) => void,
  onDone: () => void,
  onError: (error: string) => void
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

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
          try {
            const event: StreamEvent<T> = JSON.parse(line.slice(6));
            if (event.type === "content" && event.data !== undefined) {
              onContent(event.data);
            } else if (event.type === "done") {
              onDone();
            } else if (event.type === "error") {
              onError(event.error || "Unknown error");
            }
          } catch {}
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

async function checkStreamStatus(
  interviewId: string,
  module: string
): Promise<StreamStatusResponse> {
  try {
    const response = await fetch(
      `/api/interview/${interviewId}/stream/${module}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) return { status: "none" };
    return await response.json();
  } catch {
    return { status: "none" };
  }
}

interface InterviewWorkspaceProps {
  interview: Interview;
}

export function InterviewWorkspace({
  interview: initialInterview,
}: InterviewWorkspaceProps) {
  const interviewId = initialInterview._id;
  const [interview, setInterview] = useState<Interview>(initialInterview);

  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({
    openingBrief: initialInterview.modules.openingBrief ? "complete" : "idle",
    revisionTopics:
      initialInterview.modules.revisionTopics.length > 0 ? "complete" : "idle",
    mcqs: initialInterview.modules.mcqs.length > 0 ? "complete" : "idle",
    rapidFire:
      initialInterview.modules.rapidFire.length > 0 ? "complete" : "idle",
  });

  const [streamingBrief, setStreamingBrief] = useState<string>("");
  const [streamingTopics, setStreamingTopics] = useState<RevisionTopic[]>([]);
  const [streamingMcqs, setStreamingMcqs] = useState<MCQ[]>([]);
  const [streamingRapidFire, setStreamingRapidFire] = useState<RapidFire[]>([]);
  
  // QoL: Hide/show answers for practice mode
  const [showMcqAnswers, setShowMcqAnswers] = useState(false);
  const [showRapidFireAnswers, setShowRapidFireAnswers] = useState(false);
  const [revealedMcqs, setRevealedMcqs] = useState<Set<string>>(new Set());
  const [revealedRapidFire, setRevealedRapidFire] = useState<Set<string>>(new Set());

  const generationStartedRef = useRef(false);
  const resumeAttemptedRef = useRef(false);

  // Toggle individual MCQ answer
  const toggleMcqAnswer = useCallback((mcqId: string) => {
    setRevealedMcqs((prev) => {
      const next = new Set(prev);
      if (next.has(mcqId)) {
        next.delete(mcqId);
      } else {
        next.add(mcqId);
      }
      return next;
    });
  }, []);

  // Toggle individual rapid fire answer
  const toggleRapidFireAnswer = useCallback((rfId: string) => {
    setRevealedRapidFire((prev) => {
      const next = new Set(prev);
      if (next.has(rfId)) {
        next.delete(rfId);
      } else {
        next.add(rfId);
      }
      return next;
    });
  }, []);

  // Resume active streams
  useEffect(() => {
    if (resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const checkAndPollModules = async () => {
      const modules: ModuleType[] = [
        "openingBrief",
        "revisionTopics",
        "mcqs",
        "rapidFire",
      ];

      for (const module of modules) {
        const streamStatus = await checkStreamStatus(interviewId, module);

        if (streamStatus.status === "active") {
          setModuleStatus((prev) => ({ ...prev, [module]: "loading" }));

          const pollInterval = setInterval(async () => {
            const status = await checkStreamStatus(interviewId, module);

            if (status.status === "completed") {
              clearInterval(pollInterval);
              const result = await getInterview(interviewId);
              if (result.success) {
                setInterview(result.data);
                setModuleStatus((prev) => ({ ...prev, [module]: "complete" }));
              }
            } else if (status.status === "error" || status.status === "none") {
              clearInterval(pollInterval);
              setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
            }
          }, 2000);

          setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
        } else if (streamStatus.status === "completed") {
          const result = await getInterview(interviewId);
          if (result.success) {
            setInterview(result.data);
            setModuleStatus((prev) => ({ ...prev, [module]: "complete" }));
          }
        }
      }
    };

    checkAndPollModules();
  }, [interviewId]);

  // Auto-generate on first load if empty
  useEffect(() => {
    if (generationStartedRef.current) return;

    const hasNoContent =
      !interview.modules.openingBrief &&
      interview.modules.revisionTopics.length === 0 &&
      interview.modules.mcqs.length === 0 &&
      interview.modules.rapidFire.length === 0;

    if (hasNoContent) {
      generationStartedRef.current = true;
      generateAllModules();
    }
  }, [interview]);

  const generateAllModules = async () => {
    const concurrencyLimit = await getAIConcurrencyLimit();
    const moduleTasks = [
      () => handleGenerateModule("openingBrief"),
      () => handleGenerateModule("revisionTopics"),
      () => handleGenerateModule("mcqs"),
      () => handleGenerateModule("rapidFire"),
    ];
    await runWithConcurrencyLimit(moduleTasks, concurrencyLimit);
  };

  const handleGenerateModule = async (
    module: ModuleKey,
    instructions?: string
  ) => {
    setModuleStatus((prev) => ({ ...prev, [module]: "loading" }));

    try {
      const response = await fetch(`/api/interview/${interviewId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, instructions }),
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
          const result = await getInterview(interviewId);
          if (result.success) setInterview(result.data);
        },
        () => {
          setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
        }
      );
    } catch (err) {
      console.error(`Failed to generate ${module}:`, err);
      setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, count: 5, instructions }),
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
                ...interview.modules.revisionTopics,
                ...(data as RevisionTopic[]),
              ]);
              break;
            case "mcqs":
              setStreamingMcqs([...interview.modules.mcqs, ...(data as MCQ[])]);
              break;
            case "rapidFire":
              setStreamingRapidFire([
                ...interview.modules.rapidFire,
                ...(data as RapidFire[]),
              ]);
              break;
          }
        },
        async () => {
          setModuleStatus((prev) => ({ ...prev, [module]: "complete" }));
          const result = await getInterview(interviewId);
          if (result.success) setInterview(result.data);
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
    const modules = [
      !!interview.modules.openingBrief,
      interview.modules.revisionTopics.length > 0,
      interview.modules.mcqs.length > 0,
      interview.modules.rapidFire.length > 0,
    ];
    return Math.round((modules.filter(Boolean).length / 4) * 100);
  }, [interview]);

  const isGenerating = Object.values(moduleStatus).some(
    (s) => s === "loading" || s === "streaming"
  );

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      {/* Floating orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />

      <div className="relative z-10">
        <InterviewHeader
          role={interview.jobDetails.title}
          company={interview.jobDetails.company}
          date={new Date(interview.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          progress={getProgress()}
          isGenerating={isGenerating}
        />

        <div className="flex">
          <InterviewSidebar
            interviewId={interviewId}
            topics={revisionTopics}
            moduleStatus={moduleStatus.revisionTopics}
          />

          <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-5xl">
            {/* Generation Status */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Brain className="w-5 h-5 text-primary" />
                  </motion.div>
                  <span className="text-sm text-foreground">
                    AI is preparing your personalized content...
                  </span>
                  <Sparkles className="w-4 h-4 text-primary ml-auto" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Module Progress Overview */}
            <ModuleProgress moduleStatus={moduleStatus} />

            {/* Opening Brief */}
            <ModuleCard
              title="Opening Brief"
              description="Your personalized interview strategy"
              icon={Target}
              status={moduleStatus.openingBrief}
              onRetry={
                moduleStatus.openingBrief === "error" ||
                (moduleStatus.openingBrief === "idle" && !openingBrief)
                  ? () => handleGenerateModule("openingBrief")
                  : undefined
              }
              onRegenerate={
                moduleStatus.openingBrief === "complete"
                  ? () => handleGenerateModule("openingBrief")
                  : undefined
              }
              onRegenerateWithInstructions={
                moduleStatus.openingBrief === "complete"
                  ? (instructions) =>
                      handleGenerateModule("openingBrief", instructions)
                  : undefined
              }
              regenerateLabel="Regenerate"
            >
              {moduleStatus.openingBrief === "streaming" ? (
                <MarkdownRenderer
                  content={streamingBrief}
                  isStreaming={true}
                  className="text-muted-foreground leading-relaxed"
                />
              ) : openingBrief ? (
                <div className="space-y-6">
                  <MarkdownRenderer
                    content={openingBrief.content}
                    isStreaming={false}
                    className="text-muted-foreground leading-relaxed"
                  />
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Experience Match
                      </p>
                      <p className="text-2xl font-mono text-foreground">
                        {openingBrief.experienceMatch}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Key Skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {openingBrief.keySkills.slice(0, 3).map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Prep Time</p>
                      <p className="text-lg font-mono text-foreground">
                        {openingBrief.prepTime}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </ModuleCard>

            {/* Revision Topics */}
            <ModuleCard
              title="Revision Topics"
              description="Key concepts to master"
              icon={BookOpen}
              status={moduleStatus.revisionTopics}
              count={revisionTopics.length}
              onRetry={
                moduleStatus.revisionTopics === "error" ||
                (moduleStatus.revisionTopics === "idle" &&
                  revisionTopics.length === 0)
                  ? () => handleGenerateModule("revisionTopics")
                  : undefined
              }
              onRegenerate={
                moduleStatus.revisionTopics === "complete"
                  ? () => handleAddMore("revisionTopics")
                  : undefined
              }
              onRegenerateWithInstructions={
                moduleStatus.revisionTopics === "complete"
                  ? (instructions) =>
                      handleAddMore("revisionTopics", instructions)
                  : undefined
              }
            >
              {revisionTopics.length > 0 && (
                <div className="space-y-3">
                  {revisionTopics.map((topic, index) => (
                    <motion.div
                      key={topic.id || `topic-${index}`}
                      initial={
                        moduleStatus.revisionTopics === "streaming"
                          ? { opacity: 0, x: -10 }
                          : false
                      }
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/interview/${interviewId}/topic/${topic.id}`}
                        className="group block"
                      >
                        <div className="flex items-center justify-between p-4 border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all">
                          <div className="flex items-center gap-4">
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
                              <p className="font-mono text-foreground group-hover:text-primary transition-colors">
                                {topic.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {topic.reason}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {topic.confidence}
                          </Badge>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </ModuleCard>

            {/* MCQs */}
            <ModuleCard
              title="Multiple Choice Questions"
              description="Test your knowledge"
              icon={HelpCircle}
              status={moduleStatus.mcqs}
              count={mcqs.length}
              onRetry={
                moduleStatus.mcqs === "error" ||
                (moduleStatus.mcqs === "idle" && mcqs.length === 0)
                  ? () => handleGenerateModule("mcqs")
                  : undefined
              }
              onRegenerate={
                moduleStatus.mcqs === "complete"
                  ? () => handleAddMore("mcqs")
                  : undefined
              }
              onRegenerateWithInstructions={
                moduleStatus.mcqs === "complete"
                  ? (instructions) => handleAddMore("mcqs", instructions)
                  : undefined
              }
            >
              {mcqs.length > 0 && (
                <div className="space-y-4">
                  {/* Practice mode toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Practice Mode
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowMcqAnswers(!showMcqAnswers);
                              if (showMcqAnswers) {
                                setRevealedMcqs(new Set());
                              }
                            }}
                          >
                            {showMcqAnswers ? (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Show All
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                                Hide Answers
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showMcqAnswers
                            ? "Click to hide answers for practice"
                            : "Click to reveal all answers"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {mcqs.map((mcq, index) => {
                    const mcqId = mcq.id || `mcq-${index}`;
                    const isRevealed = showMcqAnswers || revealedMcqs.has(mcqId);

                    return (
                      <motion.div
                        key={mcqId}
                        initial={
                          moduleStatus.mcqs === "streaming"
                            ? { opacity: 0, y: 10 }
                            : false
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 border border-border bg-card/50 hover:border-muted-foreground/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-mono text-foreground">
                            <span className="text-muted-foreground mr-2">
                              {index + 1}.
                            </span>
                            {mcq.question}
                          </p>
                          <div className="flex items-center gap-2">
                            {mcq.source === "search" && (
                              <Badge
                                variant="outline"
                                className="text-xs flex-shrink-0"
                              >
                                Web
                              </Badge>
                            )}
                            {!showMcqAnswers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMcqAnswer(mcqId)}
                                className="h-7 text-xs"
                              >
                                {isRevealed ? "Hide" : "Reveal"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {mcq.options?.map((option, optIndex) => {
                            const isCorrect = option === mcq.answer;
                            return (
                              <div
                                key={optIndex}
                                className={`p-3 border text-sm transition-colors cursor-pointer ${
                                  isRevealed && isCorrect
                                    ? "border-green-500/50 bg-green-500/10 text-foreground"
                                    : "border-border text-muted-foreground hover:border-muted-foreground/50"
                                }`}
                                onClick={() => !showMcqAnswers && toggleMcqAnswer(mcqId)}
                              >
                                <span className="font-mono mr-2">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>
                                {option}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ModuleCard>

            {/* Rapid Fire */}
            <ModuleCard
              title="Rapid Fire Questions"
              description="Quick recall practice"
              icon={Zap}
              status={moduleStatus.rapidFire}
              count={rapidFire.length}
              onRetry={
                moduleStatus.rapidFire === "error" ||
                (moduleStatus.rapidFire === "idle" && rapidFire.length === 0)
                  ? () => handleGenerateModule("rapidFire")
                  : undefined
              }
              onRegenerate={
                moduleStatus.rapidFire === "complete"
                  ? () => handleAddMore("rapidFire")
                  : undefined
              }
              onRegenerateWithInstructions={
                moduleStatus.rapidFire === "complete"
                  ? (instructions) => handleAddMore("rapidFire", instructions)
                  : undefined
              }
            >
              {rapidFire.length > 0 && (
                <div className="space-y-4">
                  {/* Practice mode toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Practice Mode
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowRapidFireAnswers(!showRapidFireAnswers);
                              if (showRapidFireAnswers) {
                                setRevealedRapidFire(new Set());
                              }
                            }}
                          >
                            {showRapidFireAnswers ? (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Show All
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                                Hide Answers
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showRapidFireAnswers
                            ? "Click to hide answers for practice"
                            : "Click to reveal all answers"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {rapidFire.map((q, index) => {
                      const rfId = q.id || `rapid-${index}`;
                      const isRevealed = showRapidFireAnswers || revealedRapidFire.has(rfId);

                      return (
                        <motion.div
                          key={rfId}
                          initial={
                            moduleStatus.rapidFire === "streaming"
                              ? { opacity: 0, scale: 0.95 }
                              : false
                          }
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="p-4 border border-border bg-card/50 hover:border-muted-foreground/50 transition-colors cursor-pointer"
                          onClick={() => !showRapidFireAnswers && toggleRapidFireAnswer(rfId)}
                        >
                          <p className="font-mono text-foreground mb-2">
                            <span className="text-primary mr-2">Q{index + 1}.</span>
                            {q.question}
                          </p>
                          {isRevealed ? (
                            <p className="text-sm text-muted-foreground">
                              <span className="text-green-500 mr-1">→</span>
                              {q.answer}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground/50 italic">
                              Click to reveal answer
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ModuleCard>
          </main>
        </div>
      </div>
    </div>
  );
}
