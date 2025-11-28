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
} from 'recharts';
import {
  FileText,
  BookOpen,
  HelpCircle,
  Zap,
  CheckCircle2,
  Building2,
  Target,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type {
  UserAnalyticsDashboardData,
  UserTopicProgress,
  UserConfidenceData,
} from '@/lib/actions/user-analytics';

interface UserAnalyticsDashboardProps {
  data: UserAnalyticsDashboardData;
}

const interviewChartConfig: ChartConfig = {
  interviews: {
    label: 'Interviews',
    color: '#8b5cf6',
  },
};

const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#94a3b8',
  'In Progress': '#3b82f6',
  'Completed': '#22c55e',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  'Low': '#ef4444',
  'Medium': '#f59e0b',
  'High': '#22c55e',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  bgColorClass,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
  bgColorClass: string;
}) {
  return (
    <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-2xl ${bgColorClass} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}


function ProgressList<T extends { count: number; percentage: number }>({
  title,
  description,
  icon: Icon,
  items,
  labelKey,
  colorMap,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  items: T[];
  labelKey: keyof T;
  colorMap?: Record<string, string>;
}) {
  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="p-6 md:p-8 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
        </div>
        <CardDescription className="mt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8">
        {items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item, i) => {
              const label = item[labelKey] as string;
              return (
                <div key={label} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">{label}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: colorMap?.[label] || '#8b5cf6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DonutChart<T extends { count: number; percentage: number }>({
  title,
  description,
  icon: Icon,
  data,
  labelKey,
  colorMap,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  data: T[];
  labelKey: keyof T;
  colorMap: Record<string, string>;
}) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="p-6 md:p-8 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
        </div>
        <CardDescription className="mt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8">
        {data.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey={labelKey as string}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    cornerRadius={4}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={String(entry[labelKey])}
                        fill={colorMap[entry[labelKey] as string] || '#94a3b8'}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold">{total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
            <div className="space-y-4 flex-1 w-full">
              {data.map((item) => {
                const label = item[labelKey] as string;
                return (
                  <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ backgroundColor: colorMap[label] || '#94a3b8' }}
                      />
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{item.count}</span>
                      <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function UserAnalyticsDashboard({ data }: UserAnalyticsDashboardProps) {
  const { stats, interviewTrends, topicProgress, topCompanies, topSkills, confidenceDistribution } = data;

  const formattedTrends = interviewTrends.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Interviews"
          value={stats.totalInterviews}
          icon={FileText}
          colorClass="text-violet-500"
          bgColorClass="bg-violet-500/10"
        />
        <StatCard
          title="Revision Topics"
          value={stats.totalTopics}
          icon={BookOpen}
          colorClass="text-blue-500"
          bgColorClass="bg-blue-500/10"
        />
        <StatCard
          title="MCQs Generated"
          value={stats.totalMcqs}
          icon={HelpCircle}
          colorClass="text-amber-500"
          bgColorClass="bg-amber-500/10"
        />
        <StatCard
          title="Rapid-Fire Questions"
          value={stats.totalRapidFire}
          icon={Zap}
          colorClass="text-orange-500"
          bgColorClass="bg-orange-500/10"
        />
        <StatCard
          title="Topics Completed"
          value={stats.completedTopics}
          icon={CheckCircle2}
          colorClass="text-green-500"
          bgColorClass="bg-green-500/10"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.topicCompletionRate}%`}
          icon={Target}
          colorClass="text-cyan-500"
          bgColorClass="bg-cyan-500/10"
        />
      </div>

      {/* Interview Activity Chart */}
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Interview Activity</CardTitle>
              <CardDescription className="mt-1">Your interview creation over the last 30 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {formattedTrends.some((d) => d.interviews > 0) ? (
            <ChartContainer config={interviewChartConfig} className="h-[250px] w-full">
              <AreaChart data={formattedTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInterviewsUser" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-interviews)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-interviews)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="interviews"
                  stroke="var(--color-interviews)"
                  fill="url(#colorInterviewsUser)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-2xl bg-secondary/20">
              <Activity className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No interview activity yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DonutChart
          title="Topic Progress"
          description="Your revision topic completion status"
          icon={TrendingUp}
          data={topicProgress}
          labelKey="status"
          colorMap={STATUS_COLORS}
        />
        <DonutChart
          title="Confidence Levels"
          description="AI-assessed confidence distribution"
          icon={Target}
          data={confidenceDistribution}
          labelKey="confidence"
          colorMap={CONFIDENCE_COLORS}
        />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressList
          title="Top Companies"
          description="Companies you're preparing for"
          icon={Building2}
          items={topCompanies}
          labelKey="company"
        />
        <ProgressList
          title="Key Skills"
          description="Most common skills across your interviews"
          icon={Zap}
          items={topSkills}
          labelKey="skill"
        />
      </div>
    </div>
  );
}
