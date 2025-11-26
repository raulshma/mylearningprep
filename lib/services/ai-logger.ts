/**
 * AI Logger Service
 * Logs all AI generation requests with full metadata and observability
 * Requirements: 9.2
 */

import { aiLogRepository } from '@/lib/db/repositories/ai-log-repository';
import { type AIAction, type AIStatus, type AIMetadata, type CreateAILog } from '@/lib/db/schemas/ai-log';
import { estimateCost as getEstimatedCost } from './openrouter-pricing';

export interface SearchResultEntry {
  query: string;
  resultCount: number;
  sources: string[];
}

export interface AILogEntry {
  interviewId: string;
  userId: string;
  action: AIAction;
  status?: AIStatus;
  model: string;
  prompt: string;
  systemPrompt?: string;
  response: string;
  errorMessage?: string;
  errorCode?: string;
  toolsUsed?: string[];
  searchQueries?: string[];
  searchResults?: SearchResultEntry[];
  tokenUsage: {
    input: number;
    output: number;
  };
  latencyMs: number;
  timeToFirstToken?: number;
  metadata?: AIMetadata;
}

/**
 * Log an AI generation request with full observability
 * Requirements: 9.2
 */
export async function logAIRequest(entry: AILogEntry): Promise<string | null> {
  // Get cost estimate from OpenRouter pricing (cached)
  const estimatedCost = await getEstimatedCost(
    entry.model,
    entry.tokenUsage.input,
    entry.tokenUsage.output
  );

  const logData: CreateAILog = {
    interviewId: entry.interviewId,
    userId: entry.userId,
    action: entry.action,
    status: entry.status ?? 'success',
    model: entry.model,
    prompt: entry.prompt,
    systemPrompt: entry.systemPrompt,
    response: entry.response,
    errorMessage: entry.errorMessage,
    errorCode: entry.errorCode,
    toolsUsed: entry.toolsUsed ?? [],
    searchQueries: entry.searchQueries ?? [],
    searchResults: entry.searchResults ?? [],
    tokenUsage: entry.tokenUsage,
    estimatedCost,
    latencyMs: entry.latencyMs,
    timeToFirstToken: entry.timeToFirstToken,
    metadata: entry.metadata,
    timestamp: new Date(),
  };

  try {
    const log = await aiLogRepository.create(logData);
    return log._id;
  } catch (error) {
    // Log error but don't throw - logging should not break the main flow
    console.error('Failed to log AI request:', error);
    return null;
  }
}

/**
 * Log an AI error
 */
export async function logAIError(
  entry: Omit<AILogEntry, 'response' | 'status'> & {
    errorMessage: string;
    errorCode?: string;
  }
): Promise<string | null> {
  return logAIRequest({
    ...entry,
    status: 'error',
    response: '',
  });
}


/**
 * Create a logger context for tracking a generation request
 * This helps collect metadata during streaming with full observability
 */
export interface LoggerContext {
  startTime: number;
  firstTokenTime: number | null;
  toolsUsed: string[];
  searchQueries: string[];
  searchResults: SearchResultEntry[];
  metadata: Partial<AIMetadata>;
  addToolUsage(toolName: string): void;
  addSearchQuery(query: string): void;
  addSearchResult(result: SearchResultEntry): void;
  markFirstToken(): void;
  setMetadata(meta: Partial<AIMetadata>): void;
  getLatencyMs(): number;
  getTimeToFirstToken(): number | undefined;
}

export function createLoggerContext(initialMetadata?: Partial<AIMetadata>): LoggerContext {
  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  const toolsUsed: string[] = [];
  const searchQueries: string[] = [];
  const searchResults: SearchResultEntry[] = [];
  const metadata: Partial<AIMetadata> = { ...initialMetadata };

  return {
    startTime,
    get firstTokenTime() { return firstTokenTime; },
    toolsUsed,
    searchQueries,
    searchResults,
    metadata,
    addToolUsage(toolName: string) {
      if (!toolsUsed.includes(toolName)) {
        toolsUsed.push(toolName);
      }
    },
    addSearchQuery(query: string) {
      searchQueries.push(query);
    },
    addSearchResult(result: SearchResultEntry) {
      searchResults.push(result);
    },
    markFirstToken() {
      if (firstTokenTime === null) {
        firstTokenTime = Date.now();
      }
    },
    setMetadata(meta: Partial<AIMetadata>) {
      Object.assign(metadata, meta);
    },
    getLatencyMs() {
      return Date.now() - startTime;
    },
    getTimeToFirstToken() {
      return firstTokenTime ? firstTokenTime - startTime : undefined;
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
 * Extract stop reason from AI SDK response
 */
export function extractStopReason(response?: Record<string, unknown>): string | undefined {
  if (!response) return undefined;
  return (response.finishReason ?? response.stopReason ?? response.stop_reason) as string | undefined;
}

/**
 * Type for AI SDK stream result with potential model info
 */
interface AIStreamResult {
  // Vercel AI SDK experimental_providerMetadata contains provider-specific info
  experimental_providerMetadata?: {
    openrouter?: {
      model?: string;
    };
  };
  // Some results have response with modelId
  response?: {
    modelId?: string;
  };
  // Direct modelId on result
  modelId?: string;
  // rawResponse for older SDK versions
  rawResponse?: {
    headers?: {
      get?: (name: string) => string | null;
    };
  };
}

/**
 * Extract model ID from AI SDK result
 * Tries multiple locations where the model ID might be stored
 */
export function extractModelId(
  result: unknown,
  fallback: string = 'unknown'
): string {
  const typedResult = result as AIStreamResult;
  
  // Try experimental_providerMetadata (OpenRouter specific)
  const providerModel = typedResult?.experimental_providerMetadata?.openrouter?.model;
  if (providerModel) return providerModel;
  
  // Try response.modelId (Vercel AI SDK standard)
  const responseModelId = typedResult?.response?.modelId;
  if (responseModelId) return responseModelId;
  
  // Try direct modelId
  const directModelId = typedResult?.modelId;
  if (directModelId) return directModelId;
  
  // Try rawResponse headers (older approach)
  const modelFromHeader = typedResult?.rawResponse?.headers?.get?.('x-model');
  if (modelFromHeader) return modelFromHeader;
  
  return fallback;
}

/**
 * AI Logger interface for dependency injection
 */
export interface AILogger {
  logAIRequest(entry: AILogEntry): Promise<string | null>;
  logAIError(entry: Omit<AILogEntry, 'response' | 'status'> & { errorMessage: string; errorCode?: string }): Promise<string | null>;
  createLoggerContext(initialMetadata?: Partial<AIMetadata>): LoggerContext;
  extractTokenUsage(usage?: Record<string, unknown>): { input: number; output: number };
  extractStopReason(response?: Record<string, unknown>): string | undefined;
}

export const aiLogger: AILogger = {
  logAIRequest,
  logAIError,
  createLoggerContext,
  extractTokenUsage,
  extractStopReason,
};
