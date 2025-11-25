/**
 * AI Logger Service
 * Logs all AI generation requests with full metadata
 * Requirements: 9.2
 */

import { aiLogRepository } from '@/lib/db/repositories/ai-log-repository';
import { type AIAction, type CreateAILog } from '@/lib/db/schemas/ai-log';

export interface AILogEntry {
  interviewId: string;
  userId: string;
  action: AIAction;
  model: string;
  prompt: string;
  response: string;
  toolsUsed?: string[];
  searchQueries?: string[];
  tokenUsage: {
    input: number;
    output: number;
  };
  latencyMs: number;
}

/**
 * Log an AI generation request
 * Requirements: 9.2
 */
export async function logAIRequest(entry: AILogEntry): Promise<void> {
  const logData: CreateAILog = {
    interviewId: entry.interviewId,
    userId: entry.userId,
    action: entry.action,
    model: entry.model,
    prompt: entry.prompt,
    response: entry.response,
    toolsUsed: entry.toolsUsed ?? [],
    searchQueries: entry.searchQueries ?? [],
    tokenUsage: entry.tokenUsage,
    latencyMs: entry.latencyMs,
    timestamp: new Date(),
  };

  try {
    await aiLogRepository.create(logData);
  } catch (error) {
    // Log error but don't throw - logging should not break the main flow
    console.error('Failed to log AI request:', error);
  }
}


/**
 * Create a logger context for tracking a generation request
 * This helps collect metadata during streaming
 */
export interface LoggerContext {
  startTime: number;
  toolsUsed: string[];
  searchQueries: string[];
  addToolUsage(toolName: string): void;
  addSearchQuery(query: string): void;
  getLatencyMs(): number;
}

export function createLoggerContext(): LoggerContext {
  const startTime = Date.now();
  const toolsUsed: string[] = [];
  const searchQueries: string[] = [];

  return {
    startTime,
    toolsUsed,
    searchQueries,
    addToolUsage(toolName: string) {
      if (!toolsUsed.includes(toolName)) {
        toolsUsed.push(toolName);
      }
    },
    addSearchQuery(query: string) {
      searchQueries.push(query);
    },
    getLatencyMs() {
      return Date.now() - startTime;
    },
  };
}

/**
 * Helper to extract token usage from AI SDK response
 * Handles both LanguageModelV2Usage and legacy formats
 */
export function extractTokenUsage(usage?: Record<string, unknown>): {
  input: number;
  output: number;
} {
  if (!usage) {
    return { input: 0, output: 0 };
  }
  
  // Handle LanguageModelV2Usage format (promptTokens, completionTokens)
  // and also handle potential variations (inputTokens, outputTokens)
  const input = (usage.promptTokens ?? usage.inputTokens ?? 0) as number;
  const output = (usage.completionTokens ?? usage.outputTokens ?? 0) as number;
  
  return { input, output };
}

/**
 * AI Logger interface for dependency injection
 */
export interface AILogger {
  logAIRequest(entry: AILogEntry): Promise<void>;
  createLoggerContext(): LoggerContext;
  extractTokenUsage(usage?: Record<string, unknown>): {
    input: number;
    output: number;
  };
}

export const aiLogger: AILogger = {
  logAIRequest,
  createLoggerContext,
  extractTokenUsage,
};
