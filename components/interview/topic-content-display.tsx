"use client";

/**
 * Enhanced Topic Content Display Component
 * Renders detailed topic content with proper markdown, syntax highlighting,
 * and interactive elements for interview preparation.
 */

import { memo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  Clock,
  Target,
  MessageSquare,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  GraduationCap,
  Layers,
} from "lucide-react";
import type { RevisionTopic } from "@/lib/db/schemas/interview";

// Dynamic import for markdown renderer to prevent SSR issues
const MarkdownRenderer = dynamic(
  () => import("@/components/streaming/markdown-renderer"),
  { ssr: false }
);

interface TopicContentDisplayProps {
  topic: RevisionTopic;
  isStreaming?: boolean;
  streamingContent?: string;
  className?: string;
  showMetadata?: boolean;
  compact?: boolean;
}

// Confidence color mapping
const confidenceColors = {
  low: "bg-red-500/10 text-red-600 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  high: "bg-green-500/10 text-green-600 border-green-500/20",
};

const confidenceLabels = {
  low: "Low Priority",
  medium: "Medium Priority",
  high: "High Priority",
};

// Difficulty color mapping
const difficultyColors = {
  junior: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  mid: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  senior: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  staff: "bg-red-500/10 text-red-600 border-red-500/20",
};

const difficultyLabels = {
  junior: "Junior Level",
  mid: "Mid Level",
  senior: "Senior Level",
  staff: "Staff Level",
};

/**
 * Topic Metadata Section
 */
const TopicMetadata = memo(function TopicMetadata({
  topic,
}: {
  topic: RevisionTopic;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {/* Confidence Badge */}
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium",
          confidenceColors[topic.confidence]
        )}
      >
        <Target className="w-3 h-3 mr-1.5" />
        {confidenceLabels[topic.confidence]}
      </Badge>

      {/* Difficulty Badge */}
      {topic.difficulty && (
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            difficultyColors[topic.difficulty]
          )}
        >
          <GraduationCap className="w-3 h-3 mr-1.5" />
          {difficultyLabels[topic.difficulty]}
        </Badge>
      )}

      {/* Estimated Time */}
      {topic.estimatedMinutes && (
        <Badge
          variant="outline"
          className="rounded-full px-3 py-1 text-xs font-medium bg-muted/50"
        >
          <Clock className="w-3 h-3 mr-1.5" />
          {topic.estimatedMinutes} min study time
        </Badge>
      )}
    </div>
  );
});

/**
 * Prerequisites Section
 */
const PrerequisitesSection = memo(function PrerequisitesSection({
  prerequisites,
}: {
  prerequisites: string[];
}) {
  if (!prerequisites || prerequisites.length === 0) return null;

  return (
    <Card className="mb-6 border-border/50 bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="w-4 h-4 text-muted-foreground" />
          Prerequisites
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {prerequisites.map((prereq, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="rounded-full text-xs"
            >
              {prereq}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Skill Gaps Section
 */
const SkillGapsSection = memo(function SkillGapsSection({
  skillGaps,
}: {
  skillGaps: string[];
}) {
  if (!skillGaps || skillGaps.length === 0) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Target className="w-4 h-4" />
          Skills This Topic Addresses
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {skillGaps.map((gap, index) => (
            <Badge
              key={index}
              variant="outline"
              className="rounded-full text-xs border-primary/30 bg-primary/10 text-primary"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {gap}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Follow-up Questions Section
 */
const FollowUpQuestionsSection = memo(function FollowUpQuestionsSection({
  questions,
}: {
  questions: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!questions || questions.length === 0) return null;

  return (
    <Card className="mt-8 border-border/50 bg-muted/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Likely Follow-up Questions ({questions.length})
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {questions.map((question, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{question}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

/**
 * Topic Reason Card
 */
const TopicReasonCard = memo(function TopicReasonCard({
  reason,
}: {
  reason: string;
}) {
  return (
    <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Lightbulb className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-500 mb-1">
              Why This Topic Matters
            </p>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Main Topic Content Display Component
 */
export const TopicContentDisplay = memo(function TopicContentDisplay({
  topic,
  isStreaming = false,
  streamingContent,
  className,
  showMetadata = true,
  compact = false,
}: TopicContentDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayContent = isStreaming && streamingContent ? streamingContent : topic.content;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [displayContent]);

  return (
    <div className={cn("relative", className)}>
      {/* Metadata Section */}
      {showMetadata && !compact && <TopicMetadata topic={topic} />}

      {/* Why This Topic Matters */}
      {!compact && topic.reason && <TopicReasonCard reason={topic.reason} />}

      {/* Prerequisites */}
      {!compact && topic.prerequisites && (
        <PrerequisitesSection prerequisites={topic.prerequisites} />
      )}

      {/* Skill Gaps */}
      {!compact && topic.skillGaps && (
        <SkillGapsSection skillGaps={topic.skillGaps} />
      )}

      {/* Main Content */}
      <div className="relative">
        {/* Copy Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 z-10 h-8 w-8 rounded-lg opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm border border-border/50"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {copied ? "Copied!" : "Copy content"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Markdown Content */}
        <MarkdownRenderer
          content={displayContent}
          isStreaming={isStreaming}
          className="mt-4"
        />
      </div>

      {/* Follow-up Questions */}
      {!compact && topic.followUpQuestions && (
        <FollowUpQuestionsSection questions={topic.followUpQuestions} />
      )}

      {/* Streaming Indicator */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">Generating content...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default TopicContentDisplay;
