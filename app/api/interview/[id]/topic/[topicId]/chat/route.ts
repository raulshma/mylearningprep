import { NextRequest } from "next/server";
import { after } from "next/server";
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  getAuthUserId,
  getByokApiKey,
  hasByokApiKey,
  getByokTierConfig,
} from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { chatRepository } from "@/lib/db/repositories/chat-repository";
import { getTierConfigFromDB } from "@/lib/db/tier-config";
import { logAIRequest, createLoggerContext } from "@/lib/services/ai-logger";
import type { ChatMessage } from "@/lib/db/schemas/chat";

// Chat costs 0.33 iterations per message
const CHAT_ITERATION_COST = 0.33;

/**
 * Get effective model config for chat (uses LOW tier)
 */
async function getChatModelConfig(
  byokTierConfig?: {
    low?: {
      model: string;
      fallback?: string;
      temperature?: number;
      maxTokens?: number;
    };
  } | null
): Promise<{
  model: string;
  modelId: string; // Formatted as "tier - model" for logging
  temperature: number;
}> {
  // Check BYOK config first
  if (byokTierConfig?.low?.model) {
    return {
      model: byokTierConfig.low.model,
      modelId: `low - ${byokTierConfig.low.model}`,
      temperature: byokTierConfig.low.temperature ?? 0.7,
    };
  }

  // Fall back to admin-configured tier
  const tierConfig = await getTierConfigFromDB("low");

  if (!tierConfig.primaryModel) {
    throw new Error("Low tier model not configured. Please contact admin.");
  }

  return {
    model: tierConfig.primaryModel,
    modelId: `low - ${tierConfig.primaryModel}`,
    temperature: tierConfig.temperature,
  };
}

/**
 * GET /api/interview/[id]/topic/[topicId]/chat
 * Get existing chat messages for a topic
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  const { id: interviewId, topicId } = await params;

  try {
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (interview.userId !== user._id && !interview.isPublic) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get chat messages
    const messages = await chatRepository.getMessages(interviewId, topicId);

    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get chat messages" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/interview/[id]/topic/[topicId]/chat
 * Stream chat responses for topic refinement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  const { id: interviewId, topicId } = await params;

  try {
    // Get authenticated user
    const clerkId = await getAuthUserId();
    
    // Parallel fetch: user and interview at the same time
    const [user, interview] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      interviewRepository.findById(interviewId),
    ]);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (interview.userId !== user._id && !interview.isPublic) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Find the topic
    const topic = interview.modules.revisionTopics.find(
      (t) => t.id === topicId
    );
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { messages } = await request.json();
    const userMessage = messages[messages.length - 1];

    // Check iteration limits (unless BYOK)
    const isByok = await hasByokApiKey();
    if (!isByok) {
      // Check if user has enough iterations (need at least CHAT_ITERATION_COST)
      const remainingIterations = user.iterations.limit - user.iterations.count;
      if (remainingIterations < CHAT_ITERATION_COST) {
        return new Response(
          JSON.stringify({
            error: "Iteration limit reached. Please upgrade your plan.",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
      // Increment iteration count by fractional amount
      await userRepository.incrementIteration(clerkId, CHAT_ITERATION_COST);
    }

    // Get BYOK API key and tier config if available
    const byokApiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Get the API key to use (BYOK or system)
    const apiKey = byokApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get model configuration (LOW tier for chat)
    const modelConfig = await getChatModelConfig(byokTierConfig);

    const openrouter = createOpenRouter({ apiKey });

    // Create logger context
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!byokApiKey,
    });

    // Ensure chat exists and save user message
    await chatRepository.findOrCreate(interviewId, topicId, user._id);
    const userChatMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage.content,
      createdAt: new Date(),
    };
    await chatRepository.addMessage(interviewId, topicId, userChatMessage);

    // Build system prompt with topic context
    const systemPrompt = `You are an expert interview preparation assistant helping a candidate understand "${topic.title}" for their upcoming interview.

Job Context:
- Position: ${interview.jobDetails.title}
- Company: ${interview.jobDetails.company}

Topic Being Discussed:
Title: ${topic.title}
Reason for importance: ${topic.reason}
Current explanation:
${topic.content}

Your role:
- Help the candidate deeply understand this topic
- Provide clear explanations with practical examples
- Use code snippets when helpful (use markdown code blocks)
- Relate concepts to real-world scenarios
- Answer follow-up questions thoroughly
- Suggest related concepts they should also understand
- Keep responses focused and interview-relevant

Be conversational but professional. Use markdown formatting for better readability.`;

    // Stream the response using Vercel AI SDK
    const result = streamText({
      model: openrouter(modelConfig.model),
      system: systemPrompt,
      messages,
      temperature: modelConfig.temperature,
      onFinish: async ({ text, usage }) => {
        // Save assistant message to chat history
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: text,
          createdAt: new Date(),
        };
        await chatRepository.addMessage(interviewId, topicId, assistantMessage);

        // Log the AI request (metadata only - no prompt/response for chat privacy)
        const tokenUsage = usage as { promptTokens?: number; completionTokens?: number } | undefined;
        await logAIRequest({
          interviewId,
          userId: user._id,
          action: "TOPIC_CHAT",
          status: "success",
          model: modelConfig.modelId,
          prompt: "[redacted]", // Don't store user messages for privacy
          response: "", // Don't store response for chat privacy
          tokenUsage: {
            input: tokenUsage?.promptTokens ?? 0,
            output: tokenUsage?.completionTokens ?? 0,
          },
          latencyMs: loggerCtx.getLatencyMs(),
          timeToFirstToken: loggerCtx.getTimeToFirstToken(),
          metadata: loggerCtx.metadata,
        });
      },
    });

    // Mark first token when streaming starts
    loggerCtx.markFirstToken();

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process chat request";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
