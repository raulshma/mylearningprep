import { NextRequest } from "next/server";
import { type UIMessage } from "ai";
import {
  getAuthUserId,
  getByokApiKey,
  getByokTierConfig,
  hasByokApiKey,
} from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { interviewRepository } from "@/lib/db/repositories/interview-repository";
import { learningPathRepository } from "@/lib/db/repositories/learning-path-repository";
import { aiConversationRepository } from "@/lib/db/repositories/ai-conversation-repository";
import {
  runOrchestrator,
  type OrchestratorContext,
  type ToolStatus,
} from "@/lib/services/ai-orchestrator";
import { logAIRequest, createLoggerContext } from "@/lib/services/ai-logger";
import {
  FREE_CHAT_MESSAGE_LIMIT,
  PRO_CHAT_MESSAGE_LIMIT,
  MAX_CHAT_MESSAGE_LIMIT,
} from "@/lib/pricing-data";

/**
 * POST /api/ai-assistant
 * Multi-tool AI assistant for interview prep and learning paths
 * Uses Vercel AI SDK v5 with multi-step tool calling
 * Counts against user iteration limits
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      interviewId,
      learningPathId,
      conversationId,
      selectedModelId,
    }: {
      messages: UIMessage[];
      interviewId?: string;
      learningPathId?: string;
      conversationId?: string;
      selectedModelId?: string;
    } = body;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get authenticated user
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get chat message limit based on plan
    const getChatLimit = (plan: string) => {
      switch (plan) {
        case "FREE": return FREE_CHAT_MESSAGE_LIMIT;
        case "PRO": return PRO_CHAT_MESSAGE_LIMIT;
        case "MAX": return MAX_CHAT_MESSAGE_LIMIT;
        default: return FREE_CHAT_MESSAGE_LIMIT;
      }
    };

    // Check chat message limits
    const isByok = await hasByokApiKey();
    const chatMessages = user.chatMessages ?? { count: 0, limit: getChatLimit(user.plan), resetDate: new Date() };
    
    if (!isByok) {
      if (chatMessages.count >= chatMessages.limit) {
        return new Response(
          JSON.stringify({
            error: "Chat message limit reached. Please upgrade your plan.",
            remaining: 0,
            limit: chatMessages.limit,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      // Increment chat message count
      await userRepository.incrementChatMessage(clerkId);
    }

    // Create conversation on first message if no conversationId provided
    let activeConversationId = conversationId;
    if (!activeConversationId && messages.length === 1) {
      const firstMessage = getLastUserMessage(messages);
      const conversation = await aiConversationRepository.create(
        user._id,
        firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : ""),
        { interviewId, learningPathId, toolsUsed: [] }
      );
      activeConversationId = conversation._id;
    }

    // Build orchestrator context
    const ctx: OrchestratorContext = {
      userId: user._id,
      plan: user.plan,
      // Pass selected model for MAX plan users
      selectedModelId: user.plan === "MAX" ? selectedModelId : undefined,
    };

    // Add interview context if provided
    if (interviewId) {
      const interview = await interviewRepository.findById(interviewId);
      if (interview && interview.userId === user._id) {
        ctx.interviewContext = {
          jobTitle: interview.jobDetails.title,
          company: interview.jobDetails.company,
          resumeText: interview.resumeContext,
        };
      }
    }

    // Add learning path context if provided
    if (learningPathId) {
      const learningPath =
        await learningPathRepository.findById(learningPathId);
      if (learningPath && learningPath.userId === user._id) {
        const currentTopic = learningPath.topics.find(
          (t) => t.id === learningPath.currentTopicId
        );
        ctx.learningContext = {
          goal: learningPath.goal,
          currentTopic: currentTopic?.title,
          difficulty: String(learningPath.currentDifficulty),
        };
      }
    }

    // Get BYOK config if available
    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Create logger context
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Track tool statuses for the stream
    const toolStatuses: ToolStatus[] = [];

    // Run the orchestrator and get the stream result
    const { stream: orchestratorStream } = await runOrchestrator(
      messages,
      ctx,
      {
        apiKey: apiKey ?? undefined,
        byokConfig: byokTierConfig ?? undefined,
        onToolStatus: (status) => {
          toolStatuses.push(status);
        },
        maxSteps: 5,
      }
    );

    // Mark first token
    loggerCtx.markFirstToken();

    // Estimate token usage (actual usage from streaming is complex to track)
    const estimatedInputTokens = Math.ceil(
      getLastUserMessage(messages).length / 4
    );

    // Use toUIMessageStreamResponse directly for proper client compatibility
    const response = orchestratorStream.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async () => {
        // Log the AI request after completion
        await logAIRequest({
          interviewId: interviewId || learningPathId || "ai-assistant",
          userId: user._id,
          action: "AI_ASSISTANT_CHAT",
          status: "success",
          model: "orchestrator",
          prompt: getLastUserMessage(messages),
          response: "streaming-complete",
          toolsUsed: toolStatuses.map((t) => t.toolName),
          searchQueries: loggerCtx.searchQueries,
          searchResults: loggerCtx.searchResults,
          tokenUsage: { input: estimatedInputTokens, output: 0 },
          latencyMs: loggerCtx.getLatencyMs(),
          timeToFirstToken: loggerCtx.getTimeToFirstToken(),
          metadata: {
            ...loggerCtx.metadata,
          },
        });
      },
      onError: (error: unknown) => {
        console.error("AI stream error:", error);
        return error instanceof Error ? error.message : "Stream error occurred";
      },
    });

    // Add conversation ID to response headers if created
    if (activeConversationId && !conversationId) {
      const headers = new Headers(response.headers);
      headers.set("X-Conversation-Id", activeConversationId);
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    return response;
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to process AI request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Extract last user message content from messages array
 */
function getLastUserMessage(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user" && msg.parts) {
      // Find text parts
      for (const part of msg.parts) {
        if (part.type === "text") {
          return part.text;
        }
      }
    }
  }
  return "";
}
