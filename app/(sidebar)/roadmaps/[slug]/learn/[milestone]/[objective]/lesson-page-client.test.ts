// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import type { ExperienceLevel } from '@/lib/db/schemas/lesson-progress';

import { LessonPageClient } from './lesson-page-client';

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('@/mdx-components', () => ({
  useMDXComponents: () => ({}),
}));

// Keep ProgressProvider real; mock hook usage is inside component.

vi.mock('@/components/learn/experience-selector', () => ({
  ExperienceSelector: ({ onLevelChange }: { onLevelChange: (l: ExperienceLevel) => void }) => (
    React.createElement('button', { onClick: () => onLevelChange('intermediate') }, 'Switch to intermediate')
  ),
}));

vi.mock('@/components/learn/progress-tracker', () => ({
  ProgressTracker: () => null,
}));

vi.mock('@/components/learn/xp-display', () => ({
  XPDisplay: () => null,
}));

vi.mock('@/components/learn/xp-award-animation', () => ({
  XPAwardAnimation: () => null,
}));

vi.mock('@/components/learn/section-sidebar', () => ({
  SectionSidebar: () => null,
}));

vi.mock('@/components/learn/next-lesson-suggestion', () => ({
  NextLessonSuggestion: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/actions/gamification', () => ({
  completeLessonAction: vi.fn(),
  resetLessonAction: vi.fn(),
  recordQuizAnswerAction: vi.fn(),
}));

vi.mock('@/lib/hooks/use-objective-progress', () => ({
  saveObjectiveProgress: vi.fn(),
  clearObjectiveProgress: vi.fn(),
}));

vi.mock('@/components/learn/zen-mode', () => ({
  ZenModeProvider: ({ children }: { children: React.ReactNode }) => children,
  ZenModeOverlay: ({ children }: { children: React.ReactNode }) => children,
  ZenModeToggle: () => null,
  useZenMode: () => ({
    isZenMode: false,
    setAdjacentLessons: vi.fn(),
    enterZenMode: vi.fn(),
  }),
}));

// Render the compiledSource so we can assert which MDX is currently displayed
vi.mock('next-mdx-remote', () => ({
  MDXRemote: (props: any) => React.createElement('div', { 'data-testid': 'mdx' }, props.compiledSource ?? ''),
}));

vi.mock('remark-gfm', () => ({
  default: () => null,
}));

vi.mock('next-mdx-remote/serialize', () => ({
  serialize: vi.fn(async (source: string) => ({
    compiledSource: `SERIALIZED:${source}`,
    scope: {},
    frontmatter: {},
  })),
}));

describe('LessonPageClient - level switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        source: 'INTERMEDIATE_SOURCE',
        level: 'intermediate',
      }),
    }));
  });

  it('updates displayed MDX when switching levels even though ProgressProvider remounts', async () => {
    const initialMdx: MDXRemoteSerializeResult = {
      compiledSource: 'BEGINNER_COMPILED',
      scope: {},
      frontmatter: {},
    };

    render(
      React.createElement(LessonPageClient, {
        lessonId: 'rest-design/http-methods',
        lessonTitle: 'HTTP Methods',
        milestoneId: 'rest-design',
        milestoneTitle: 'REST Design',
        roadmapSlug: 'backend',
        sections: ['a', 'b'],
        initialLevel: 'beginner' as ExperienceLevel,
        initialMdxSource: initialMdx,
        initialCompletedSections: [],
        initialTimeSpent: 0,
        isLessonCompleted: false,
        initialGamification: null,
        nextLessonSuggestion: null,
        adjacentLessons: null,
      })
    );

    // Sanity check initial content
    expect(screen.getByTestId('mdx').textContent).toBe('BEGINNER_COMPILED');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to intermediate' }));

    await waitFor(() => {
      expect(screen.getByTestId('mdx').textContent).toBe('SERIALIZED:INTERMEDIATE_SOURCE');
    });

    // Ensure the API was actually called
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});
