'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, FileText, Cpu, Building2 } from 'lucide-react';
import type {
  UsageTrendData,
  PopularTopicData,
  PlanDistribution,
  TokenUsageTrend,
} from '@/lib/actions/admin';

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
    label: 'Interviews',
    color: 'hsl(var(--chart-1))',
  },
  aiRequests: {
    label: 'AI Requests',
    color: 'hsl(var(--chart-2))',
  },
  users: {
    label: 'New Users',
    color: 'hsl(var(--chart-3))',
  },
};

const tokenChartConfig: ChartConfig = {
  inputTokens: {
    label: 'Input Tokens',
    color: 'hsl(var(--chart-1))',
  },
  outputTokens: {
    label: 'Output Tokens',
    color: 'hsl(var(--chart-2))',
  },
};

const PLAN_COLORS: Record<string, string> = {
  FREE: 'hsl(var(--muted-foreground))',
  PRO: 'hsl(var(--chart-2))',
  MAX: 'hsl(var(--chart-1))',
};


function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calculateTrend(data: number[]): { value: number; isPositive: boolean } {
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
  // Calculate trends
  const interviewTrend = calculateTrend(usageTrends.map((d) => d.interviews));
  const aiRequestTrend = calculateTrend(usageTrends.map((d) => d.aiRequests));
  const userTrend = calculateTrend(usageTrends.map((d) => d.users));

  // Format data for charts - ensure numeric values
  const formattedUsageTrends = usageTrends.map((d) => ({
    ...d,
    interviews: Number(d.interviews) || 0,
    aiRequests: Number(d.aiRequests) || 0,
    users: Number(d.users) || 0,
    formattedDate: formatDate(d.date),
  }));

  const formattedTokenTrends = tokenUsageTrends.map((d) => ({
    ...d,
    inputTokens: Number(d.inputTokens) || 0,
    outputTokens: Number(d.outputTokens) || 0,
    formattedDate: formatDate(d.date),
  }));

  // Calculate totals - ensure numeric values
  const totalInterviews = usageTrends.reduce((sum, d) => sum + (Number(d.interviews) || 0), 0);
  const totalAIRequests = usageTrends.reduce((sum, d) => sum + (Number(d.aiRequests) || 0), 0);
  const totalNewUsers = usageTrends.reduce((sum, d) => sum + (Number(d.users) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Interviews (30d)</p>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-mono text-foreground">{totalInterviews}</p>
            <div className="flex items-center gap-1 mt-2">
              {interviewTrend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span
                className={`text-xs ${interviewTrend.isPositive ? 'text-green-500' : 'text-red-500'}`}
              >
                {interviewTrend.value}% vs last week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">AI Requests (30d)</p>
              <Cpu className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-mono text-foreground">{totalAIRequests}</p>
            <div className="flex items-center gap-1 mt-2">
              {aiRequestTrend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span
                className={`text-xs ${aiRequestTrend.isPositive ? 'text-green-500' : 'text-red-500'}`}
              >
                {aiRequestTrend.value}% vs last week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">New Users (30d)</p>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-mono text-foreground">{totalNewUsers}</p>
            <div className="flex items-center gap-1 mt-2">
              {userTrend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs ${userTrend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {userTrend.value}% vs last week
              </span>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Usage Trends Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-mono">Usage Trends</CardTitle>
          <CardDescription>Interviews, AI requests, and new users over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {formattedUsageTrends.length > 0 ? (
            <ChartContainer config={usageChartConfig} className="h-64 w-full">
              <AreaChart data={formattedUsageTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="interviews"
                  stackId="1"
                  stroke="var(--color-interviews)"
                  fill="var(--color-interviews)"
                  fillOpacity={0.4}
                />
                <Area
                  type="monotone"
                  dataKey="aiRequests"
                  stackId="2"
                  stroke="var(--color-aiRequests)"
                  fill="var(--color-aiRequests)"
                  fillOpacity={0.4}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stackId="3"
                  stroke="var(--color-users)"
                  fill="var(--color-users)"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No usage data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Popular Topics */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono">Popular Job Titles</CardTitle>
            <CardDescription>Most common interview preparation topics</CardDescription>
          </CardHeader>
          <CardContent>
            {popularTopics.length > 0 ? (
              <div className="space-y-3">
                {popularTopics.map((topic, i) => (
                  <div key={topic.topic} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm text-foreground truncate">{topic.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded">
                        <div
                          className="h-full bg-foreground rounded"
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {topic.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No interview data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="font-mono">Top Companies</CardTitle>
            </div>
            <CardDescription>Companies users are preparing for</CardDescription>
          </CardHeader>
          <CardContent>
            {topCompanies.length > 0 ? (
              <div className="space-y-3">
                {topCompanies.map((company, i) => (
                  <div key={company.topic} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm text-foreground truncate">{company.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded">
                        <div
                          className="h-full bg-foreground rounded"
                          style={{ width: `${company.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {company.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No company data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono">Plan Distribution</CardTitle>
            <CardDescription>User subscription breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {planDistribution.length > 0 ? (
              <div className="flex items-center gap-8">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        dataKey="count"
                        nameKey="plan"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {planDistribution.map((entry) => (
                          <Cell
                            key={entry.plan}
                            fill={PLAN_COLORS[entry.plan] || 'hsl(var(--muted))'}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 flex-1">
                  {planDistribution.map((plan) => (
                    <div key={plan.plan} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PLAN_COLORS[plan.plan] || 'hsl(var(--muted))' }}
                        />
                        <Badge variant={plan.plan === 'MAX' ? 'default' : 'secondary'}>
                          {plan.plan}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{plan.count}</span>
                        <span className="text-xs text-muted-foreground">({plan.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No user data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Usage */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono">Model Usage</CardTitle>
            <CardDescription>AI model distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {modelUsage.length > 0 ? (
              <div className="space-y-3">
                {modelUsage.map((model) => {
                  const maxCount = Math.max(...modelUsage.map((m) => m.count));
                  const barWidth = maxCount > 0 ? (model.count / maxCount) * 100 : 0;
                  return (
                    <div key={model.model} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                          {model.model}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {model.count} ({model.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded">
                        <div
                          className="h-full bg-foreground rounded transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No AI usage data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Trends */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-mono">Token Usage Trends</CardTitle>
          <CardDescription>Input and output token consumption over time</CardDescription>
        </CardHeader>
        <CardContent>
          {formattedTokenTrends.some((d) => d.inputTokens > 0 || d.outputTokens > 0) ? (
            <ChartContainer config={tokenChartConfig} className="h-64 w-full">
              <LineChart data={formattedTokenTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                    return value;
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="inputTokens"
                  stroke="var(--color-inputTokens)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="outputTokens"
                  stroke="var(--color-outputTokens)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No token usage data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
