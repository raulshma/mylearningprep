import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import fs from 'fs/promises';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock fs
vi.mock('fs/promises');

describe('Lessons Content API - CSS Lessons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: null });

    const request = new NextRequest('http://localhost:3000/api/lessons/content?path=css/selectors&level=beginner');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if path parameter is missing', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const request = new NextRequest('http://localhost:3000/api/lessons/content?level=beginner');
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing path or level parameter');
  });

  it('returns 400 if level parameter is missing', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const request = new NextRequest('http://localhost:3000/api/lessons/content?path=css/selectors');
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing path or level parameter');
  });

  it('returns 400 if level is invalid', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const request = new NextRequest('http://localhost:3000/api/lessons/content?path=css/selectors&level=expert');
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid level');
  });

  it('loads beginner level content for CSS selectors', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const mockContent = '# CSS Selectors - Beginner\n\nLearn the basics of CSS selectors.';
    (fs.readFile as any).mockResolvedValue(mockContent);

    const request = new NextRequest('http://localhost:3000/api/lessons/content?path=css/selectors&level=beginner');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.source).toBe(mockContent);
    expect(data.level).toBe('beginner');
  });

  it('loads intermediate level content for CSS selectors', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const mockContent = '# CSS Selectors - Intermediate\n\nAdvanced selector techniques.';
    (fs.readFile as any).mockResolvedValue(mockContent);

    const request = new NextRequest('http://localhost:3000/api/lessons/content?path=css/selectors&level=intermediate');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.source).toBe(mockContent);
    expect(data.level).toBe('intermediate');
  });

  it('loads advanced level content for CSS selectors', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const mockContent = '# CSS Selectors - Advanced\n\nMaster complex selectors.';
    (fs.readFile as any).mockResolvedValue(mockContent);

    const request = new NextRequest('http://localhost:3000/api/lessons/content?path=css/selectors&level=advanced');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.source).toBe(mockContent);
    expect(data.level).toBe('advanced');
  });

  it('returns 404 if lesson file does not exist', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    (fs.readFile as any).mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const request = new NextRequest('http://localhost:3000/api/lessons/content?path=css/nonexistent&level=beginner');
    const response = await GET(request);
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Lesson content not found');
  });

  it('returns 400 for path traversal attempts and does not read files', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const request = new NextRequest(
      'http://localhost:3000/api/lessons/content?path=../secret&level=beginner'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid path');
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('returns 400 for absolute/windows paths and does not read files', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const absoluteRequest = new NextRequest(
      'http://localhost:3000/api/lessons/content?path=/etc/passwd&level=beginner'
    );
    const absoluteResponse = await GET(absoluteRequest);
    expect(absoluteResponse.status).toBe(400);
    expect((await absoluteResponse.json()).error).toBe('Invalid path');

    const windowsRequest = new NextRequest(
      'http://localhost:3000/api/lessons/content?path=C:/Windows/System32&level=beginner'
    );
    const windowsResponse = await GET(windowsRequest);
    expect(windowsResponse.status).toBe(400);
    expect((await windowsResponse.json()).error).toBe('Invalid path');

    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('loads content for all CSS lesson topics', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const cssTopics = [
      'css/selectors',
      'css/box-model',
      'css/positioning',
      'css/flexbox',
      'css/grid',
      'css/typography',
      'css/colors',
      'css/responsive-design',
      'css/animations',
      'css/transforms',
    ];

    for (const topic of cssTopics) {
      const mockContent = `# ${topic} - Beginner`;
      (fs.readFile as any).mockResolvedValue(mockContent);

      const request = new NextRequest(`http://localhost:3000/api/lessons/content?path=${topic}&level=beginner`);
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.source).toBe(mockContent);
      expect(data.level).toBe('beginner');
    }
  });

  it('loads content for all experience levels', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as any).mockResolvedValue({ userId: 'user123' });

    const levels = ['beginner', 'intermediate', 'advanced'];

    for (const level of levels) {
      const mockContent = `# CSS Selectors - ${level}`;
      (fs.readFile as any).mockResolvedValue(mockContent);

      const request = new NextRequest(`http://localhost:3000/api/lessons/content?path=css/selectors&level=${level}`);
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.source).toBe(mockContent);
      expect(data.level).toBe(level);
    }
  });
});
