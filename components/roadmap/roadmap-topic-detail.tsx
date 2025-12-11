'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Clock, 
  Target, 
  BookOpen, 
  Star, 
  Play, 
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Lock,
  CircleDashed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getObjectivesWithLessons, type ObjectiveLessonInfo } from '@/lib/actions/lessons';
import { objectiveToLessonSlug } from '@/lib/utils/lesson-utils';
import type { RoadmapNode } from '@/lib/db/schemas/roadmap';
import type { NodeProgress, NodeProgressStatus } from '@/lib/db/schemas/user-roadmap-progress';

interface RoadmapTopicDetailProps {
  node: RoadmapNode;
  nodeProgress: NodeProgress | null;
  roadmapSlug: string;
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

// Storage key for objective progress
const getObjectiveProgressKey = (nodeId: string, objective: string) => 
  `objective_progress_${nodeId}_${objectiveToLessonSlug(objective)}`;

interface ObjectiveProgress {
  completedAt?: string;
  lastLevel?: string;
  xpEarned?: number;
}

export function RoadmapTopicDetail({
  node,
  nodeProgress,
  roadmapSlug,
  onStartLearning,
  onMarkComplete,
  onClose,
}: RoadmapTopicDetailProps) {
  const status = nodeProgress?.status || 'available';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in-progress';
  const difficulty = node.difficulty ? difficultyLabels[node.difficulty] : null;
  
  // State for objective lesson info
  const [objectivesInfo, setObjectivesInfo] = useState<ObjectiveLessonInfo[]>([]);
  const [objectiveProgress, setObjectiveProgress] = useState<Record<string, ObjectiveProgress>>({});
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(false);
  
  // Calculate progress percentage for in-progress nodes
  const progressPercent = nodeProgress && nodeProgress.totalQuestions > 0
    ? Math.round((nodeProgress.correctAnswers / nodeProgress.totalQuestions) * 100)
    : 0;
  
  // Fetch objective lesson info when node changes
  useEffect(() => {
    async function fetchObjectives() {
      if (node.learningObjectives.length === 0) return;
      
      setIsLoadingObjectives(true);
      try {
        const info = await getObjectivesWithLessons(node.id, node.learningObjectives);
        setObjectivesInfo(info);
        
        // Load progress from localStorage
        const progress: Record<string, ObjectiveProgress> = {};
        for (const obj of node.learningObjectives) {
          const key = getObjectiveProgressKey(node.id, obj);
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              progress[obj] = JSON.parse(stored);
            } catch {
              // Ignore parse errors
            }
          }
        }
        setObjectiveProgress(progress);
      } catch (error) {
        console.error('Failed to fetch objective info:', error);
      } finally {
        setIsLoadingObjectives(false);
      }
    }
    
    fetchObjectives();
  }, [node.id, node.learningObjectives]);
  
  // Count available lessons
  const availableLessons = objectivesInfo.filter(o => o.hasLesson).length;
  const completedObjectives = Object.keys(objectiveProgress).filter(
    obj => objectiveProgress[obj]?.completedAt
  ).length;
  
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
              {availableLessons > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {availableLessons} lessons
                </Badge>
              )}
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
      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        {/* Learning Objectives with Lesson Info */}
        {node.learningObjectives.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Learning Objectives
              {completedObjectives > 0 && (
                <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                  {completedObjectives}/{node.learningObjectives.length} complete
                </Badge>
              )}
            </h3>
            
            {isLoadingObjectives ? (
              <div className="space-y-2">
                {node.learningObjectives.map((_, index) => (
                  <div key={index} className="h-14 rounded-xl bg-secondary/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {node.learningObjectives.map((objective, index) => {
                  const info = objectivesInfo.find(o => o.objective === objective);
                  const progress = objectiveProgress[objective];
                  const hasLesson = info?.hasLesson;
                  const isObjectiveComplete = !!progress?.completedAt;
                  const slug = objectiveToLessonSlug(objective);
                  
                  return (
                    <li 
                      key={index} 
                      className={cn(
                        "rounded-xl border transition-all",
                        hasLesson 
                          ? "bg-secondary/30 border-border hover:border-primary/30 hover:bg-secondary/50" 
                          : "bg-muted/20 border-transparent"
                      )}
                    >
                      {hasLesson ? (
                        <Link
                          href={`/roadmaps/${roadmapSlug}/learn/${node.id}/${slug}`}
                          className="block p-3"
                        >
                          <div className="flex items-start gap-3">
                            {/* Status icon */}
                            <div className={cn(
                              "p-1.5 rounded-lg shrink-0 mt-0.5",
                              isObjectiveComplete 
                                ? "bg-green-500/10" 
                                : "bg-primary/10"
                            )}>
                              {isObjectiveComplete ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Play className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-sm font-medium",
                                  isObjectiveComplete ? "text-muted-foreground" : "text-foreground"
                                )}>
                                  {objective}
                                </span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                              </div>
                              
                              {/* XP and time info */}
                              <div className="flex items-center gap-3 mt-1">
                                {info?.xpRewards && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-500">
                                    <Sparkles className="w-3 h-3" />
                                    <span>{info.xpRewards.beginner}-{info.xpRewards.advanced} XP</span>
                                  </div>
                                )}
                                {info?.estimatedMinutes && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>{info.estimatedMinutes.beginner}-{info.estimatedMinutes.advanced} min</span>
                                  </div>
                                )}
                                {isObjectiveComplete && progress?.xpEarned && (
                                  <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                                    +{progress.xpEarned} XP earned
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="p-3 flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-muted/50 shrink-0 mt-0.5">
                            <CircleDashed className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-muted-foreground">{objective}</span>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/70">
                              <Lock className="w-3 h-3" />
                              <span>No lesson available yet</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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
