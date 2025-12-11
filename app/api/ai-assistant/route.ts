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
import { chatImageRepository } from "@/lib/db/repositories/chat-image-repository";
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
  ITERATION_COSTS,
} from "@/lib/pricing-data";
import type { AIMessage, AIRequestMetadata } from "@/lib/db/schemas/ai-conversation";

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
      providerTools,
    }: {
      messages: UIMessage[];
      interviewId?: string;
      learningPathId?: string;
      conversationId?: string;
      selectedModelId?: string;
      providerTools?: string[];
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

    // Check chat message limits and iteration limits
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
      
      // Check iteration limits
      const remainingIterations = user.iterations.limit - user.iterations.count;
      if (remainingIterations < ITERATION_COSTS.CHAT_MESSAGE) {
        return new Response(
          JSON.stringify({
            error: "Iteration limit reached. Please upgrade your plan.",
            remaining: 0,
            limit: user.iterations.limit,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      // Increment chat message count and iteration count
      await userRepository.incrementChatMessage(clerkId);
      await userRepository.incrementIteration(clerkId, ITERATION_COSTS.CHAT_MESSAGE);
    }

    // Create conversation on first message if no conversationId provided
    let activeConversationId = conversationId;
    let isNewConversation = false;
    if (!activeConversationId && messages.length === 1) {
      const firstMessage = getLastUserMessage(messages);
      const conversation = await aiConversationRepository.create(
        user._id,
        firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : ""),
        { interviewId, learningPathId, toolsUsed: [] }
      );
      activeConversationId = conversation._id;
      isNewConversation = true;
    }

    // Persist the user message to the conversation
    if (activeConversationId) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.role === "user") {
        // Extract image data from file parts and store separately
        const imageIds: string[] = [];
        const fileParts = lastUserMsg.parts?.filter(
          (p): p is { type: "file"; mediaType: string; url: string; filename?: string } =>
            p.type === "file" && p.mediaType?.startsWith("image/")
        ) || [];

        if (fileParts.length > 0) {
          const imagesToCreate = fileParts.map((part) => ({
            userId: user._id,
            conversationId: activeConversationId!,
            messageId: lastUserMsg.id,
            filename: part.filename || `image_${Date.now()}`,
            mediaType: part.mediaType,
            data: part.url, // Base64 data URL
            size: Math.ceil((part.url.length * 3) / 4), // Approximate size
          }));

          const savedImages = await chatImageRepository.createMany(imagesToCreate);
          imageIds.push(...savedImages.map((img) => img._id));
        }

        const userMessage: AIMessage = {
          id: lastUserMsg.id,
          role: "user",
          content: getLastUserMessage(messages),
          imageIds: imageIds.length > 0 ? imageIds : undefined,
          createdAt: new Date(),
        };
        await aiConversationRepository.addMessage(activeConversationId, userMessage);
      }
    }

    // Build orchestrator context
    const ctx: OrchestratorContext = {
      userId: user._id,
      plan: user.plan,
      // Pass selected model for MAX plan users
      selectedModelId: user.plan === "MAX" ? selectedModelId : undefined,
      // Pass provider-specific tools (e.g., googleSearch, urlContext)
      providerTools: user.plan === "MAX" ? providerTools : undefined,
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

    // Determine provider from selected model ID (for MAX plan users)
    let selectedProvider: import("@/lib/ai/types").AIProviderType = 'openrouter';
    if (user.plan === "MAX" && selectedModelId) {
      if (selectedModelId.startsWith('google:')) {
        selectedProvider = 'google';
      }
    }

    // Get BYOK config if available - use provider-specific key
    const apiKey = await getByokApiKey(selectedProvider);
    const byokTierConfig = await getByokTierConfig();

    // Create logger context
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Track tool statuses for the stream
    const toolStatuses: ToolStatus[] = [];

    // Run the orchestrator and get the stream result
    const { stream: orchestratorStream, modelId } = await runOrchestrator(
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

    // Track assistant response for persistence
    let assistantResponseText = "";
    let assistantReasoningText = "";
    let assistantMessageId = "";
    let streamError: { message: string; code?: string; isRetryable?: boolean } | null = null;
    
    // Track metadata for the response
    const requestStartTime = Date.now();
    let firstTokenTime: number | null = null;
    let outputTokenCount = 0;
    let finalMetadata: AIRequestMetadata | null = null;

    // Use toUIMessageStreamResponse directly for proper client compatibility
    const response = orchestratorStream.toUIMessageStreamResponse({
      originalMessages: messages,
      messageMetadata: ({ part }) => {
        // Send metadata when streaming starts
        if (part.type === "start") {
          firstTokenTime = Date.now();
          return {
            model: modelId,
            ttft: firstTokenTime - requestStartTime,
          };
        }
        
        // Send full metadata when streaming completes
        if (part.type === "finish") {
          const latencyMs = Date.now() - requestStartTime;
          const ttft = firstTokenTime ? firstTokenTime - requestStartTime : undefined;
          const tokensIn = part.totalUsage?.inputTokens;
          const tokensOut = part.totalUsage?.outputTokens;
          const totalTokens = part.totalUsage?.totalTokens ?? (tokensIn && tokensOut ? tokensIn + tokensOut : undefined);
          const throughput = latencyMs > 0 && tokensOut ? Math.round((tokensOut / latencyMs) * 1000) : undefined;
          
          // Store for persistence
          finalMetadata = {
            model: modelId,
            tokensIn,
            tokensOut,
            totalTokens,
            latencyMs,
            ttft,
            throughput,
          };
          
          return finalMetadata;
        }
      },
      onFinish: async (result) => {
        // Extract assistant response from the result
        if (result.messages && result.messages.length > 0) {
          const lastMsg = result.messages[result.messages.length - 1];
          if (lastMsg.role === "assistant") {
            assistantMessageId = lastMsg.id;
            // Extract text content from parts
            assistantResponseText = lastMsg.parts
              ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("") || "";
            // Extract reasoning content from parts
            assistantReasoningText = lastMsg.parts
              ?.filter((p): p is { type: "reasoning"; text: string } => p.type === "reasoning")
              .map((p) => p.text)
              .join("") || "";
          }
        }

        // Use the metadata captured during streaming, or calculate fallback
        const latencyMs = finalMetadata?.latencyMs ?? (Date.now() - requestStartTime);
        const ttft = finalMetadata?.ttft ?? (firstTokenTime ? firstTokenTime - requestStartTime : undefined);
        
        // Use actual token counts from finalMetadata (captured from part.totalUsage in messageMetadata)
        // If not available, fall back to estimates
        const tokensIn = finalMetadata?.tokensIn ?? estimatedInputTokens;
        outputTokenCount = finalMetadata?.tokensOut ?? Math.ceil(assistantResponseText.length / 4);
        const totalTokens = tokensIn + outputTokenCount;
        const throughput = latencyMs > 0 ? Math.round((outputTokenCount / latencyMs) * 1000) : undefined;
        
        // Build metadata object
        const messageMetadata: AIRequestMetadata = {
          model: modelId,
          tokensIn,
          tokensOut: outputTokenCount,
          totalTokens,
          latencyMs,
          ttft,
          throughput,
        };

        // Persist assistant message to conversation (only if we have content and no error)
        if (activeConversationId && assistantResponseText && !streamError) {
          const assistantMessage: AIMessage = {
            id: assistantMessageId || `assistant_${Date.now()}`,
            role: "assistant",
            content: assistantResponseText,
            reasoning: assistantReasoningText || undefined,
            toolCalls: toolStatuses.length > 0 ? toolStatuses.map((t, idx) => ({
              id: `${t.toolName}_${idx}`,
              name: t.toolName,
              input: t.input,
              output: t.output,
              state: t.status === "complete" ? "output-available" as const : 
                     t.status === "error" ? "output-error" as const : "input-available" as const,
            })) : undefined,
            metadata: messageMetadata,
            createdAt: new Date(),
          };
          await aiConversationRepository.addMessage(activeConversationId, assistantMessage);
        }

        // Persist error message if one occurred
        if (activeConversationId && streamError) {
          const errorMessage: AIMessage = {
            id: `error_${Date.now()}`,
            role: "error",
            content: streamError.message,
            errorDetails: {
              code: streamError.code,
              isRetryable: streamError.isRetryable,
            },
            createdAt: new Date(),
          };
          await aiConversationRepository.addMessage(activeConversationId, errorMessage);
        }

        // Log the AI request after completion
        await logAIRequest({
          interviewId: interviewId || learningPathId || "ai-assistant",
          userId: user._id,
          action: "AI_ASSISTANT_CHAT",
          status: streamError ? "error" : "success",
          model: modelId,
          prompt: getLastUserMessage(messages),
          response: streamError ? streamError.message : (assistantResponseText || "streaming-complete"),
          toolsUsed: toolStatuses.map((t) => t.toolName),
          searchQueries: loggerCtx.searchQueries,
          searchResults: loggerCtx.searchResults,
          tokenUsage: { input: tokensIn, output: outputTokenCount },
          latencyMs,
          timeToFirstToken: ttft,
          metadata: {
            ...loggerCtx.metadata,
            ...(streamError && { errorCode: streamError.code }),
            throughput,
          },
        });
      },
      onError: (error: unknown) => {
        console.error("AI stream error:", error);
        
        // Check for rate limit errors (429)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorString = JSON.stringify(error);
        
        if (errorString.includes("429") || errorMessage.includes("rate-limit") || errorMessage.includes("rate limit")) {
          streamError = {
            message: "Rate limit exceeded. The AI model is temporarily unavailable. Please try again in a few moments or select a different model.",
            code: "RATE_LIMIT",
            isRetryable: true,
          };
          return streamError.message;
        }
        
        streamError = {
          message: error instanceof Error ? error.message : "Stream error occurred",
          code: "STREAM_ERROR",
          isRetryable: true,
        };
        return streamError.message;
      },
    });

    // Add conversation ID, model info, and new conversation flag to response headers
    const headers = new Headers(response.headers);
    if (activeConversationId) {
      headers.set("X-Conversation-Id", activeConversationId);
      if (isNewConversation) {
        headers.set("X-New-Conversation", "true");
      }
    }
    // Always include model ID so client knows which model was used
    headers.set("X-Model-Id", modelId);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
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
