'use client';

import React from 'react';
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
  Sector,
} from 'recharts';
import {
  Activity,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Target,
  TrendingUp,
  Map,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type {
  UserAnalyticsStats,
  UserInterviewTrend,
  UserTopicProgress,
  UserCompanyData,
  UserSkillData,
  UserConfidenceData,
  UserjourneyStats,
  UserjourneyTrend,
  UserTopjourney,
  UserjourneyProgressBucket,
} from '@/lib/actions/user-analytics-cached';

// Chart configs
const interviewChartConfig: ChartConfig = {
  interviews: { label: 'Interviews', color: '#8b5cf6' },
};

const journeyCompletionChartConfig: ChartConfig = {
  nodeCompletions: { label: 'Node Completions', color: '#3b82f6' },
};

// Color maps
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

const JOURNEY_BUCKET_COLORS: Record<string, string> = {
  '0%': '#94a3b8',
  '1–25%': '#60a5fa',
  '26–50%': '#3b82f6',
  '51–75%': '#22c55e',
  '76–99%': '#a855f7',
  '100%': '#f59e0b',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}) {
  return (
    <Card className="group relative border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/50 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6 md:p-8 flex flex-col justify-between h-full relative z-10">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">{title}</span>
          <Icon className={`w-6 h-6 ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />
        </div>
        <p className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

// Stats Grid
export function StatsGrid({ stats }: { stats: UserAnalyticsStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <StatCard title="Total Interviews" value={stats.totalInterviews} icon={FileText} colorClass="text-violet-500" />
      <StatCard title="Revision Topics" value={stats.totalTopics} icon={BookOpen} colorClass="text-blue-500" />
      <StatCard title="MCQs Generated" value={stats.totalMcqs} icon={HelpCircle} colorClass="text-amber-500" />
      <StatCard title="Rapid-Fire Questions" value={stats.totalRapidFire} icon={Zap} colorClass="text-orange-500" />
      <StatCard title="Topics Completed" value={stats.completedTopics} icon={CheckCircle2} colorClass="text-green-500" />
      <StatCard title="Completion Rate" value={`${stats.topicCompletionRate}%`} icon={Target} colorClass="text-cyan-500" />
    </motion.div>
  );
}

// Journey Stats Grid
export function JourneyStatsGrid({ stats }: { stats: UserjourneyStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <StatCard title="Journeys Started" value={stats.journeysStarted} icon={Map} colorClass="text-blue-500" />
      <StatCard title="Active Journeys (7d)" value={stats.activejourneys7d} icon={Activity} colorClass="text-green-500" />
      <StatCard title="Nodes Completed" value={stats.totalNodesCompleted} icon={CheckCircle2} colorClass="text-violet-500" />
      <StatCard title="Time Spent (hrs)" value={Math.round((stats.totalTimeSpentMinutes || 0) / 60)} icon={Clock} colorClass="text-amber-500" />
    </motion.div>
  );
}


// Interview Activity Chart
export function InterviewActivityChart({ trends }: { trends: UserInterviewTrend[] }) {
  const formattedTrends = trends.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  const hasData = formattedTrends.some((d) => d.interviews > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 rounded-4xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
              <Activity className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Interview Activity</CardTitle>
          </div>
          <CardDescription className="text-base text-muted-foreground/80 ml-1">
            Your interview creation over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          {hasData ? (
            <ChartContainer config={interviewChartConfig} className="h-[300px] w-full">
              <AreaChart data={formattedTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInterviewsUser" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-interviews)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-interviews)" stopOpacity={0} />
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
                  cursor={{ stroke: 'var(--color-interviews)', strokeWidth: 2, strokeDasharray: '4 4', opacity: 0.3 }}
                />
                <Area
                  type="monotone"
                  dataKey="interviews"
                  stroke="var(--color-interviews)"
                  fill="url(#colorInterviewsUser)"
                  strokeWidth={3}
                  style={{ filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.3))' }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-3xl bg-secondary/10">
              <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-base font-medium text-muted-foreground">No interview activity yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}


// Donut Chart Component
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
  icon: React.ComponentType<{ className?: string }>;
  data: T[];
  labelKey: keyof T;
  colorMap: Record<string, string>;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))', transition: 'all 0.3s ease' }}
        />
      </g>
    );
  };

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 rounded-4xl overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/5 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
        </div>
        <CardDescription className="text-base text-muted-foreground/80 ml-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        {data.length > 0 ? (
          <div className="flex flex-col items-center gap-8">
            <div className="w-56 h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey={labelKey as string}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={4}
                    cornerRadius={6}
                    stroke="none"
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                  >
                    {data.map((entry) => (
                      <Cell key={String(entry[labelKey])} fill={colorMap[String(entry[labelKey])] || '#94a3b8'} style={{ cursor: 'pointer' }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-4xl font-bold tracking-tighter">{activeIndex !== undefined ? data[activeIndex].count : total}</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {activeIndex !== undefined ? String(data[activeIndex][labelKey]) : 'Total'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              {data.map((item, index) => {
                const label = item[labelKey] as string;
                const isActive = activeIndex === index;
                return (
                  <div
                    key={label}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                      isActive ? 'bg-secondary/70 scale-105 shadow-lg' : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white/10 ${isActive ? 'scale-125 ring-4' : ''}`}
                        style={{ backgroundColor: colorMap[String(label)] || '#94a3b8' }}
                      />
                      <span className="font-medium text-sm text-foreground/90">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">{item.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Topic Progress Chart
export function TopicProgressChart({ data }: { data: UserTopicProgress[] }) {
  return <DonutChart title="Topic Progress" description="Your revision topic completion status" icon={TrendingUp} data={data} labelKey="status" colorMap={STATUS_COLORS} />;
}

// Confidence Chart
export function ConfidenceChart({ data }: { data: UserConfidenceData[] }) {
  return <DonutChart title="Confidence Levels" description="AI-assessed confidence distribution" icon={Target} data={data} labelKey="confidence" colorMap={CONFIDENCE_COLORS} />;
}

// Journey Progress Chart
export function JourneyProgressChart({ data }: { data: UserjourneyProgressBucket[] }) {
  return <DonutChart title="Journey Progress" description="Your journeys grouped by progress" icon={Map} data={data} labelKey="bucket" colorMap={JOURNEY_BUCKET_COLORS} />;
}


// Journey Activity Chart
export function JourneyActivityChart({ trends }: { trends: UserjourneyTrend[] }) {
  const formattedTrends = trends.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  const hasData = formattedTrends.some((d) => (d.nodeCompletions ?? 0) > 0);

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 rounded-4xl overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Journey Activity</CardTitle>
        </div>
        <CardDescription className="text-base text-muted-foreground/80 ml-1">
          Node completions over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        {hasData ? (
          <ChartContainer config={journeyCompletionChartConfig} className="h-[300px] w-full">
            <AreaChart data={formattedTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorJourneyCompletions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-nodeCompletions)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-nodeCompletions)" stopOpacity={0} />
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="nodeCompletions"
                stroke="var(--color-nodeCompletions)"
                fill="url(#colorJourneyCompletions)"
                strokeWidth={3}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-3xl bg-secondary/10">
            <Map className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No journey activity yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// Progress List Component
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
  icon: React.ComponentType<{ className?: string }>;
  items: T[];
  labelKey: keyof T;
  colorMap?: Record<string, string>;
}) {
  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 rounded-4xl overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/5 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
        </div>
        <CardDescription className="text-base text-muted-foreground/80 ml-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        {items.length > 0 ? (
          <div className="space-y-6">
            {items.map((item, i) => {
              const label = item[labelKey] as string;
              return (
                <div key={label} className="group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50 text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-base font-medium text-foreground truncate">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-secondary/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 group-hover:scale-y-125 group-hover:shadow-lg origin-left"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: colorMap?.[label] || '#8b5cf6',
                        boxShadow: `0 0 12px ${colorMap?.[label] || '#8b5cf6'}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Companies List Card
export function CompaniesListCard({ data }: { data: UserCompanyData[] }) {
  return (
    <ProgressList
      title="Top Companies"
      description="Companies you're preparing for"
      icon={Building2}
      items={data}
      labelKey="company"
    />
  );
}

// Skills List Card
export function SkillsListCard({ data }: { data: UserSkillData[] }) {
  return (
    <ProgressList
      title="Key Skills"
      description="Most common skills across your interviews"
      icon={Zap}
      items={data}
      labelKey="skill"
    />
  );
}

// Top Journeys List Card
export function TopJourneysListCard({ data }: { data: UserTopjourney[] }) {
  const listItems = data.map((r) => ({
    journey: r.journeyTitle,
    count: r.nodesCompleted,
    percentage: r.overallProgress,
  }));

  return (
    <ProgressList
      title="Top Journeys"
      description="Your most progressed journeys"
      icon={Map}
      items={listItems}
      labelKey="journey"
      colorMap={{}}
    />
  );
}
