"use client";

import { memo, useCallback, useMemo } from "react";
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
  Globe,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore, useUI, useUIActions } from "@/lib/store/chat/store";

// =============================================================================
// Types
// =============================================================================

/**
 * Tool definition for the sidebar
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  prompt: string;
}

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Static tools array - defined outside component to prevent recreation
 * Requirements: 9.1 - Display available tools with descriptions and icons
 */
export const tools: Tool[] = [
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
    id: "web-crawler",
    name: "Web Crawler",
    description: "Extract full content from web pages and articles",
    icon: Globe,
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-amber-600/20",
    prompt: "Crawl this URL and extract the full content: ",
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

/**
 * Get a tool by its ID
 */
export function getToolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}

/**
 * Get all tool IDs
 */
export function getAllToolIds(): string[] {
  return tools.map((tool) => tool.id);
}

// =============================================================================
// Component Props
// =============================================================================

export interface ToolsSidebarProps {
  /**
   * Callback when a tool is selected
   * Requirements: 9.2 - Populate input with tool's prompt template
   */
  onToolSelect: (prompt: string) => void;
  /**
   * Whether the sidebar is collapsed (icon-only mode)
   */
  isCollapsed?: boolean;
  /**
   * Callback to toggle collapse state
   */
  onToggleCollapse?: () => void;
  /**
   * Optional class name for the container
   */
  className?: string;
}

export interface ToolCardProps {
  /**
   * The tool to display
   */
  tool: Tool;
  /**
   * Animation index for staggered entrance
   */
  index: number;
  /**
   * Callback when the tool is selected
   */
  onSelect: (prompt: string) => void;
}

// =============================================================================
// Tool Card Component
// =============================================================================

/**
 * Individual tool card with icon, name, and description
 * Memoized to prevent unnecessary re-renders
 * 
 * Requirements: 9.1 - Display tools with descriptions and icons
 * Requirements: 9.2 - Click populates input with prompt template
 */
export const ToolCard = memo(function ToolCard({
  tool,
  index,
  onSelect,
}: ToolCardProps) {
  const Icon = tool.icon;
  const handleClick = useCallback(() => onSelect(tool.prompt), [onSelect, tool.prompt]);
  
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className={cn(
        "group w-full p-3 rounded-xl border border-border/50 bg-card/40",
        "hover:bg-card/80 hover:border-primary/30",
        "transition-all duration-300 text-left shadow-sm hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
      )}
      aria-label={`Use ${tool.name} tool: ${tool.description}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg bg-linear-to-br transition-transform duration-300 group-hover:scale-110 shadow-sm",
            tool.gradient
          )}
          aria-hidden="true"
        >
          <Icon className={cn("h-4 w-4", tool.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm group-hover:text-primary transition-colors">
              {tool.name}
            </span>
            <ArrowRight 
              className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" 
              aria-hidden="true"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {tool.description}
          </p>
        </div>
      </div>
    </motion.button>
  );
});

// =============================================================================
// Collapsed Sidebar Component
// =============================================================================

/**
 * Collapsed version of the tools sidebar (icon-only)
 */
const CollapsedToolsSidebar = memo(function CollapsedToolsSidebar({
  onToolSelect,
  onToggleCollapse,
}: Pick<ToolsSidebarProps, 'onToolSelect' | 'onToggleCollapse'>) {
  return (
    <div 
      className="flex flex-col items-center py-4 px-2 bg-muted/20 border-l border-border/50"
      role="toolbar"
      aria-label="AI Tools (collapsed)"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        className="mb-4"
        aria-label="Expand tools sidebar"
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
          aria-label={`Use ${tool.name} tool`}
        >
          <tool.icon className="h-5 w-5" />
        </Button>
      ))}
    </div>
  );
});

// =============================================================================
// Tools List Component
// =============================================================================

/**
 * List of tool cards
 */
const ToolsList = memo(function ToolsList({
  onToolSelect,
}: Pick<ToolsSidebarProps, 'onToolSelect'>) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 space-y-2" role="list" aria-label="Available AI tools">
        {tools.map((tool, index) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            index={index}
            onSelect={onToolSelect}
          />
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// Pro Features Notice Component
// =============================================================================

/**
 * Pro features notice at the bottom of the sidebar
 */
const ProFeaturesNotice = memo(function ProFeaturesNotice() {
  return (
    <div className="p-4 border-t border-border/40 bg-transparent shrink-0">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-violet-600/5 border border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-primary/10 blur-2xl rounded-full pointer-events-none" aria-hidden="true" />

        <div className="flex items-center gap-2 mb-2 relative z-10">
          <div className="p-1 rounded-md bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-foreground/90">Pro Features</span>
        </div>
        <p className="text-xs text-muted-foreground relative z-10 leading-relaxed">
          These tools use advanced AI capabilities to help you prepare.
        </p>
      </div>
    </div>
  );
});

// =============================================================================
// Main Tools Sidebar Component
// =============================================================================

/**
 * Tools sidebar component displaying available AI tools
 * Connected to the chat store for state management
 * 
 * Requirements: 9.1 - Display available tools with descriptions and icons
 * Requirements: 9.2 - Click populates input with tool's prompt template
 */
export const ToolsSidebar = memo(function ToolsSidebar({
  onToolSelect,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: ToolsSidebarProps) {
  // Connect to store for sidebar state
  const ui = useUI();
  const { setRightSidebar } = useUIActions();
  
  // Use store state if no explicit props provided
  const effectiveIsCollapsed = isCollapsed;
  const effectiveOnToggle = onToggleCollapse ?? (() => setRightSidebar(!ui.rightSidebarOpen));

  // Memoized tool select handler
  const handleToolSelect = useCallback((prompt: string) => {
    onToolSelect(prompt);
  }, [onToolSelect]);

  if (effectiveIsCollapsed) {
    return (
      <CollapsedToolsSidebar
        onToolSelect={handleToolSelect}
        onToggleCollapse={effectiveOnToggle}
      />
    );
  }

  return (
    <div 
      className={cn("flex flex-col h-full bg-transparent w-80", className)}
      role="complementary"
      aria-label="AI Tools sidebar"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/40 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <span className="font-semibold">AI Tools</span>
          </div>
          {effectiveOnToggle && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={effectiveOnToggle}
              aria-label="Collapse tools sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Click a tool to start a conversation
        </p>
      </div>

      {/* Tools List */}
      <ToolsList onToolSelect={handleToolSelect} />

      {/* Pro Features Notice */}
      <ProFeaturesNotice />
    </div>
  );
});

// =============================================================================
// Hook for using tools sidebar with store
// =============================================================================

/**
 * Hook to get tools sidebar state and actions from the store
 */
export function useToolsSidebar() {
  const ui = useUI();
  const { setRightSidebar } = useUIActions();
  
  return useMemo(() => ({
    isOpen: ui.rightSidebarOpen,
    toggle: () => setRightSidebar(!ui.rightSidebarOpen),
    open: () => setRightSidebar(true),
    close: () => setRightSidebar(false),
    tools,
  }), [ui.rightSidebarOpen, setRightSidebar]);
}
