import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserId,
  getByokApiKey,
  getByokTierConfig,
  hasByokApiKey,
} from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import {
  analyzeGitHubRepo,
  type ToolInvocation,
} from "@/lib/services/ai-tools";
import { ITERATION_COSTS } from "@/lib/pricing-data";

/**
 * POST /api/ai-tools/github-analysis
 * Analyze GitHub repository - Pro and Max only
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
      await userRepository.incrementIteration(clerkId, ITERATION_COSTS.AI_TOOL);
    }

    const body = await request.json();
    const { repoUrl, focus } = body as {
      repoUrl: string;
      focus?: "architecture" | "interview-prep" | "learning" | "code-review";
    };

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
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

    const result = await analyzeGitHubRepo(
      repoUrl,
      focus ?? "learning",
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
    console.error("GitHub analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
