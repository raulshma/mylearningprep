import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import fs from 'fs/promises';
import path from 'path';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';
import { resolvePathWithinRoot } from '@/lib/utils/safe-path';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'lessons');

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
    const source = await fs.readFile(mdxPath, 'utf-8');
    console.log('[API] Loaded content, first 100 chars:', source.substring(0, 100));
    
    // Return with no-cache headers to ensure fresh content
    return NextResponse.json(
      { source, level },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
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

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
