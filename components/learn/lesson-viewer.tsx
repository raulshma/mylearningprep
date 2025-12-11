'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { Button } from '@/components/ui/button';
import { ExperienceSelector } from './experience-selector';
import { ProgressTracker } from './progress-tracker';
import { XPDisplay } from './xp-display';
import { BadgeDisplay, BadgeUnlockAnimation } from './badge-display';
import { useMDXComponents } from '@/mdx-components';
import { cn } from '@/lib/utils';
import type { ExperienceLevel, LessonProgress, UserGamification } from '@/lib/db/schemas/lesson-progress';

interface LessonViewerProps {
  lessonId: string;
  lessonTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  roadmapSlug: string;
  mdxSource: MDXRemoteSerializeResult;
  sections: string[];
  initialLevel: ExperienceLevel;
  initialProgress: LessonProgress | null;
  initialGamification: UserGamification | null;
  onLevelChange?: (level: ExperienceLevel) => Promise<MDXRemoteSerializeResult | null>;
  onSectionComplete?: (section: string) => Promise<void>;
  onLessonComplete?: () => Promise<void>;
}

export function LessonViewer({ 
  lessonId,
  lessonTitle,
  milestoneId,
  milestoneTitle,
  roadmapSlug,
  mdxSource: initialMdxSource,
  sections,
  initialLevel,
  initialProgress,
  initialGamification,
  onLevelChange,
  onSectionComplete,
  onLessonComplete,
}: LessonViewerProps) {
  const [level, setLevel] = useState<ExperienceLevel>(initialLevel);
  const [mdxSource, setMdxSource] = useState(initialMdxSource);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSections, setCompletedSections] = useState<string[]>(
    initialProgress?.sectionsCompleted.map(s => s.sectionId) || []
  );
  const [gamification, setGamification] = useState(initialGamification);
  const [newBadge, setNewBadge] = useState<{ id: string; earnedAt: Date } | null>(null);

  const components = useMDXComponents({
    // Override ProgressCheckpoint to track completion
    ProgressCheckpoint: ({ section }: { section: string }) => {
      const handleComplete = useCallback(async (sectionId: string) => {
        if (!completedSections.includes(sectionId)) {
          setCompletedSections(prev => [...prev, sectionId]);
          onSectionComplete?.(sectionId);
        }
      }, []);

      return (
        <ProgressCheckpoint 
          section={section} 
          onComplete={handleComplete}
        />
      );
    },
  });

  // Handle level change
  const handleLevelChange = async (newLevel: ExperienceLevel) => {
    if (newLevel === level) return;
    
    setIsLoading(true);
    try {
      const newSource = await onLevelChange?.(newLevel);
      if (newSource) {
        setMdxSource(newSource);
        setLevel(newLevel);
        // Reset section progress for new level
        setCompletedSections([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if lesson is complete
  const isLessonComplete = completedSections.length >= sections.length && sections.length > 0;
  const completedLevels = initialProgress?.experienceLevel 
    ? [initialProgress.experienceLevel] 
    : [];

  // Handle lesson completion
  const handleCompleteLesson = async () => {
    await onLessonComplete?.();
    // Could trigger badge check here
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Badge unlock animation */}
      <BadgeUnlockAnimation 
        badge={newBadge} 
        onComplete={() => setNewBadge(null)} 
      />

      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumb */}
        <Link
          href={`/roadmaps/${roadmapSlug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {milestoneTitle}
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
          {gamification && (
            <XPDisplay
              totalXp={gamification.totalXp}
              currentStreak={gamification.currentStreak}
              compact
            />
          )}
        </div>
      </div>

      {/* Gamification stats (optional expanded view) */}
      {gamification && gamification.badges.length > 0 && (
        <div className="mb-6">
          <BadgeDisplay 
            earnedBadges={gamification.badges} 
            showRecent={5}
            compact
          />
        </div>
      )}

      {/* Experience Level Selector */}
      <ExperienceSelector
        currentLevel={level}
        onLevelChange={handleLevelChange}
        completedLevels={completedLevels}
        disabled={isLoading}
      />

      {/* Progress Tracker */}
      <ProgressTracker
        sections={sections}
        completedSections={completedSections}
        currentSection={sections[completedSections.length]}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
            />
            <span>Loading {level} content...</span>
          </div>
        </div>
      )}

      {/* MDX Content */}
      {!isLoading && (
        <motion.article
          key={level}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="prose prose-lg dark:prose-invert max-w-none"
        >
          <MDXRemote {...mdxSource} components={components} />
        </motion.article>
      )}

      {/* Lesson completion */}
      {isLessonComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 p-6 rounded-2xl bg-linear-to-br from-green-500/10 to-primary/10 border border-green-500/30"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Lesson Complete! 🎉
              </h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve completed all sections at the {level} level.
              </p>
            </div>
            <Button onClick={handleCompleteLesson}>
              Claim Rewards
            </Button>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="flex justify-between">
          <Link href={`/roadmaps/${roadmapSlug}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Roadmap
            </Button>
          </Link>
          {/* Could add "Next Lesson" button here */}
        </div>
      </div>
    </div>
  );
}

// Re-export ProgressCheckpoint for use in MDX
import { ProgressCheckpoint } from './mdx-components/progress-checkpoint';
