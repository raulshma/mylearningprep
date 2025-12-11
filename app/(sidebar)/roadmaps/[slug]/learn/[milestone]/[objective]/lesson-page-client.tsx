'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { Button } from '@/components/ui/button';
import { ExperienceSelector } from '@/components/learn/experience-selector';
import { ProgressTracker } from '@/components/learn/progress-tracker';
import { XPDisplay } from '@/components/learn/xp-display';
import { useMDXComponents } from '@/mdx-components';
import { 
  ProgressProvider, 
  useProgress,
  getTotalTimeSpent,
  formatTimeSpent,
  SectionProgress, // Added import
} from '@/lib/hooks/use-lesson-progress';
import { completeLessonAction, resetLessonAction } from '@/lib/actions/gamification';
import { toast } from 'sonner';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';
import { RefreshCw } from 'lucide-react'; // Import Icon
import { ProgressCheckpoint } from '@/components/learn/mdx-components/progress-checkpoint';

import type { UserGamification } from '@/lib/db/schemas/user';

interface LessonPageClientProps {
  lessonId: string;
  lessonTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  roadmapSlug: string;
  sections: string[];
  initialLevel: ExperienceLevel;
  initialMdxSource: MDXRemoteSerializeResult;
  initialCompletedSections?: string[];
  initialTimeSpent?: number;
  isLessonCompleted?: boolean;
  initialGamification?: UserGamification | null;
}

