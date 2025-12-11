import { notFound } from 'next/navigation';
import { getRoadmapWithProgress } from '@/lib/actions/roadmap';
import { RoadmapClient } from './roadmap-client';

interface RoadmapPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const { slug } = await params;
  const { roadmap, progress, lessonAvailability } = await getRoadmapWithProgress(slug);
  
  if (!roadmap) {
    notFound();
  }
  
  return (
    <div className="h-[calc(100vh-4rem)]">
      <RoadmapClient 
        initialRoadmap={roadmap} 
        initialProgress={progress} 
        initialLessonAvailability={lessonAvailability}
      />
    </div>
  );
}

export async function generateMetadata({ params }: RoadmapPageProps) {
  const { slug } = await params;
  const { roadmap } = await getRoadmapWithProgress(slug);
  
  if (!roadmap) {
    return { title: 'Roadmap Not Found' };
  }
  
  return {
    title: `${roadmap.title} | Learning Roadmap`,
    description: roadmap.description,
  };
}
