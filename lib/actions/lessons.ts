'use server';

import fs from 'fs/promises';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import { unstable_cache } from 'next/cache';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';
import type { LearningObjective } from '@/lib/db/schemas/roadmap';
import { objectiveToLessonSlug, getObjectiveTitle, getObjectiveLessonId } from '@/lib/utils/lesson-utils';
import { resolvePathWithinRoot } from '@/lib/utils/safe-path';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'lessons');

/**
 * Get lesson metadata from JSON file
 */
export async function getLessonMetadata(lessonPath: string) {
  try {
    const metadataPath = await resolvePathWithinRoot(CONTENT_DIR, lessonPath, 'metadata.json');
    if (!metadataPath) {
      return null;
    }
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content) as {
      id: string;
      title: string;
      description: string;
      milestone: string;
      order: number;
      sections: string[];
      levels: {
        beginner: { estimatedMinutes: number; xpReward: number };
        intermediate: { estimatedMinutes: number; xpReward: number };
        advanced: { estimatedMinutes: number; xpReward: number };
      };
      prerequisites: string[];
      tags: string[];
    };
  } catch (error) {
    console.error('Failed to load lesson metadata:', error);
    return null;
  }
}

/**
 * Get MDX content for a specific lesson and experience level
 * Cached for optimal performance - MDX compilation is expensive
 */
export const getLessonContent = unstable_cache(
  async (lessonPath: string, level: ExperienceLevel) => {
    try {
      // Validate the experience level to prevent injection in filename
      const validLevels: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
      if (!validLevels.includes(level)) {
        console.error('Invalid experience level:', level);
        return null;
      }
      
      const mdxPath = await resolvePathWithinRoot(CONTENT_DIR, lessonPath, `${level}.mdx`);
      if (!mdxPath) {
        return null;
      }
      const source = await fs.readFile(mdxPath, 'utf-8');
      
      const mdxSource = await serialize(source, {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug],
        },
      });
      
      return mdxSource;
    } catch (error) {
      console.error('Failed to load lesson content:', error);
      return null;
    }
  },
  ['lesson-content'],
  {
    revalidate: 3600, // Cache for 1 hour in production
    tags: ['lessons'],
  }
);

/**
 * Check if a lesson exists
 */
export async function lessonExists(lessonPath: string): Promise<boolean> {
  try {
    const metadataPath = await resolvePathWithinRoot(CONTENT_DIR, lessonPath, 'metadata.json');
    if (!metadataPath) {
      return false;
    }
    await fs.access(metadataPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all lesson paths for a milestone
 */
export async function getLessonsForMilestone(milestoneId: string) {
  try {
    const milestonePath = await resolvePathWithinRoot(CONTENT_DIR, milestoneId);
    if (!milestonePath) {
      return [];
    }
    const entries = await fs.readdir(milestonePath, { withFileTypes: true });
    
    const lessons = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadata = await getLessonMetadata(`${milestoneId}/${entry.name}`);
        if (metadata) {
          lessons.push({
            path: `${milestoneId}/${entry.name}`,
            ...metadata,
          });
        }
      }
    }
    
    return lessons.sort((a, b) => a.order - b.order);
  } catch (error) {
    // ENOENT is expected for milestones without lesson directories
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to get lessons for milestone:', error);
    }
    return [];
  }
}

/**
 * Find lesson path from milestone and objective
 * Supports both string objectives and object objectives with lessonId
 */
export async function findLessonPath(milestoneId: string, objective: LearningObjective): Promise<string | null> {
  const objectiveTitle = getObjectiveTitle(objective);
  const lessonId = getObjectiveLessonId(objective);
  
  // First try with explicit lessonId
  const possiblePath = `${milestoneId}/${lessonId}`;
  
  if (await lessonExists(possiblePath)) {
    return possiblePath;
  }
  
  // Try to find by listing lessons
  const lessons = await getLessonsForMilestone(milestoneId);
  const matchingLesson = lessons.find(l => 
    l.title.toLowerCase() === objectiveTitle.toLowerCase() ||
    l.id === lessonId
  );
  
  return matchingLesson?.path || null;
}

export interface ObjectiveLessonInfo {
  objective: string;
  lessonId: string;
  hasLesson: boolean;
  lessonPath?: string;
  xpRewards?: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  estimatedMinutes?: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
}

/**
 * Get lesson availability info for a list of objectives
 * Supports both string objectives and object objectives with lessonId
 */
export async function getObjectivesWithLessons(
  milestoneId: string, 
  objectives: LearningObjective[]
): Promise<ObjectiveLessonInfo[]> {
  const results: ObjectiveLessonInfo[] = [];
  
  for (const objective of objectives) {
    const objectiveTitle = getObjectiveTitle(objective);
    const lessonId = getObjectiveLessonId(objective);
    const lessonPath = await findLessonPath(milestoneId, objective);
    
    if (lessonPath) {
      const metadata = await getLessonMetadata(lessonPath);
      
      if (metadata) {
        results.push({
          objective: objectiveTitle,
          lessonId,
          hasLesson: true,
          lessonPath,
          xpRewards: {
            beginner: metadata.levels.beginner.xpReward,
            intermediate: metadata.levels.intermediate.xpReward,
            advanced: metadata.levels.advanced.xpReward,
          },
          estimatedMinutes: {
            beginner: metadata.levels.beginner.estimatedMinutes,
            intermediate: metadata.levels.intermediate.estimatedMinutes,
            advanced: metadata.levels.advanced.estimatedMinutes,
          },
        });
        continue;
      }
    }
    
    results.push({
      objective: objectiveTitle,
      lessonId,
      hasLesson: false,
    });
  }
  
  return results;
}

/**
 * Get lesson availability for an entire roadmap
 * Optimized to reduce file system operations
 */