// Inner component that uses the progress context
function LessonContent({
  lessonId,
  lessonTitle,
  milestoneId,
  milestoneTitle,
  roadmapSlug,
  sections,
  initialLevel,
  initialMdxSource,
  initialCompletedSections = [],
  initialTimeSpent = 0,
  isLessonCompleted = false,
  initialGamification = null,
}: LessonPageClientProps) {
  const [level, setLevel] = useState<ExperienceLevel>(initialLevel);
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult>(initialMdxSource);
  const [isLoading, setIsLoading] = useState(false);
  const [gamification, setGamification] = useState<UserGamification | null>(initialGamification);
  const [hasClaimedReward, setHasClaimedReward] = useState(isLessonCompleted);
  
  // Get progress from context
  const { 
    completedSectionIds, 
    currentSection, 
    isComplete, 
    markSectionComplete,
    progress,
    getProgressPercentage,
    resetProgress,
  } = useProgress();

  // Use actual user XP from gamification data
  const totalXp = gamification?.totalXp ?? 0;
  const currentStreak = gamification?.currentStreak ?? 0;

  // Get base MDX components and enhance with progress tracking
  const baseMdxComponents = useMDXComponents({});
  
  const mdxComponents = useMemo(() => ({
    ...baseMdxComponents,
    // Override ProgressCheckpoint to integrate with our progress system
    ProgressCheckpoint: ({ section, xpReward = 10 }: { section: string; xpReward?: number }) => {
      const isCompleted = completedSectionIds.includes(section);
      
      return (
        <ProgressCheckpoint
          section={section}
          isCompleted={isCompleted}
          xpReward={xpReward}
          onComplete={(sectionId: string) => {
            markSectionComplete(sectionId);
          }}
        />
      );
    },
  }), [baseMdxComponents, completedSectionIds, markSectionComplete]);

  // Handle level change - fetch new content via API
  const handleLevelChange = useCallback(async (newLevel: ExperienceLevel) => {
    if (newLevel === level || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/lessons/content?path=${encodeURIComponent(lessonId)}&level=${newLevel}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      
      const data = await response.json();
      
      // Serialize the MDX on the client side
      const { serialize } = await import('next-mdx-remote/serialize');
      const remarkGfm = (await import('remark-gfm')).default;
      
      const serialized = await serialize(data.source, {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      });
      
      setMdxSource(serialized);
      setLevel(newLevel);
      resetProgress(); // Reset local progress for new level
      
      // Check if this level was already completed
      const isLevelCompleted = gamification?.completedLessons?.some(
        l => l.lessonId === lessonId && l.experienceLevel === newLevel
      ) ?? false;
      setHasClaimedReward(isLevelCompleted);
      
      // Update URL without page refresh
      window.history.replaceState(
        null,
        '',
        `/roadmaps/${roadmapSlug}/learn/${milestoneId}/${lessonId.split('/')[1]}?level=${newLevel}`
      );
    } catch (error) {
      console.error('Failed to load new content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [level, lessonId, roadmapSlug, milestoneId, isLoading, resetProgress, gamification]);

  // Handle lesson completion
  const handleClaimRewards = useCallback(async () => {
    if (!progress || hasClaimedReward) return;

    const levelXp = level === 'beginner' ? 50 : level === 'intermediate' ? 100 : 200;
    
    // Calculate total XP (sections + completion bonus)
    // Sections are worth 10 XP each as per gamification logic
    const sectionsXp = completedSectionIds.length * 10;
    const totalEarnedXp = sectionsXp + levelXp;
    
    const timeSpent = getTotalTimeSpent(progress);

    try {
      const result = await completeLessonAction(
        lessonId, 
        level, 
        totalEarnedXp,
        completedSectionIds,
        timeSpent
      );

      if (result.success) {
        // Update gamification state with the returned data
        if (result.data) {
          setGamification(result.data);
        }
        setHasClaimedReward(true);
        toast.success(`You earned ${totalEarnedXp} XP!`);
      } else {
        toast.error('Failed to save progress');
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      toast.error('Something went wrong');
    }
  }, [level, lessonId, completedSectionIds, progress, hasClaimedReward]);

  // Handle lesson reset
  const handleResetLesson = useCallback(async () => {
    try {
      const result = await resetLessonAction(lessonId);
      
      if (result.success) {
        resetProgress();
        // Update gamification state with the returned data
        if (result.data) {
          setGamification(result.data);
        }
        setHasClaimedReward(false);
        toast.success('Lesson progress reset and XP removed');
      } else {
        toast.error('Failed to reset lesson');
      }
    } catch (error) {
      console.error('Failed to reset lesson:', error);
      toast.error('Something went wrong');
    }
  }, [lessonId, resetProgress]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumb */}
        <Link
          href={`/roadmaps/${roadmapSlug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Roadmap
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {milestoneTitle}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {lessonTitle}
            </h1>
          </div>

          {/* XP Display */}
          <XPDisplay totalXp={totalXp} currentStreak={currentStreak} compact />
        </div>
      </div>

      {/* Experience Level Selector */}
      <ExperienceSelector
        currentLevel={level}
        onLevelChange={handleLevelChange}
        completedLevels={[]}
        disabled={isLoading}
      />

      {/* Progress Tracker */}
      <ProgressTracker
        sections={sections}
        completedSections={completedSectionIds}
        currentSection={currentSection ?? undefined}
      />

      {/* Loading state */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading {level} content...</p>
            </div>
          </motion.div>
        ) : (
          <motion.article
            key={level}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="prose prose-lg dark:prose-invert max-w-none"
          >
            <MDXRemote {...mdxSource} components={mdxComponents} />
          </motion.article>
        )}
      </AnimatePresence>

      {/* Lesson completion banner */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-12 p-6 rounded-2xl bg-green-500/10 border border-green-500/30"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {hasClaimedReward ? 'Lesson Completed!' : 'Lesson Complete! 🎉'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasClaimedReward 
                    ? `You've already completed this lesson at the ${level} level.`
                    : `You completed all ${sections.length} sections at the ${level} level${progress ? ` in ${formatTimeSpent(getTotalTimeSpent(progress))}` : ''}.`
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleResetLesson} variant="outline" size="sm" className="text-muted-foreground hover:text-destructive">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                {!hasClaimedReward && (
                  <Button onClick={handleClaimRewards}>
                    Claim Rewards
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="flex justify-between">
          <Link href={`/roadmaps/${roadmapSlug}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Roadmap
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Wrapper component that provides the progress context
export function LessonPageClient(props: LessonPageClientProps) {
  const handleSectionComplete = useCallback((sectionId: string) => {
    // Could send to analytics, save to DB, etc.
    console.log(`Section completed: ${sectionId}`);
  }, []);

  const handleLessonComplete = useCallback(() => {
    // Could save to DB, award XP, etc.
    console.log('Lesson completed!');
  }, []);

  // Check if the initial level was already completed
  const isInitialLevelCompleted = props.initialGamification?.completedLessons?.some(
    l => l.lessonId === props.lessonId && l.experienceLevel === props.initialLevel
  ) ?? false;

  // Get completed sections for the initial level from gamification data
  const completedLessonData = props.initialGamification?.completedLessons?.find(
    l => l.lessonId === props.lessonId && l.experienceLevel === props.initialLevel
  );
  
  const initialCompletedSections = completedLessonData?.sectionsCompleted?.map(s => s.sectionId) 
    ?? props.initialCompletedSections 
    ?? [];

  return (
    <ProgressProvider
      lessonId={props.lessonId}
      level={props.initialLevel}
      sections={props.sections}
      onSectionComplete={handleSectionComplete}
      onLessonComplete={handleLessonComplete}
      persistToStorage={true}
      initialState={{
        completedSections: initialCompletedSections,
        timeSpent: completedLessonData?.timeSpentSeconds ?? props.initialTimeSpent ?? 0,
        isCompleted: isInitialLevelCompleted
      }}
    >
      <LessonContent {...props} />
    </ProgressProvider>
  );
}
