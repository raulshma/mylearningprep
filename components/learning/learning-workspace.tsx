'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ArrowLeft,
  Target,
  Brain,
  Clock,
  XCircle,
  Loader2,
  ChevronRight,
  Code,
  Bug,
  FileText,
  HelpCircle,
  BarChart3,
  History,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  submitReflection,
  getLearningInsights,
} from '@/lib/actions/learning-path';
import { useActivityStream } from '@/hooks/use-activity-stream';
import type {
  LearningPath,
  Activity,
  ActivityContent,
  LearningTopic,
  Reflection,
} from '@/lib/db/schemas/learning-path';
import type { LearningInsights } from '@/lib/services/insight-generator';
import { MCQActivityView } from './activity-views/mcq-activity';
import { CodingChallengeView } from './activity-views/coding-challenge';
import { DebuggingTaskView } from './activity-views/debugging-task';
import { ConceptExplanationView } from './activity-views/concept-explanation';
import { ReflectionForm } from './reflection-form';
import { TimelineView } from './timeline-view';
import { InsightsDashboard } from './insights-dashboard';

interface LearningWorkspaceProps {
  learningPath: LearningPath;
}

const activityTypeIcons: Record<string, typeof BookOpen> = {
  mcq: HelpCircle,
  'coding-challenge': Code,
  'debugging-task': Bug,
  'concept-explanation': FileText,
  'real-world-assignment': Target,
  'mini-case-study': Brain,
};

const activityTypeLabels: Record<string, string> = {
  mcq: 'Multiple Choice',
  'coding-challenge': 'Coding Challenge',
  'debugging-task': 'Debugging Task',
  'concept-explanation': 'Concept Explanation',
  'real-world-assignment': 'Real-World Assignment',
  'mini-case-study': 'Mini Case Study',
};

