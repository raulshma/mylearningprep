'use client';

import { motion } from 'framer-motion';
import { 
  Clock, 
  Target, 
  BookOpen, 
  Star, 
  Play, 
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RoadmapNode } from '@/lib/db/schemas/roadmap';
import type { NodeProgress, NodeProgressStatus } from '@/lib/db/schemas/user-roadmap-progress';

interface RoadmapTopicDetailProps {
  node: RoadmapNode;
  nodeProgress: NodeProgress | null;
  onStartLearning: () => void;
  onMarkComplete: () => void;
  onClose: () => void;
}

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Beginner', color: 'text-green-500' },
  2: { label: 'Beginner', color: 'text-green-500' },
  3: { label: 'Easy', color: 'text-green-500' },
  4: { label: 'Intermediate', color: 'text-yellow-500' },
  5: { label: 'Intermediate', color: 'text-yellow-500' },
  6: { label: 'Advanced', color: 'text-orange-500' },
  7: { label: 'Advanced', color: 'text-orange-500' },
  8: { label: 'Expert', color: 'text-red-500' },
  9: { label: 'Expert', color: 'text-red-500' },
  10: { label: 'Master', color: 'text-purple-500' },
};

const resourceIcons: Record<string, typeof BookOpen> = {
  documentation: BookOpen,
  article: BookOpen,
  video: Play,
  practice: Target,
  book: BookOpen,
};

export function RoadmapTopicDetail({
  node,
  nodeProgress,
  onStartLearning,
  onMarkComplete,
  onClose,
}: RoadmapTopicDetailProps) {
  const status = nodeProgress?.status || 'available';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in-progress';
  const difficulty = node.difficulty ? difficultyLabels[node.difficulty] : null;
  
  // Calculate progress percentage for in-progress nodes
  const progressPercent = nodeProgress && nodeProgress.totalQuestions > 0
    ? Math.round((nodeProgress.correctAnswers / nodeProgress.totalQuestions) * 100)
    : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col bg-card rounded-2xl border border-border"
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {node.subRoadmapSlug && (
                <Star className="w-4 h-4 text-amber-500" fill="currentColor" />
              )}
              <Badge variant={node.type === 'milestone' ? 'default' : 'secondary'}>
                {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
              </Badge>
              {difficulty && (
                <span className={cn('text-xs font-medium', difficulty.color)}>
                  {difficulty.label}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">{node.title}</h2>
            {node.description && (
              <p className="text-sm text-muted-foreground mt-2">{node.description}</p>
            )}
          </div>
          
          {isCompleted && (
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          )}
        </div>
        
        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{node.estimatedMinutes} min</span>
          </div>
          {node.learningObjectives.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>{node.learningObjectives.length} objectives</span>
            </div>
          )}
          {node.resources.length > 0 && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>{node.resources.length} resources</span>
            </div>
          )}
        </div>
        
        {/* Progress bar for in-progress */}
        {isInProgress && nodeProgress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>{nodeProgress.activitiesCompleted} activities</span>
              <span>{nodeProgress.timeSpentMinutes} min spent</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Learning Objectives */}
        {node.learningObjectives.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Learning Objectives
            </h3>
            <ul className="space-y-2">
              {node.learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Resources */}
        {node.resources.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Resources
            </h3>
            <div className="space-y-2">
              {node.resources.map((resource, index) => {
                const Icon = resourceIcons[resource.type] || BookOpen;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {resource.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {resource.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {resource.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Sub-roadmap indicator */}
        {node.subRoadmapSlug && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Star className="w-4 h-4" fill="currentColor" />
              <span className="text-sm font-medium">This topic has a detailed sub-roadmap</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Start Learning&quot; to explore the in-depth learning path for this topic.
            </p>
          </div>
        )}
        
        {/* Tags */}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {node.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex flex-row gap-2">
          {!isCompleted && (
            <>
              <Button
                onClick={onStartLearning}
                size="default"
                className="flex-1"
              >
                <Play className="w-4 h-4 shrink-0" />
                <span className="ml-2">{isInProgress ? 'Continue' : 'Start'}</span>
              </Button>
              {isInProgress && (
                <Button
                  onClick={onMarkComplete}
                  variant="outline"
                  size="default"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="ml-2 hidden sm:inline">Done</span>
                </Button>
              )}
            </>
          )}
          {isCompleted && (
            <Button
              onClick={onStartLearning}
              variant="outline"
              size="default"
              className="flex-1"
            >
              <Play className="w-4 h-4 shrink-0" />
              <span className="ml-2">Review</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
