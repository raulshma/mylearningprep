"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  MessageSquare,
  Github,
  Network,
  Users,
  BookOpen,
  Lock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Bot,
  Zap,
  Infinity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TechTrendsDialog } from "./tech-trends-dialog";
import { MockInterviewDialog } from "./mock-interview-dialog";
import { GitHubAnalysisDialog } from "./github-analysis-dialog";
import { SystemDesignDialog } from "./system-design-dialog";
import { STARFrameworkDialog } from "./star-framework-dialog";
import { LearningResourcesDialog } from "./learning-resources-dialog";
import { AIAssistantInline } from "./ai-assistant";
import { useSharedHeader } from "@/components/dashboard/shared-header-context";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AITool {
  id: string;
  name: string;
  description: string;
  icon: typeof TrendingUp;
  color: string;
  gradient: string;
  minPlan: "pro" | "max";
  features: string[];
  layout: string;
  isAssistant?: boolean;
}

const aiTools: AITool[] = [
  {
    id: "ai-assistant",
    name: "AI Assistant",
    description:
      "Your intelligent interview coach with multi-tool capabilities.",
    icon: Bot,
    color: "text-primary",
    gradient: "from-primary/20 to-violet-600/20",
    minPlan: "pro",
    features: ["Multi-Tool", "Context-Aware", "Real-time"],
    layout: "md:col-span-3 md:row-span-2",
    isAssistant: true,
  },
  {
    id: "tech-trends",
    name: "Tech Trends",
    description: "Data-driven insights for your career path.",
    icon: TrendingUp,
    color: "text-cyan-500",
    gradient: "from-cyan-500/20 to-blue-600/20",
    minPlan: "pro",
    features: ["Market Analysis", "Growth Data"],
    layout: "md:col-span-2 md:row-span-1",
  },
  {
    id: "mock-interview",
    name: "Mock Interview",
    description: "Realistic practice with AI feedback.",
    icon: MessageSquare,
    color: "text-violet-500",
    gradient: "from-violet-500/20 to-purple-600/20",
    minPlan: "pro",
    features: ["Real-time Feedback", "Roleplay"],
    layout: "md:col-span-1 md:row-span-1",
  },
  {
    id: "github-analysis",
    name: "GitHub Analysis",
    description: "Deep dive into code quality and patterns.",
    icon: Github,
    color: "text-gray-500",
    gradient: "from-gray-500/20 to-slate-600/20",
    minPlan: "pro",
    features: ["Code Review", "Pattern Detection"],
    layout: "md:col-span-1 md:row-span-1",
  },
  {
    id: "system-design",
    name: "System Design",
    description: "Architect scalable systems with ease.",
    icon: Network,
    color: "text-indigo-500",
    gradient: "from-indigo-500/20 to-blue-600/20",
    minPlan: "max",
    features: ["Diagrams", "Trade-offs"],
    layout: "md:col-span-2 md:row-span-1",
  },
  {
    id: "star-framework",
    name: "STAR Builder",
    description: "Craft perfect behavioral stories.",
    icon: Users,
    color: "text-emerald-500",
    gradient: "from-emerald-500/20 to-green-600/20",
    minPlan: "pro",
    features: ["Story Structure", "Key Metrics"],
    layout: "md:col-span-1 md:row-span-1",
  },
  {
    id: "learning-resources",
    name: "Learning Hub",
    description: "Curated resources for your growth.",
    icon: BookOpen,
    color: "text-rose-500",
    gradient: "from-rose-500/20 to-red-600/20",
    minPlan: "max",
    features: ["Courses", "Tutorials"],
    layout: "md:col-span-2 md:row-span-1",
  },
];

interface AIToolsPageContentProps {
  userPlan?: "free" | "pro" | "max";
  usageData?: {
    iterations: {
      count: number;
      limit: number;
      resetDate: Date;
    };
    isByok: boolean;
  };
}

