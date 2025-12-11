import { NextRequest } from "next/server";
import { getAuthUserId, getByokApiKey, hasByokApiKey } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { streamText, type CoreMessage } from "ai";
import { createProviderWithFallback, type AIProviderType } from "@/lib/ai";
import { logAIRequest, createLoggerContext } from "@/lib/services/ai-logger";
import {
  FREE_CHAT_MESSAGE_LIMIT,
  PRO_CHAT_MESSAGE_LIMIT,
  MAX_CHAT_MESSAGE_LIMIT,
  ITERATION_COSTS,
} from "@/lib/pricing-data";

/**
 * POST /api/ai-assistant/multi
 * Streams a single model response for multi-model chat
 * Called once per model in parallel from the client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, modelId, provider, conversationId, shouldIncrementCount } = body as {
      message: string;
      modelId: string;
      provider: AIProviderType;
      conversationId?: string;
      shouldIncrementCount?: boolean;
    };

    if (!message || !modelId || !provider) {
      return new Response(
        JSON.stringify({ error: "Message, modelId, and provider are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get authenticated user and check BYOK status in parallel
    const clerkId = await getAuthUserId();
    const [user, isByok, apiKey] = await Promise.all([
      userRepository.findByClerkId(clerkId),
      hasByokApiKey(),
      getByokApiKey(provider),
    ]);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only MAX plan users can use multi-model chat
    if (user.plan !== "MAX") {
      return new Response(
        JSON.stringify({ error: "Multi-model chat requires MAX plan" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check chat message limits
    const getChatLimit = (plan: string) => {
      switch (plan) {
        case "FREE": return FREE_CHAT_MESSAGE_LIMIT;
        case "PRO": return PRO_CHAT_MESSAGE_LIMIT;
        case "MAX": return MAX_CHAT_MESSAGE_LIMIT;
        default: return FREE_CHAT_MESSAGE_LIMIT;
      }
    };

    const chatMessages = user.chatMessages ?? {
      count: 0,
      limit: getChatLimit(user.plan),
      resetDate: new Date(),
    };

    if (!isByok && chatMessages.count >= chatMessages.limit) {
      return new Response(
        JSON.stringify({
          error: "Chat message limit reached. Please upgrade your plan.",
          remaining: 0,
          limit: chatMessages.limit,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check iteration limits
    if (!isByok) {
      const remainingIterations = user.iterations.limit - user.iterations.count;
      if (remainingIterations < ITERATION_COSTS.CHAT_MESSAGE) {
        return new Response(
          JSON.stringify({
            error: "Iteration limit reached. Please upgrade your plan.",
            remaining: 0,
            limit: user.iterations.limit,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Increment chat message count and iteration count only if this is the first model in the comparison
    // This ensures multi-model comparisons count as a single user interaction
    // Don't await - do it in the background to not block parallel requests
    if (!isByok && shouldIncrementCount !== false) {
      userRepository.incrementChatMessage(clerkId).catch((err) => {
        console.error("Failed to increment chat message count:", err);
      });
      userRepository.incrementIteration(clerkId, ITERATION_COSTS.CHAT_MESSAGE).catch((err) => {
        console.error("Failed to increment iteration count:", err);
      });
    }
    
    // Create provider client
    const providerClient = createProviderWithFallback(provider, apiKey ?? undefined);

    // Build messages array using CoreMessage format
    const messages: CoreMessage[] = [
      {
        role: "user",
        content: message,
      },
    ];

    // Build system prompt
    const systemPrompt = `You are a helpful AI assistant for coding interview preparation. 
Be concise, accurate, and helpful. Provide code examples when relevant.
Current date: ${new Date().toLocaleDateString()}`;

    // Create logger context
    const loggerCtx = createLoggerContext({
      streaming: true,
      byokUsed: !!apiKey,
    });

    // Stream the response
    const result = streamText({
      model: providerClient.getModel(modelId),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxOutputTokens: 4096,
      maxRetries: 0,
    });

    // Track response for logging
    let responseText = "";
    let tokensIn = 0;
    let tokensOut = 0;

    // Create a custom stream that formats data for the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              loggerCtx.markFirstToken();
              responseText += part.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", content: part.text })}\n\n`)
              );
            } else if (part.type === "reasoning-delta") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "reasoning", content: part.text })}\n\n`)
              );
            } else if (part.type === "finish") {
              tokensIn = part.totalUsage?.inputTokens ?? 0;
              tokensOut = part.totalUsage?.outputTokens ?? 0;
              
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "metadata",
                    metadata: {
                      tokensIn,
                      tokensOut,
                      latencyMs: loggerCtx.getLatencyMs(),
                      ttft: loggerCtx.getTimeToFirstToken(),
                    },
                  })}\n\n`
                )
              );
            }
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Log the AI request after successful completion
          await logAIRequest({
            interviewId: conversationId || "multi-model-chat",
            userId: user._id,
            action: "AI_ASSISTANT_CHAT",
            status: "success",
            model: modelId,
            provider,
            prompt: message,
            systemPrompt,
            response: responseText,
            tokenUsage: { input: tokensIn, output: tokensOut },
            latencyMs: loggerCtx.getLatencyMs(),
            timeToFirstToken: loggerCtx.getTimeToFirstToken(),
            metadata: loggerCtx.metadata,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
          );
          controller.close();

          // Log the error
          await logAIRequest({
            interviewId: conversationId || "multi-model-chat",
            userId: user._id,
            action: "AI_ASSISTANT_CHAT",
            status: "error",
            model: modelId,
            provider,
            prompt: message,
            response: "",
            errorMessage,
            tokenUsage: { input: 0, output: 0 },
            latencyMs: loggerCtx.getLatencyMs(),
            metadata: loggerCtx.metadata,
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Model-Id": modelId,
      },
    });
  } catch (error) {
    console.error("Multi-model assistant error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
