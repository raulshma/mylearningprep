import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserId,
  getByokApiKey,
  getByokTierConfig,
  hasByokApiKey,
} from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import {
  generateSystemDesignTemplate,
  type ToolInvocation,
} from "@/lib/services/ai-tools";

/**
 * POST /api/ai-tools/system-design
 * Generate system design template - Pro and Max only
 * Counts against user iteration limits
 */
export async function POST(request: NextRequest) {
  try {
    const clerkId = await getAuthUserId();
    const user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Check plan - Pro and Max only
    if (user.plan === "FREE") {
      return NextResponse.json(
        { error: "This feature requires a Pro or Max subscription" },
        { status: 403 }
      );
    }

    // Check iteration limits (unless BYOK)
    const isByok = await hasByokApiKey();
    if (!isByok) {
      if (user.iterations.count >= user.iterations.limit) {
        return NextResponse.json(
          {
            error: "Iteration limit reached. Please upgrade your plan.",
            remaining: 0,
            limit: user.iterations.limit,
          },
          { status: 429 }
        );
      }
      // Increment iteration count
      await userRepository.incrementIteration(clerkId);
    }

    const body = await request.json();
    const { system, scale, focus } = body as {
      system: string;
      scale?: "startup" | "medium" | "large-scale";
      focus?: string[];
    };

    if (!system) {
      return NextResponse.json(
        { error: "System name is required" },
        { status: 400 }
      );
    }

    const apiKey = await getByokApiKey();
    const byokTierConfig = await getByokTierConfig();

    // Track tool invocations
    const toolInvocations: ToolInvocation[] = [];
    const onToolInvoke = (invocation: ToolInvocation) => {
      toolInvocations.push(invocation);
    };

    const result = await generateSystemDesignTemplate(
      system,
      scale ?? "large-scale",
      focus,
      apiKey ?? undefined,
      byokTierConfig ?? undefined,
      onToolInvoke,
      user._id
    );

    return NextResponse.json({
      success: true,
      data: result,
      toolsUsed: toolInvocations.map((t) => t.toolName),
    });
  } catch (error) {
    console.error("System design generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
