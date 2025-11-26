"use server";

/**
 * Interview Server Actions
 * Handles interview CRUD operations and AI content generation
 * Requirements: 2.3, 3.1, 5.1, 10.2, 10.3
 */

import { createStreamableValue } from "@ai-sdk/rsc";
import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
} from "@/lib/auth/get-user";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { aiLogRepository } from "@/lib/db/repositories/ai-log-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { resumeParser } from "@/lib/services/resume-parser";
import { aiEngine, type GenerationContext } from "@/lib/services/ai-engine";
import {
  logAIRequest,
  createLoggerContext,
  extractTokenUsage,
  extractModelId,
} from "@/lib/services/ai-logger";
import {
  CreateInterviewInputSchema,
  AddMoreInputSchema,
} from "@/lib/schemas/input";
import { createAPIError, type APIError } from "@/lib/schemas/error";
import { getSettingsCollection } from "@/lib/db/collections";
import { SETTINGS_KEYS } from "@/lib/db/schemas/settings";

/**
 * Get the configured default model from database
 */
async function getConfiguredModel(): Promise<string> {
  try {
    const collection = await getSettingsCollection();
    const doc = await collection.findOne({ key: SETTINGS_KEYS.DEFAULT_MODEL });
    return (doc?.value as string) || "unknown";
  } catch {
    return "unknown";
  }
}
import type {
  Interview,
  ModuleType,
  MCQ,
  RevisionTopic,
  RapidFire,
} from "@/lib/db/schemas/interview";
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
}

/**
 * Input for creating an interview from a natural language prompt
 */
export interface CreateInterviewFromPromptInput {
  prompt: string;
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

    // Get BYOK API key if available
    const apiKey = await getByokApiKey();

    // Get configured model for logging
    const configuredModel = await getConfiguredModel();

    // Create logger context for prompt parsing
    const loggerCtx = createLoggerContext({
      streaming: false,
      byokUsed: !!apiKey,
    });

    // Parse the prompt using AI - generateObject returns a promise that resolves to the object directly
    const result = await aiEngine.parseInterviewPrompt(
      input.prompt.trim(),
      {},
      apiKey ?? undefined
    );
    const parsedDetails = result.object;

