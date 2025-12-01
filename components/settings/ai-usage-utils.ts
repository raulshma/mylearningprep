import type { ChartConfig } from "@/components/ui/chart";

// Format functions
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

export function formatCost(cost: number): string {
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(4)}`;
}

// Chart configurations
export const requestsChartConfig: ChartConfig = {
    requests: { label: "Requests", color: "#8b5cf6" },
};

export const tokenChartConfig: ChartConfig = {
    inputTokens: { label: "Input", color: "#3b82f6" },
    outputTokens: { label: "Output", color: "#f97316" },
};

// Color constants
export const STATUS_COLORS: Record<string, string> = {
    Success: "#10b981", // Emerald 500
    Error: "#ef4444", // Red 500
    Timeout: "#f59e0b", // Amber 500
    "Rate Limited": "#f97316", // Orange 500
    Cancelled: "#94a3b8", // Slate 400
};

export const ACTION_COLORS = [
    "#8b5cf6",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
];

// Action labels mapping
export const ACTION_LABELS: Record<string, string> = {
    GENERATE_BRIEF: "Brief",
    GENERATE_TOPICS: "Topics",
    GENERATE_MCQ: "MCQ",
    GENERATE_RAPID_FIRE: "Rapid Fire",
    REGENERATE_ANALOGY: "Analogy",
    PARSE_PROMPT: "Parse",
    TOPIC_CHAT: "Chat",
    GENERATE_ACTIVITY_MCQ: "Activity MCQ",
    GENERATE_ACTIVITY_CODING_CHALLENGE: "Coding",
    GENERATE_ACTIVITY_DEBUGGING_TASK: "Debug",
    GENERATE_ACTIVITY_CONCEPT_EXPLANATION: "Concept",
    GENERATE_ACTIVITY_REAL_WORLD_ASSIGNMENT: "Assignment",
    GENERATE_ACTIVITY_MINI_CASE_STUDY: "Case Study",
    ANALYZE_FEEDBACK: "Feedback",
    AGGREGATE_ANALYSIS: "Analysis",
    GENERATE_IMPROVEMENT_PLAN: "Plan",
    STREAM_IMPROVEMENT_ACTIVITY: "Improvement",
};
