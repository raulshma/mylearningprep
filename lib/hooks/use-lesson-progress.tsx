'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  useRef,
  ReactNode 
} from 'react';

/**
 * Generic progress tracking system for learning content
 * Can be used for any lesson, objective, or learning module
 */

export interface SectionProgress {
  sectionId: string;
  completedAt: Date;
  timeSpentSeconds: number;
}

export interface LessonProgressState {
  lessonId: string;
  level: string;
  completedSections: SectionProgress[];
  startedAt: Date;
  lastActivityAt: Date;
  isComplete: boolean;
}

interface ProgressContextValue {
  progress: LessonProgressState | null;
  completedSectionIds: string[];
  currentSection: string | null;
  isComplete: boolean;
  markSectionComplete: (sectionId: string) => void;
  resetProgress: () => void;
  getProgressPercentage: () => number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

// Storage key generator for localStorage/sessionStorage
function getStorageKey(lessonId: string, level: string): string {
  return `lesson_progress_${lessonId}_${level}`;
}

interface ProgressProviderProps {
  children: ReactNode;
  lessonId: string;
  level: string;
  sections: string[];
  onSectionComplete?: (sectionId: string, progress: LessonProgressState) => void;
  onLessonComplete?: (progress: LessonProgressState) => void;
  persistToStorage?: boolean;
  initialState?: {
    completedSections: string[];
    timeSpent: number;
    isCompleted: boolean;
  };
}

export function ProgressProvider({
  children,
  lessonId,
  level,
  sections,
  onSectionComplete,
  onLessonComplete,
  persistToStorage = true,
  initialState,
}: ProgressProviderProps) {
  const [progress, setProgress] = useState<LessonProgressState | null>(() => {
    // 1. Try to load from local storage first if enabled
    if (persistToStorage) {
      try {
        const storageKey = getStorageKey(lessonId, level);
        const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        
        if (stored) {
          const parsed = JSON.parse(stored);
          // Restore dates
          return {
            ...parsed,
            startedAt: new Date(parsed.startedAt),
            lastActivityAt: new Date(parsed.lastActivityAt),
            completedSections: parsed.completedSections.map((s: any) => ({
              ...s,
              completedAt: new Date(s.completedAt),
            })),
          };
        }
      } catch (e) {
        console.error('Failed to parse stored progress:', e);
      }
    }

    // 2. If no local storage (or failed), check if we have initialState from server
    if (initialState && initialState.completedSections.length > 0) {
      return {
        lessonId,
        level,
        completedSections: initialState.completedSections.map(id => ({
          sectionId: id,
          completedAt: new Date(), // Approximation
          timeSpentSeconds: 0 
        })),
        startedAt: new Date(),
        lastActivityAt: new Date(),
        // If server says completed, respect it
        isComplete: initialState.isCompleted, 
      };
    }

    // 3. Default to null
    return null;
  });

  const sectionStartTimeRef = useRef<Record<string, number>>({});



  // Save progress to storage whenever it changes
  useEffect(() => {
    if (progress && persistToStorage) {
      const storageKey = getStorageKey(lessonId, level);
      localStorage.setItem(storageKey, JSON.stringify(progress));
    }
  }, [progress, lessonId, level, persistToStorage]);

  const completedSectionIds = progress?.completedSections.map(s => s.sectionId) ?? [];
  
  const currentSection = sections.find(s => !completedSectionIds.includes(s)) ?? null;
  
  const isComplete = sections.length > 0 && 
    sections.every(s => completedSectionIds.includes(s));

  const markSectionComplete = useCallback((sectionId: string) => {
    setProgress(prev => {
      if (!prev) return prev;
      
      // Don't mark if already complete
      if (prev.completedSections.some(s => s.sectionId === sectionId)) {
        return prev;
      }

      // Calculate time spent in this section
      const startTime = sectionStartTimeRef.current[sectionId] ?? Date.now();
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);

      const newSection: SectionProgress = {
        sectionId,
        completedAt: new Date(),
        timeSpentSeconds,
      };

      const newCompletedSections = [...prev.completedSections, newSection];
      const newIsComplete = sections.every(s => 
        newCompletedSections.some(cs => cs.sectionId === s)
      );

      const newProgress: LessonProgressState = {
        ...prev,
        completedSections: newCompletedSections,
        lastActivityAt: new Date(),
        isComplete: newIsComplete,
      };

      // Fire callbacks
      onSectionComplete?.(sectionId, newProgress);
      
      if (newIsComplete && !prev.isComplete) {
        onLessonComplete?.(newProgress);
      }

      return newProgress;
    });
  }, [sections, onSectionComplete, onLessonComplete]);

