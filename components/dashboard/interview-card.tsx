"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MoreHorizontal,
  Trash2,
  Share2,
  Copy,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ViewTransitionLink } from "@/components/transitions/view-transition-link";
import type { DashboardInterviewData } from "@/lib/actions/dashboard";

interface InterviewCardNewProps {
  interview: DashboardInterviewData;
  viewMode: "grid" | "list";
  onDelete: () => void;
  isDeleting?: boolean;
}

const statusConfig = {
  upcoming: {
    label: "New",
    icon: Sparkles,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  active: {
    label: "In Progress",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
};

export function InterviewCardNew({
  interview,
  viewMode,
  onDelete,
  isDeleting,
}: InterviewCardNewProps) {
  const status = statusConfig[interview.status];
  const StatusIcon = status.icon;

  const formattedDate = new Date(interview.createdAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  if (viewMode === "list") {
    return (
      <ViewTransitionLink
        href={`/interview/${interview._id}`}
        viewTransitionName={`interview-card-${interview._id}`}
      >
        <div
          className="group bg-card border border-border hover:border-primary/30 transition-all duration-300 p-4 flex items-center gap-4"
          style={
            {
              viewTransitionName: `interview-card-${interview._id}`,
            } as React.CSSProperties
          }
        >
          {/* Icon */}
          <div className="w-10 h-10 bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
            <Briefcase className="w-4 h-4 text-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-mono text-foreground truncate">
                {interview.jobDetails.title}
              </h3>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${status.className}`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {interview.jobDetails.company}
            </p>
          </div>

          {/* Progress */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-sm font-mono text-foreground">
                {interview.progress}%
              </p>
            </div>
            <div className="w-24 h-1.5 bg-muted">
              <div
                className="h-full bg-foreground transition-all"
                style={{ width: `${interview.progress}%` }}
              />
            </div>
          </div>

          {/* Date */}
          <div className="hidden md:block text-right">
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </ViewTransitionLink>
    );
  }

  return (
    <ViewTransitionLink
      href={`/interview/${interview._id}`}
      viewTransitionName={`interview-card-${interview._id}`}
    >
      <div
        className="group bg-card border border-border hover:border-primary/30 transition-all duration-300 h-full flex flex-col"
        style={
          {
            viewTransitionName: `interview-card-${interview._id}`,
          } as React.CSSProperties
        }
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Briefcase className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs ${status.className}`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 -mr-2"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={isDeleting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <h3 className="font-mono text-foreground mb-1 truncate group-hover:text-primary transition-colors">
            {interview.jobDetails.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {interview.jobDetails.company}
          </p>
        </div>

        {/* Content */}
        <div className="p-5 pt-4 flex-1 flex flex-col">
          {/* Topics */}
          <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
            {interview.topics.slice(0, 3).map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="font-mono text-xs truncate max-w-[140px]"
              >
                {topic}
              </Badge>
            ))}
            {interview.topics.length > 3 && (
              <Badge variant="secondary" className="font-mono text-xs shrink-0">
                +{interview.topics.length - 3}
              </Badge>
            )}
            {interview.topics.length === 0 && (
              <Badge
                variant="outline"
                className="font-mono text-xs text-muted-foreground border-dashed"
              >
                No topics yet
              </Badge>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-auto">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono text-foreground">
                {interview.progress}%
              </span>
            </div>
            <div className="h-1.5 bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500"
                style={{ width: `${interview.progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </ViewTransitionLink>
  );
}
