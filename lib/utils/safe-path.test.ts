import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs/promises', () => ({
  default: {
    realpath: vi.fn(async (p: string) => p),
  },
}));

import fs from 'fs/promises';
import path from 'path';
import { isSafeLessonRelativePath, resolvePathWithinRoot } from './safe-path';

describe('safe-path security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSafeLessonRelativePath', () => {
    it('accepts standard lesson paths', () => {
      expect(isSafeLessonRelativePath('css/selectors')).toBe(true);
      expect(isSafeLessonRelativePath('react/hooks')).toBe(true);
      expect(isSafeLessonRelativePath('internet/http')).toBe(true);
      expect(isSafeLessonRelativePath('css/box-model')).toBe(true);
    });

    it('rejects empty, absolute, and windows-ish paths', () => {
      expect(isSafeLessonRelativePath('')).toBe(false);
      expect(isSafeLessonRelativePath('/etc/passwd')).toBe(false);
      expect(isSafeLessonRelativePath('C:/Windows/System32')).toBe(false);
      expect(isSafeLessonRelativePath('C:\\Windows\\System32')).toBe(false);
      expect(isSafeLessonRelativePath('\\\\server\\share')).toBe(false);
    });

    it('rejects traversal and dot segments', () => {
      expect(isSafeLessonRelativePath('../secrets')).toBe(false);
      expect(isSafeLessonRelativePath('css/../secrets')).toBe(false);
      expect(isSafeLessonRelativePath('./css/selectors')).toBe(false);
      expect(isSafeLessonRelativePath('css/./selectors')).toBe(false);
      expect(isSafeLessonRelativePath('css//selectors')).toBe(true); // normalized to css/selectors
    });

    it('rejects invalid characters', () => {
      expect(isSafeLessonRelativePath('css/selectors.mdx')).toBe(false);
      expect(isSafeLessonRelativePath('css/selectors?x=1')).toBe(false);
      expect(isSafeLessonRelativePath('css/se lectors')).toBe(false);
      expect(isSafeLessonRelativePath('css/🧨')).toBe(false);
      expect(isSafeLessonRelativePath('css/selectors#hash')).toBe(false);
    });
  });

  describe('resolvePathWithinRoot', () => {
    it('resolves a safe relative lesson path under root', async () => {
      const root = path.join(process.cwd(), 'content', 'lessons');
      const resolved = await resolvePathWithinRoot(root, 'css/selectors', 'beginner.mdx');

      expect(resolved).toBeTruthy();
      expect(path.isAbsolute(resolved!)).toBe(true);
      expect(resolved!.includes(path.join('content', 'lessons'))).toBe(true);
    });

    it('returns null for traversal attempts', async () => {
      const root = path.join(process.cwd(), 'content', 'lessons');

      await expect(resolvePathWithinRoot(root, '../..', 'beginner.mdx')).resolves.toBeNull();
      await expect(resolvePathWithinRoot(root, 'css/../../secret', 'beginner.mdx')).resolves.toBeNull();
      await expect(resolvePathWithinRoot(root, '/absolute/path', 'beginner.mdx')).resolves.toBeNull();
      await expect(resolvePathWithinRoot(root, 'C:/Windows/System32', 'x')).resolves.toBeNull();
      await expect(resolvePathWithinRoot(root, 'css\\selectors', 'beginner.mdx')).resolves.toBeNull();
    });

    it('returns null if realpath resolves outside the root (symlink escape)', async () => {
      const root = path.join(process.cwd(), 'content', 'lessons');
      const rootReal = path.join(process.cwd(), 'content', 'lessons');

      // root realpath OK
      vi.mocked((fs as any).realpath).mockImplementationOnce(async () => rootReal);
      // candidate realpath escapes root
      vi.mocked((fs as any).realpath).mockImplementationOnce(async () => path.join(process.cwd(), 'SECRETS', 'leak.mdx'));

      const resolved = await resolvePathWithinRoot(root, 'css/selectors', 'beginner.mdx');
      expect(resolved).toBeNull();
    });

    it('is resilient to mocked realpath returning undefined', async () => {
      const root = path.join(process.cwd(), 'content', 'lessons');
      vi.mocked((fs as any).realpath).mockResolvedValueOnce(undefined as any);
      vi.mocked((fs as any).realpath).mockResolvedValueOnce(undefined as any);

      const resolved = await resolvePathWithinRoot(root, 'css/selectors', 'beginner.mdx');
      // still resolves based on path.resolve containment checks
      expect(resolved).toBeTruthy();
    });
  });
});
