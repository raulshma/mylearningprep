"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Cpu,
  Building2,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import type {
  UsageTrendData,
  PopularTopicData,
  PlanDistribution,
  TokenUsageTrend,
} from "@/lib/actions/admin";

interface AnalyticsDashboardProps {
  usageTrends: UsageTrendData[];
  popularTopics: PopularTopicData[];
  planDistribution: PlanDistribution[];
  tokenUsageTrends: TokenUsageTrend[];
  topCompanies: PopularTopicData[];
  modelUsage: Array<{ model: string; count: number; percentage: number }>;
}

const usageChartConfig: ChartConfig = {
  interviews: {
    label: "Interviews",
    color: "#8b5cf6", // Bright violet
  },
  aiRequests: {
    label: "AI Requests",
    color: "#f97316", // Bright orange
  },
  users: {
    label: "New Users",
    color: "#22c55e", // Bright green
  },
  tokens: {
    label: "Tokens (K)",
    color: "#06b6d4", // Bright cyan
  },
};

const tokenChartConfig: ChartConfig = {
  inputTokens: {
    label: "Input Tokens",
    color: "#22d3ee", // Bright cyan - visible on both light/dark
  },
  outputTokens: {
    label: "Output Tokens",
    color: "#f472b6", // Bright pink - visible on both light/dark
  },
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "#94a3b8", // Slate gray - visible on both themes
  PRO: "#3b82f6", // Bright blue
  MAX: "#eab308", // Bright yellow/gold
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// SummaryCard component defined outside the main component to avoid recreation on each render
function SummaryCard({
  title,
  value,
  trend,
  icon: Icon,
  colorClass,
  bgColorClass,
}: {
  title: string;
  value: number;
  trend: { value: number; isPositive: boolean };
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgColorClass: string;
}) {
  return (
    <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-10 h-10 rounded-2xl ${bgColorClass} flex items-center justify-center`}
          >
            <Icon className={`w-5 h-5 ${colorClass}`} />
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}%
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateTrend(data: number[]): {
  value: number;
  isPositive: boolean;
} {
  if (data.length < 2) return { value: 0, isPositive: true };
  const recent = data.slice(-7).reduce((a, b) => a + b, 0);
  const previous = data.slice(-14, -7).reduce((a, b) => a + b, 0);
  if (previous === 0) return { value: 100, isPositive: true };
  const change = ((recent - previous) / previous) * 100;
  return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
}

export function AnalyticsDashboard({
  usageTrends,
  popularTopics,
  planDistribution,
  tokenUsageTrends,
  topCompanies,
  modelUsage,
}: AnalyticsDashboardProps) {
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);
  
  // Calculate trends
  const interviewTrend = calculateTrend(usageTrends.map((d) => d.interviews));
  const aiRequestTrend = calculateTrend(usageTrends.map((d) => d.aiRequests));
  const userTrend = calculateTrend(usageTrends.map((d) => d.users));

  // Format data for charts - ensure numeric values
  // Tokens are scaled to thousands (K) for better chart readability
  const formattedUsageTrends = usageTrends.map((d) => ({
    ...d,
    interviews: Number(d.interviews) || 0,
    aiRequests: Number(d.aiRequests) || 0,
    users: Number(d.users) || 0,
    tokens: Math.round((Number(d.tokens) || 0) / 1000), // Convert to K
    formattedDate: formatDate(d.date),
  }));

  const formattedTokenTrends = tokenUsageTrends.map((d) => ({
    ...d,
    inputTokens: Number(d.inputTokens) || 0,
    outputTokens: Number(d.outputTokens) || 0,
    formattedDate: formatDate(d.date),
  }));

  // Calculate totals - ensure numeric values
  const totalInterviews = usageTrends.reduce(
    (sum, d) => sum + (Number(d.interviews) || 0),
    0
  );
  const totalAIRequests = usageTrends.reduce(
    (sum, d) => sum + (Number(d.aiRequests) || 0),
    0
  );
  const totalNewUsers = usageTrends.reduce(
    (sum, d) => sum + (Number(d.users) || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard
          title="Interviews (30d)"
          value={totalInterviews}
          trend={interviewTrend}
          icon={FileText}
          colorClass="text-violet-500"
          bgColorClass="bg-violet-500/10"
        />
        <SummaryCard
          title="AI Requests (30d)"
          value={totalAIRequests}
          trend={aiRequestTrend}
          icon={Cpu}
          colorClass="text-orange-500"
          bgColorClass="bg-orange-500/10"
        />
        <SummaryCard
          title="New Users (30d)"
          value={totalNewUsers}
          trend={userTrend}
          icon={Users}
          colorClass="text-green-500"
          bgColorClass="bg-green-500/10"
        />
      </div>

      {/* Usage Trends Chart */}
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Usage Trends</CardTitle>
              <CardDescription className="mt-1">
                Interviews, AI requests, and new users over the last 30 days
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {formattedUsageTrends.length > 0 ? (
            <ChartContainer
              config={usageChartConfig}
              className="h-[300px] w-full"
            >
              <AreaChart
                data={formattedUsageTrends}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorInterviews"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-interviews)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-interviews)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="colorAiRequests"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-aiRequests)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-aiRequests)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-users)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-users)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-tokens)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-tokens)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/50"
                  vertical={false}
                />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  animationDuration={200}
                  animationEasing="ease-out"
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="interviews"
                  stackId="1"
                  stroke="var(--color-interviews)"
                  fill="url(#colorInterviews)"
                  strokeWidth={2}
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(139, 92, 246, 0.3))' }}
                />
                <Area
                  type="monotone"
                  dataKey="aiRequests"
                  stackId="2"
                  stroke="var(--color-aiRequests)"
                  fill="url(#colorAiRequests)"
                  strokeWidth={2}
                  animationBegin={100}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(249, 115, 22, 0.3))' }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stackId="3"
                  stroke="var(--color-users)"
                  fill="url(#colorUsers)"
                  strokeWidth={2}
                  animationBegin={200}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(34, 197, 94, 0.3))' }}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stackId="4"
                  stroke="var(--color-tokens)"
                  fill="url(#colorTokens)"
                  strokeWidth={2}
                  animationBegin={300}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(6, 182, 212, 0.3))' }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-2xl bg-secondary/20">
              <Activity className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                No usage data available yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Popular Topics */}
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b border-border/50">
            <CardTitle className="text-lg font-bold">
              Popular Job Titles
            </CardTitle>
            <CardDescription className="mt-1">
              Most common interview preparation topics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {popularTopics.length > 0 ? (
              <div className="space-y-4">
                {popularTopics.map((topic, i) => (
                  <div key={topic.topic} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {topic.topic}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                        {topic.count}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/80 rounded-full transition-all duration-500 group-hover:bg-primary group-hover:scale-y-125 group-hover:shadow-lg origin-left"
                        style={{ 
                          width: `${topic.percentage}%`,
                          boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No interview data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg font-bold">Top Companies</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Companies users are preparing for
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {topCompanies.length > 0 ? (
              <div className="space-y-4">
                {topCompanies.map((company, i) => (
                  <div key={company.topic} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {company.topic}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                        {company.count}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500/80 rounded-full transition-all duration-500 group-hover:bg-blue-500 group-hover:scale-y-125 group-hover:shadow-lg origin-left"
                        style={{ 
                          width: `${company.percentage}%`,
                          boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No company data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b border-border/50">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg font-bold">
                Plan Distribution
              </CardTitle>
            </div>
            <CardDescription className="mt-1">
              User subscription breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {planDistribution.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-48 h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        dataKey="count"
                        nameKey="plan"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        cornerRadius={4}
                        activeIndex={activePieIndex}
                        activeShape={(props: any) => {
                          const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                          return (
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
                          );
                        }}
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(undefined)}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {planDistribution.map((entry) => (
                          <Cell
                            key={entry.plan}
                            fill={
                              PLAN_COLORS[entry.plan] || "hsl(var(--muted))"
                            }
                            strokeWidth={0}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-2xl font-bold transition-all duration-300">
                      {activePieIndex !== undefined 
                        ? planDistribution[activePieIndex].count
                        : planDistribution.reduce((acc, curr) => acc + curr.count, 0)
                      }
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activePieIndex !== undefined 
                        ? planDistribution[activePieIndex].plan
                        : 'Total Users'
                      }
                    </span>
                  </div>
                </div>
                <div className="space-y-4 flex-1 w-full">
                  {planDistribution.map((plan, index) => {
                    const isActive = activePieIndex === index;
                    return (
                      <div
                        key={plan.plan}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 cursor-pointer ${
                          isActive 
                            ? 'bg-secondary/60 scale-105 shadow-lg' 
                            : 'bg-secondary/30 hover:bg-secondary/50'
                        }`}
                        onMouseEnter={() => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(undefined)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full shadow-sm transition-all duration-300 ${
                              isActive ? 'scale-125 ring-2 ring-white/20' : ''
                            }`}
                            style={{
                              backgroundColor:
                                PLAN_COLORS[plan.plan] || "hsl(var(--muted))",
                            }}
                          />
                          <span className="font-medium text-sm">{plan.plan}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{plan.count}</span>
                          <span className="text-xs text-muted-foreground">
                            ({plan.percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No user data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Usage */}
        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg font-bold">Model Usage</CardTitle>
            </div>
            <CardDescription className="mt-1">
              AI model distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {modelUsage.length > 0 ? (
              <div className="space-y-4">
                {modelUsage.map((model) => {
                  const maxCount = Math.max(...modelUsage.map((m) => m.count));
                  const barWidth =
                    maxCount > 0 ? (model.count / maxCount) * 100 : 0;
                  return (
                    <div key={model.model} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {model.model}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded-md">
                          {model.count} ({model.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-secondary/50 rounded-full overflow-hidden group">
                        <div
                          className="h-full rounded-full transition-all duration-500 group-hover:scale-y-125 group-hover:shadow-lg origin-left"
                          style={{ 
                            width: `${barWidth}%`,
                            backgroundColor: '#8b5cf6',
                            boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)'
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
                  <Cpu className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No AI usage data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Trends */}
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">
                Token Usage Trends
              </CardTitle>
              <CardDescription className="mt-1">
                Input and output token consumption over time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {formattedTokenTrends.some(
            (d) => d.inputTokens > 0 || d.outputTokens > 0
          ) ? (
            <ChartContainer
              config={tokenChartConfig}
              className="h-[300px] w-full"
            >
              <BarChart
                data={formattedTokenTrends}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/50"
                  vertical={false}
                />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value) => {
                    if (value >= 1000000)
                      return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                    return value;
                  }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                  animationDuration={200}
                  animationEasing="ease-out"
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="inputTokens"
                  stackId="tokens"
                  fill="var(--color-inputTokens)"
                  radius={[0, 0, 4, 4]}
                  maxBarSize={50}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(34, 211, 238, 0.3))' }}
                />
                <Bar
                  dataKey="outputTokens"
                  stackId="tokens"
                  fill="var(--color-outputTokens)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  animationBegin={100}
                  animationDuration={800}
                  animationEasing="ease-out"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(244, 114, 182, 0.3))' }}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-2xl bg-secondary/20">
              <BarChart3 className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                No token usage data available yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
