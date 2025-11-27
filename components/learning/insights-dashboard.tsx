'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  CheckCircle2,
  XCircle,
  Brain,
  Gauge,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { LearningInsights } from '@/lib/services/insight-generator';
import type { LearningPath } from '@/lib/db/schemas/learning-path';

interface InsightsDashboardProps {
  insights: LearningInsights | null;
  learningPath: LearningPath;
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

const activityTypeLabels: Record<string, string> = {
  mcq: 'MCQ',
  'coding-challenge': 'Coding',
  'debugging-task': 'Debug',
  'concept-explanation': 'Concept',
  'real-world-assignment': 'Assignment',
  'mini-case-study': 'Case Study',
};

export function InsightsDashboard({ insights, learningPath }: InsightsDashboardProps) {
  if (!insights) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-secondary flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-lg text-foreground mb-2">Loading Insights...</h3>
        <p className="text-muted-foreground">
          Complete more activities to see detailed insights.
        </p>
      </div>
    );
  }

  // Prepare radar chart data
  const radarData = insights.skillRadar.map((item) => ({
    skill: skillClusterLabels[item.cluster] || item.cluster,
    score: item.score,
    percentile: item.percentile,
    fullMark: item.maxScore,
  }));

  // Prepare ELO trend data
  const trendData = insights.eloTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    elo: Math.round(item.elo),
  }));

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Brain}
          label="Overall ELO"
          value={Math.round(learningPath.overallElo).toString()}
          trend={learningPath.overallElo >= 1000 ? 'up' : 'down'}
        />
        <StatCard
          icon={Gauge}
          label="Confidence"
          value={`${insights.confidenceScore}%`}
          trend={insights.confidenceScore >= 50 ? 'up' : 'down'}
        />
        <StatCard
          icon={Target}
          label="Activities"
          value={learningPath.timeline.length.toString()}
        />
        <StatCard
          icon={BarChart3}
          label="Difficulty"
          value={`${learningPath.currentDifficulty}/10`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Radar */}
        {radarData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border bg-card/80 p-6"
          >
            <h3 className="font-mono text-foreground mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Skill Radar
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 2000]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* ELO Trend */}
        {trendData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-border bg-card/80 p-6"
          >
            <h3 className="font-mono text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              ELO Trend
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    domain={['dataMin - 50', 'dataMax + 50']}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="elo"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-green-500/30 bg-green-500/5 p-6"
        >
          <h3 className="font-mono text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Strengths
          </h3>
          {insights.strengths.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {insights.strengths.map((cluster) => (
                <Badge key={cluster} variant="outline" className="border-green-500/50 text-green-500">
                  {skillClusterLabels[cluster] || cluster}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete more activities to identify your strengths.
            </p>
          )}
        </motion.div>

        {/* Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border border-destructive/30 bg-destructive/5 p-6"
        >
          <h3 className="font-mono text-foreground mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            Areas to Improve
          </h3>
          {insights.weaknesses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {insights.weaknesses.map((cluster) => (
                <Badge key={cluster} variant="outline" className="border-destructive/50 text-destructive">
                  {skillClusterLabels[cluster] || cluster}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No weak areas identified yet. Keep learning!
            </p>
          )}
        </motion.div>
      </div>

      {/* Stuck Areas */}
      {insights.stuckAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-amber-500/30 bg-amber-500/5 p-6"
        >
          <h3 className="font-mono text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Stuck Areas
          </h3>
          <div className="space-y-3">
            {insights.stuckAreas.map((area) => (
              <div
                key={area.topicId}
                className="flex items-center justify-between p-3 border border-amber-500/20 bg-amber-500/5"
              >
                <div>
                  <span className="font-mono text-foreground">{area.topicTitle}</span>
                  <p className="text-xs text-muted-foreground">
                    {area.failureCount} consecutive failures
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                  Needs Review
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Performance by Activity Type */}
      {Object.keys(insights.performanceByType).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="border border-border bg-card/80 p-6"
        >
          <h3 className="font-mono text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Performance by Activity Type
          </h3>
          <div className="space-y-4">
            {Object.entries(insights.performanceByType).map(([type, data]) => (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {activityTypeLabels[type] || type}
                  </span>
                  <span className="font-mono text-foreground">
                    {Math.round(data.successRate * 100)}% ({data.attempts} attempts)
                  </span>
                </div>
                <Progress
                  value={data.successRate * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Suggested Improvements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="border border-primary/30 bg-primary/5 p-6"
      >
        <h3 className="font-mono text-foreground mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Suggested Improvements
        </h3>
        <ul className="space-y-3">
          {insights.suggestedImprovements.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 bg-primary/10 flex items-center justify-center text-xs font-mono text-primary flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{suggestion}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="border border-border bg-card/80 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {trend && (
          trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )
        )}
      </div>
      <p className="text-2xl font-mono text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
