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
  Clock,
  CheckCircle2,
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
      className="border border-border bg-card hover:border-primary/30 transition-all"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-mono text-foreground">Active Learning Path</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {learningPath.goal}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-secondary/30 border border-border">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-mono text-foreground">
              {Math.round(learningPath.overallElo)}
            </p>
            <p className="text-xs text-muted-foreground">ELO</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 border border-border">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-mono text-foreground">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Activities</p>
          </div>
          <div className="text-center p-3 bg-secondary/30 border border-border">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-lg font-mono text-foreground">{successRate}%</p>
            <p className="text-xs text-muted-foreground">Success</p>
          </div>
        </div>

        {/* Current Topic */}
        {currentTopic && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Current Topic</p>
            <p className="font-mono text-foreground text-sm">{currentTopic.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {skillClusterLabels[currentTopic.skillCluster] || currentTopic.skillCluster}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Difficulty {currentTopic.difficulty}/10
              </span>
            </div>
          </div>
        )}

        {/* Skill Clusters */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Focus Areas</p>
          <div className="flex flex-wrap gap-1">
            {learningPath.skillClusters.slice(0, 4).map((cluster) => (
              <Badge key={cluster} variant="secondary" className="text-xs">
                {skillClusterLabels[cluster] || cluster}
              </Badge>
            ))}
            {learningPath.skillClusters.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{learningPath.skillClusters.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Difficulty Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Current Difficulty</span>
            <span className="font-mono text-foreground">
              {learningPath.currentDifficulty}/10
            </span>
          </div>
          <Progress value={learningPath.currentDifficulty * 10} className="h-1.5" />
        </div>

        {/* Action */}
        <Button asChild className="w-full">
          <Link href={`/learning/${learningPath._id}`}>
            Continue Learning
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

function EmptyLearningPathCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-dashed border-border bg-card/50 hover:border-primary/30 transition-all"
    >
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-secondary flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-foreground mb-2">Start Learning</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a personalized learning path with adaptive difficulty and AI-generated activities.
        </p>
        <Button asChild>
          <Link href="/learning/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Learning Path
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
