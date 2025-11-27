"use server";

/**
 * Interview Server Actions
 * Handles interview CRUD operations and AI content generation
 * Requirements: 2.3, 3.1, 5.1, 10.2, 10.3
 *
 * NOTE: Streaming functions have been migrated to API routes.
 * See /api/interview/[id]/generate and /api/interview/[id]/add-more
 */

import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { resumeParser } from "@/lib/services/resume-parser";
import { aiEngine } from "@/lib/services/ai-engine";
import {
  logAIRequest,
  createLoggerContext,
  extractTokenUsage,
} from "@/lib/services/ai-logger";
import { CreateInterviewInputSchema } from "@/lib/schemas/input";
import { createAPIError, type APIError } from "@/lib/schemas/error";

import type { Interview } from "@/lib/db/schemas/interview";
import { DEFAULT_AI_CONCURRENCY_LIMIT } from "../constants";

/**
 * Result type for server actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: APIError };

/**
 * Input for creating an interview with file upload
 */
export interface CreateInterviewActionInput {
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeFile?: File;
  resumeText?: string;
  excludedModules?: string[];
}

/**
 * Input for creating an interview from a natural language prompt
 */
export interface CreateInterviewFromPromptInput {
  prompt: string;
  excludedModules?: string[];
}

/**
 * Create a new interview from a natural language prompt
 * Requirements: 2.3 - Simplified interview creation
 */
export async function createInterviewFromPrompt(
  input: CreateInterviewFromPromptInput
): Promise<ActionResult<Interview>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();

    // Get user from database to check limits
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "User not found. Please complete onboarding."
        ),
      };
    }

    // Check interview limits (unless BYOK)
    const isByok = await hasByokApiKey();
    if (!isByok) {
      const interviews = user.interviews ?? {
        count: 0,
        limit: 3,
        resetDate: new Date(),
      };
      if (interviews.count >= interviews.limit) {
        return {
          success: false,
          error: createAPIError(
            "RATE_LIMIT",
            `You have reached your ${user.plan} plan limit of ${
              interviews.limit
            } interviews. Please upgrade or wait until ${interviews.resetDate.toLocaleDateString()}.`,
            { plan: user.plan, limit: String(interviews.limit) },
            Math.floor((interviews.resetDate.getTime() - Date.now()) / 1000)
          ),
        };
      }
    }

    // Validate prompt
    if (!input.prompt || input.prompt.trim().length < 10) {
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          "Please provide a more detailed prompt (at least 10 characters)"
        ),
      };
    }

    // Get BYOK API key and tier config if available
    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Create logger context for prompt parsing
    const loggerCtx = createLoggerContext({
      streaming: false,
      byokUsed: !!apiKey,
    });

    // Parse the prompt using AI - generateObject returns a promise that resolves to the object directly
    const result = await aiEngine.parseInterviewPrompt(
      input.prompt.trim(),
      {},
      apiKey ?? undefined,
      byokTierConfig ?? undefined
    );
    const parsedDetails = result.object;

    // Log the parse prompt request
    const usage = result.usage;
    const modelId = result.modelId;

    // We'll log with a placeholder interview ID since we haven't created it yet
    // This will be updated after interview creation
    await logAIRequest({
      interviewId: "prompt-parse",
      userId: user._id,
      action: "PARSE_PROMPT",
      model: modelId,
      prompt: input.prompt.trim(),
      response: JSON.stringify(parsedDetails),
      tokenUsage: extractTokenUsage(usage),
      latencyMs: loggerCtx.getLatencyMs(),
      metadata: loggerCtx.metadata,
    });

    // Validate excluded modules
    const validModules = ['openingBrief', 'revisionTopics', 'mcqs', 'rapidFire'] as const;
    const excludedModules = (input.excludedModules ?? []).filter(
      (m): m is typeof validModules[number] => validModules.includes(m as typeof validModules[number])
    );

    // Create interview record
    const interview = await interviewRepository.create({
      userId: user._id,
      isPublic: false,
      jobDetails: {
        title: parsedDetails.jobTitle,
        company: parsedDetails.company,
        description: parsedDetails.jobDescription,
      },
      resumeContext: parsedDetails.resumeContext ?? "",
      modules: {
        revisionTopics: [],
        mcqs: [],
        rapidFire: [],
      },
      excludedModules,
    });

    // Increment interview count (unless BYOK)
    if (!isByok) {
      await userRepository.incrementInterview(clerkId);
    }

    return { success: true, data: interview };
  } catch (error) {
    console.error("createInterviewFromPrompt error:", error);
    return {
      success: false,
      error: createAPIError(
        "AI_ERROR",
        "Failed to parse your prompt. Please try again or use the detailed form."
      ),
    };
  }
}

/**
 * Create a new interview with validation and resume parsing
 * Requirements: 2.3, 10.2
 */
