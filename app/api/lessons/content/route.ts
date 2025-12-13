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
    const mdxPath = await resolvePathWithinRoot(CONTENT_DIR, lessonPath, `${level}.mdx`);
    if (!mdxPath) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }
    const source = await fs.readFile(mdxPath, 'utf-8');
    
    return NextResponse.json({ source, level });
  } catch (error) {
    console.error('Failed to load lesson content:', error);
    return NextResponse.json(
      { error: 'Lesson content not found' },
      { status: 404 }
    );
  }
}