  const resetProgress = useCallback(() => {
    const newProgress: LessonProgressState = {
      lessonId,
      level,
      completedSections: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      isComplete: false,
    };
    setProgress(newProgress);
    sectionStartTimeRef.current = {};
  }, [lessonId, level]);

  const getProgressPercentage = useCallback(() => {
    if (sections.length === 0) return 0;
    return Math.round((completedSectionIds.length / sections.length) * 100);
  }, [completedSectionIds.length, sections.length]);

  // Track when user enters a section
  const trackSectionStart = useCallback((sectionId: string) => {
    if (!sectionStartTimeRef.current[sectionId]) {
      sectionStartTimeRef.current[sectionId] = Date.now();
    }
  }, []);

  return (
    <ProgressContext.Provider
      value={{
        progress,
        completedSectionIds,
        currentSection,
        isComplete,
        markSectionComplete,
        resetProgress,
        getProgressPercentage,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}

/**
 * Hook to auto-track section visibility using IntersectionObserver
 * Marks a section as complete when it has been visible for a threshold time
 */
interface UseSectionTrackerOptions {
  sectionId: string;
  /** Minimum time in ms the section must be visible to count as complete */
  minVisibleTime?: number;
  /** Intersection threshold (0-1) */
  threshold?: number;
  /** Whether to track this section */
  enabled?: boolean;
}

export function useSectionTracker({
  sectionId,
  minVisibleTime = 2000, // 2 seconds default
  threshold = 0.5,
  enabled = true,
}: UseSectionTrackerOptions) {
  const { markSectionComplete, completedSectionIds } = useProgress();
  const elementRef = useRef<HTMLDivElement>(null);
  const visibleTimeRef = useRef<number>(0);
  const lastVisibleRef = useRef<number | null>(null);
  const isCompleted = completedSectionIds.includes(sectionId);

  useEffect(() => {
    if (!enabled || isCompleted || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Started being visible
            lastVisibleRef.current = Date.now();
          } else if (lastVisibleRef.current) {
            // Stopped being visible, accumulate time
            visibleTimeRef.current += Date.now() - lastVisibleRef.current;
            lastVisibleRef.current = null;

            // Check if we've hit the threshold
            if (visibleTimeRef.current >= minVisibleTime) {
              markSectionComplete(sectionId);
            }
          }
        });
      },
      { threshold }
    );

    observer.observe(elementRef.current);

    // Also check periodically while visible
    const interval = setInterval(() => {
      if (lastVisibleRef.current && !isCompleted) {
        const totalTime = visibleTimeRef.current + (Date.now() - lastVisibleRef.current);
        if (totalTime >= minVisibleTime) {
          markSectionComplete(sectionId);
        }
      }
    }, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [sectionId, minVisibleTime, threshold, enabled, isCompleted, markSectionComplete]);

  return { ref: elementRef, isCompleted };
}

/**
 * Component wrapper for auto-tracking sections
 */
interface TrackedSectionProps {
  sectionId: string;
  children: ReactNode;
  minVisibleTime?: number;
  className?: string;
}

export function TrackedSection({
  sectionId,
  children,
  minVisibleTime = 2000,
  className = '',
}: TrackedSectionProps) {
  const { ref, isCompleted } = useSectionTracker({
    sectionId,
    minVisibleTime,
  });

  return (
    <div
      ref={ref}
      data-section-id={sectionId}
      data-completed={isCompleted}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Utility to get total time spent on completed sections
 */
export function getTotalTimeSpent(progress: LessonProgressState | null): number {
  if (!progress) return 0;
  return progress.completedSections.reduce((acc, s) => acc + s.timeSpentSeconds, 0);
}

/**
 * Utility to format time spent as a readable string
 */
export function formatTimeSpent(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
