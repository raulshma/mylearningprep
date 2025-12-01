"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Wrench,
  Search,
  Globe,
  TrendingUp,
  MessageSquare,
  Github,
  Layers,
  Star,
  BookOpen,
} from "lucide-react";
import { updateAIToolStatus } from "@/lib/actions/admin";
import type { AIToolConfig, AIToolId } from "@/lib/db/schemas/settings";

interface AIToolsConfigProps {
  initialConfig: AIToolConfig[];
}

const TOOL_ICONS: Record<AIToolId, typeof Search> = {
  searchWeb: Search,
  crawlWeb: Globe,
  searchAndCrawl: Globe,
  analyzeTechTrends: TrendingUp,
  generateInterviewQuestions: MessageSquare,
  analyzeGitHubRepo: Github,
  generateSystemDesign: Layers,
  structureSTARResponse: Star,
  findLearningResources: BookOpen,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-secondary text-secondary-foreground",
  PRO: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MAX: "bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400",
};

export function AIToolsConfig({ initialConfig }: AIToolsConfigProps) {
  const [tools, setTools] = useState<AIToolConfig[]>(initialConfig);
  const [pendingTool, setPendingTool] = useState<AIToolId | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (toolId: AIToolId, enabled: boolean) => {
    setPendingTool(toolId);
    startTransition(async () => {
      const result = await updateAIToolStatus(toolId, enabled);
      if ("success" in result && result.success) {
        setTools((prev) =>
          prev.map((t) => (t.id === toolId ? { ...t, enabled } : t))
        );
      }
      setPendingTool(null);
    });
  };

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/50 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/10">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Tool Configuration</CardTitle>
        </div>
        <CardDescription>
          Enable or disable AI tools. Disabled tools will not be available to the AI assistant.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8">
        <div className="grid gap-4">
          {tools.map((tool) => {
            const Icon = TOOL_ICONS[tool.id] || Wrench;
            const isLoading = isPending && pendingTool === tool.id;

            return (
              <div
                key={tool.id}
                className={`flex items-center justify-between p-5 rounded-2xl border border-border/40 transition-all duration-200 ${
                  tool.enabled
                    ? "bg-secondary/20 hover:bg-secondary/40"
                    : "bg-secondary/5 opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tool.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{tool.name}</p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0.5 rounded-full ${PLAN_COLORS[tool.requiredPlan]}`}
                      >
                        {tool.requiredPlan}+
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLoading && <Spinner className="w-4 h-4" />}
                  <Switch
                    checked={tool.enabled}
                    onCheckedChange={(checked) => handleToggle(tool.id, checked)}
                    disabled={isPending}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
