"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ArrowLeft,
  Target,
  Brain,
  Clock,
  XCircle,
  Loader2,
  Code,
  Bug,
  FileText,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  submitReflection,
  getLearningInsights,
} from "@/lib/actions/learning-path";
import { useActivityStream } from "@/hooks/use-activity-stream";
import type {
  LearningPath,
  Activity,
  ActivityContent,
  Reflection,
} from "@/lib/db/schemas/learning-path";
import type { LearningInsights } from "@/lib/services/insight-generator";
import { MCQActivityView } from "./activity-views/mcq-activity";
import { CodingChallengeView } from "./activity-views/coding-challenge";
import { DebuggingTaskView } from "./activity-views/debugging-task";
import { ConceptExplanationView } from "./activity-views/concept-explanation";
import { ReflectionForm } from "./reflection-form";
import { TimelineView } from "./timeline-view";
import { InsightsDashboard } from "./insights-dashboard";
import { AIAssistantPanel } from "@/components/ai-tools/ai-assistant";

interface LearningWorkspaceProps {
  learningPath: LearningPath;
}

const activityTypeIcons: Record<string, typeof BookOpen> = {
  mcq: HelpCircle,
  "coding-challenge": Code,
  "debugging-task": Bug,
  "concept-explanation": FileText,
  "real-world-assignment": Target,
  "mini-case-study": Brain,
};

const activityTypeLabels: Record<string, string> = {
  mcq: "Multiple Choice",
  "coding-challenge": "Coding Challenge",
  "debugging-task": "Debugging Task",
  "concept-explanation": "Concept Explanation",
  "real-world-assignment": "Real-World Assignment",
  "mini-case-study": "Mini Case Study",
};