export function AIToolsPageContent({
  userPlan = "pro",
  usageData,
}: AIToolsPageContentProps) {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const { setHeader } = useSharedHeader();

  const remaining = usageData
    ? Math.max(0, usageData.iterations.limit - usageData.iterations.count)
    : 0;
  const isAtLimit = usageData && !usageData.isByok && remaining === 0;

  // Set the shared header with usage display
  useEffect(() => {
    setHeader({
      badge: "AI Tools",
      badgeIcon: Sparkles,
      title: "AI Suite",
      description: "Professional grade tools for your interview preparation.",
      actions: (
        <div className="flex items-center gap-3">
          {/* Usage indicator */}
          {usageData && userPlan !== "free" && (
            <div className="flex items-center gap-2 text-sm bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
              <Zap className="w-3.5 h-3.5 text-primary" />
              {usageData.isByok ? (
                <span className="flex items-center gap-1 text-muted-foreground font-medium">
                  <Infinity className="w-3.5 h-3.5" /> Unlimited
                </span>
              ) : (
                <span
                  className={cn(
                    "font-medium",
                    isAtLimit ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {remaining}/{usageData.iterations.limit} remaining
                </span>
              )}
            </div>
          )}
          <Badge
            variant={
              userPlan === "max"
                ? "default"
                : userPlan === "pro"
                ? "secondary"
                : "outline"
            }
            className="text-sm px-4 py-1.5 flex items-center gap-2 w-fit rounded-full"
          >
            {userPlan === "max" && <Sparkles className="w-3 h-3" />}
            {userPlan.toUpperCase()} Plan
          </Badge>
        </div>
      ),
    });
  }, [setHeader, userPlan, usageData, remaining, isAtLimit]);

  const canAccessTool = (tool: AITool) => {
    if (userPlan === "max") return true;
    if (userPlan === "pro" && tool.minPlan === "pro") return true;
    return false;
  };

  const handleOpenDialog = (toolId: string) => {
    const tool = aiTools.find((t) => t.id === toolId);
    if (tool && canAccessTool(tool)) {
      // Show warning if at limit (unless BYOK)
      if (isAtLimit) {
        // Dialog will show the limit message
      }
      setOpenDialog(toolId);
    }
  };

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/5 via-primary/10 to-background border p-6 md:p-8 text-center md:text-left">
        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Master Your Interview.
            </h1>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              A complete suite of AI-powered tools designed to give you the
              competitive edge. From system design to behavioral questions,
              we&apos;ve got you covered.
            </p>

            {userPlan === "free" && (
              <Button size="lg" className="rounded-full px-8" asChild>
                <Link href="/pricing">
                  Unlock All Tools <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </motion.div>
        </div>

        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(200px,auto)]">
        {aiTools.map((tool, index) => {
          const hasAccess = canAccessTool(tool);
          const Icon = tool.icon;

          // Special rendering for AI Assistant - inline component
          if (tool.isAssistant && hasAccess) {
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm",
                  tool.layout
                )}
              >
                <AIAssistantInline
                  title="AI Interview Coach"
                  description="Ask anything about interviews, tech trends, or learning resources"
                  className="h-full border-0 rounded-none shadow-none"
                />
              </motion.div>
            );
          }

          // Skip AI Assistant if user doesn't have access (will show locked version below)
          if (tool.isAssistant && !hasAccess) {
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm opacity-75",
                  tool.layout
                )}
              >
                {/* Background Gradient */}
                <div
                  className={cn(
                    "absolute inset-0 bg-linear-to-br opacity-50",
                    tool.gradient
                  )}
                />

                <div className="relative h-full p-8 flex flex-col items-center justify-center text-center z-10">
                  <div
                    className={cn(
                      "p-4 rounded-2xl bg-background/80 backdrop-blur-sm shadow-lg ring-1 ring-black/5 dark:ring-white/10 mb-4",
                      tool.color
                    )}
                  >
                    <Icon className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{tool.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-md">
                    {tool.description}
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {tool.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="secondary"
                        className="bg-background/50"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <Button asChild>
                    <Link href="/pricing">
                      <Lock className="w-4 h-4 mr-2" />
                      Upgrade to PRO
                    </Link>
                  </Button>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl cursor-pointer",
                tool.layout,
                !hasAccess && "opacity-75"
              )}
              onClick={() => handleOpenDialog(tool.id)}
            >
              {/* Background Gradient */}
              <div
                className={cn(
                  "absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  tool.gradient
                )}
              />

              <div className="relative h-full p-5 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "p-2.5 rounded-xl bg-background/80 backdrop-blur-sm shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-300 group-hover:scale-110",
                      tool.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    {!hasAccess ? (
                      <Badge
                        variant="secondary"
                        className="bg-background/50 backdrop-blur-md text-[10px] px-2 h-5"
                      >
                        <Lock className="w-3 h-3 mr-1" />{" "}
                        {tool.minPlan.toUpperCase()}
                      </Badge>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/50 backdrop-blur-md rounded-full p-1">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-snug mb-3 line-clamp-2">
                    {tool.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {tool.features.slice(0, 2).map((feature) => (
                      <span
                        key={feature}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/50 backdrop-blur-sm border text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hover Overlay for Locked Items */}
              {!hasAccess && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button variant="secondary" className="shadow-lg">
                    Upgrade to {tool.minPlan.toUpperCase()}
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Dialogs */}
      <TechTrendsDialog
        open={openDialog === "tech-trends"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      />
      <MockInterviewDialog
        open={openDialog === "mock-interview"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      />
      <GitHubAnalysisDialog
        open={openDialog === "github-analysis"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      />
      <SystemDesignDialog
        open={openDialog === "system-design"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      />
      <STARFrameworkDialog
        open={openDialog === "star-framework"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      />
      <LearningResourcesDialog
        open={openDialog === "learning-resources"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      />
    </div>
  );
}
