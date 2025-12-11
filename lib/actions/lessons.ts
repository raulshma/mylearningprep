'use server';

import fs from 'fs/promises';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';
import { objectiveToLessonSlug } from '@/lib/utils/lesson-utils';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'lessons');

/**
 * Get lesson metadata from JSON file
 */
export async function getLessonMetadata(lessonPath: string) {
  try {
    const metadataPath = path.join(CONTENT_DIR, lessonPath, 'metadata.json');
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
 */
export async function getLessonContent(lessonPath: string, level: ExperienceLevel) {
  try {
    const mdxPath = path.join(CONTENT_DIR, lessonPath, `${level}.mdx`);
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
}

/**
 * Check if a lesson exists
 */
export async function lessonExists(lessonPath: string): Promise<boolean> {
  try {
    const metadataPath = path.join(CONTENT_DIR, lessonPath, 'metadata.json');
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
    const milestonePath = path.join(CONTENT_DIR, milestoneId);
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
 */
export async function findLessonPath(milestoneId: string, objectiveTitle: string): Promise<string | null> {
  const slug = objectiveToLessonSlug(objectiveTitle);
  const possiblePath = `${milestoneId}/${slug}`;
  
  if (await lessonExists(possiblePath)) {
    return possiblePath;
  }
  
  // Try to find by listing lessons
  const lessons = await getLessonsForMilestone(milestoneId);
  const matchingLesson = lessons.find(l => 
    l.title.toLowerCase() === objectiveTitle.toLowerCase() ||
    l.id === slug
  );
  
  return matchingLesson?.path || null;
}

export interface ObjectiveLessonInfo {
  objective: string;
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
 */
export async function getObjectivesWithLessons(
  milestoneId: string, 
  objectives: string[]
): Promise<ObjectiveLessonInfo[]> {
  const results: ObjectiveLessonInfo[] = [];
  
  for (const objective of objectives) {
    const lessonPath = await findLessonPath(milestoneId, objective);
    
    if (lessonPath) {
      const metadata = await getLessonMetadata(lessonPath);
      
      if (metadata) {
        results.push({
          objective,
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
      objective,
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
  roadmap: { nodes: { id: string; learningObjectives?: string[] }[] }
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

