'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  MessageSquare,
  Github,
  Network,
  Target,
  BookOpen,
  ChevronRight,
  Sparkles,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AIToolName } from '@/lib/services/ai-tools';

interface AIToolCardProps {
  toolName: AIToolName;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  isPro?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  hover: { scale: 1.02, y: -4 },
  tap: { scale: 0.98 },
};

export function AIToolCard({
  toolName,
  title,
  description,
  icon: Icon,
  color,
  isPro = false,
  isLocked = false,
  onClick,
}: AIToolCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={!isLocked ? "hover" : undefined}
      whileTap={!isLocked ? "tap" : undefined}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden cursor-pointer transition-colors',
          isLocked && 'opacity-60 cursor-not-allowed',
          !isLocked && 'hover:border-primary/50'
        )}
        onClick={!isLocked ? onClick : undefined}
      >
        {/* Background gradient */}
        <div
          className={cn(
            'absolute inset-0 opacity-5',
            color
          )}
        />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className={cn('p-2 rounded-lg', color.replace('bg-', 'bg-').replace('-500', '-500/10'))}>
              <Icon className={cn('h-5 w-5', color.replace('bg-', 'text-'))} />
            </div>
            <div className="flex items-center gap-2">
              {isPro && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Pro
                </Badge>
              )}
              {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <CardTitle className="text-lg mt-2">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <div className="flex items-center text-sm text-primary font-medium">
            {isLocked ? 'Upgrade to unlock' : 'Get started'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AIToolsGridProps {
  userPlan: 'FREE' | 'PRO' | 'MAX';
  onToolSelect: (toolName: AIToolName) => void;
}

const tools: Array<{
  name: AIToolName;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  minPlan: 'PRO' | 'MAX';
}> = [
  {
    name: 'analyzeTechTrends',
    title: 'Tech Trends Analysis',
    description: 'Analyze technology market trends, job demand, and growth trajectory to prioritize your learning.',
    icon: TrendingUp,
    color: 'bg-cyan-500',
    minPlan: 'PRO',
  },
  {
    name: 'mockInterview',
    title: 'Mock Interview',
    description: 'Generate realistic mock interview questions with ideal answers and evaluation criteria.',
    icon: MessageSquare,
    color: 'bg-violet-500',
    minPlan: 'PRO',
  },
  {
    name: 'analyzeGitHubRepo',
    title: 'GitHub Analysis',
    description: 'Analyze repositories to understand architecture, technologies, and generate interview questions.',
    icon: Github,
    color: 'bg-slate-500',
    minPlan: 'PRO',
  },
  {
    name: 'generateSystemDesign',
    title: 'System Design',
    description: 'Generate comprehensive system design templates with components, data flow, and tradeoffs.',
    icon: Network,
    color: 'bg-indigo-500',
    minPlan: 'PRO',
  },
  {
    name: 'generateSTARFramework',
    title: 'STAR Framework',
    description: 'Structure your behavioral interview answers using the STAR method with improvements.',
    icon: Target,
    color: 'bg-rose-500',
    minPlan: 'PRO',
  },
  {
    name: 'findLearningResources',
    title: 'Learning Resources',
    description: 'Find curated learning resources including docs, tutorials, videos, and practice problems.',
    icon: BookOpen,
    color: 'bg-emerald-500',
    minPlan: 'PRO',
  },
];

export function AIToolsGrid({ userPlan, onToolSelect }: AIToolsGridProps) {
  const isProOrMax = userPlan === 'PRO' || userPlan === 'MAX';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {tools.map((tool, index) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AIToolCard
              toolName={tool.name}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              color={tool.color}
              isPro
              isLocked={!isProOrMax}
              onClick={() => onToolSelect(tool.name)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact tool selector for inline use
 */
interface AIToolSelectorProps {
  userPlan: 'FREE' | 'PRO' | 'MAX';
  onToolSelect: (toolName: AIToolName) => void;
  className?: string;
}

export function AIToolSelector({ userPlan, onToolSelect, className }: AIToolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isProOrMax = userPlan === 'PRO' || userPlan === 'MAX';

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={!isProOrMax}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI Tools
        {!isProOrMax && <Lock className="h-3 w-3 ml-1" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 z-50 w-72 bg-popover border rounded-lg shadow-lg p-2"
          >
            <div className="space-y-1">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => {
                      onToolSelect(tool.name);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                  >
                    <div className={cn('p-1.5 rounded', tool.color.replace('bg-', 'bg-').replace('-500', '-500/10'))}>
                      <Icon className={cn('h-4 w-4', tool.color.replace('bg-', 'text-'))} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{tool.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export tool metadata for external use
export { tools as AI_TOOLS_METADATA };