export function LearningWorkspace({ learningPath: initialPath }: LearningWorkspaceProps) {
  const [learningPath, setLearningPath] = useState(initialPath);
  const [showReflection, setShowReflection] = useState(false);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [startTime, setStartTime] = useState(Date.now());
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [activeTab, setActiveTab] = useState('activity');

  const currentTopic = learningPath.topics.find(
    (t) => t.id === learningPath.currentTopicId
  );

  // Use the activity stream hook for streaming activity generation
  // Requirements: 1.1, 1.2, 4.2, 5.2
  const {
    status: streamStatus,
    error: streamError,
    activity: streamedActivity,
    streamingContent,
    activityType,
    startStream,
    cancelStream,
  } = useActivityStream({
    learningPathId: learningPath._id,
    onComplete: () => {
      // Reset start time when activity is ready
      setStartTime(Date.now());
    },
    onError: (error) => {
      console.error('Activity stream error:', error);
    },
  });

  // Determine current activity - prefer streamed activity, fall back to persisted currentActivity
  const currentActivity = streamedActivity || learningPath.currentActivity;
  const isLoadingActivity = streamStatus === 'loading' || streamStatus === 'streaming';
  const activityError = streamError;

  // Load initial activity via streaming if no currentActivity exists
  const loadActivity = useCallback(async (regenerate = false) => {
    setShowReflection(false);
    setUserAnswer('');
    await startStream({ regenerate });
  }, [startStream]);

  // Load insights
  const loadInsights = useCallback(async () => {
    try {
      const result = await getLearningInsights(learningPath._id);
      if (result.success) {
        setInsights(result.data);
      }
    } catch {
      // Silently fail for insights
    }
  }, [learningPath._id]);

  // Track if we've already attempted to load activity and insights
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [hasLoadedInsights, setHasLoadedInsights] = useState(false);

  // Load activity on mount if no currentActivity exists
  useEffect(() => {
    // Only start streaming if there's no existing activity, we're idle, and haven't attempted yet
    if (!learningPath.currentActivity && streamStatus === 'idle' && !hasAttemptedLoad) {
      setHasAttemptedLoad(true);
      loadActivity();
    }
  }, [learningPath.currentActivity, streamStatus, hasAttemptedLoad, loadActivity]);

  // Load insights once on mount
  useEffect(() => {
    if (!hasLoadedInsights) {
      setHasLoadedInsights(true);
      loadInsights();
    }
  }, [hasLoadedInsights, loadInsights]);

  const handleActivityComplete = (answer: string) => {
    setUserAnswer(answer);
    setShowReflection(true);
  };

  // Handle regenerate button click - force new activity generation
  // Requirements: 4.4
  const handleRegenerate = useCallback(() => {
    loadActivity(true);
  }, [loadActivity]);

  const handleReflectionSubmit = async (reflection: Omit<Reflection, 'timeTakenSeconds'>) => {
    if (!currentActivity) return;

    setIsSubmittingReflection(true);
    const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await submitReflection(learningPath._id, currentActivity.id, {
        ...reflection,
        userAnswer,
        timeTakenSeconds,
      });

      if (result.success) {
        // Update local state with new timeline entry and clear currentActivity
        setLearningPath((prev) => ({
          ...prev,
          timeline: [...prev.timeline, result.data],
          overallElo: result.data.eloAfter,
          currentActivity: null, // Clear the current activity after submission
        }));

        // Load next activity via streaming
        await loadActivity();
        await loadInsights();
      } else {
        console.error('Reflection submission failed:', result.error.message);
      }
    } catch {
      console.error('Failed to submit reflection');
    } finally {
      setIsSubmittingReflection(false);
    }
  };

  const ActivityIcon = currentActivity
    ? activityTypeIcons[currentActivity.type] || BookOpen
    : BookOpen;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                </Button>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-mono text-lg text-foreground line-clamp-1">
                      {learningPath.goal}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>ELO: {Math.round(learningPath.overallElo)}</span>
                      <span>•</span>
                      <span>Difficulty: {learningPath.currentDifficulty}/10</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono">{learningPath.timeline.length} activities</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-72 border-r border-border bg-sidebar/50 p-6 hidden lg:block min-h-[calc(100vh-73px)]">
            {/* Topics */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-mono text-foreground">Topics</span>
              </div>
              <div className="space-y-2">
                {learningPath.topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    isActive={topic.id === learningPath.currentTopicId}
                  />
                ))}
                {learningPath.topics.length === 0 && (
                  <p className="text-sm text-muted-foreground">No topics yet</p>
                )}
              </div>
            </div>

            {/* Skill Scores */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-mono text-foreground">Skills</span>
              </div>
              <div className="space-y-3">
                {Object.entries(learningPath.skillScores).map(([cluster, score]) => (
                  <div key={cluster} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">
                        {cluster.replace('-', ' ')}
                      </span>
                      <span className="font-mono">{Math.round(score)}</span>
                    </div>
                    <Progress value={Math.min((score / 2000) * 100, 100)} className="h-1.5" />
                  </div>
                ))}
                {Object.keys(learningPath.skillScores).length === 0 && (
                  <p className="text-sm text-muted-foreground">Complete activities to see skills</p>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 lg:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
              <TabsList className="mb-6">
                <TabsTrigger value="activity" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <History className="w-4 h-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="insights" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Insights
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                {/* Current Topic Header */}
                {currentTopic && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {currentTopic.skillCluster.replace('-', ' ')}
                        </Badge>
                        <h2 className="text-2xl font-mono text-foreground mb-1">
                          {currentTopic.title}
                        </h2>
                        <p className="text-muted-foreground">{currentTopic.description}</p>
                      </div>
                      {/* Regenerate button - Requirements: 4.4 */}
                      {currentActivity && !showReflection && !isLoadingActivity && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerate}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          New Activity
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Activity Content */}
                <AnimatePresence mode="wait">
                  {streamStatus === 'streaming' && streamingContent ? (
                    <StreamingActivityCard
                      content={streamingContent}
                      activityType={activityType}
                    />
                  ) : isLoadingActivity ? (
                    <ActivityLoadingSkeleton />
                  ) : activityError ? (
                    <ActivityError error={activityError} onRetry={() => loadActivity()} />
                  ) : currentActivity && !showReflection ? (
                    <ActivityCard
                      activity={currentActivity}
                      onComplete={handleActivityComplete}
                      ActivityIcon={ActivityIcon}
                    />
                  ) : showReflection && currentActivity ? (
                    <ReflectionForm
                      activity={currentActivity}
                      onSubmit={handleReflectionSubmit}
                      isSubmitting={isSubmittingReflection}
                    />
                  ) : null}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="timeline">
                <TimelineView
                  timeline={learningPath.timeline}
                  pathId={learningPath._id}
                />
              </TabsContent>

              <TabsContent value="insights">
                <InsightsDashboard
                  insights={insights}
                  learningPath={learningPath}
                />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}


// Topic Card Component
function TopicCard({ topic, isActive }: { topic: LearningTopic; isActive: boolean }) {
  return (
    <div
      className={`p-3 border transition-colors ${
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card/50 hover:border-primary/30'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-mono text-foreground line-clamp-1">{topic.title}</span>
        {isActive && <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{topic.skillCluster.replace('-', ' ')}</span>
        <span>•</span>
        <span>Lvl {topic.difficulty}</span>
      </div>
    </div>
  );
}

// Activity Card Component
function ActivityCard({
  activity,
  onComplete,
  ActivityIcon,
}: {
  activity: Activity;
  onComplete: (answer: string, isCorrect?: boolean) => void;
  ActivityIcon: typeof BookOpen;
}) {
  return (
    <motion.div
      key={activity.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="border border-border bg-card/80 backdrop-blur-sm"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-mono text-foreground">
                {activityTypeLabels[activity.type] || activity.type}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  Difficulty {activity.difficulty}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Take your time</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <ActivityContentView content={activity.content} onComplete={onComplete} />
      </div>
    </motion.div>
  );
}

// Activity Content View - renders the appropriate view based on activity type
function ActivityContentView({
  content,
  onComplete,
}: {
  content: ActivityContent;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}) {
  switch (content.type) {
    case 'mcq':
      return <MCQActivityView content={content} onComplete={onComplete} />;
    case 'coding-challenge':
      return <CodingChallengeView content={content} onComplete={onComplete} />;
    case 'debugging-task':
      return <DebuggingTaskView content={content} onComplete={onComplete} />;
    case 'concept-explanation':
      return <ConceptExplanationView content={content} onComplete={onComplete} />;
    default:
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Unknown activity type</p>
          <Button onClick={() => onComplete('', false)} className="mt-4">
            Continue
          </Button>
        </div>
      );
  }
}

// Loading Skeleton
function ActivityLoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border border-border bg-card/80 backdrop-blur-sm"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-secondary animate-pulse" />
            <div className="h-4 w-24 bg-secondary animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="h-6 w-full bg-secondary animate-pulse" />
        <div className="h-4 w-3/4 bg-secondary animate-pulse" />
        <div className="h-4 w-full bg-secondary animate-pulse" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
      <div className="p-6 border-t border-border flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    </motion.div>
  );
}

// Error State
function ActivityError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border border-destructive/20 bg-destructive/5 p-8 text-center"
    >
      <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
      <h3 className="font-mono text-lg text-foreground mb-2">Failed to Load Activity</h3>
      <p className="text-muted-foreground mb-6">{error}</p>
      <Button onClick={onRetry}>
        <Loader2 className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </motion.div>
  );
}

// Streaming Activity Card - displays content progressively during streaming
// Requirements: 1.1, 1.2
function StreamingActivityCard({
  content,
  activityType,
}: {
  content: unknown;
  activityType: string | null;
}) {
  const ActivityIcon = activityType ? activityTypeIcons[activityType] || BookOpen : BookOpen;
  const activityLabel = activityType ? activityTypeLabels[activityType] || activityType : 'Activity';

  // Type guard for content with question property
  const hasQuestion = (c: unknown): c is { question?: string } =>
    typeof c === 'object' && c !== null && 'question' in c;
  
  // Type guard for content with options property
  const hasOptions = (c: unknown): c is { options?: string[] } =>
    typeof c === 'object' && c !== null && 'options' in c;

  // Type guard for content with problemDescription property
  const hasProblemDescription = (c: unknown): c is { problemDescription?: string } =>
    typeof c === 'object' && c !== null && 'problemDescription' in c;

  // Type guard for content with content property (concept explanation)
  const hasContent = (c: unknown): c is { content?: string } =>
    typeof c === 'object' && c !== null && 'content' in c;

  // Type guard for content with buggyCode property
  const hasBuggyCode = (c: unknown): c is { buggyCode?: string } =>
    typeof c === 'object' && c !== null && 'buggyCode' in c;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="border border-border bg-card/80 backdrop-blur-sm"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-mono text-foreground">{activityLabel}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  Generating...
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Streaming</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Display question for MCQ */}
        {hasQuestion(content) && content.question && (
          <div className="space-y-2">
            <p className="text-foreground font-medium">{content.question}</p>
          </div>
        )}

        {/* Display options for MCQ */}
        {hasOptions(content) && content.options && content.options.length > 0 && (
          <div className="space-y-2 mt-4">
            {content.options.map((option, index) => (
              <div
                key={index}
                className="p-3 border border-border bg-secondary/20 text-muted-foreground"
              >
                {option || <span className="animate-pulse">Loading option...</span>}
              </div>
            ))}
          </div>
        )}

        {/* Display problem description for coding challenge */}
        {hasProblemDescription(content) && content.problemDescription && (
          <div className="space-y-2">
            <p className="text-foreground">{content.problemDescription}</p>
          </div>
        )}

        {/* Display content for concept explanation */}
        {hasContent(content) && content.content && (
          <div className="space-y-2">
            <p className="text-foreground whitespace-pre-wrap">{content.content}</p>
          </div>
        )}

        {/* Display buggy code for debugging task */}
        {hasBuggyCode(content) && content.buggyCode && (
          <div className="space-y-2">
            <pre className="p-4 bg-secondary/30 border border-border overflow-x-auto text-sm font-mono">
              {content.buggyCode}
            </pre>
          </div>
        )}

        {/* Show loading indicator if no content yet */}
        {!hasQuestion(content) &&
          !hasProblemDescription(content) &&
          !hasContent(content) &&
          !hasBuggyCode(content) && (
            <div className="space-y-4">
              <div className="h-6 w-full bg-secondary animate-pulse" />
              <div className="h-4 w-3/4 bg-secondary animate-pulse" />
              <div className="h-4 w-full bg-secondary animate-pulse" />
            </div>
          )}
      </div>

      <div className="p-6 border-t border-border flex justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating activity content...</span>
        </div>
      </div>
    </motion.div>
  );
}
