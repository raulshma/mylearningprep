"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  MessageSquare,
  Github,
  Network,
  Users,
  BookOpen,
  Sparkles,
  ArrowRight,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: typeof TrendingUp;
  color: string;
  gradient: string;
  prompt: string;
}

const tools: Tool[] = [
  {
    id: "tech-trends",
    name: "Tech Trends",
    description: "Analyze technology market trends and career insights",
    icon: TrendingUp,
    color: "text-cyan-500",
    gradient: "from-cyan-500/20 to-blue-600/20",
    prompt: "Analyze the current tech trends for ",
  },
  {
    id: "mock-interview",
    name: "Mock Interview",
    description: "Practice with realistic interview scenarios",
    icon: MessageSquare,
    color: "text-violet-500",
    gradient: "from-violet-500/20 to-purple-600/20",
    prompt: "Start a mock interview session for ",
  },
  {
    id: "github-analysis",
    name: "GitHub Analysis",
    description: "Review code quality and patterns",
    icon: Github,
    color: "text-gray-500",
    gradient: "from-gray-500/20 to-slate-600/20",
    prompt: "Analyze the GitHub repository at ",
  },
  {
    id: "system-design",
    name: "System Design",
    description: "Learn to architect scalable systems",
    icon: Network,
    color: "text-indigo-500",
    gradient: "from-indigo-500/20 to-blue-600/20",
    prompt: "Help me design a system for ",
  },
  {
    id: "star-framework",
    name: "STAR Builder",
    description: "Craft compelling behavioral stories",
    icon: Users,
    color: "text-emerald-500",
    gradient: "from-emerald-500/20 to-green-600/20",
    prompt: "Help me create a STAR story about ",
  },
  {
    id: "learning-resources",
    name: "Learning Hub",
    description: "Get curated learning resources",
    icon: BookOpen,
    color: "text-rose-500",
    gradient: "from-rose-500/20 to-red-600/20",
    prompt: "Find learning resources for ",
  },
];

interface ToolsSidebarProps {
  onToolSelect: (prompt: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ToolsSidebar({
  onToolSelect,
  isCollapsed = false,
  onToggleCollapse,
}: ToolsSidebarProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 px-2 bg-muted/20 border-l border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant="ghost"
            size="icon"
            className={cn("mb-2", tool.color)}
            onClick={() => onToolSelect(tool.prompt)}
            title={tool.name}
          >
            <tool.icon className="h-5 w-5" />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent w-80">
      {/* Header */}
      <div className="p-4 border-b border-border/40 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">AI Tools</span>
          </div>
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Click a tool to start a conversation
        </p>
      </div>

      {/* Tools List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onToolSelect(tool.prompt)}
                className={cn(
                  "group w-full p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 text-left shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg bg-linear-to-br transition-transform duration-300 group-hover:scale-110 shadow-sm",
                      tool.gradient
                    )}
                  >
                    <Icon className={cn("h-4 w-4", tool.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors">
                        {tool.name}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Pro Features Notice */}
      <div className="p-4 border-t border-border/40 bg-transparent">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-violet-600/5 border border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-primary/10 blur-2xl rounded-full pointer-events-none" />

          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="p-1 rounded-md bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground/90">Pro Features</span>
          </div>
          <p className="text-xs text-muted-foreground relative z-10 leading-relaxed">
            These tools use advanced AI capabilities to help you prepare.
          </p>
        </div>
      </div>
    </div>
  );
}