export async function getRoadmapLessonAvailability(
  roadmap: { nodes: { id: string; learningObjectives?: LearningObjective[] }[] }
): Promise<Record<string, ObjectiveLessonInfo[]>> {
  const results: Record<string, ObjectiveLessonInfo[]> = {};
  
  // 1. Collect all unique milestones from nodes
  // In our system, the milestone ID is usually the first part of the lesson path
  // simpler for now: iterate all nodes with objectives
  
  const nodesWithObjectives = roadmap.nodes.filter(
    n => n.learningObjectives && n.learningObjectives.length > 0
  );

  // We'll process in parallel but limited concurrency if needed.
  // Ideally, we want to batch this.
  
  // Group by milestone if possible to optimize FS reads?
  // Our structure is `content/lessons/{milestoneId}/{lessonSlug}`
  // So we can assume the node.id IS the milestone ID for milestone nodes, but what about topic nodes?
  
  // Strategy: Just run everything in parallel for now, but on server side it is much faster than client requests.
  // We can further optimize by reading directories once per unique milestone.
  
  await Promise.all(
    nodesWithObjectives.map(async (node) => {
      // The node.id is traditionally used as the milestone directory for lessons associated with it
      // if the node is a milestone. If it's a topic, it might be nested?
      // Based on `RoadmapSidebar`, it calls `getObjectivesWithLessons(node.id, ...)`
      // So `node.id` is passed as `milestoneId`.
      
      const info = await getObjectivesWithLessons(node.id, node.learningObjectives || []);
      results[node.id] = info;
    })
  );
  
  return results;
}

/**
 * Normalize lesson path to full format (milestone/lesson)
 */
function normalizeLessonPath(prerequisite: string, currentMilestone: string): string {
  // If it already contains a slash, it's a full path
  if (prerequisite.includes('/')) {
    return prerequisite;
  }
  // Otherwise, assume it's in the same milestone
  return `${currentMilestone}/${prerequisite}`;
}

export interface NextLessonSuggestion {
  lessonPath: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  xpReward: number;
}

/**
 * Get next lesson suggestion based on prerequisites
 * Suggests lessons where all prerequisites are completed
 */
export interface AdjacentLesson {
  lessonPath: string;
  title: string;
  milestone: string;
}

export interface AdjacentLessons {
  previous: AdjacentLesson | null;
  next: AdjacentLesson | null;
}

/**
 * Get adjacent lessons (previous and next) for zen mode navigation
 */
export async function getAdjacentLessons(
  currentLessonPath: string
): Promise<AdjacentLessons> {
  try {
    const currentMetadata = await getLessonMetadata(currentLessonPath);
    if (!currentMetadata) {
      return { previous: null, next: null };
    }

    const [currentMilestone] = currentLessonPath.split('/');
    const milestoneLessons = await getLessonsForMilestone(currentMilestone);
    
    // Sort by order
    const sortedLessons = milestoneLessons.sort((a, b) => a.order - b.order);
    const currentIndex = sortedLessons.findIndex(l => l.path === currentLessonPath);
    
    if (currentIndex === -1) {
      return { previous: null, next: null };
    }

    const previousLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;

    return {
      previous: previousLesson ? {
        lessonPath: previousLesson.path,
        title: previousLesson.title,
        milestone: currentMilestone,
      } : null,
      next: nextLesson ? {
        lessonPath: nextLesson.path,
        title: nextLesson.title,
        milestone: currentMilestone,
      } : null,
    };
  } catch (error) {
    console.error('Failed to get adjacent lessons:', error);
    return { previous: null, next: null };
  }
}

export async function getNextLessonSuggestion(
  currentLessonPath: string,
  currentLevel: ExperienceLevel,
  completedLessons: Array<{ lessonId: string; experienceLevel: string }>
): Promise<NextLessonSuggestion | null> {
  try {
    // Get current lesson metadata
    const currentMetadata = await getLessonMetadata(currentLessonPath);
    if (!currentMetadata) {
      return null;
    }

    const [currentMilestone] = currentLessonPath.split('/');
    
    // Get all lessons in the same milestone
    const milestoneLessons = await getLessonsForMilestone(currentMilestone);
    
    // Create a set of completed lesson paths for quick lookup
    const completedPaths = new Set(
      completedLessons
        .filter(l => l.experienceLevel === currentLevel)
        .map(l => l.lessonId)
    );
    
    // Add current lesson to completed set
    completedPaths.add(currentLessonPath);
    
    // Find lessons where:
    // 1. All prerequisites are completed
    // 2. The lesson itself is not completed
    // 3. Order is higher than current lesson (natural progression)
    const suggestions = milestoneLessons
      .filter(lesson => {
        const lessonPath = lesson.path;
        
        // Skip if already completed
        if (completedPaths.has(lessonPath)) {
          return false;
        }
        
        // Skip if order is not higher (we want natural progression)
        if (lesson.order <= currentMetadata.order) {
          return false;
        }
        
        // Check if all prerequisites are met
        const allPrerequisitesMet = lesson.prerequisites.every(prereq => {
          const normalizedPath = normalizeLessonPath(prereq, currentMilestone);
          return completedPaths.has(normalizedPath);
        });
        
        return allPrerequisitesMet;
      })
      .sort((a, b) => a.order - b.order); // Sort by order to get the next logical lesson
    
    // Return the first suggestion (next in sequence)
    if (suggestions.length > 0) {
      const nextLesson = suggestions[0];
      return {
        lessonPath: nextLesson.path,
        title: nextLesson.title,
        description: nextLesson.description,
        estimatedMinutes: nextLesson.levels[currentLevel].estimatedMinutes,
        xpReward: nextLesson.levels[currentLevel].xpReward,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get next lesson suggestion:', error);
    return null;
  }
}