export async function createInterview(
  input: CreateInterviewActionInput
): Promise<ActionResult<Interview>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();

    // Get user from database to check limits
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "User not found. Please complete onboarding."
        ),
      };
    }

    // Check interview limits (unless BYOK)
    const isByok = await hasByokApiKey();
    if (!isByok) {
      const interviews = user.interviews ?? {
        count: 0,
        limit: 3,
        resetDate: new Date(),
      };
      if (interviews.count >= interviews.limit) {
        return {
          success: false,
          error: createAPIError(
            "RATE_LIMIT",
            `You have reached your ${user.plan} plan limit of ${
              interviews.limit
            } interviews. Please upgrade or wait until ${interviews.resetDate.toLocaleDateString()}.`,
            { plan: user.plan, limit: String(interviews.limit) },
            Math.floor((interviews.resetDate.getTime() - Date.now()) / 1000)
          ),
        };
      }
    }

    // Parse resume text from file if provided
    let resumeText = input.resumeText;
    if (input.resumeFile && !resumeText) {
      const buffer = Buffer.from(await input.resumeFile.arrayBuffer());
      const parseResult = await resumeParser.parse(
        buffer,
        input.resumeFile.name
      );

      if (!parseResult.success) {
        return { success: false, error: parseResult.error };
      }
      resumeText = parseResult.data.text;
    }

    // Validate input
    const validationResult = CreateInterviewInputSchema.safeParse({
      jobTitle: input.jobTitle,
      company: input.company,
      jobDescription: input.jobDescription,
      resumeText,
    });

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.entries(fieldErrors)[0];
      return {
        success: false,
        error: createAPIError(
          "VALIDATION_ERROR",
          firstError
            ? `${firstError[0]}: ${firstError[1]?.[0]}`
            : "Invalid input",
          Object.fromEntries(
            Object.entries(fieldErrors).map(([k, v]) => [
              k,
              v?.[0] ?? "Invalid",
            ])
          )
        ),
      };
    }

    // Validate excluded modules
    const validModulesDetailed = ['openingBrief', 'revisionTopics', 'mcqs', 'rapidFire'] as const;
    const excludedModules = (input.excludedModules ?? []).filter(
      (m): m is typeof validModulesDetailed[number] => validModulesDetailed.includes(m as typeof validModulesDetailed[number])
    );

    // Create interview record
    const interview = await interviewRepository.create({
      userId: user._id,
      isPublic: false,
      jobDetails: {
        title: validationResult.data.jobTitle,
        company: validationResult.data.company,
        description: validationResult.data.jobDescription,
      },
      resumeContext: resumeText ?? "",
      modules: {
        revisionTopics: [],
        mcqs: [],
        rapidFire: [],
      },
      excludedModules,
    });

    // Increment interview count (unless BYOK)
    if (!isByok) {
      await userRepository.incrementInterview(clerkId);
    }

    return { success: true, data: interview };
  } catch (error) {
    console.error("createInterview error:", error);
    return {
      success: false,
      error: createAPIError(
        "DATABASE_ERROR",
        "Failed to create interview. Please try again."
      ),
    };
  }
}

/**
 * Delete an interview (AI logs are preserved for admin monitoring)
 * Requirements: 10.3
 */
export async function deleteInterview(
  interviewId: string
): Promise<ActionResult<void>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    if (!interview) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Interview not found"),
      };
    }

    // Verify ownership
    if (interview.userId !== user._id) {
      return {
        success: false,
        error: createAPIError(
          "AUTH_ERROR",
          "Not authorized to delete this interview"
        ),
      };
    }

    // Note: AI logs are intentionally NOT deleted to preserve admin monitoring data
    // Delete the interview
    await interviewRepository.delete(interviewId);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteInterview error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to delete interview"),
    };
  }
}

/**
 * Get an interview by ID
 */
export async function getInterview(
  interviewId: string
): Promise<ActionResult<Interview>> {
  try {
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    if (!interview) {
      return {
        success: false,
        error: createAPIError("NOT_FOUND", "Interview not found"),
      };
    }

    // Verify ownership (unless public)
    if (interview.userId !== user._id && !interview.isPublic) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "Not authorized"),
      };
    }

    return { success: true, data: interview };
  } catch (error) {
    console.error("getInterview error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get interview"),
    };
  }
}

/**
 * Get all interviews for the current user
 */
export async function getUserInterviews(): Promise<ActionResult<Interview[]>> {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const interviews = await interviewRepository.findByUserId(user._id);
    return { success: true, data: interviews };
  } catch (error) {
    console.error("getUserInterviews error:", error);
    return {
      success: false,
      error: createAPIError("DATABASE_ERROR", "Failed to get interviews"),
    };
  }
}

/**
 * Get the current AI concurrency limit setting
 * This is used by the client to control parallel module generation
 */
export async function getAIConcurrencyLimit(): Promise<number> {
  const { getSettingsCollection } = await import("@/lib/db/collections");
  const { SETTINGS_KEYS } = await import("@/lib/db/schemas/settings");

  const DEFAULT_CONCURRENCY = DEFAULT_AI_CONCURRENCY_LIMIT;

  try {
    const collection = await getSettingsCollection();
    const doc = await collection.findOne({
      key: SETTINGS_KEYS.AI_CONCURRENCY_LIMIT,
    });
    return doc ? (doc.value as number) : DEFAULT_CONCURRENCY;
  } catch {
    return DEFAULT_CONCURRENCY;
  }
}
