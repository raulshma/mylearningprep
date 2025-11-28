'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Activity,
  Cpu,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Database,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { AIUsageDashboardData, AILogEntry } from '@/lib/actions/ai-usage';

interface AIUsageDashboardProps {
  data: AIUsageDashboardData;
}

const requestsChartConfig: ChartConfig = {
  requests: { label: 'Requests', color: '#8b5cf6' },
  tokens: { label: 'Tokens', color: '#3b82f6' },
};

const STATUS_COLORS: Record<string, string> = {
  Success: '#22c55e',
  Error: '#ef4444',
  Timeout: '#f59e0b',
  'Rate Limited': '#f97316',
  Cancelled: '#94a3b8',
};

const ACTION_COLORS = [
  '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  subtitle?: string;
}) {
  return (
    <Card className="group relative border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden hover:scale-[1.02] transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardContent className="p-6 md:p-8 flex flex-col justify-between h-full relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">{title}</span>
          <Icon className={`w-6 h-6 ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />
        </div>
        <div>
          <p className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}


function RecentLogsTable({ logs }: { logs: AILogEntry[] }) {
  const actionLabels: Record<string, string> = {
    GENERATE_BRIEF: 'Brief',
    GENERATE_TOPICS: 'Topics',
    GENERATE_MCQ: 'MCQ',
    GENERATE_RAPID_FIRE: 'Rapid Fire',
    REGENERATE_ANALOGY: 'Analogy',
    PARSE_PROMPT: 'Parse',
    TOPIC_CHAT: 'Chat',
    GENERATE_ACTIVITY_MCQ: 'Activity MCQ',
    GENERATE_ACTIVITY_CODING_CHALLENGE: 'Coding',
    GENERATE_ACTIVITY_DEBUGGING_TASK: 'Debug',
    GENERATE_ACTIVITY_CONCEPT_EXPLANATION: 'Concept',
    GENERATE_ACTIVITY_REAL_WORLD_ASSIGNMENT: 'Assignment',
    GENERATE_ACTIVITY_MINI_CASE_STUDY: 'Case Study',
    ANALYZE_FEEDBACK: 'Feedback',
    AGGREGATE_ANALYSIS: 'Analysis',
    GENERATE_IMPROVEMENT_PLAN: 'Plan',
    STREAM_IMPROVEMENT_ACTIVITY: 'Improvement',
  };

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/5 text-primary">
            <Database className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Recent Requests</CardTitle>
        </div>
        <CardDescription className="text-base text-muted-foreground/80 ml-1">Your latest AI API calls</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tokens</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Latency</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="font-medium">
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground font-mono truncate max-w-[150px]">
                      {log.model.split('/').pop()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={log.status === 'success' ? 'default' : 'destructive'}
                        className={log.status === 'success' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}
                      >
                        {log.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatNumber(log.tokenUsage.input + log.tokenUsage.output)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {log.latencyMs}ms
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {log.estimatedCost ? formatCost(log.estimatedCost) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-muted-foreground">No requests yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function AIUsageDashboard({ data }: AIUsageDashboardProps) {
  const { stats, trends, actionBreakdown, modelUsage, statusBreakdown, recentLogs } = data;

  const formattedTrends = trends.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <StatCard
          title="Total Requests"
          value={formatNumber(stats.totalRequests)}
          icon={Activity}
          colorClass="text-violet-500"
        />
        <StatCard
          title="Total Tokens"
          value={formatNumber(stats.totalInputTokens + stats.totalOutputTokens)}
          icon={Cpu}
          colorClass="text-blue-500"
          subtitle={`${formatNumber(stats.totalInputTokens)} in / ${formatNumber(stats.totalOutputTokens)} out`}
        />
        <StatCard
          title="Estimated Cost"
          value={formatCost(stats.totalCost)}
          icon={DollarSign}
          colorClass="text-green-500"
        />
        <StatCard
          title="Avg Latency"
          value={`${stats.avgLatencyMs}ms`}
          icon={Clock}
          colorClass="text-amber-500"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={CheckCircle2}
          colorClass="text-emerald-500"
        />
        <StatCard
          title="Errors"
          value={stats.errorCount}
          icon={AlertCircle}
          colorClass="text-red-500"
        />
      </motion.div>

      {/* Usage Trends Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">Usage Trends</CardTitle>
            </div>
            <CardDescription className="text-base text-muted-foreground/80 ml-1">AI requests over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            {formattedTrends.some((d) => d.requests > 0) ? (
              <ChartContainer config={requestsChartConfig} className="h-[300px] w-full">
                <AreaChart data={formattedTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-requests)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-requests)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={16}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={16}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="var(--color-requests)"
                    fill="url(#colorRequests)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-3xl bg-secondary/10">
                <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-base font-medium text-muted-foreground">No usage data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Action & Status Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Action Breakdown */}
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/5 text-primary">
                <Zap className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">By Action</CardTitle>
            </div>
            <CardDescription className="text-base text-muted-foreground/80 ml-1">Request distribution by type</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            {actionBreakdown.length > 0 ? (
              <div className="space-y-4">
                {actionBreakdown.slice(0, 8).map((item, i) => (
                  <div key={item.action} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{item.action}</span>
                      <span className="text-sm text-muted-foreground">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-secondary/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: ACTION_COLORS[i % ACTION_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center">
                <Zap className="w-8 h-8 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">By Status</CardTitle>
            </div>
            <CardDescription className="text-base text-muted-foreground/80 ml-1">Request success/failure breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            {statusBreakdown.length > 0 ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-48 h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        cornerRadius={6}
                        stroke="none"
                      >
                        {statusBreakdown.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-3xl font-bold">{stats.successRate}%</span>
                    <span className="text-xs text-muted-foreground">Success</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {statusBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }}
                        />
                        <span className="text-sm font-medium">{item.status}</span>
                      </div>
                      <span className="text-sm font-bold text-muted-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Model Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Cpu className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">Model Usage</CardTitle>
            </div>
            <CardDescription className="text-base text-muted-foreground/80 ml-1">AI models used and their costs</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            {modelUsage.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Model</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Requests</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tokens</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {modelUsage.map((model) => (
                      <tr key={model.model} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4 text-sm font-mono">{model.model}</td>
                        <td className="py-3 px-4 text-sm text-right">{model.count} ({model.percentage}%)</td>
                        <td className="py-3 px-4 text-sm text-right font-mono">{formatNumber(model.totalTokens)}</td>
                        <td className="py-3 px-4 text-sm text-right font-mono">{formatCost(model.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center">
                <Cpu className="w-8 h-8 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No model data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <RecentLogsTable logs={recentLogs} />
      </motion.div>
    </div>
  );
}
