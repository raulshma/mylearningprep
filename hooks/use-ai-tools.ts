"use client";

import { useState, useCallback } from "react";
import type { AIToolName, ToolInvocation } from "@/lib/services/ai-tools";

export type AIToolStatus = "idle" | "loading" | "success" | "error";

interface UseAIToolOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onToolInvoke?: (invocation: ToolInvocation) => void;
}

interface UseAIToolReturn<T, P> {
  data: T | null;
  status: AIToolStatus;
  error: string | null;
  activeTools: ToolInvocation[];
  execute: (params: P) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for executing AI tools
 */
function useAITool<T, P>(
  endpoint: string,
  options: UseAIToolOptions<T> = {}
): UseAIToolReturn<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AIToolStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<ToolInvocation[]>([]);

  const execute = useCallback(
    async (params: P): Promise<T | null> => {
      setStatus("loading");
      setError(null);
      setActiveTools([]);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Request failed");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);
          setStatus("success");
          options.onSuccess?.(result.data);

          // Track tools used
          if (result.toolsUsed) {
            const invocations: ToolInvocation[] = result.toolsUsed.map(
              (toolName: AIToolName) => ({
                toolName,
                displayName: toolName,
                status: "complete" as const,
                timestamp: new Date(),
              })
            );
            setActiveTools(invocations);
          }

          return result.data;
        }

        throw new Error(result.error || "Unknown error");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setStatus("error");
        options.onError?.(errorMessage);
        return null;
      }
    },
    [endpoint, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setStatus("idle");
    setError(null);
    setActiveTools([]);
  }, []);

  return {
    data,
    status,
    error,
    activeTools,
    execute,
    reset,
  };
}

// ============================================================================
// Specific Tool Hooks
// ============================================================================

export interface TechTrendsParams {
  technologies: string[];
  context?: string;
}

export interface TechTrendsResult {
  trends: Array<{
    technology: string;
    popularityScore: number;
    growthTrend: "rising" | "stable" | "declining";
    marketDemand: string;
    keyStrengths: string[];
    keyWeaknesses: string[];
    relatedSkills: string[];
    certifications: string[];
    companiesHiring: string[];
    learningPath: string;
  }>;
  summary: string;
  recommendations: string[];
}

export function useTechTrendsAnalysis(
  options?: UseAIToolOptions<TechTrendsResult>
) {
  return useAITool<TechTrendsResult, TechTrendsParams>(
    "/api/ai-tools/tech-trends",
    options
  );
}

export interface MockInterviewParams {
  role: string;
  company?: string;
  type: "behavioral" | "technical" | "system-design" | "mixed";
  difficulty: "entry" | "mid" | "senior" | "staff";
  questionCount?: number;
}

export interface MockInterviewResult {
  role: string;
  company: string;
  interviewType: string;
  questions: Array<{
    questionNumber: number;
    question: string;
    type: string;
    difficulty: string;
    timeLimit: number;
    hints: string[];
    idealAnswer: string;
    evaluationCriteria: string[];
    followUpQuestions: string[];
  }>;
  tips: string[];
  commonMistakes: string[];
}

export function useMockInterview(
  options?: UseAIToolOptions<MockInterviewResult>
) {
  return useAITool<MockInterviewResult, MockInterviewParams>(
    "/api/ai-tools/mock-interview",
    options
  );
}

export interface GitHubAnalysisParams {
  repoUrl: string;
  focus?: "architecture" | "interview-prep" | "learning" | "code-review";
}

export interface GitHubAnalysisResult {
  repoName: string;
  description: string;
  primaryLanguage: string;
  technologies: string[];
  architecturePatterns: string[];
  codeQualityIndicators: {
    hasTests: boolean;
    hasCI: boolean;
    hasDocumentation: boolean;
    hasLinting: boolean;
    hasTypeScript: boolean;
  };
  suggestedImprovements: string[];
  interviewQuestions: string[];
  learningOpportunities: string[];
  keyFiles: Array<{
    path: string;
    purpose: string;
  }>;
}

export function useGitHubAnalysis(
  options?: UseAIToolOptions<GitHubAnalysisResult>
) {
  return useAITool<GitHubAnalysisResult, GitHubAnalysisParams>(
    "/api/ai-tools/github-analysis",
    options
  );
}

export interface SystemDesignParams {
  system: string;
  scale?: "startup" | "medium" | "large-scale";
  focus?: string[];
}

export interface SystemDesignResult {
  systemName: string;
  overview: string;
  requirements: {
    functional: string[];
    nonFunctional: string[];
  };
  components: Array<{
    name: string;
    type: string;
    description: string;
    responsibilities: string[];
    technologies: string[];
  }>;
  dataFlow: Array<{
    from: string;
    to: string;
    description: string;
    protocol?: string;
  }>;
  scalabilityConsiderations: string[];
  tradeoffs: Array<{
    decision: string;
    pros: string[];
    cons: string[];
  }>;
  estimations?: {
    qps?: string;
    storage?: string;
    bandwidth?: string;
  };
  diagram: string;
  interviewTips: string[];
}

export function useSystemDesign(
  options?: UseAIToolOptions<SystemDesignResult>
) {
  return useAITool<SystemDesignResult, SystemDesignParams>(
    "/api/ai-tools/system-design",
    options
  );
}

export interface STARFrameworkParams {
  situation: string;
  questionType?: string;
}

export interface STARFrameworkResult {
  originalSituation: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics: string[];
  improvedVersion: string;
  tips: string[];
  followUpPreparation: Array<{
    question: string;
    suggestedResponse: string;
  }>;
}

export function useSTARFramework(
  options?: UseAIToolOptions<STARFrameworkResult>
) {
  return useAITool<STARFrameworkResult, STARFrameworkParams>(
    "/api/ai-tools/star-framework",
    options
  );
}

export interface LearningResourcesParams {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  preferences?: {
    preferFree?: boolean;
    preferVideo?: boolean;
    preferHandsOn?: boolean;
  };
}

export interface LearningResourcesResult {
  topic: string;
  level: string;
  resources: {
    documentation: LearningResource[];
    tutorials: LearningResource[];
    videos: LearningResource[];
    courses: LearningResource[];
    books: LearningResource[];
    practice: LearningResource[];
  };
  learningPath: Array<{
    step: number;
    title: string;
    description: string;
    resources: string[];
    estimatedTime: string;
  }>;
  tips: string[];
}

interface LearningResource {
  title: string;
  type: string;
  url?: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  isFree: boolean;
  provider?: string;
}

export function useLearningResources(
  options?: UseAIToolOptions<LearningResourcesResult>
) {
  return useAITool<LearningResourcesResult, LearningResourcesParams>(
    "/api/ai-tools/learning-resources",
    options
  );
}

// Export all hooks
export {
  useAITool,
  type UseAIToolOptions,
  type UseAIToolReturn,
};
