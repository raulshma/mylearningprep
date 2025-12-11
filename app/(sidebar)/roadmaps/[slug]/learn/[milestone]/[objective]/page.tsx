import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import fs from 'fs/promises';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import { getLessonMetadata } from '@/lib/actions/lessons';
import { LessonPageClient } from './lesson-page-client';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';
import { getUserGamificationAction } from '@/lib/actions/gamification';

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

const CONTENT_DIR = path.join(process.cwd(), 'content', 'lessons');

async function getSerializedMdx(lessonPath: string, level: ExperienceLevel) {
  try {
    const mdxPath = path.join(CONTENT_DIR, lessonPath, `${level}.mdx`);
    const source = await fs.readFile(mdxPath, 'utf-8');
    
    const serialized = await serialize(source, {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    });
    
    return serialized;
  } catch (error) {
    console.error('Failed to serialize MDX:', error);
    return null;
  }
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
  
  // Find the lesson path
  const lessonPath = `${milestoneId}/${objectiveSlug}`;
  
  // Get lesson metadata
  const metadata = await getLessonMetadata(lessonPath);
  if (!metadata) {
    notFound();
  }
  
  // Determine initial experience level
  const initialLevel = (resolvedSearchParams.level as ExperienceLevel) || 'beginner';
  
  // Get serialized MDX for the initial level
  const serializedMdx = await getSerializedMdx(lessonPath, initialLevel);
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

  return (
    <div className="container py-8">
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
      />
    </div>
  );
}

export async function generateMetadata({ params }: LearnObjectivePageProps) {
  const resolvedParams = await params;
  const objectiveSlug = decodeURIComponent(resolvedParams.objective);
  const lessonPath = `${resolvedParams.milestone}/${objectiveSlug}`;
  
  const metadata = await getLessonMetadata(lessonPath);
  
  return {
    title: metadata?.title || 'Learn',
    description: metadata?.description || 'Interactive learning content',
  };
}
