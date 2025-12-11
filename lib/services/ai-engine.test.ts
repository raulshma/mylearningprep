import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTopics } from './ai-engine';
import { streamObject } from 'ai';

// Mock the ai module
vi.mock('ai', () => ({
    streamObject: vi.fn(() => ({
        toTextStreamResponse: () => { },
        pipeThrough: () => { },
    })),
    tool: vi.fn(),
}));

// Mock db calls
vi.mock('@/lib/db/tier-config', () => ({
    getTierConfigFromDB: vi.fn().mockResolvedValue({
        primaryModel: 'test-model',
        temperature: 0.7,
        maxTokens: 4096,
    }),
}));

describe('ai-engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate topics with optimized prompt', async () => {
        const ctx = {
            jobTitle: 'Senior React Developer',
            company: 'TechCorp',
            jobDescription: 'We need a React expert.',
            resumeText: 'I am a React expert.',
            planContext: { plan: 'PRO' as const },
        };

        await generateTopics(ctx, 8, {}, 'test-key');

        expect(streamObject).toHaveBeenCalled();
        const callArgs = vi.mocked(streamObject).mock.calls[0][0];

        // Check if prompt contains the current content structure
        expect(callArgs.prompt).toContain('1000-1500 words');
        expect(callArgs.prompt).toContain('DETAILED markdown content');
        expect(callArgs.prompt).toContain('Key Concepts');
        expect(callArgs.prompt).toContain('Code Example');
        expect(callArgs.prompt).toContain('Common Interview Questions');
        expect(callArgs.prompt).toContain('Best Practices');
        expect(callArgs.prompt).toContain('Common Mistakes');

        // Check that prompt includes required topic fields
        expect(callArgs.prompt).toContain('estimatedMinutes');
        expect(callArgs.prompt).toContain('prerequisites');
        expect(callArgs.prompt).toContain('skillGaps');
        expect(callArgs.prompt).toContain('followUpQuestions');
        expect(callArgs.prompt).toContain('difficulty');
    });
});
