'use server';

import { auth } from '@clerk/nextjs/server';
import * as roadmapRepo from '@/lib/db/repositories/roadmap-repository';
import type { Roadmap, RoadmapNode, LearningObjective } from '@/lib/db/schemas/roadmap';

export type SearchResultType = 'roadmap' | 'milestone' | 'topic' | 'optional' | 'objective';

export interface RoadmapSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  roadmapSlug: string;
  roadmapTitle: string;
  nodeId?: string;
  nodeTitle?: string;
  lessonId?: string;
  keywords: string[];
}

interface SearchOptions {
  query: string;
  currentRoadmapSlug?: string;
  limit?: number;
}

/**
 * Search across all roadmaps, milestones, topics, and objectives
 */
export async function searchRoadmaps(options: SearchOptions): Promise<RoadmapSearchResult[]> {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  const { query, currentRoadmapSlug, limit = 20 } = options;
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const roadmaps = await roadmapRepo.findAllRoadmaps();
  const results: RoadmapSearchResult[] = [];

  // Helper to calculate relevance score
  const getRelevanceScore = (text: string, isCurrentRoadmap: boolean): number => {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // Exact match
    if (lowerText === searchTerm) score += 100;
    // Starts with
    else if (lowerText.startsWith(searchTerm)) score += 80;
    // Word boundary match
    else if (lowerText.split(/\s+/).some(word => word.startsWith(searchTerm))) score += 60;
    // Contains
    else if (lowerText.includes(searchTerm)) score += 40;
    
    // Boost current roadmap results
    if (isCurrentRoadmap) score += 20;
    
    return score;
  };

  // Helper to check if text matches search
  const matches = (text: string): boolean => {
    return text.toLowerCase().includes(searchTerm);
  };

  for (const roadmap of roadmaps) {
    const isCurrentRoadmap = roadmap.slug === currentRoadmapSlug;

    // Search roadmap title and description
    if (matches(roadmap.title) || matches(roadmap.description)) {
      results.push({
        id: `roadmap-${roadmap.slug}`,
        type: 'roadmap',
        title: roadmap.title,
        description: roadmap.description,
        roadmapSlug: roadmap.slug,
        roadmapTitle: roadmap.title,
        keywords: [roadmap.category, ...roadmap.prerequisites],
      });
    }

    // Search nodes (milestones, topics, optional)
    for (const node of roadmap.nodes) {
      const nodeMatches = matches(node.title) || 
        (node.description && matches(node.description)) ||
        node.tags.some(tag => matches(tag));

      if (nodeMatches) {
        results.push({
          id: `node-${roadmap.slug}-${node.id}`,
          type: node.type as SearchResultType,
          title: node.title,
          description: node.description,
          roadmapSlug: roadmap.slug,
          roadmapTitle: roadmap.title,
          nodeId: node.id,
          keywords: node.tags,
        });
      }

      // Search learning objectives
      if (node.learningObjectives) {
        for (const objective of node.learningObjectives) {
          const objectiveTitle = typeof objective === 'string' ? objective : objective.title;
          const lessonId = typeof objective === 'string' ? undefined : objective.lessonId;

          if (matches(objectiveTitle)) {
            results.push({
              id: `objective-${roadmap.slug}-${node.id}-${objectiveTitle}`,
              type: 'objective',
              title: objectiveTitle,
              roadmapSlug: roadmap.slug,
              roadmapTitle: roadmap.title,
              nodeId: node.id,
              nodeTitle: node.title,
              lessonId,
              keywords: [node.title, ...node.tags],
            });
          }
        }
      }
    }
  }

  // Sort by relevance
  results.sort((a, b) => {
    const scoreA = getRelevanceScore(a.title, a.roadmapSlug === currentRoadmapSlug);
    const scoreB = getRelevanceScore(b.title, b.roadmapSlug === currentRoadmapSlug);
    return scoreB - scoreA;
  });

  return results.slice(0, limit);
}

/**
 * Get all searchable items for a specific roadmap (for client-side filtering)
 */
export async function getRoadmapSearchIndex(roadmapSlug: string): Promise<RoadmapSearchResult[]> {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  const roadmap = await roadmapRepo.findRoadmapBySlug(roadmapSlug);
  if (!roadmap) {
    return [];
  }

  const results: RoadmapSearchResult[] = [];

  // Add roadmap itself
  results.push({
    id: `roadmap-${roadmap.slug}`,
    type: 'roadmap',
    title: roadmap.title,
    description: roadmap.description,
    roadmapSlug: roadmap.slug,
    roadmapTitle: roadmap.title,
    keywords: [roadmap.category, ...roadmap.prerequisites],
  });

  // Add all nodes and objectives
  for (const node of roadmap.nodes) {
    results.push({
      id: `node-${roadmap.slug}-${node.id}`,
      type: node.type as SearchResultType,
      title: node.title,
      description: node.description,
      roadmapSlug: roadmap.slug,
      roadmapTitle: roadmap.title,
      nodeId: node.id,
      keywords: node.tags,
    });

    // Add learning objectives
    if (node.learningObjectives) {
      for (const objective of node.learningObjectives) {
        const objectiveTitle = typeof objective === 'string' ? objective : objective.title;
        const lessonId = typeof objective === 'string' ? undefined : objective.lessonId;

        results.push({
          id: `objective-${roadmap.slug}-${node.id}-${objectiveTitle}`,
          type: 'objective',
          title: objectiveTitle,
          roadmapSlug: roadmap.slug,
          roadmapTitle: roadmap.title,
          nodeId: node.id,
          nodeTitle: node.title,
          lessonId,
          keywords: [node.title, ...node.tags],
        });
      }
    }
  }

  return results;
}
