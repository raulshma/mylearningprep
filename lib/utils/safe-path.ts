import fs from 'fs/promises';
import path from 'path';

function splitPosixPath(input: string): string[] {
  return input.split('/').filter(Boolean);
}

export function isSafeLessonRelativePath(input: string): boolean {
  if (!input) return false;
  if (input.includes('\0')) return false;
  if (input.includes('\\')) return false;
  if (input.includes(':')) return false;
  if (input.startsWith('/')) return false;

  const parts = splitPosixPath(input);
  if (parts.length === 0) return false;

  const partRe = /^[a-z0-9][a-z0-9-]*$/;
  return parts.every((part) => partRe.test(part) && part !== '.' && part !== '..');
}

function isPathInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  if (!relative) return true;

  return !(
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  );
}

/**
 * Resolves an untrusted path (provided as POSIX-style segments, e.g. `css/box-model`)
 * to an absolute path under `root`.
 *
 * - Rejects path traversal (`..`), absolute paths, Windows drive paths, and backslashes.
 * - Normalizes and (when possible) resolves symlinks via `fs.realpath`.
 */
export async function resolvePathWithinRoot(
  root: string,
  untrustedPosixPath: string,
  ...additionalSegments: string[]
): Promise<string | null> {
  if (!isSafeLessonRelativePath(untrustedPosixPath)) {
    return null;
  }

  const rootResolved = path.resolve(root);
  const pathParts = splitPosixPath(untrustedPosixPath);
  const candidateResolved = path.resolve(rootResolved, ...pathParts, ...additionalSegments);

  if (!isPathInsideRoot(rootResolved, candidateResolved)) {
    return null;
  }

  let rootReal = rootResolved;
  try {
    const real = await fs.realpath(rootResolved);
    if (typeof real === 'string') {
      rootReal = real;
    }
  } catch {
    // Ignore; fall back to resolved path. This typically only happens in tests (mocked fs)
    // or if the root directory does not exist.
  }

  let candidateReal = candidateResolved;
  try {
    const real = await fs.realpath(candidateResolved);
    if (typeof real === 'string') {
      candidateReal = real;
    }
  } catch {
    // Ignore; for non-existent files/dirs we still get protection from the resolved-path check.
  }

  if (!isPathInsideRoot(rootReal, candidateReal)) {
    return null;
  }

  return candidateReal;
}
