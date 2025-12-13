import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNextLessonSuggestion, getLessonMetadata, lessonExists, getLessonsForMilestone } from './lessons';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    realpath: vi.fn((p: string) => Promise.resolve(p)),
  },
}));

describe('Lesson Navigation - Next Lesson Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNextLessonSuggestion', () => {
    it('should return null if current lesson metadata cannot be loaded', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.default.readFile).mockRejectedValue(new Error('File not found'));

      const result = await getNextLessonSuggestion(
        'css/selectors',
        'beginner',
        []
      );

      expect(result).toBeNull();
    });

    it('should return null if no lessons are available in milestone', async () => {
      const fs = await import('fs/promises');
      
      // Mock current lesson metadata
      vi.mocked(fs.default.readFile).mockResolvedValueOnce(JSON.stringify({
        id: 'selectors',
        title: 'CSS Selectors',
        description: 'Learn CSS selectors',
        milestone: 'css',
        order: 1,
        sections: ['intro'],
        levels: {
          beginner: { estimatedMinutes: 30, xpReward: 50 },
          intermediate: { estimatedMinutes: 45, xpReward: 100 },
          advanced: { estimatedMinutes: 60, xpReward: 200 },
        },
        prerequisites: [],
        tags: ['css'],
      }));

      // Mock empty milestone directory
      vi.mocked(fs.default.readdir).mockResolvedValue([]);

      const result = await getNextLessonSuggestion(
        'css/selectors',
        'beginner',
        []
      );

      expect(result).toBeNull();
    });

    it('should suggest next lesson in order when prerequisites are met', async () => {
      const fs = await import('fs/promises');
      
      // Mock current lesson metadata (order: 1)
      vi.mocked(fs.default.readFile)
        .mockResolvedValueOnce(JSON.stringify({
          id: 'selectors',
          title: 'CSS Selectors',
          description: 'Learn CSS selectors',
          milestone: 'css',
          order: 1,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 30, xpReward: 50 },
            intermediate: { estimatedMinutes: 45, xpReward: 100 },
            advanced: { estimatedMinutes: 60, xpReward: 200 },
          },
          prerequisites: [],
          tags: ['css'],
        }))
        // Mock next lesson metadata (order: 2)
        .mockResolvedValueOnce(JSON.stringify({
          id: 'box-model',
          title: 'CSS Box Model',
          description: 'Learn the box model',
          milestone: 'css',
          order: 2,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 25, xpReward: 50 },
            intermediate: { estimatedMinutes: 40, xpReward: 100 },
            advanced: { estimatedMinutes: 55, xpReward: 200 },
          },
          prerequisites: [],
          tags: ['css'],
        }));

      // Mock milestone directory with one lesson
      vi.mocked(fs.default.readdir).mockResolvedValue([
        { name: 'box-model', isDirectory: () => true } as any,
      ]);

      const result = await getNextLessonSuggestion(
        'css/selectors',
        'beginner',
        [{ lessonId: 'css/selectors', experienceLevel: 'beginner' }]
      );

      expect(result).not.toBeNull();
      expect(result?.lessonPath).toBe('css/box-model');
      expect(result?.title).toBe('CSS Box Model');
      expect(result?.estimatedMinutes).toBe(25);
      expect(result?.xpReward).toBe(50);
    });

    it('should skip lessons with unmet prerequisites', async () => {
      const fs = await import('fs/promises');
      
      // Mock current lesson metadata (order: 1)
      vi.mocked(fs.default.readFile)
        .mockResolvedValueOnce(JSON.stringify({
          id: 'selectors',
          title: 'CSS Selectors',
          description: 'Learn CSS selectors',
          milestone: 'css',
          order: 1,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 30, xpReward: 50 },
            intermediate: { estimatedMinutes: 45, xpReward: 100 },
            advanced: { estimatedMinutes: 60, xpReward: 200 },
          },
          prerequisites: [],
          tags: ['css'],
        }))
        // Mock lesson with unmet prerequisites (order: 2)
        .mockResolvedValueOnce(JSON.stringify({
          id: 'animations',
          title: 'CSS Animations',
          description: 'Learn animations',
          milestone: 'css',
          order: 2,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 50, xpReward: 50 },
            intermediate: { estimatedMinutes: 65, xpReward: 100 },
            advanced: { estimatedMinutes: 80, xpReward: 200 },
          },
          prerequisites: ['css/box-model', 'css/positioning'],
          tags: ['css'],
        }));

      // Mock milestone directory
      vi.mocked(fs.default.readdir).mockResolvedValue([
        { name: 'animations', isDirectory: () => true } as any,
      ]);

      const result = await getNextLessonSuggestion(
        'css/selectors',
        'beginner',
        [{ lessonId: 'css/selectors', experienceLevel: 'beginner' }]
      );

      // Should return null because prerequisites are not met
      expect(result).toBeNull();
    });

    it('should not suggest already completed lessons', async () => {
      const fs = await import('fs/promises');
      
      // Mock current lesson metadata
      vi.mocked(fs.default.readFile)
        .mockResolvedValueOnce(JSON.stringify({
          id: 'selectors',
          title: 'CSS Selectors',
          description: 'Learn CSS selectors',
          milestone: 'css',
          order: 1,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 30, xpReward: 50 },
            intermediate: { estimatedMinutes: 45, xpReward: 100 },
            advanced: { estimatedMinutes: 60, xpReward: 200 },
          },
          prerequisites: [],
          tags: ['css'],
        }))
        // Mock next lesson metadata
        .mockResolvedValueOnce(JSON.stringify({
          id: 'box-model',
          title: 'CSS Box Model',
          description: 'Learn the box model',
          milestone: 'css',
          order: 2,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 25, xpReward: 50 },
            intermediate: { estimatedMinutes: 40, xpReward: 100 },
            advanced: { estimatedMinutes: 55, xpReward: 200 },
          },
          prerequisites: [],
          tags: ['css'],
        }));

      // Mock milestone directory
      vi.mocked(fs.default.readdir).mockResolvedValue([
        { name: 'box-model', isDirectory: () => true } as any,
      ]);

      const result = await getNextLessonSuggestion(
        'css/selectors',
        'beginner',
        [
          { lessonId: 'css/selectors', experienceLevel: 'beginner' },
          { lessonId: 'css/box-model', experienceLevel: 'beginner' },
        ]
      );

      // Should return null because the next lesson is already completed
      expect(result).toBeNull();
    });

    it('should only consider lessons at the same experience level', async () => {
      const fs = await import('fs/promises');
      
      // Mock current lesson metadata
      vi.mocked(fs.default.readFile)
        .mockResolvedValueOnce(JSON.stringify({
          id: 'selectors',
          title: 'CSS Selectors',
          description: 'Learn CSS selectors',
          milestone: 'css',
          order: 1,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 30, xpReward: 50 },
            intermediate: { estimatedMinutes: 45, xpReward: 100 },
            advanced: { estimatedMinutes: 60, xpReward: 200 },
          },
          prerequisites: [],
          tags: ['css'],
        }))
        // Mock next lesson metadata
        .mockResolvedValueOnce(JSON.stringify({
          id: 'box-model',
          title: 'CSS Box Model',
          description: 'Learn the box model',
          milestone: 'css',
          order: 2,
          sections: ['intro'],
          levels: {
            beginner: { estimatedMinutes: 25, xpReward: 50 },
            intermediate: { estimatedMinutes: 40, xpReward: 100 },
            advanced: { estimatedMinutes: 55, xpReward: 200 },
          },
          prerequisites: [],
          tags: ['css'],
        }));

      // Mock milestone directory
      vi.mocked(fs.default.readdir).mockResolvedValue([
        { name: 'box-model', isDirectory: () => true } as any,
      ]);

      const result = await getNextLessonSuggestion(
        'css/selectors',
        'beginner',
        [
          { lessonId: 'css/selectors', experienceLevel: 'beginner' },
          // Box model completed at intermediate level, not beginner
          { lessonId: 'css/box-model', experienceLevel: 'intermediate' },
        ]
      );

      // Should suggest box-model because it's not completed at beginner level
      expect(result).not.toBeNull();
      expect(result?.lessonPath).toBe('css/box-model');
    });
  });
});

describe('Lesson Actions - Path Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLessonMetadata rejects traversal and does not read files', async () => {
    const fs = await import('fs/promises');

    const result = await getLessonMetadata('../secret');

    expect(result).toBeNull();
    expect(vi.mocked(fs.default.readFile)).not.toHaveBeenCalled();
  });

  it('lessonExists rejects traversal and does not access files', async () => {
    const fs = await import('fs/promises');

    const result = await lessonExists('../secret');

    expect(result).toBe(false);
    expect(vi.mocked(fs.default.access)).not.toHaveBeenCalled();
  });

  it('getLessonsForMilestone rejects traversal and does not list directories', async () => {
    const fs = await import('fs/promises');

    const result = await getLessonsForMilestone('../secret');

    expect(result).toEqual([]);
    expect(vi.mocked(fs.default.readdir)).not.toHaveBeenCalled();
  });

  it('getLessonsForMilestone allows safe milestone ids', async () => {
    const fs = await import('fs/promises');
    vi.mocked(fs.default.readdir).mockResolvedValueOnce([]);

    const result = await getLessonsForMilestone('css');

    expect(result).toEqual([]);
    expect(vi.mocked(fs.default.readdir)).toHaveBeenCalledTimes(1);
  });
});
