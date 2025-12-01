"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  Target,
  Brain,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { createLearningPath } from "@/lib/actions/learning-path";
import { useSharedHeader } from "@/components/dashboard/shared-header-context";

const tips = [
  "Be specific about your learning goal",
  "Include the technology or framework you want to learn",
  "Mention your target level (beginner, intermediate, senior)",
  'Add context like "for interviews" or "for a project"',
];

const examples = [
  "Learn .NET for senior dev interviews",
  "Master React hooks and state management",
  "Understand system design patterns for distributed systems",
  "Learn TypeScript advanced types and generics",
];

export default function NewLearningPathPage() {
  const router = useRouter();
  const { setHeader } = useSharedHeader();

  // Form state
  const [goal, setGoal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set header on mount
  useEffect(() => {
    setHeader({
      badge: "Learning Path",
      badgeIcon: BookOpen,
      title: "Start Your Learning Journey",
      description: "Create a personalized, adaptive learning path",
    });
  }, [setHeader]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation (minimum 10 characters per Requirements 1.5)
    if (goal.trim().length < 10) {
      setError("Please provide a more detailed goal (at least 10 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createLearningPath(goal.trim());
      if (result.success) {
        router.push(`/learning/${result.data._id}`);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setGoal(example);
    setError(null);
  };

  const canSubmit = goal.trim().length >= 10;

  return (
    <div className="max-w-full px-4 md:px-0">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto hover:bg-destructive/20 p-1 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        {/* Main form area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Goal Input Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <form onSubmit={handleSubmit}>
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      What do you want to learn?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Describe your learning goal in detail
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <Textarea
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g., Learn .NET for senior dev interviews, focusing on dependency injection, LINQ, and async patterns..."
                    className="font-mono text-sm min-h-40 bg-secondary/30 border-border/50 focus:border-primary/30 focus:ring-0 resize-none rounded-2xl p-4 leading-relaxed"
                    disabled={isSubmitting}
                  />
                  <div className="absolute bottom-4 right-4">
                    <p className="text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border/50">
                      {goal.trim().length < 10
                        ? `${10 - goal.trim().length} more characters`
                        : "Ready"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-4">
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="rounded-full px-6 h-11 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Learning
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Example Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="bg-card/30 border border-border/50 p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                </div>
                <h3 className="font-bold text-sm text-foreground">
                  Example goals
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    disabled={isSubmitting}
                    className="text-xs px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all duration-300 disabled:opacity-50 text-left leading-relaxed"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Side panel */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-bold text-sm text-foreground">
                Tips for best results
              </h3>
            </div>
            <ul className="space-y-4">
              {tips.map((tip, i) => (
                <motion.li
                  key={tip}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500/80 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden bg-linear-to-br from-primary/5 to-blue-500/5 border border-white/10 p-6 rounded-3xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground">
                  What you&apos;ll get
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center shrink-0 border border-border/50">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span>Adaptive difficulty based on your performance</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center shrink-0 border border-border/50">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <span>MCQs, coding challenges, and debugging tasks</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center shrink-0 border border-border/50">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <span>Personalized topic selection</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center shrink-0 border border-border/50">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <span>Insights into strengths and weaknesses</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
