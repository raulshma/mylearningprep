import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getLessonMetadata, getLessonContent, getNextLessonSuggestion, getAdjacentLessons, resolveLessonPath, getNextLessonNavigation } from '@/lib/actions/lessons';
import { LessonPageClient } from './lesson-page-client';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';
import { getUserGamificationAction } from '@/lib/actions/gamification';

// Force dynamic rendering to ensure fresh content
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface LearnObjectivePageProps {
  params: Promise<{
    slug: string;
    milestone: string;
    objective: string;
  }>;
  searchParams: Promise<{
    level?: string;
  }>;
}

export default async function LearnObjectivePage({ 
  params,
  searchParams,
}: LearnObjectivePageProps) {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }
  
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Decode URL-encoded objective
  const objectiveSlug = decodeURIComponent(resolvedParams.objective);
  const milestoneId = resolvedParams.milestone;
  const roadmapSlug = resolvedParams.slug;
  
  // Find the lesson path using proper resolution
  const lessonPath = await resolveLessonPath(milestoneId, objectiveSlug, roadmapSlug);
  if (!lessonPath) {
    notFound();
  }
  
  // Get lesson metadata
  const metadata = await getLessonMetadata(lessonPath);
  if (!metadata) {
    notFound();
  }
  
  // Determine initial experience level
  const initialLevel = (resolvedSearchParams.level as ExperienceLevel) || 'beginner';
  
  // Get serialized MDX for the initial level (cached for performance)
  const serializedMdx = await getLessonContent(lessonPath, initialLevel);
  if (!serializedMdx) {
    notFound();
  }
  
  // Get milestone title from roadmap data
  const milestoneTitle = milestoneId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Fetch user progress for this lesson
  const userGamification = await getUserGamificationAction();
  
  // Find completion record for this lesson (any level or specific? usually we want to know if *current* level is done, or any)
  // The client uses "completedSectionIds" to track progress.
  // We need to find if there's an existing completion or in-progress state.
  // Note: The current gamification schema only stores *completed* lessons.
  // It does NOT store partially completed lessons persistently in the DB (that's currently local-only).
  // However, if the lesson is marked "complete" in DB, we should reflect that.
  
  const completedLesson = userGamification?.completedLessons?.find(
    l => l.lessonId === lessonPath && l.experienceLevel === initialLevel
  );

  const initialCompletedSections = completedLesson?.sectionsCompleted.map(s => s.sectionId) || [];
  const initialTimeSpent = completedLesson?.timeSpentSeconds || 0;
  const isLessonCompleted = !!completedLesson;

  // Get next lesson suggestion based on completed lessons
  const nextLessonSuggestion = await getNextLessonSuggestion(
    lessonPath,
    initialLevel,
    userGamification?.completedLessons || []
  );

  // Get next lesson navigation based on roadmap structure (for navigation button)
  const nextLessonNavigation = await getNextLessonNavigation(
    lessonPath,
    milestoneId,
    roadmapSlug
  );

  // Get adjacent lessons for zen mode navigation
  const adjacentLessons = await getAdjacentLessons(lessonPath);

  return (
    <div className="container">
      <LessonPageClient
        lessonId={lessonPath}
        lessonTitle={metadata.title}
        milestoneId={milestoneId}
        milestoneTitle={milestoneTitle}
        roadmapSlug={resolvedParams.slug}
        sections={metadata.sections}
        initialLevel={initialLevel}
        initialMdxSource={serializedMdx}
        initialCompletedSections={initialCompletedSections}
        initialTimeSpent={initialTimeSpent}
        isLessonCompleted={isLessonCompleted}
        initialGamification={userGamification}
        nextLessonSuggestion={nextLessonSuggestion}
        adjacentLessons={adjacentLessons}
        nextLessonNavigation={nextLessonNavigation}
      />
    </div>
  );
}

export async function generateMetadata({ params }: LearnObjectivePageProps) {
  const resolvedParams = await params;
  const objectiveSlug = decodeURIComponent(resolvedParams.objective);
  const lessonPath = await resolveLessonPath(
    resolvedParams.milestone,
    objectiveSlug,
    resolvedParams.slug
  );
  
  const metadata = lessonPath ? await getLessonMetadata(lessonPath) : null;
  
  return {
    title: metadata?.title || 'Learn',
    description: metadata?.description || 'Interactive learning content',
  };
}