    // Log the parse prompt request
    const usage = result.usage;
    const modelId = extractModelId(result, configuredModel);

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
 * Generate a specific module for an interview with streaming
 * Requirements: 3.1
 */
export async function generateModule(interviewId: string, module: ModuleType) {
  const stream = createStreamableValue<string>("");

  (async () => {
    try {
      // Get authenticated user
      const clerkId = await getAuthUserId();
      const user = await userRepository.findByClerkId(clerkId);

      if (!user) {
        stream.error(createAPIError("AUTH_ERROR", "User not found"));
        return;
      }

      // Get interview
      const interview = await interviewRepository.findById(interviewId);
      if (!interview) {
        stream.error(createAPIError("NOT_FOUND", "Interview not found"));
        return;
      }

      // Verify ownership
      if (interview.userId !== user._id) {
        stream.error(
          createAPIError(
            "AUTH_ERROR",
            "Not authorized to access this interview"
          )
        );
        return;
      }

      // Check iteration limits (unless BYOK)
      const isByok = await hasByokApiKey();
      if (!isByok) {
        if (user.iterations.count >= user.iterations.limit) {
          stream.error(
            createAPIError(
              "RATE_LIMIT",
              `Iteration limit reached. Please upgrade your plan.`
            )
          );
          return;
        }
        // Increment iteration count
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

      // Create logger context with metadata
      const loggerCtx = createLoggerContext({
        streaming: true,
        byokUsed: !!apiKey,
      });
      let responseText = "";

      // Generate based on module type
      switch (module) {
        case "openingBrief": {
          const result = await aiEngine.generateOpeningBrief(
            ctx,
            {},
            apiKey ?? undefined
          );

          // Mark first token when streaming starts
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
          await interviewRepository.updateModule(
            interviewId,
            "openingBrief",
            finalObject
          );

          // Log the request with full metadata
          const usage = await result.usage;
          const modelId = extractModelId(result, configuredModel);
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "GENERATE_BRIEF",
            model: modelId,
            prompt: `Generate opening brief for ${interview.jobDetails.title} at ${interview.jobDetails.company}`,
            response: responseText,
            toolsUsed: loggerCtx.toolsUsed,
            searchQueries: loggerCtx.searchQueries,
            searchResults: loggerCtx.searchResults,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
          break;
        }

        case "revisionTopics": {
          const result = await aiEngine.generateTopics(
            ctx,
            5,
            {},
            apiKey ?? undefined
          );

          let firstTokenMarked = false;
          for await (const partialObject of result.partialObjectStream) {
            if (partialObject.topics) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }
              stream.update(JSON.stringify(partialObject.topics));
            }
          }

          const finalObject = await result.object;
          await interviewRepository.updateModule(
            interviewId,
            "revisionTopics",
            finalObject.topics
          );
          responseText = JSON.stringify(finalObject.topics);

          const usage = await result.usage;
          const modelId = extractModelId(result, configuredModel);
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "GENERATE_TOPICS",
            model: modelId,
            prompt: `Generate revision topics for ${interview.jobDetails.title}`,
            response: responseText,
            toolsUsed: loggerCtx.toolsUsed,
            searchQueries: loggerCtx.searchQueries,
            searchResults: loggerCtx.searchResults,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
          break;
        }

        case "mcqs": {
          const result = await aiEngine.generateMCQs(
            ctx,
            5,
            {},
            apiKey ?? undefined
          );

          let firstTokenMarked = false;
          for await (const partialObject of result.partialObjectStream) {
            if (partialObject.mcqs) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }
              stream.update(JSON.stringify(partialObject.mcqs));
            }
          }

          const finalObject = await result.object;
          await interviewRepository.updateModule(
            interviewId,
            "mcqs",
            finalObject.mcqs
          );
          responseText = JSON.stringify(finalObject.mcqs);

          const usage = await result.usage;
          const modelId = extractModelId(result, configuredModel);
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "GENERATE_MCQ",
            model: modelId,
            prompt: `Generate MCQs for ${interview.jobDetails.title}`,
            response: responseText,
            toolsUsed: loggerCtx.toolsUsed,
            searchQueries: loggerCtx.searchQueries,
            searchResults: loggerCtx.searchResults,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
          break;
        }

        case "rapidFire": {
          const result = await aiEngine.generateRapidFire(
            ctx,
            10,
            {},
            apiKey ?? undefined
          );

          let firstTokenMarked = false;
          for await (const partialObject of result.partialObjectStream) {
            if (partialObject.questions) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }
              stream.update(JSON.stringify(partialObject.questions));
            }
          }

          const finalObject = await result.object;
          await interviewRepository.updateModule(
            interviewId,
            "rapidFire",
            finalObject.questions
          );
          responseText = JSON.stringify(finalObject.questions);

          const usage = await result.usage;
          const modelId = extractModelId(result, configuredModel);
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "GENERATE_RAPID_FIRE",
            model: modelId,
            prompt: `Generate rapid fire questions for ${interview.jobDetails.title}`,
            response: responseText,
            toolsUsed: loggerCtx.toolsUsed,
            searchQueries: loggerCtx.searchQueries,
            searchResults: loggerCtx.searchResults,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
          break;
        }
      }

      stream.done();
    } catch (error) {
      console.error("generateModule error:", error);
      stream.error(
        createAPIError(
          "AI_ERROR",
          "Failed to generate content. Please try again."
        )
      );
    }
  })();

  return { stream: stream.value };
}

/**
 * Add more content to an existing section with duplicate prevention
 * Requirements: 5.1
 */
