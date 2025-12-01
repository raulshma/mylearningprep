"use client";

/**
 * Improvement Workspace Component
 * Displays and manages improvement activities for skill gaps
 * Requirements: 3.3, 4.1
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Target,
  Brain,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ImprovementActivityView } from "./improvement-activity-view";
import { recordActivityCompletion } from "@/lib/actions/feedback";
import type { Interview } from "@/lib/db/schemas/interview";
import type {
  WeaknessAnalysis,
  ImprovementPlan,
  ImprovementActivity,
  SkillGap,
} from "@/lib/db/schemas/feedback";
import type {
  ActivityContent,
  SkillCluster,
} from "@/lib/db/schemas/learning-path";

interface ImprovementWorkspaceProps {
  interviewId: string;
  interview: Interview;
  analysis: WeaknessAnalysis | null;
  improvementPlan: ImprovementPlan | null;
  initialSkillCluster?: string;
  userLevel: number;
  programmingLanguage?: string;
}

const skillClusterLabels: Record<string, { label: string; icon: string }> = {
  dsa: { label: "DSA", icon: "🧮" },
  oop: { label: "OOP", icon: "🏗️" },
  "system-design": { label: "System Design", icon: "🏛️" },
  databases: { label: "Databases", icon: "🗄️" },
  "web-fundamentals": { label: "Web", icon: "🌐" },
  "api-design": { label: "API Design", icon: "🔌" },
  testing: { label: "Testing", icon: "🧪" },
  security: { label: "Security", icon: "🔒" },
  devops: { label: "DevOps", icon: "⚙️" },
  behavioral: { label: "Behavioral", icon: "💬" },
  debugging: { label: "Debugging", icon: "🐛" },
  frontend: { label: "Frontend", icon: "🎨" },
  backend: { label: "Backend", icon: "🖥️" },
  performance: { label: "Performance", icon: "⚡" },
};

type StreamState = "idle" | "loading" | "streaming" | "complete" | "error";

export function ImprovementWorkspace({
  interviewId,
  interview,
  analysis,
  improvementPlan,
  initialSkillCluster,
  userLevel,
  programmingLanguage,
}: ImprovementWorkspaceProps) {
  const router = useRouter();

  // State
  const [selectedSkill, setSelectedSkill] = useState<string | null>(
    initialSkillCluster || analysis?.skillGaps[0]?.skillCluster || null
  );
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [currentActivity, setCurrentActivity] =
    useState<ImprovementActivity | null>(null);
  const [streamingContent, setStreamingContent] =
    useState<Partial<ActivityContent> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);

  // Get the selected skill gap
  const selectedGap = analysis?.skillGaps.find(
    (gap) => gap.skillCluster === selectedSkill
  );

  // Get existing activities for the selected skill
  const existingActivities =
    improvementPlan?.activities.filter(
      (a) => a.skillCluster === selectedSkill
    ) || [];

  // Stream a new activity
  const generateActivity = useCallback(async () => {
    if (!selectedSkill || !selectedGap) return;

    setStreamState("loading");
    setError(null);
    setStreamingContent(null);
    setCurrentActivity(null);

    try {
      const response = await fetch("/api/feedback/improvement/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillCluster: selectedSkill,
          userLevel,
          programmingLanguage,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate activity");
      }

      setStreamState("streaming");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "content") {
                setStreamingContent(event.data);
              } else if (event.type === "complete") {
                setCurrentActivity(event.activity);
                setStreamingContent(null);
                setStreamState("complete");
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (err) {
      console.error("Generate activity error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate activity"
      );
      setStreamState("error");
    }
  }, [selectedSkill, selectedGap, userLevel, programmingLanguage]);

  // Handle activity completion
  const handleActivityComplete = useCallback(
    async (activityId: string, score?: number) => {
      if (!selectedSkill) return;

      try {
        const result = await recordActivityCompletion({
          activityId,
          skillCluster: selectedSkill,
          score,
        });

        if (result.success) {
          setCompletedActivities((prev) => [...prev, activityId]);
          // Reset to allow generating another activity
          setCurrentActivity(null);
          setStreamState("idle");
          // Refresh the page data
          router.refresh();
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        console.error("Complete activity error:", err);
        setError("Failed to record activity completion");
      }
    },
    [selectedSkill, router]
  );

  // Auto-generate activity when skill is selected and no current activity
  useEffect(() => {
    if (selectedSkill && streamState === "idle" && !currentActivity) {
      // Don't auto-generate, let user click the button
    }
  }, [selectedSkill, streamState, currentActivity]);

  // No analysis state
  if (!analysis || analysis.skillGaps.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <Link
            href={`/interview/${interviewId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Interview
          </Link>

          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              No Skill Gaps Identified
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Add feedback about questions you struggled with in your interview,
              then run analysis to identify areas for improvement.
            </p>
            <Button asChild>
              <Link href={`/interview/${interviewId}`}>
                Add Interview Feedback
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const clusterInfo = skillClusterLabels[selectedSkill || ""] || {
    label: selectedSkill?.replace(/-/g, " ") || "Unknown",
    icon: "📚",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link
            href={`/interview/${interviewId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Interview
          </Link>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Improvement Activities
            </h1>
            <p className="text-muted-foreground mt-1">
              Practice targeted activities to strengthen your weak areas
            </p>
          </div>
        </div>

        {/* Skill Selector */}
        <div className="flex gap-2 flex-wrap">
          {analysis.skillGaps
            .sort((a, b) => b.gapScore - a.gapScore)
            .map((gap) => {
              const info = skillClusterLabels[gap.skillCluster] || {
                label: gap.skillCluster.replace(/-/g, " "),
                icon: "📚",
              };
              const isSelected = selectedSkill === gap.skillCluster;

              return (
                <button
                  key={gap.skillCluster}
                  onClick={() => {
                    setSelectedSkill(gap.skillCluster);
                    setCurrentActivity(null);
                    setStreamState("idle");
                    setError(null);
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }
                  `}
                >
                  <span>{info.icon}</span>
                  <span className="capitalize">{info.label}</span>
                  <Badge
                    variant={isSelected ? "secondary" : "outline"}
                    className="text-xs ml-1"
                  >
                    {Math.round(gap.gapScore)}%
                  </Badge>
                </button>
              );
            })}
        </div>

        {/* Selected Skill Info */}
        {selectedGap && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {clusterInfo.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground capitalize">
                    {clusterInfo.label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Gap Score: {Math.round(selectedGap.gapScore)}% •{" "}
                    {selectedGap.frequency} feedback
                    {selectedGap.frequency !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-lg font-semibold text-foreground">
                  {Math.round(selectedGap.confidence * 100)}%
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  Improvement Progress
                </span>
                <span className="text-foreground font-medium">
                  {100 - Math.round(selectedGap.gapScore)}%
                </span>
              </div>
              <Progress value={100 - selectedGap.gapScore} className="h-2" />
            </div>
          </motion.div>
        )}

        {/* Activity Area */}
        <div className="space-y-4">
          {/* Error State */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="flex-1 text-sm">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button or Activity */}
          {streamState === "idle" && !currentActivity && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ready to Practice?
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Generate a personalized activity to help you improve in{" "}
                <span className="font-medium text-foreground capitalize">
                  {clusterInfo.label}
                </span>
              </p>
              <Button onClick={generateActivity} size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Activity
              </Button>
            </motion.div>
          )}

          {/* Loading State */}
          {streamState === "loading" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
              >
                <Brain className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Generating Activity...
              </h3>
              <p className="text-muted-foreground">
                Creating a personalized learning experience for you
              </p>
            </motion.div>
          )}

          {/* Streaming State */}
          {streamState === "streaming" && streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm font-medium text-muted-foreground">
                  Generating content...
                </span>
              </div>
              <ImprovementActivityView
                content={streamingContent as ActivityContent}
                isStreaming={true}
                onComplete={() => {}}
              />
            </motion.div>
          )}

          {/* Complete Activity */}
          {streamState === "complete" && currentActivity?.content && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="capitalize">
                    {currentActivity.activityType.replace(/-/g, " ")}
                  </Badge>
                  <Badge variant="outline">
                    Difficulty: {currentActivity.difficulty}/10
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateActivity}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Activity
                </Button>
              </div>
              <ImprovementActivityView
                content={currentActivity.content}
                isStreaming={false}
                onComplete={(score?: number) =>
                  handleActivityComplete(currentActivity.id, score)
                }
              />
            </motion.div>
          )}

          {/* Error State with Retry */}
          {streamState === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Generation Failed
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {error || "Something went wrong. Please try again."}
              </p>
              <Button
                onClick={generateActivity}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </motion.div>
          )}
        </div>

        {/* Previous Activities */}
        {existingActivities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
          >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Previous Activities
            </h3>
            <div className="space-y-2">
              {existingActivities.map((activity) => {
                const isViewable = activity.content !== null;
                const isCompletable = activity.status !== "completed" && isViewable;
                const isCurrentlyViewing = currentActivity?.id === activity.id;

                return (
                  <button
                    key={activity.id}
                    onClick={() => {
                      if (isViewable) {
                        setCurrentActivity(activity);
                        setStreamState("complete");
                        setError(null);
                        setStreamingContent(null);
                      }
                    }}
                    disabled={!isViewable}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                      isCurrentlyViewing
                        ? "bg-primary/10 border border-primary/30"
                        : isViewable
                        ? "bg-secondary/30 hover:bg-secondary/50 cursor-pointer"
                        : "bg-secondary/20 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {activity.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : isCompletable ? (
                        <div className="w-5 h-5 rounded-full border-2 border-primary/50 bg-primary/10" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className="text-sm text-foreground capitalize">
                        {activity.activityType.replace(/-/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          activity.status === "completed" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {activity.status}
                      </Badge>
                      {isViewable && (
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${
                          isCurrentlyViewing ? "rotate-90" : ""
                        }`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
