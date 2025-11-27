'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import {
  ResponsiveDropdown,
  ResponsiveDropdownItem,
  ResponsiveDropdownSeparator,
} from '@/components/ui/responsive-dropdown';
import { ViewTransitionLink } from '@/components/transitions/view-transition-link';
import type { DashboardInterviewData } from '@/lib/actions/dashboard';

interface InterviewCardNewProps {
  interview: DashboardInterviewData;
  viewMode: 'grid' | 'list';
  onDelete: () => void;
  isDeleting?: boolean;
}

const statusConfig = {
  upcoming: {
    label: 'New',
    icon: Sparkles,
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  active: {
    label: 'In Progress',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
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
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );

  if (viewMode === 'list') {
    return (
      <ViewTransitionLink
        href={`/interview/${interview._id}`}
        viewTransitionName={`interview-card-${interview._id}`}
      >
        <div
          className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 p-4 flex items-center gap-4"
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
            <Briefcase className="w-5 h-5 text-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {interview.jobDetails.title}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${status.className}`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            {(interview.jobDetails.company || interview.jobDetails.programmingLanguage) && (
              <p className="text-sm text-muted-foreground truncate">
                {[interview.jobDetails.company, interview.jobDetails.programmingLanguage]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="hidden sm:flex items-center gap-4 mr-4">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Progress</p>
              <p className="text-sm font-mono font-medium text-foreground">
                {interview.progress}%
              </p>
            </div>
            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all"
                style={{ width: `${interview.progress}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block text-right mr-2">
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
            <ResponsiveDropdown
              title="Actions"
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              }
            >
              <ResponsiveDropdownItem icon={<Copy className="w-4 h-4" />}>
                Duplicate
              </ResponsiveDropdownItem>
              <ResponsiveDropdownItem icon={<Share2 className="w-4 h-4" />}>
                Share
              </ResponsiveDropdownItem>
              <ResponsiveDropdownSeparator />
              <ResponsiveDropdownItem
                variant="destructive"
                disabled={isDeleting}
                icon={<Trash2 className="w-4 h-4" />}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                Delete
              </ResponsiveDropdownItem>
            </ResponsiveDropdown>
          </div>
        </div>
      </ViewTransitionLink >
    );
  }

  return (
    <ViewTransitionLink
      href={`/interview/${interview._id}`}
      viewTransitionName={`interview-card-${interview._id}`}
    >
      <div
        className="group relative overflow-hidden rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 h-full flex flex-col"
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-500">
              <Briefcase className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] px-2.5 py-1 rounded-full ${status.className}`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <ResponsiveDropdown
                title="Actions"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full -mr-2"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                }
              >
                <ResponsiveDropdownItem icon={<Copy className="w-4 h-4" />}>
                  Duplicate
                </ResponsiveDropdownItem>
                <ResponsiveDropdownItem icon={<Share2 className="w-4 h-4" />}>
                  Share
                </ResponsiveDropdownItem>
                <ResponsiveDropdownSeparator />
                <ResponsiveDropdownItem
                  variant="destructive"
                  disabled={isDeleting}
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  Delete
                </ResponsiveDropdownItem>
              </ResponsiveDropdown>
            </div>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
            {interview.jobDetails.title}
          </h3>
          {(interview.jobDetails.company || interview.jobDetails.programmingLanguage) && (
            <p className="text-sm text-muted-foreground truncate">
              {[interview.jobDetails.company, interview.jobDetails.programmingLanguage]
                .filter(Boolean)
                .join(' • ')}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 pt-2 flex-1 flex flex-col">
          {/* Topics */}
          <div className="flex flex-wrap gap-1.5 mb-6 flex-1 content-start">
            {interview.topics.slice(0, 3).map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="rounded-md px-2 py-1 text-xs font-normal bg-secondary/50"
              >
                {topic}
              </Badge>
            ))}
            {interview.topics.length > 3 && (
              <Badge variant="secondary" className="rounded-md px-2 py-1 text-xs font-normal bg-secondary/50">
                +{interview.topics.length - 3}
              </Badge>
            )}
            {interview.topics.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No topics added
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-auto">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Progress</span>
              <span className="font-mono font-bold text-foreground">
                {interview.progress}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-500 ease-out"
                style={{ width: `${interview.progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <ArrowUpRight className="w-4 h-4 text-foreground" />
            </div>
          </div>
        </div>
      </div>
    </ViewTransitionLink>
  );
}
