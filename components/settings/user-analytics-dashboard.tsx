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
  FileText,
  HelpCircle,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="group relative border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6 md:p-8 flex flex-col justify-between h-full relative z-10">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">{title}</span>
          <Icon className={`w-6 h-6 ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />
        </div>
        <div>
          <p className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">{value}</p>
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
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
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
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
            transition: 'all 0.3s ease',
          }}
        />
      </g>
    );
  };

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
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
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {data.map((entry) => (
                      <Cell
                        key={String(entry[labelKey])}
                        fill={colorMap[entry[labelKey] as string] || '#94a3b8'}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-4xl font-bold tracking-tighter transition-all duration-300">
                  {activeIndex !== undefined ? data[activeIndex].count : total}
                </span>
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
                      isActive 
                        ? 'bg-secondary/70 scale-105 shadow-lg' 
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white/10 transition-all duration-300 ${
                          isActive ? 'scale-125 ring-4' : ''
                        }`}
                        style={{ backgroundColor: colorMap[label] || '#94a3b8' }}
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


export function UserAnalyticsDashboard({ data }: UserAnalyticsDashboardProps) {
  const { stats, interviewTrends, topicProgress, topCompanies, topSkills, confidenceDistribution } = data;

  const formattedTrends = interviewTrends.map((d) => ({
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
          title="Total Interviews"
          value={stats.totalInterviews}
          icon={FileText}
          colorClass="text-violet-500"
        />
        <StatCard
          title="Revision Topics"
          value={stats.totalTopics}
          icon={BookOpen}
          colorClass="text-blue-500"
        />
        <StatCard
          title="MCQs Generated"
          value={stats.totalMcqs}
          icon={HelpCircle}
          colorClass="text-amber-500"
        />
        <StatCard
          title="Rapid-Fire Questions"
          value={stats.totalRapidFire}
          icon={Zap}
          colorClass="text-orange-500"
        />
        <StatCard
          title="Topics Completed"
          value={stats.completedTopics}
          icon={CheckCircle2}
          colorClass="text-green-500"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.topicCompletionRate}%`}
          icon={Target}
          colorClass="text-cyan-500"
        />
      </motion.div>

      {/* Interview Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                <Activity className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">Interview Activity</CardTitle>
            </div>
            <CardDescription className="text-base text-muted-foreground/80 ml-1">Your interview creation over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            {formattedTrends.some((d) => d.interviews > 0) ? (
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
                    cursor={{ 
                      stroke: 'var(--color-interviews)', 
                      strokeWidth: 2, 
                      strokeDasharray: '4 4',
                      opacity: 0.3
                    }}
                    animationDuration={200}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="interviews"
                    stroke="var(--color-interviews)"
                    fill="url(#colorInterviewsUser)"
                    strokeWidth={3}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    style={{
                      filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.3))',
                    }}
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

      {/* Progress Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
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
      </motion.div>

      {/* Lists */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
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
      </motion.div>
    </div>
  );
}
