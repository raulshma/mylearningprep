"use client";

/**
 * Enhanced Topic List Item Component
 * Displays topic cards in the interview workspace with rich metadata
 * and preview capabilities.
 */

import { memo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  GraduationCap,
  Layers,
} from "lucide-react";
import type { RevisionTopic, TopicStatus } from "@/lib/db/schemas/interview";

interface TopicListItemProps {
  topic: RevisionTopic;
  interviewId: string;
  index: number;
  isStreaming?: boolean;
  isCurrentlyStreaming?: boolean;
}

// Confidence indicator colors
const confidenceConfig = {
  low: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-600 border-red-500/20",
    label: "Low",
  },
  medium: {
    dot: "bg-yellow-500",
    badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    label: "Medium",
  },
  high: {
    dot: "bg-green-500",
    badge: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "High",
  },
};

// Status indicator config
const statusConfig: Record<
  TopicStatus,
  { icon: typeof Circle; color: string; label: string }
> = {
  not_started: {
    icon: Circle,
    color: "text-muted-foreground",
    label: "Not Started",
  },
  in_progress: {
    icon: PlayCircle,
    color: "text-yellow-500",
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    label: "Completed",
  },
};

// Difficulty labels
const difficultyLabels = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
};

/**
 * Extract a clean preview from markdown content
 */
function extractPreview(content: string, maxLength: number = 150): string {
  // Remove markdown headers
  let preview = content.replace(/^#{1,6}\s+.*$/gm, "");
  // Remove code blocks
  preview = preview.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  preview = preview.replace(/`[^`]+`/g, "");
  // Remove bold/italic markers
  preview = preview.replace(/\*\*([^*]+)\*\*/g, "$1");
  preview = preview.replace(/\*([^*]+)\*/g, "$1");
  preview = preview.replace(/__([^_]+)__/g, "$1");
  preview = preview.replace(/_([^_]+)_/g, "$1");
  // Remove links
  preview = preview.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove images
  preview = preview.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  // Remove horizontal rules
  preview = preview.replace(/^---+$/gm, "");
  // Remove blockquotes
  preview = preview.replace(/^>\s*/gm, "");
  // Remove list markers
  preview = preview.replace(/^[-*+]\s+/gm, "");
  preview = preview.replace(/^\d+\.\s+/gm, "");
  // Collapse whitespace
  preview = preview.replace(/\s+/g, " ").trim();

  if (preview.length > maxLength) {
    return preview.slice(0, maxLength).trim() + "...";
  }
  return preview;
}

/**
 * Streaming Topic Card - Shows during generation
 */
const StreamingTopicCard = memo(function StreamingTopicCard({
  topic,
  interviewId,
}: {
  topic: RevisionTopic;
  interviewId: string;
}) {
  const hasContent = topic.content && topic.content.length > 0;
  const previewContent = hasContent ? extractPreview(topic.content, 200) : "";
  const confidence = confidenceConfig[topic.confidence] || confidenceConfig.medium;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Animated confidence dot */}
            <div className="relative flex-shrink-0">
              <div className={cn("w-2.5 h-2.5 rounded-full", confidence.dot)} />
              <div
                className={cn(
                  "absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping",
                  confidence.dot,
                  "opacity-50"
                )}
              />
            </div>

            {/* Title */}
            <h3 className="font-semibold text-foreground truncate">
              {topic.title || "Generating topic..."}
            </h3>
          </div>

          {/* Streaming badge */}
          <Badge
            variant="outline"
            className="rounded-full px-3 bg-primary/10 border-primary/30 text-primary flex-shrink-0"
          >
            <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
            Generating
          </Badge>
        </div>

        {/* Reason */}
        {topic.reason && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {topic.reason}
          </p>
        )}

        {/* Content Preview */}
        {hasContent && (
          <div className="mt-3 pt-3 border-t border-primary/20">
            <p className="text-xs text-muted-foreground/70 font-mono line-clamp-3">
              {previewContent}
              <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5 align-middle" />
            </p>
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {topic.difficulty && (
            <Badge variant="secondary" className="rounded-full text-xs">
              <GraduationCap className="w-3 h-3 mr-1" />
              {difficultyLabels[topic.difficulty]}
            </Badge>
          )}
          {topic.estimatedMinutes && (
            <Badge variant="secondary" className="rounded-full text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {topic.estimatedMinutes} min
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Completed Topic Card - Shows after generation
 */
const CompletedTopicCard = memo(function CompletedTopicCard({
  topic,
  interviewId,
}: {
  topic: RevisionTopic;
  interviewId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const confidence = confidenceConfig[topic.confidence] || confidenceConfig.medium;
  const status = statusConfig[topic.status || "not_started"];
  const StatusIcon = status.icon;
  const preview = extractPreview(topic.content, 150);

  return (
    <Link
      href={`/interview/${interviewId}/topic/${topic.id}`}
      className="group block"
    >
      <div
        className={cn(
          "rounded-2xl border border-border/50 bg-background/50 overflow-hidden",
          "hover:border-primary/30 hover:bg-background hover:shadow-lg",
          "transition-all duration-200"
        )}
      >
        <div className="p-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Confidence dot */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        confidence.dot
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {confidence.label} likelihood of being asked
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Title */}
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {topic.title}
              </h3>
            </div>

            {/* Status & Arrow */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <StatusIcon className={cn("w-4 h-4", status.color)} />
                  </TooltipTrigger>
                  <TooltipContent>{status.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Reason */}
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 pl-5">
            {topic.reason}
          </p>

          {/* Content Preview */}
          <div className="pl-5 mb-3">
            <p className="text-xs text-muted-foreground/70 line-clamp-2 italic">
              {preview}
            </p>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 pl-5 flex-wrap">
            {/* Confidence Badge */}
            <Badge
              variant="outline"
              className={cn("rounded-full text-xs", confidence.badge)}
            >
              <Target className="w-3 h-3 mr-1" />
              {confidence.label}
            </Badge>

            {/* Difficulty */}
            {topic.difficulty && (
              <Badge variant="secondary" className="rounded-full text-xs">
                <GraduationCap className="w-3 h-3 mr-1" />
                {difficultyLabels[topic.difficulty]}
              </Badge>
            )}

            {/* Time Estimate */}
            {topic.estimatedMinutes && (
              <Badge variant="secondary" className="rounded-full text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {topic.estimatedMinutes} min
              </Badge>
            )}

            {/* Prerequisites count */}
            {topic.prerequisites && topic.prerequisites.length > 0 && (
              <Badge variant="secondary" className="rounded-full text-xs">
                <Layers className="w-3 h-3 mr-1" />
                {topic.prerequisites.length} prereqs
              </Badge>
            )}

            {/* Skill gaps count */}
            {topic.skillGaps && topic.skillGaps.length > 0 && (
              <Badge
                variant="outline"
                className="rounded-full text-xs border-primary/30 bg-primary/5 text-primary"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {topic.skillGaps.length} skills
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

/**
 * Main Topic List Item Component
 */
export const TopicListItem = memo(function TopicListItem({
  topic,
  interviewId,
  index,
  isStreaming = false,
  isCurrentlyStreaming = false,
}: TopicListItemProps) {
  // Show streaming card for the currently generating topic
  if (isCurrentlyStreaming) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <StreamingTopicCard topic={topic} interviewId={interviewId} />
      </motion.div>
    );
  }

  // Show completed card for finished topics
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <CompletedTopicCard topic={topic} interviewId={interviewId} />
    </motion.div>
  );
});

export default TopicListItem;
