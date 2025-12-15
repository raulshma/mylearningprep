'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import type { UserGamification } from '@/lib/db/schemas/user';

/**
 * Unified objective/lesson progress tracking
 * Syncs between database (gamification) and localStorage for consistent UI
 */

export interface ObjectiveProgressData {
  completedAt: string;
  level: string;
  xpEarned: number;
  lessonId: string;
}

// Storage key for objective progress (matches roadmap-topic-detail.tsx)
export function getObjectiveProgressKey(nodeId: string, lessonId: string): string {
  return `objective_progress_${nodeId}_${lessonId}`;
}

// Storage key for lesson progress (matches use-lesson-progress.tsx)
export function getLessonProgressKey(lessonId: string, level: string): string {
  return `lesson_progress_${lessonId}_${level}`;
}

/**
 * Save objective progress to localStorage
 * Called after successful lesson completion
 */
export function saveObjectiveProgress(
  nodeId: string,
  lessonId: string,
  level: string,
  xpEarned: number
): void {
  if (typeof window === 'undefined') return;
  
  const key = getObjectiveProgressKey(nodeId, lessonId);
  const data: ObjectiveProgressData = {
    completedAt: new Date().toISOString(),
    level,
    xpEarned,
    lessonId,
  };
  
  localStorage.setItem(key, JSON.stringify(data));

  // Notify same-tab listeners (storage event does not fire in the same document)
  try {
    window.dispatchEvent(
      new CustomEvent('objective-progress-updated', { 
        detail: { roadmapSlug: nodeId, lessonId } 
      })
    );
  } catch {
    // Ignore if CustomEvent is not available
  }
}

/**
 * Get objective progress from localStorage
 */
export function getObjectiveProgress(
  nodeId: string,
  lessonId: string
): ObjectiveProgressData | null {
  if (typeof window === 'undefined') return null;
  
  const key = getObjectiveProgressKey(nodeId, lessonId);
  const stored = localStorage.getItem(key);
  
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as ObjectiveProgressData;
  } catch {
    return null;
  }
}

/**
 * Sync gamification data to localStorage for roadmap UI
 * Call this when gamification data is loaded from server
 */
export function syncGamificationToLocalStorage(
  gamification: UserGamification | null,
  nodeId?: string
): void {
  if (typeof window === 'undefined' || !gamification?.completedLessons) return;
  
  for (const lesson of gamification.completedLessons) {
    if (!lesson.completedAt) continue;
    
    // Extract nodeId from lessonId (format: "nodeId/lessonSlug")
    const parts = lesson.lessonId.split('/');
    const extractedNodeId = parts[0];
    
    // If nodeId is specified, only sync for that node
    if (nodeId && extractedNodeId !== nodeId) continue;
    
    const key = getObjectiveProgressKey(extractedNodeId, lesson.lessonId);
    
    // Only write if not already present (don't overwrite newer local data)
    if (!localStorage.getItem(key)) {
      const data: ObjectiveProgressData = {
        completedAt: lesson.completedAt instanceof Date 
          ? lesson.completedAt.toISOString() 
          : String(lesson.completedAt),
        level: lesson.experienceLevel,
        xpEarned: lesson.xpEarned,
        lessonId: lesson.lessonId,
      };
      localStorage.setItem(key, JSON.stringify(data));

      try {
        window.dispatchEvent(
          new CustomEvent('objective-progress-updated', {
            detail: { roadmapSlug: extractedNodeId, lessonId: lesson.lessonId },
          })
        );
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Clear objective progress from localStorage
 */
export function clearObjectiveProgress(nodeId: string, lessonId: string): void {
  if (typeof window === 'undefined') return;
  
  const key = getObjectiveProgressKey(nodeId, lessonId);
  localStorage.removeItem(key);

  try {
    window.dispatchEvent(
      new CustomEvent('objective-progress-updated', { 
        detail: { roadmapSlug: nodeId, lessonId } 
      })
    );
  } catch {
    // Ignore
  }
}

/**
 * Hook to manage objective progress with sync to localStorage
 */
export function useObjectiveProgress(
  nodeId: string,
  objectives: Array<{ lessonId: string; objective: string }>,
  gamification: UserGamification | null
) {
  // Track locally added completions with the nodeId they belong to
  const [localMutations, setLocalMutations] = useState<{
    nodeId: string;
    data: Record<string, ObjectiveProgressData>;
  }>({ nodeId, data: {} });
  
  // Get the current mutations (only if nodeId matches, otherwise treat as empty)
  const currentMutations = useMemo(() => {
    return localMutations.nodeId === nodeId ? localMutations.data : {};
  }, [localMutations, nodeId]);
  
  // Sync gamification to localStorage (side effect, no setState)
  useEffect(() => {
    if (gamification) {
      syncGamificationToLocalStorage(gamification, nodeId);
    }
  }, [nodeId, gamification]);
  
  // Derive progress from localStorage (computed during render, not in effect)
  const serverProgress = useMemo(() => {
    if (typeof window === 'undefined') return {};
    
    const progress: Record<string, ObjectiveProgressData> = {};
    for (const obj of objectives) {
      const stored = getObjectiveProgress(nodeId, obj.lessonId);
      if (stored) {
        progress[obj.objective] = stored;
      }
    }
    return progress;
  }, [nodeId, objectives]);
  
  // Merge server progress with local mutations
  const progressMap = useMemo(() => {
    return { ...serverProgress, ...currentMutations };
  }, [serverProgress, currentMutations]);
  
  // Mark objective as complete
  const markComplete = useCallback((
    objective: string,
    lessonId: string,
    level: string,
    xpEarned: number
  ) => {
    saveObjectiveProgress(nodeId, lessonId, level, xpEarned);
    
    setLocalMutations(prev => ({
      nodeId,
      data: {
        ...prev.data,
        [objective]: {
          completedAt: new Date().toISOString(),
          level,
          xpEarned,
          lessonId,
        },
      },
    }));
  }, [nodeId]);
  
  // Reset objective progress
  const resetObjective = useCallback((objective: string, lessonId: string) => {
    clearObjectiveProgress(nodeId, lessonId);
    
    setLocalMutations(prev => {
      const next = { ...prev.data };
      delete next[objective];
      return { nodeId, data: next };
    });
  }, [nodeId]);
  
  // Get completion count
  const completedCount = Object.keys(progressMap).filter(
    key => progressMap[key]?.completedAt
  ).length;
  
  return {
    progressMap,
    markComplete,
    resetObjective,
    completedCount,
    isObjectiveComplete: (objective: string) => !!progressMap[objective]?.completedAt,
    getObjectiveXp: (objective: string) => progressMap[objective]?.xpEarned ?? 0,
  };
}
