'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  TrendingUp,
  Target,
  Brain,
  ArrowRight,
  Plus,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { LearningPath } from '@/lib/db/schemas/learning-path';

interface LearningPathCardProps {
  learningPath: LearningPath | null;
}

const skillClusterLabels: Record<string, string> = {
  dsa: 'DSA',
  oop: 'OOP',
  'system-design': 'System Design',
  debugging: 'Debugging',
  databases: 'Databases',
  'api-design': 'API Design',
  testing: 'Testing',
  devops: 'DevOps',
  frontend: 'Frontend',
  backend: 'Backend',
  security: 'Security',
  performance: 'Performance',
};

export function LearningPathCard({ learningPath }: LearningPathCardProps) {
  if (!learningPath) {
    return <EmptyLearningPathCard />;
  }

  const currentTopic = learningPath.topics.find(
    (t) => t.id === learningPath.currentTopicId
  );

  const successCount = learningPath.timeline.filter((e) => e.success).length;
  const totalCount = learningPath.timeline.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-card border border-border group hover:border-primary/30 transition-all duration-500"
    >
      <div className="p-6 md:p-8 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-foreground">Learning Path</h3>
                <Badge variant="secondary" className="gap-1 rounded-full px-2.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm line-clamp-1 max-w-md">
                {learningPath.goal}
              </p>
            </div>
          </div>

          <Button asChild className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
            <Link href={`/learning/${learningPath._id}`}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Focus */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Current Focus</p>
              {currentTopic && (
                <Badge variant="outline" className="rounded-full text-xs">
                  {skillClusterLabels[currentTopic.skillCluster] || currentTopic.skillCluster}
                </Badge>
              )}
            </div>

            {currentTopic ? (
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-foreground">{currentTopic.title}</p>
                  <span className="text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded-md">
                    Lvl {currentTopic.difficulty}
                  </span>
                </div>
                <Progress value={learningPath.currentDifficulty * 10} className="h-1.5 bg-background/50" />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-secondary/30 border border-dashed border-border/50 text-center text-sm text-muted-foreground">
                No active topic
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-secondary/20 border border-border/50 flex flex-col items-center justify-center text-center">
              <Brain className="w-4 h-4 text-primary mb-2" />
              <span className="text-xl font-bold text-foreground">{Math.round(learningPath.overallElo)}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ELO</span>
            </div>
            <div className="p-3 rounded-2xl bg-secondary/20 border border-border/50 flex flex-col items-center justify-center text-center">
              <Target className="w-4 h-4 text-blue-500 mb-2" />
              <span className="text-xl font-bold text-foreground">{totalCount}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Activities</span>
            </div>
            <div className="p-3 rounded-2xl bg-secondary/20 border border-border/50 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-4 h-4 text-green-500 mb-2" />
              <span className="text-xl font-bold text-foreground">{successRate}%</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Success</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyLearningPathCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-card/30 hover:bg-card/50 transition-all duration-500 group"
    >
      <div className="p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
          <Sparkles className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Start Your Journey</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Create a personalized learning path with adaptive difficulty and AI-generated activities to master new skills.
        </p>
        <Button asChild className="rounded-full px-8">
          <Link href="/learning/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Learning Path
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
