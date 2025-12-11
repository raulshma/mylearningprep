/**
 * Lesson utility functions
 * These are NOT server actions, just helper functions
 */

/**
 * Convert objective title to lesson slug
 */
export function objectiveToLessonSlug(objective: string): string {
  return objective
    .toLowerCase()
    .replace(/[?]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
