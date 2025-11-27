"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { InterviewHeader } from "@/components/interview/interview-header";
import { InterviewSidebar } from "@/components/interview/interview-sidebar";
import { MobileInterviewSidebar } from "@/components/interview/mobile-interview-sidebar";
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
  ArrowDown,
  MousePointer2,
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
          } catch { }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

interface ResumeStreamResult {
  hasActiveStream: boolean;
  response?: Response;
}

async function tryResumeStream(
  interviewId: string,
  module: string
): Promise<ResumeStreamResult> {
  try {
    const response = await fetch(
      `/api/interview/${interviewId}/stream/${module}`,
      {
        credentials: "include",
      }
    );

    // 204 means no active stream
    if (response.status === 204) {
      return { hasActiveStream: false };
    }

    if (!response.ok) {
      return { hasActiveStream: false };
    }

    // Check if this is a resumed stream (SSE response)
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("text/event-stream")) {
      return { hasActiveStream: true, response };
    }

    return { hasActiveStream: false };
  } catch {
    return { hasActiveStream: false };
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

  const excludedModules = initialInterview.excludedModules ?? [];
  
  const getInitialStatus = (module: ModuleKey, hasContent: boolean): StreamingCardStatus => {
    if (excludedModules.includes(module)) return "complete"; // Treat excluded as complete (won't render)
    return hasContent ? "complete" : "idle";
  };

  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({
    openingBrief: getInitialStatus("openingBrief", !!initialInterview.modules.openingBrief),
    revisionTopics: getInitialStatus("revisionTopics", initialInterview.modules.revisionTopics.length > 0),
    mcqs: getInitialStatus("mcqs", initialInterview.modules.mcqs.length > 0),
    rapidFire: getInitialStatus("rapidFire", initialInterview.modules.rapidFire.length > 0),
  });

  const [streamingBrief, setStreamingBrief] = useState<string>("");
  const [streamingTopics, setStreamingTopics] = useState<RevisionTopic[]>([]);
  const [streamingMcqs, setStreamingMcqs] = useState<MCQ[]>([]);
  const [streamingRapidFire, setStreamingRapidFire] = useState<RapidFire[]>([]);

  // QoL: Hide/show answers for practice mode
  const [showMcqAnswers, setShowMcqAnswers] = useState(false);
  const [showRapidFireAnswers, setShowRapidFireAnswers] = useState(false);
  const [revealedMcqs, setRevealedMcqs] = useState<Set<string>>(new Set());
  const [revealedRapidFire, setRevealedRapidFire] = useState<Set<string>>(
    new Set()
  );
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

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

  const isGenerating = Object.values(moduleStatus).some(
    (s) => s === "loading" || s === "streaming"
  );

  // Auto-scroll effect
  useEffect(() => {
    if (!isGenerating || !autoScrollEnabled) return;

    const scrollToActiveModule = () => {
      // Find the active streaming module
      const activeModule = Object.entries(moduleStatus).find(
        ([_, status]) => status === "streaming"
      );

      if (activeModule) {
        const [moduleKey] = activeModule;
        const element = document.getElementById(`module-${moduleKey}`);
        if (element) {
          // Scroll to the bottom of the element
          const rect = element.getBoundingClientRect();
          const isBelowViewport = rect.bottom > window.innerHeight;

          if (isBelowViewport) {
            window.scrollTo({
              top: window.scrollY + rect.bottom - window.innerHeight,
              behavior: "smooth",
            });
          }
        }
      } else {
        // Fallback to bottom of page if no specific module found (e.g. just loading)
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }
    };

    scrollToActiveModule();
  }, [
    isGenerating,
    autoScrollEnabled,
    streamingBrief,
    streamingTopics,
    streamingMcqs,
    streamingRapidFire,
    moduleStatus,
  ]);

  // Resume active streams
  useEffect(() => {
    if (resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const resumeModuleStream = async (module: ModuleKey) => {
      const { hasActiveStream, response } = await tryResumeStream(
        interviewId,
        module
      );

      if (!hasActiveStream || !response) {
        return false;
      }

      // We have an active stream to resume - process it
      setModuleStatus((prev) => ({ ...prev, [module]: "streaming" }));

      try {
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
        return true;
      } catch {
        setModuleStatus((prev) => ({ ...prev, [module]: "error" }));
        return false;
      }
    };

    const checkAndResumeModules = async () => {
      const modules: ModuleKey[] = [
        "openingBrief",
        "revisionTopics",
        "mcqs",
        "rapidFire",
      ];

      // Try to resume each module that doesn't have content
      for (const module of modules) {
        // Only try to resume if module appears incomplete
        const hasContent =
          module === "openingBrief"
            ? !!initialInterview.modules.openingBrief
            : initialInterview.modules[module].length > 0;

        if (!hasContent) {
          await resumeModuleStream(module);
        }
      }
    };

    checkAndResumeModules();
  }, [interviewId, initialInterview]);

  // Auto-generate on first load if empty (excluding excluded modules)
  useEffect(() => {
    if (generationStartedRef.current) return;

    const excluded = interview.excludedModules ?? [];
    const hasNoContent =
      (excluded.includes("openingBrief") || !interview.modules.openingBrief) &&
      (excluded.includes("revisionTopics") || interview.modules.revisionTopics.length === 0) &&
      (excluded.includes("mcqs") || interview.modules.mcqs.length === 0) &&
      (excluded.includes("rapidFire") || interview.modules.rapidFire.length === 0);

    // Check if there's at least one non-excluded module without content
    const needsGeneration =
      (!excluded.includes("openingBrief") && !interview.modules.openingBrief) ||
      (!excluded.includes("revisionTopics") && interview.modules.revisionTopics.length === 0) ||
      (!excluded.includes("mcqs") && interview.modules.mcqs.length === 0) ||
      (!excluded.includes("rapidFire") && interview.modules.rapidFire.length === 0);

    if (needsGeneration) {
      generationStartedRef.current = true;
      generateAllModules();
    }
  }, [interview]);

  const generateAllModules = async () => {
    const concurrencyLimit = await getAIConcurrencyLimit();
    const excludedModules = interview.excludedModules ?? [];
    
    const allModules: ModuleKey[] = ["openingBrief", "revisionTopics", "mcqs", "rapidFire"];
    const modulesToGenerate = allModules.filter(m => !excludedModules.includes(m));
    
    const moduleTasks = modulesToGenerate.map(module => () => handleGenerateModule(module));
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

          {/* Mobile Interview Sidebar - floating button trigger */}
          <MobileInterviewSidebar
            interviewId={interviewId}
            topics={revisionTopics}
            moduleStatus={moduleStatus.revisionTopics}
          />

          <main className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl w-full mx-auto">
            {/* Generation Status */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl"
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
                  <span className="text-sm font-medium text-foreground">
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
              id="module-openingBrief"
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border/50">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Experience Match
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {openingBrief.experienceMatch}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Key Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {openingBrief.keySkills.slice(0, 3).map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary/50"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Prep Time
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {openingBrief.prepTime}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </ModuleCard>

            {/* Revision Topics */}
            <ModuleCard
              id="module-revisionTopics"
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
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-background/50 hover:border-primary/30 hover:bg-background hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${topic.confidence === "low"
                                ? "bg-red-500"
                                : topic.confidence === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                                }`}
                            />
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {topic.title}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {topic.reason}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="capitalize rounded-full px-3"
                          >
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
              id="module-mcqs"
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
                <div className="space-y-6">
                  {/* Practice mode toggle */}
                  <div className="flex items-center justify-between pb-4 border-b border-border/50 gap-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      Practice Mode
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full h-9 px-4"
                            onClick={() => {
                              setShowMcqAnswers(!showMcqAnswers);
                              if (showMcqAnswers) {
                                setRevealedMcqs(new Set());
                              }
                            }}
                          >
                            {showMcqAnswers ? (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                Show All
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-2" />
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
                    const isRevealed =
                      showMcqAnswers || revealedMcqs.has(mcqId);

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
                        className="p-6 rounded-2xl border border-border/50 bg-background/50 hover:border-primary/20 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <p className="text-base font-medium text-foreground leading-relaxed">
                            <span className="text-muted-foreground mr-3 font-mono text-sm">
                              {index + 1}.
                            </span>
                            {mcq.question}
                          </p>
                          <div className="flex items-center gap-2 ml-4">
                            {mcq.source === "search" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase tracking-wider rounded-full px-2"
                              >
                                Web
                              </Badge>
                            )}
                            {!showMcqAnswers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMcqAnswer(mcqId)}
                                className="h-7 text-xs rounded-full px-3"
                              >
                                {isRevealed ? "Hide" : "Reveal"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {mcq.options?.map((option, optIndex) => {
                            const isCorrect = option === mcq.answer;
                            return (
                              <div
                                key={optIndex}
                                className={`p-3 rounded-xl border text-sm transition-all cursor-pointer flex items-center ${isRevealed && isCorrect
                                  ? "border-green-500/30 bg-green-500/10 text-foreground font-medium"
                                  : "border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-secondary/30"
                                  }`}
                                onClick={() =>
                                  !showMcqAnswers && toggleMcqAnswer(mcqId)
                                }
                              >
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-mono mr-3 flex-shrink-0">
                                  {String.fromCharCode(65 + optIndex)}
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
              id="module-rapidFire"
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
                <div className="space-y-6">
                  {/* Practice mode toggle */}
                  <div className="flex items-center justify-between pb-4 border-b border-border/50 gap-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      Practice Mode
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full h-9 px-4"
                            onClick={() => {
                              setShowRapidFireAnswers(!showRapidFireAnswers);
                              if (showRapidFireAnswers) {
                                setRevealedRapidFire(new Set());
                              }
                            }}
                          >
                            {showRapidFireAnswers ? (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                Show All
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-2" />
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

                  <div className="grid grid-cols-1 gap-4">
                    {rapidFire.map((rf, index) => {
                      const rfId = rf.id || `rf-${index}`;
                      const isRevealed =
                        showRapidFireAnswers || revealedRapidFire.has(rfId);

                      return (
                        <motion.div
                          key={rfId}
                          initial={
                            moduleStatus.rapidFire === "streaming"
                              ? { opacity: 0, scale: 0.95 }
                              : false
                          }
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 hover:border-primary/20 hover:shadow-sm transition-all"
                        >
                          <div
                            className="p-5 cursor-pointer"
                            onClick={() => toggleRapidFireAnswer(rfId)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <p className="font-medium text-foreground">
                                <span className="text-muted-foreground mr-3 font-mono text-sm">
                                  {index + 1}.
                                </span>
                                {rf.question}
                              </p>
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isRevealed
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary text-muted-foreground group-hover:bg-primary/5"
                                  }`}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isRevealed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-border/50 bg-secondary/10"
                              >
                                <div className="p-5 pt-3">
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    <span className="font-semibold text-primary mr-2">
                                      Answer:
                                    </span>
                                    {rf.answer}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ModuleCard>
          </main>

          {/* Floating Auto-scroll Control */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="fixed bottom-8 right-8 z-50"
              >
                <Button
                  onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                  size="lg"
                  className={`rounded-full shadow-lg transition-all duration-300 ${autoScrollEnabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                >
                  {autoScrollEnabled ? (
                    <>
                      <ArrowDown className="w-4 h-4 mr-2 animate-bounce" />
                      Following
                    </>
                  ) : (
                    <>
                      <MousePointer2 className="w-4 h-4 mr-2" />
                      Manual Scroll
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
