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
  Zap,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
      <div className="text-center py-24">
        <div className="w-24 h-24 rounded-3xl bg-secondary/30 flex items-center justify-center mx-auto mb-8">
          <BarChart3 className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground mb-3">Loading Insights...</h3>
        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Complete more activities to see detailed insights.
        </p>
      </div>
    );
  }

  const radarData = insights.skillRadar.map((item) => ({
    skill: skillClusterLabels[item.cluster] || item.cluster,
    score: item.score,
    percentile: item.percentile,
    fullMark: item.maxScore,
  }));

  const trendData = insights.eloTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    elo: Math.round(item.elo),
  }));

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="Overall ELO"
          value={Math.round(learningPath.overallElo).toString()}
          trend={learningPath.overallElo >= 1000 ? 'up' : 'down'}
          color="amber"
        />
        <StatCard
          icon={Gauge}
          label="Confidence"
          value={`${insights.confidenceScore}%`}
          trend={insights.confidenceScore >= 50 ? 'up' : 'down'}
          color="blue"
        />
        <StatCard
          icon={Activity}
          label="Activities"
          value={learningPath.timeline.length.toString()}
          color="green"
        />
        <StatCard
          icon={Target}
          label="Difficulty"
          value={`${learningPath.currentDifficulty}/10`}
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Radar */}
        {radarData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-sm p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Skill Radar</h3>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 2000]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
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
            className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-sm p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">ELO Progress</h3>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={['dataMin - 50', 'dataMax + 50']}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '16px',
                      boxShadow: '0 4px 20px -4px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px',
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="elo"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl bg-green-500/10 border border-green-500/20 p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Strengths</h3>
          </div>
          {insights.strengths.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {insights.strengths.map((cluster) => (
                <Badge
                  key={cluster}
                  className="rounded-xl px-4 py-2 text-sm font-medium bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20"
                >
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl bg-destructive/10 border border-destructive/20 p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-destructive/20">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Areas to Improve</h3>
          </div>
          {insights.weaknesses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {insights.weaknesses.map((cluster) => (
                <Badge
                  key={cluster}
                  className="rounded-xl px-4 py-2 text-sm font-medium bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                >
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
          className="rounded-3xl bg-amber-500/10 border border-amber-500/20 p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Needs Attention</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.stuckAreas.map((area) => (
              <div
                key={area.topicId}
                className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
              >
                <div>
                  <span className="font-medium text-foreground">{area.topicTitle}</span>
                  <p className="text-xs text-amber-600 mt-1">
                    {area.failureCount} consecutive failures
                  </p>
                </div>
                <Badge className="rounded-xl bg-amber-500/20 text-amber-600 border-amber-500/30">
                  Review
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Performance by Type */}
      {Object.keys(insights.performanceByType).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-sm p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Performance by Type</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(insights.performanceByType).map(([type, data]) => (
              <div key={type} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {activityTypeLabels[type] || type}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(data.successRate * 100)}%
                    <span className="text-xs ml-1">({data.attempts})</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.successRate * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      data.successRate >= 0.7
                        ? 'bg-green-500'
                        : data.successRate >= 0.4
                        ? 'bg-amber-500'
                        : 'bg-destructive'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-3xl bg-primary/5 border border-primary/20 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/20">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.suggestedImprovements.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-2xl bg-background/50 border border-primary/10"
            >
              <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                {index + 1}
              </span>
              <p className="text-sm text-foreground/80 leading-relaxed pt-1">{suggestion}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'primary',
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  trend?: 'up' | 'down';
  color?: 'primary' | 'amber' | 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/10 text-amber-600',
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    purple: 'bg-purple-500/10 text-purple-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className={`w-12 h-12 rounded-2xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex items-center gap-2">
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        {trend && (
          <div className={`p-1.5 rounded-lg ${trend === 'up' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}
