/**
 * Build candidate paths for lesson resolution
 * This is a pure function that generates all paths to try
 */
export function buildLessonCandidatePaths(
  milestoneId: string,
  lessonId: string,
  roadmapSlug?: string
): string[] {
  const candidatePaths: string[] = [];
  const seenPaths = new Set<string>();
  
  const addPath = (path?: string) => {
    if (!path) return;
    if (seenPaths.has(path)) return;
    seenPaths.add(path);
    candidatePaths.push(path);
  };

  // Direct lessonId (e.g., "csharp-basics/variables-data-types")
  addPath(lessonId);
  
  // Standard pattern: milestone/lessonId (e.g., "csharp-basics/variables-data-types")
  if (!lessonId.startsWith(`${milestoneId}/`)) {
    addPath(`${milestoneId}/${lessonId}`);
  }
  
  // If lessonId has slashes, try trailing parts
  const slugParts = lessonId.split('/').filter(Boolean);
  if (slugParts.length > 1) {
    const trailing = slugParts.slice(1).join('/');
    addPath(trailing);
    addPath(`${milestoneId}/${trailing}`);
  }
  
  // Try with final slug
  const finalSlug = slugParts[slugParts.length - 1];
  if (finalSlug) {
    addPath(`${milestoneId}/${finalSlug}`);
  }
  
  // Try roadmapSlug as category folder (e.g., "sql/learn-basics")
  if (roadmapSlug) {
    addPath(`${roadmapSlug}/${lessonId}`);
    addPath(`${roadmapSlug}/${finalSlug}`);
  }
  
  // Common category folders fallback
  const categoryFolders = ['sql', 'databases', 'javascript', 'typescript', 'entity-framework-core', 'ef-core-introduction', 'functions', 'working-with-apis', 'classes', 'type-casting', 'equality-comparisons'];
  for (const category of categoryFolders) {
    if (category !== roadmapSlug) {
      addPath(`${category}/${lessonId}`);
      addPath(`${category}/${finalSlug}`);
    }
  }
  
  return candidatePaths;
}