export async function addMoreContent(input: {
  interviewId: string;
  module: "mcqs" | "rapidFire" | "revisionTopics";
  count?: number;
}) {
  const stream = createStreamableValue<string>("");

  (async () => {
    try {
      // Validate input
      const validationResult = AddMoreInputSchema.safeParse(input);
      if (!validationResult.success) {
        stream.error(createAPIError("VALIDATION_ERROR", "Invalid input"));
        return;
      }

      const { interviewId, module, count } = validationResult.data;

      // Get authenticated user
      const clerkId = await getAuthUserId();
      const user = await userRepository.findByClerkId(clerkId);

      if (!user) {
        stream.error(createAPIError("AUTH_ERROR", "User not found"));
        return;
      }

      // Get interview
      const interview = await interviewRepository.findById(interviewId);
      if (!interview) {
        stream.error(createAPIError("NOT_FOUND", "Interview not found"));
        return;
      }

      // Verify ownership
      if (interview.userId !== user._id) {
        stream.error(createAPIError("AUTH_ERROR", "Not authorized"));
        return;
      }

      // Check iteration limits (unless BYOK)
      const isByok = await hasByokApiKey();
      if (!isByok) {
        if (user.iterations.count >= user.iterations.limit) {
          stream.error(createAPIError("RATE_LIMIT", "Iteration limit reached"));
          return;
        }
        await userRepository.incrementIteration(clerkId);
      }

      // Get BYOK API key if available
      const apiKey = await getByokApiKey();

      // Get configured model for logging
      const configuredModel = await getConfiguredModel();

      // Build generation context with existing content IDs for duplicate prevention
      const existingContent = getExistingContentIds(interview, module);

      const ctx: GenerationContext = {
        resumeText: interview.resumeContext,
        jobDescription: interview.jobDetails.description,
        jobTitle: interview.jobDetails.title,
        company: interview.jobDetails.company,
        existingContent,
      };

      const loggerCtx = createLoggerContext({
        streaming: true,
        byokUsed: !!apiKey,
      });
      let responseText = "";
      let newItems: MCQ[] | RevisionTopic[] | RapidFire[] = [];

      // Generate based on module type
      switch (module) {
        case "mcqs": {
          const result = await aiEngine.generateMCQs(
            ctx,
            count,
            {},
            apiKey ?? undefined
          );

          let firstTokenMarked = false;
          for await (const partialObject of result.partialObjectStream) {
            if (partialObject.mcqs) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }
              stream.update(JSON.stringify(partialObject.mcqs));
            }
          }

          const finalObject = await result.object;
          newItems = finalObject.mcqs;

          // Filter out any duplicates that might have slipped through
          const existingIds = new Set(interview.modules.mcqs.map((m) => m.id));
          const uniqueItems = finalObject.mcqs.filter(
            (m) => !existingIds.has(m.id)
          );

          await interviewRepository.appendToModule(
            interviewId,
            "mcqs",
            uniqueItems
          );
          responseText = JSON.stringify(uniqueItems);

          const usage = await result.usage;
          const modelId = extractModelId(result, configuredModel);
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "GENERATE_MCQ",
            model: modelId,
            prompt: `Add ${count} more MCQs for ${interview.jobDetails.title}`,
            response: responseText,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
          break;
        }

        case "revisionTopics": {
          const result = await aiEngine.generateTopics(
            ctx,
            count,
            {},
            apiKey ?? undefined
          );

          let firstTokenMarked = false;
          for await (const partialObject of result.partialObjectStream) {
            if (partialObject.topics) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }
              stream.update(JSON.stringify(partialObject.topics));
            }
          }

          const finalObject = await result.object;
          newItems = finalObject.topics;

          const existingIds = new Set(
            interview.modules.revisionTopics.map((t) => t.id)
          );
          const uniqueItems = finalObject.topics.filter(
            (t) => !existingIds.has(t.id)
          );

          await interviewRepository.appendToModule(
            interviewId,
            "revisionTopics",
            uniqueItems
          );
          responseText = JSON.stringify(uniqueItems);

          const usage = await result.usage;
          const modelId = extractModelId(result, configuredModel);
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "GENERATE_TOPICS",
            model: modelId,
            prompt: `Add ${count} more revision topics for ${interview.jobDetails.title}`,
            response: responseText,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
          break;
        }

        case "rapidFire": {
          const result = await aiEngine.generateRapidFire(
            ctx,
            count,
            {},
            apiKey ?? undefined
          );

          let firstTokenMarked = false;
          for await (const partialObject of result.partialObjectStream) {
            if (partialObject.questions) {
              if (!firstTokenMarked) {
                loggerCtx.markFirstToken();
                firstTokenMarked = true;
              }
              stream.update(JSON.stringify(partialObject.questions));
            }
          }

          const finalObject = await result.object;
          newItems = finalObject.questions;

          const existingIds = new Set(
            interview.modules.rapidFire.map((q) => q.id)
          );
          const uniqueItems = finalObject.questions.filter(
            (q) => !existingIds.has(q.id)
          );

          await interviewRepository.appendToModule(
            interviewId,
            "rapidFire",
            uniqueItems
          );
          responseText = JSON.stringify(uniqueItems);

          const usage = await result.usage;
          const modelId = extractModelId(result, configuredModel);
          await logAIRequest({
            interviewId,
            userId: user._id,
            action: "GENERATE_RAPID_FIRE",
            model: modelId,
            prompt: `Add ${count} more rapid fire questions for ${interview.jobDetails.title}`,
            response: responseText,
            tokenUsage: extractTokenUsage(usage),
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
          break;
        }
      }

      stream.done();
    } catch (error) {
      console.error("addMoreContent error:", error);
      stream.error(createAPIError("AI_ERROR", "Failed to add content"));
    }
  })();

  return { stream: stream.value };
}

/**
 * Helper to get existing content IDs for duplicate prevention
 */
function getExistingContentIds(
  interview: Interview,
  module: "mcqs" | "rapidFire" | "revisionTopics"
): string[] {
  switch (module) {
    case "mcqs":
      return interview.modules.mcqs.map((m) => m.id);
    case "revisionTopics":
      return interview.modules.revisionTopics.map((t) => t.id);
    case "rapidFire":
      return interview.modules.rapidFire.map((q) => q.id);
    default:
      return [];
  }
}

/**
 * Delete an interview with cascade delete of AI logs
 * Requirements: 10.3
 */
export async function deleteInterview(
  interviewId: string
): Promise<ActionResult<void>> {
  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    // Get interview
    const interview = await interviewRepository.findById(interviewId);
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

    // Delete associated AI logs first (cascade delete)
    await aiLogRepository.deleteByInterviewId(interviewId);

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
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return {
        success: false,
        error: createAPIError("AUTH_ERROR", "User not found"),
      };
    }

    const interview = await interviewRepository.findById(interviewId);
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
