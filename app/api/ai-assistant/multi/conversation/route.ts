import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { aiConversationRepository } from "@/lib/db/repositories/ai-conversation-repository";
import type { AIMessage } from "@/lib/db/schemas/ai-conversation";

/**
 * POST /api/ai-assistant/multi/conversation
 * Creates a new multi-model conversation or adds messages to existing one
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      userMessage,
      models,
      responses,
    } = body as {
      conversationId?: string;
      userMessage: string;
      models: Array<{ id: string; name: string; provider: "openrouter" | "google" }>;
      responses?: Array<{
        modelId: string;
        modelName: string;
        provider: "openrouter" | "google";
        content: string;
        metadata?: {
          tokensIn?: number;
          tokensOut?: number;
          latencyMs?: number;
          ttft?: number;
        };
      }>;
    };

    if (!userMessage || !models || models.length === 0) {
      return new Response(
        JSON.stringify({ error: "userMessage and models are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

    // Only MAX plan users can use multi-model chat
    if (user.plan !== "MAX") {
      return new Response(
        JSON.stringify({ error: "Multi-model chat requires MAX plan" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    let activeConversationId = conversationId;
    let isNewConversation = false;

    // Create new conversation if none provided
    if (!activeConversationId) {
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
      const conversation = await aiConversationRepository.create(
        user._id,
        title,
        { toolsUsed: [] },
        {
          chatMode: "multi",
          comparisonModels: models,
        }
      );
      activeConversationId = conversation._id;
      isNewConversation = true;
    }

    // Add user message
    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date(),
    };
    await aiConversationRepository.addMessage(activeConversationId, userMsg);

    // Add assistant responses if provided (after streaming completes)
    if (responses && responses.length > 0) {
      const assistantMessages: AIMessage[] = responses.map((r, idx) => ({
        id: `assistant_${Date.now()}_${idx}`,
        role: "assistant" as const,
        content: `**${r.modelName}** (${r.provider}):\n\n${r.content}`,
        metadata: r.metadata ? {
          model: r.modelId,
          modelName: r.modelName,
          tokensIn: r.metadata.tokensIn,
          tokensOut: r.metadata.tokensOut,
          latencyMs: r.metadata.latencyMs,
          ttft: r.metadata.ttft,
        } : undefined,
        createdAt: new Date(),
      }));

      await aiConversationRepository.addMessages(activeConversationId, assistantMessages);
    }

    return new Response(
      JSON.stringify({
        conversationId: activeConversationId,
        isNewConversation,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Multi-model conversation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
