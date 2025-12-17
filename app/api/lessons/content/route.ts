import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';
import { resolvePathWithinRoot } from '@/lib/utils/safe-path';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'lessons');

/**
 * Serve MDX lesson content for an authenticated user using the requested lesson path and experience level.
 *
 * Expects query parameters `path` (relative lesson path) and `level` (`beginner`, `intermediate`, or `advanced`).
 *
 * @param request - The incoming NextRequest whose search params must include `path` and `level`.
 * @returns On success, a JSON object with `source` containing the MDX file contents and `level` indicating the requested experience level. On failure, a JSON object with an `error` message describing the problem.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const lessonPath = searchParams.get('path');
  const level = searchParams.get('level') as ExperienceLevel;

  if (!lessonPath || !level) {
    return NextResponse.json(
      { error: 'Missing path or level parameter' },
      { status: 400 }
    );
  }

  if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
    return NextResponse.json(
      { error: 'Invalid level' },
      { status: 400 }
    );
  }

  try {
    console.log('[API] Loading lesson content:', { lessonPath, level, CONTENT_DIR });
    
    const mdxPath = await resolvePathWithinRoot(CONTENT_DIR, lessonPath, `${level}.mdx`);
    console.log('[API] Resolved MDX path:', mdxPath);
    
    if (!mdxPath) {
      console.error('[API] Invalid path - could not resolve:', lessonPath, level);
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }
    const source = await readFile(mdxPath, 'utf-8');
    console.log('[API] Loaded content, first 100 chars:', source.substring(0, 100));
    
    // Allow caching - lesson MDX content is static
    return NextResponse.json(
      { source, level },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Failed to load lesson content:', error);
    return NextResponse.json(
      { error: 'Lesson content not found' },
      { status: 404 }
    );
  }
}

// Allow caching - lesson content is static MDX
export const revalidate = 3600; // Revalidate every hour