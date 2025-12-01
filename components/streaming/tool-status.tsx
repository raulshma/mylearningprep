"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  Sparkles,
  Check,
  Loader2,
  TrendingUp,
  MessageSquare,
  Github,
  Network,
  Target,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIToolName } from "@/lib/services/ai-tools";

export type ToolStatusStep =
  | "idle"
  | "searching"
  | "crawling"
  | "searchingAndCrawling"
  | "reading"
  | "generating"
  | "complete"
  // New AI tool statuses
  | "analyzingTrends"
  | "mockInterview"
  | "analyzingRepo"
  | "systemDesign"
  | "starFramework"
  | "findingResources";

interface ToolStatusProps {
  status: ToolStatusStep;
  searchQuery?: string;
  toolName?: AIToolName;
  className?: string;
}

const statusConfig: Record<
  ToolStatusStep,
  {
    icon: LucideIcon;
    label: string;
    color: string;
  }
> = {
  idle: {
    icon: Sparkles,
    label: "Ready",
    color: "bg-muted text-muted-foreground",
  },
  searching: {
    icon: Search,
    label: "Searching Web",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  crawling: {
    icon: FileText,
    label: "Crawling Web Page",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  searchingAndCrawling: {
    icon: Search,
    label: "Searching & Crawling",
    color: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  },
  reading: {
    icon: FileText,
    label: "Reading Results",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  generating: {
    icon: Sparkles,
    label: "Generating Answer",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  complete: {
    icon: Check,
    label: "Complete",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  // New AI tool statuses
  analyzingTrends: {
    icon: TrendingUp,
    label: "Analyzing Tech Trends",
    color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  },
  mockInterview: {
    icon: MessageSquare,
    label: "Preparing Mock Interview",
    color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  },
  analyzingRepo: {
    icon: Github,
    label: "Analyzing GitHub Repo",
    color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
  systemDesign: {
    icon: Network,
    label: "Generating System Design",
    color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  },
  starFramework: {
    icon: Target,
    label: "Structuring STAR Response",
    color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  findingResources: {
    icon: BookOpen,
    label: "Finding Learning Resources",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
};

/**
 * Map AI tool names to status steps
 */
export function toolNameToStatus(toolName: AIToolName): ToolStatusStep {
  const mapping: Record<AIToolName, ToolStatusStep> = {
    searchWeb: "searching",
    crawlWeb: "crawling",
    searchAndCrawl: "searchingAndCrawling",
    analyzeTechTrends: "analyzingTrends",
    mockInterview: "mockInterview",
    analyzeGitHubRepo: "analyzingRepo",
    generateSystemDesign: "systemDesign",
    generateSTARFramework: "starFramework",
    findLearningResources: "findingResources",
  };
  return mapping[toolName] || "generating";
}

const pillVariants = {
  initial: { opacity: 0, scale: 0.9, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 4,
    transition: { duration: 0.1, ease: "easeIn" as const },
  },
};

export function ToolStatus({
  status,
  searchQuery,
  toolName,
  className,
}: ToolStatusProps) {
  // Use toolName to determine status if provided
  const effectiveStatus = toolName ? toolNameToStatus(toolName) : status;
  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;
  const isActive = effectiveStatus !== "idle" && effectiveStatus !== "complete";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={effectiveStatus}
        variants={pillVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
          config.color,
          className
        )}
        style={{ viewTransitionName: "tool-status" } as React.CSSProperties}
      >
        {isActive ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className="h-3 w-3" />
        )}
        <span>{config.label}</span>
        {effectiveStatus === "searching" && searchQuery && (
          <span className="text-muted-foreground truncate max-w-[120px]">
            &ldquo;{searchQuery}&rdquo;
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface ToolStatusTrailProps {
  steps: Array<{
    status: ToolStatusStep;
    query?: string;
    toolName?: AIToolName;
    timestamp?: Date;
  }>;
  className?: string;
}

export function ToolStatusTrail({ steps, className }: ToolStatusTrailProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <AnimatePresence>
        {steps.map((step, index) => (
          <motion.div
            key={`${step.toolName || step.status}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: index * 0.1 }}
          >
            <ToolStatus
              status={step.status}
              searchQuery={step.query}
              toolName={step.toolName}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Active Tools Display - Shows all currently running tools
 */
interface ActiveToolsProps {
  tools: Array<{
    toolName: AIToolName;
    status: "calling" | "complete" | "error";
    input?: Record<string, unknown>;
  }>;
  className?: string;
}

export function ActiveTools({ tools, className }: ActiveToolsProps) {
  if (tools.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <AnimatePresence mode="popLayout">
        {tools.map((tool, index) => {
          const status = toolNameToStatus(tool.toolName);
          const config = statusConfig[status];
          const Icon = config.icon;
          const isActive = tool.status === "calling";

          return (
            <motion.div
              key={`${tool.toolName}-${index}`}
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                tool.status === "error"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : tool.status === "complete"
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : config.color
              )}
            >
              {isActive ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : tool.status === "complete" ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span>{config.label}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
