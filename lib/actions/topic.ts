'use server';

/**
 * Topic Server Actions
 * Handles topic deep dive and analogy mode regeneration
 * Requirements: 6.2, 6.3, 6.4
 */

import { createStreamableValue } from '@ai-sdk/rsc';
import { getAuthUserId, getByokApiKey, hasByokApiKey } from '@/lib/auth/get-user';
import { interviewRepository } from '@/lib/db/repositories/interview-repository';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { aiEngine, type GenerationContext } from '@/lib/services/ai-engine';
import { logAIRequest, createLoggerContext, extractTokenUsage, extractModelId } from '@/lib/services/ai-logger';
import { createAPIError, type APIError } from '@/lib/schemas/error';
import type { RevisionTopic } from '@/lib/db/schemas/interview';
import { getSettingsCollection } from '@/lib/db/collections';
import { SETTINGS_KEYS } from '@/lib/db/schemas/settings';

/**
 * Get the configured default model from database
 */
async function getConfiguredModel(): Promise<string> {
  try {
    const collection = await getSettingsCollection();
    const doc = await collection.findOne({ key: SETTINGS_KEYS.DEFAULT_MODEL });
    return (doc?.value as string) || 'anthropic/claude-sonnet-4';
  } catch {
    return 'anthropic/claude-sonnet-4';
  }
}

/**
 * Result type for server actions
 */
export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: APIError };

/**
 * Analogy style type
 */
export type AnalogyStyle = 'professional' | 'construction' | 'simple';

/**
 * Regenerate a topic's explanation with a different analogy style
 * Preserves topic identity (ID, title, reason) while updating content and style
 * Requirements: 6.2, 6.3, 6.4
 */
export async function regenerateAnalogy(
  interviewId: string,
  topicId: string,
  style: AnalogyStyle
) {
  const stream = createStreamableValue<string>('');

  (async () => {
    try {
      // Get authenticated user
      const clerkId = await getAuthUserId();
      const user = await userRepository.findByClerkId(clerkId);
      
      if (!user) {
        stream.error(createAPIError('AUTH_ERROR', 'User not found'));
        return;
      }

      // Get interview
      const interview = await interviewRepository.findById(interviewId);
      if (!interview) {
        stream.error(createAPIError('NOT_FOUND', 'Interview not found'));
        return;
      }

      // Verify ownership
      if (interview.userId !== user._id) {
        stream.error(createAPIError('AUTH_ERROR', 'Not authorized'));
        return;
      }

      // Find the topic
      const topic = interview.modules.revisionTopics.find(t => t.id === topicId);
      if (!topic) {
        stream.error(createAPIError('NOT_FOUND', 'Topic not found'));
        return;
      }

      // Check iteration limits (unless BYOK)
      const isByok = await hasByokApiKey();
      if (!isByok) {
        if (user.iterations.count >= user.iterations.limit) {
          stream.error(createAPIError('RATE_LIMIT', 'Iteration limit reached'));
          return;
        }
        await userRepository.incrementIteration(clerkId);
      }

      // Get BYOK API key if available
      const apiKey = await getByokApiKey();

      // Get configured model for logging
      const configuredModel = await getConfiguredModel();

      // Build generation context
      const ctx: GenerationContext = {
        resumeText: interview.resumeContext,
        jobDescription: interview.jobDetails.description,
        jobTitle: interview.jobDetails.title,
        company: interview.jobDetails.company,
      };

      const loggerCtx = createLoggerContext({
        streaming: true,
        byokUsed: !!apiKey,
      });
      let responseText = '';

      // Generate new analogy
      // Requirements: 6.3 - Preserve topic context while regenerating explanation style
      const result = await aiEngine.regenerateTopicAnalogy(
        topic,
        style,
        ctx,
        {},
        apiKey ?? undefined
      );

      let firstTokenMarked = false;
      for await (const partialObject of result.partialObjectStream) {
        if (partialObject.content) {
          if (!firstTokenMarked) {
            loggerCtx.markFirstToken();
            firstTokenMarked = true;
          }
          stream.update(partialObject.content);
          responseText = partialObject.content;
        }
      }

      const finalObject = await result.object;

      // Requirements: 6.4 - Store the style preference in the topic record
      // Update only content and style, preserving ID, title, and reason
      await interviewRepository.updateTopicStyle(
        interviewId,
        topicId,
        finalObject.content,
        style
      );

      // Log the request with full metadata
      const usage = await result.usage;
      const modelId = extractModelId(result, configuredModel);
      await logAIRequest({
        interviewId,
        userId: user._id,
        action: 'REGENERATE_ANALOGY',
        model: modelId,
        prompt: `Regenerate topic "${topic.title}" with ${style} style`,
        response: responseText,
        toolsUsed: loggerCtx.toolsUsed,
        searchQueries: loggerCtx.searchQueries,
        searchResults: loggerCtx.searchResults,
        tokenUsage: extractTokenUsage(usage),
        latencyMs: loggerCtx.getLatencyMs(),
        timeToFirstToken: loggerCtx.getTimeToFirstToken(),
        metadata: loggerCtx.metadata,
      });

      stream.done();
    } catch (error) {
      console.error('regenerateAnalogy error:', error);
      stream.error(createAPIError('AI_ERROR', 'Failed to regenerate analogy'));
    }
  })();

  return { stream: stream.value };
}

/**
 * Get a specific topic from an interview
 */
export async function getTopic(
  interviewId: string,
  topicId: string
): Promise<ActionResult<RevisionTopic>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);
    
    if (!user) {
      return {
        success: false,
        error: createAPIError('AUTH_ERROR', 'User not found'),
      };
    }

    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      return {
        success: false,
        error: createAPIError('NOT_FOUND', 'Interview not found'),
      };
    }

    // Verify ownership (unless public)
    if (interview.userId !== user._id && !interview.isPublic) {
      return {
        success: false,
        error: createAPIError('AUTH_ERROR', 'Not authorized'),
      };
    }

    const topic = interview.modules.revisionTopics.find(t => t.id === topicId);
    if (!topic) {
      return {
        success: false,
        error: createAPIError('NOT_FOUND', 'Topic not found'),
      };
    }

    return { success: true, data: topic };
  } catch (error) {
    console.error('getTopic error:', error);
    return {
      success: false,
      error: createAPIError('DATABASE_ERROR', 'Failed to get topic'),
    };
  }
}