export function LearningWorkspace({
  learningPath: initialPath,
}: LearningWorkspaceProps) {
  const [learningPath, setLearningPath] = useState(initialPath);
  const [showReflection, setShowReflection] = useState(false);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [startTime, setStartTime] = useState(Date.now());
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [activeView, setActiveView] = useState<
    "activity" | "timeline" | "insights"
  >("activity");

  const currentTopic = learningPath.topics.find(
    (t) => t.id === learningPath.currentTopicId
  );

  const {
    status: streamStatus,
    error: streamError,
    activity: streamedActivity,
    streamingContent,
    activityType,
    startStream,
  } = useActivityStream({
    learningPathId: learningPath._id,
    onComplete: () => {
      setStartTime(Date.now());
    },
    onError: (error) => {
      console.error("Activity stream error:", error);
    },
  });

  const currentActivity = streamedActivity || learningPath.currentActivity;
  const isLoadingActivity =
    streamStatus === "loading" || streamStatus === "streaming";
  const activityError = streamError;

  const loadActivity = useCallback(
    async (regenerate = false) => {
      setShowReflection(false);
      setUserAnswer("");
      await startStream({ regenerate });
    },
    [startStream]
  );

  const loadInsights = useCallback(async () => {
    try {
      const result = await getLearningInsights(learningPath._id);
      if (result.success) {
        setInsights(result.data);
      }
    } catch {
      // Silently fail for insights
    }
  }, [learningPath._id]);

  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [hasLoadedInsights, setHasLoadedInsights] = useState(false);

  useEffect(() => {
    if (
      !learningPath.currentActivity &&
      streamStatus === "idle" &&
      !hasAttemptedLoad
    ) {
      setHasAttemptedLoad(true);
      loadActivity();
    }
  }, [
    learningPath.currentActivity,
    streamStatus,
    hasAttemptedLoad,
    loadActivity,
  ]);

  useEffect(() => {
    if (!hasLoadedInsights) {
      setHasLoadedInsights(true);
      loadInsights();
    }
  }, [hasLoadedInsights, loadInsights]);

  const handleActivityComplete = (answer: string) => {
    setUserAnswer(answer);
    setShowReflection(true);
  };

  const handleRegenerate = useCallback(() => {
    loadActivity(true);
  }, [loadActivity]);

  const handleReflectionSubmit = async (
    reflection: Omit<Reflection, "timeTakenSeconds">
  ) => {
    if (!currentActivity) return;

    setIsSubmittingReflection(true);
    const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await submitReflection(
        learningPath._id,
        currentActivity.id,
        {
          ...reflection,
          userAnswer,
          timeTakenSeconds,
        }
      );

      if (result.success) {
        setLearningPath((prev) => ({
          ...prev,
          timeline: [...prev.timeline, result.data],
          overallElo: result.data.eloAfter,
          currentActivity: null,
        }));

        await loadActivity();
        await loadInsights();
      } else {
        console.error("Reflection submission failed:", result.error.message);
      }
    } catch {
      console.error("Failed to submit reflection");
    } finally {
      setIsSubmittingReflection(false);
    }
  };

  const ActivityIcon = currentActivity
    ? activityTypeIcons[currentActivity.type] || BookOpen
    : BookOpen;

  return (
    <div className="min-h-screen bg-background">
      {/* Apple-style floating header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-background/70 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-lg shadow-black/5">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <Link
                    href="/dashboard"
                    className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className="p-2 rounded-xl bg-secondary/50 group-hover:bg-secondary transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </Link>
                  <div className="h-6 w-px bg-border/50" />
                  <div>
                    <h1 className="text-base font-semibold text-foreground line-clamp-1">
                      {learningPath.goal}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">
                        {Math.round(learningPath.overallElo)}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-border/50" />
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">
                        Lvl {learningPath.currentDifficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with top padding for fixed header */}
      <main className="pt-28 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Navigation Pills - Apple style segmented control */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-2xl bg-secondary/40 backdrop-blur-sm border border-border/30">
              {[
                { id: "activity", label: "Learn", icon: Sparkles },
                { id: "timeline", label: "History", icon: Clock },
                { id: "insights", label: "Insights", icon: Brain },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as typeof activeView)}
                  className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeView === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {activeView === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-background rounded-xl shadow-sm border border-border/50"
                      transition={{
                        type: "spring",
                        bounce: 0.15,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {activeView === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Sidebar - Topics & Skills */}
                  <aside className="lg:col-span-1 space-y-6">
                    {/* Current Topic Card */}
                    {currentTopic && (
                      <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-xl bg-primary/10">
                            <Target className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-primary uppercase tracking-wider">
                            Current Topic
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {currentTopic.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {currentTopic.description}
                        </p>
                        <div className="mt-4 pt-4 border-t border-primary/10">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground capitalize">
                              {currentTopic.skillCluster.replace("-", " ")}
                            </span>
                            <Badge
                              variant="secondary"
                              className="rounded-full text-xs"
                            >
                              Lvl {currentTopic.difficulty}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Topics List */}
                    <div className="p-6 rounded-3xl bg-background/60 backdrop-blur-sm border border-border/40">
                      <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        All Topics
                      </h4>
                      <div className="space-y-2">
                        {learningPath.topics.map((topic) => (
                          <div
                            key={topic.id}
                            className={`p-3 rounded-xl transition-all cursor-pointer ${
                              topic.id === learningPath.currentTopicId
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-secondary/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm font-medium line-clamp-1 ${
                                  topic.id === learningPath.currentTopicId
                                    ? "text-primary"
                                    : "text-foreground"
                                }`}
                              >
                                {topic.title}
                              </span>
                              {topic.id === learningPath.currentTopicId && (
                                <ChevronRight className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skills Progress */}
                    {Object.keys(learningPath.skillScores).length > 0 && (
                      <div className="p-6 rounded-3xl bg-background/60 backdrop-blur-sm border border-border/40">
                        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-muted-foreground" />
                          Skills
                        </h4>
                        <div className="space-y-4">
                          {Object.entries(learningPath.skillScores).map(
                            ([cluster, score]) => (
                              <div key={cluster} className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground capitalize">
                                    {cluster.replace("-", " ")}
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {Math.round(score)}
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${Math.min(
                                        (score / 2000) * 100,
                                        100
                                      )}%`,
                                    }}
                                    transition={{
                                      duration: 1,
                                      ease: "easeOut",
                                    }}
                                    className="h-full rounded-full bg-primary"
                                  />
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </aside>

                  {/* Main Activity Area */}
                  <div className="lg:col-span-3">
                    <AnimatePresence mode="wait">
                      {streamStatus === "streaming" && streamingContent ? (
                        <StreamingActivityCard
                          content={streamingContent}
                          activityType={activityType}
                        />
                      ) : isLoadingActivity ? (
                        <ActivityLoadingSkeleton />
                      ) : activityError ? (
                        <ActivityError
                          error={activityError}
                          onRetry={() => loadActivity()}
                        />
                      ) : currentActivity && !showReflection ? (
                        <ActivityCard
                          activity={currentActivity}
                          onComplete={handleActivityComplete}
                          ActivityIcon={ActivityIcon}
                          language={learningPath.programmingLanguage}
                          onRegenerate={handleRegenerate}
                        />
                      ) : showReflection && currentActivity ? (
                        <ReflectionForm
                          activity={currentActivity}
                          onSubmit={handleReflectionSubmit}
                          isSubmitting={isSubmittingReflection}
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "timeline" && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                <TimelineView
                  timeline={learningPath.timeline}
                  pathId={learningPath._id}
                />
              </motion.div>
            )}

            {activeView === "insights" && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <InsightsDashboard
                  insights={insights}
                  learningPath={learningPath}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* AI Assistant Panel */}
      <AIAssistantPanel learningPathId={learningPath._id} position="right" />
    </div>
  );
}

// Apple-style Activity Card Component
function ActivityCard({
  activity,
  onComplete,
  ActivityIcon,
  language = "typescript",
  onRegenerate,
}: {
  activity: Activity;
  onComplete: (answer: string, isCorrect?: boolean) => void;
  ActivityIcon: typeof BookOpen;
  language?: string;
  onRegenerate: () => void;
}) {
  return (
    <motion.div
      key={activity.id}
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -20 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-xl shadow-black/5 overflow-hidden"
    >
      {/* Card Header */}
      <div className="px-8 py-6 border-b border-border/30 bg-secondary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
              <ActivityIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {activityTypeLabels[activity.type] || activity.type}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">
                  Difficulty {activity.difficulty}
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Take your time
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            className="rounded-xl h-10 px-4 gap-2 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">New Question</span>
          </Button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-8">
        <ActivityContentView
          content={activity.content}
          onComplete={onComplete}
          language={language}
        />
      </div>
    </motion.div>
  );
}

// Activity Content View
function ActivityContentView({
  content,
  onComplete,
  language = "typescript",
}: {
  content: ActivityContent;
  onComplete: (answer: string, isCorrect?: boolean) => void;
  language?: string;
}) {
  switch (content.type) {
    case "mcq":
      return <MCQActivityView content={content} onComplete={onComplete} />;
    case "coding-challenge":
      return (
        <CodingChallengeView
          content={content}
          onComplete={onComplete}
          language={language}
        />
      );
    case "debugging-task":
      return (
        <DebuggingTaskView
          content={content}
          onComplete={onComplete}
          language={language}
        />
      );
    case "concept-explanation":
      return (
        <ConceptExplanationView content={content} onComplete={onComplete} />
      );
    default:
      return (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-secondary/50 flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Unknown Activity Type
          </h3>
          <p className="text-muted-foreground mb-8">
            This activity type is not yet supported.
          </p>
          <Button
            onClick={() => onComplete("", false)}
            className="rounded-xl px-8 h-12"
          >
            Continue
          </Button>
        </div>
      );
  }
}

// Apple-style Loading Skeleton
function ActivityLoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-xl shadow-black/5 overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-border/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary/50 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-secondary/50 rounded-xl animate-pulse" />
            <div className="h-4 w-32 bg-secondary/40 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <div className="h-6 w-full bg-secondary/40 rounded-xl animate-pulse" />
          <div className="h-6 w-4/5 bg-secondary/30 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 w-full bg-secondary/20 rounded-2xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="px-8 py-6 border-t border-border/30 flex justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">
            Generating your activity...
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Apple-style Error State
function ActivityError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="rounded-3xl bg-destructive/5 border border-destructive/20 p-12 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-10 h-10 text-destructive" />
      </div>
      <h3 className="text-2xl font-semibold text-foreground mb-3">
        Something went wrong
      </h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        {error}
      </p>
      <Button
        onClick={onRetry}
        size="lg"
        className="rounded-xl px-8 h-12 shadow-lg"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </motion.div>
  );
}

// Apple-style Streaming Activity Card
function StreamingActivityCard({
  content,
  activityType,
}: {
  content: unknown;
  activityType: string | null;
}) {
  const ActivityIcon = activityType
    ? activityTypeIcons[activityType] || BookOpen
    : BookOpen;
  const activityLabel = activityType
    ? activityTypeLabels[activityType] || activityType
    : "Activity";

  const hasQuestion = (c: unknown): c is { question?: string } =>
    typeof c === "object" && c !== null && "question" in c;
  const hasOptions = (c: unknown): c is { options?: string[] } =>
    typeof c === "object" && c !== null && "options" in c;
  const hasProblemDescription = (
    c: unknown
  ): c is { problemDescription?: string } =>
    typeof c === "object" && c !== null && "problemDescription" in c;
  const hasContent = (c: unknown): c is { content?: string } =>
    typeof c === "object" && c !== null && "content" in c;
  const hasBuggyCode = (c: unknown): c is { buggyCode?: string } =>
    typeof c === "object" && c !== null && "buggyCode" in c;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -20 }}
      className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-xl shadow-black/5 overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-border/30 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10 relative">
              <ActivityIcon className="w-7 h-7 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {activityLabel}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generating...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {hasQuestion(content) && content.question && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl text-foreground font-medium leading-relaxed"
          >
            {content.question}
          </motion.p>
        )}

        {hasOptions(content) &&
          content.options &&
          content.options.length > 0 && (
            <div className="space-y-3 mt-6">
              {content.options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-5 rounded-2xl border border-border/40 bg-secondary/20 text-muted-foreground"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center text-sm font-medium">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>
                      {option || <span className="animate-pulse">...</span>}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        {hasProblemDescription(content) && content.problemDescription && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg text-foreground leading-relaxed"
          >
            {content.problemDescription}
          </motion.p>
        )}

        {hasContent(content) && content.content && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg text-foreground leading-relaxed whitespace-pre-wrap"
          >
            {content.content}
          </motion.p>
        )}

        {hasBuggyCode(content) && content.buggyCode && (
          <motion.pre
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-2xl bg-secondary/30 border border-border/40 overflow-x-auto text-sm font-mono"
          >
            {content.buggyCode}
          </motion.pre>
        )}

        {!hasQuestion(content) &&
          !hasProblemDescription(content) &&
          !hasContent(content) &&
          !hasBuggyCode(content) && (
            <div className="space-y-4">
              <div className="h-6 w-full bg-secondary/40 rounded-xl animate-pulse" />
              <div className="h-6 w-3/4 bg-secondary/30 rounded-xl animate-pulse" />
            </div>
          )}
      </div>

      <div className="px-8 py-5 border-t border-border/30 bg-secondary/10">
        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            Creating your personalized activity
          </span>
        </div>
      </div>
    </motion.div>
  );
}
