"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  DollarSign,
  Filter,
  RefreshCw,
  Zap,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { AILogViewer } from "./ai-log-viewer";
import type {
  AILogWithDetails,
  AdminStats,
  ErrorStatsData,
  LatencyPercentiles,
  HourlyUsageData,
  CostBreakdown,
  PricingCacheStatus,
} from "@/lib/actions/admin";
import {
  getAILogs,
  getAILogsCount,
  getErrorStats,
  getLatencyPercentiles,
  getHourlyUsage,
  getCostBreakdown,
  getRecentErrors,
  getSlowRequests,
  getUniqueModels,
  getPricingCacheStatus,
  forceRefreshPricingCache,
} from "@/lib/actions/admin";
import { formatLatency } from "@/lib/utils";

const PAGE_SIZE = 10;

interface AIMonitoringDashboardProps {
  initialLogs: AILogWithDetails[];
  initialStats: AdminStats;
  initialLogsCount: number;
  usageByAction: Array<{ action: string; count: number; avgLatency: number }>;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${(cost * 100).toFixed(4)}¢`;
  return `$${cost.toFixed(4)}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export function AIMonitoringDashboard({
  initialLogs,
  initialStats,
  initialLogsCount,
  usageByAction,
}: AIMonitoringDashboardProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [logsCount, setLogsCount] = useState(initialLogsCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState({
    action: "all",
    status: "all",
    model: "all",
  });
  const [errorStats, setErrorStats] = useState<ErrorStatsData[]>([]);
  const [latencyPercentiles, setLatencyPercentiles] =
    useState<LatencyPercentiles | null>(null);
  const [hourlyUsage, setHourlyUsage] = useState<HourlyUsageData[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [recentErrors, setRecentErrors] = useState<AILogWithDetails[]>([]);
  const [slowRequests, setSlowRequests] = useState<AILogWithDetails[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [pricingCache, setPricingCache] = useState<PricingCacheStatus | null>(
    null
  );
  const [isRefreshingPricing, setIsRefreshingPricing] = useState(false);

  // Helper to check if response is unauthorized
  const isUnauthorized = <T,>(
    data: T | { success: false; error: string }
  ): data is { success: false; error: string } => {
    return (
      data !== null &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    );
  };

  // Load additional data on mount
  useEffect(() => {
    async function loadData() {
      const [
        errors,
        percentiles,
        hourly,
        costs,
        errLogs,
        slow,
        uniqueModels,
        pricing,
      ] = await Promise.all([
        getErrorStats(7),
        getLatencyPercentiles(),
        getHourlyUsage(),
        getCostBreakdown(),
        getRecentErrors(5),
        getSlowRequests(5000, 5),
        getUniqueModels(),
        getPricingCacheStatus(),
      ]);
      if (!isUnauthorized(errors)) setErrorStats(errors);
      if (!isUnauthorized(percentiles)) setLatencyPercentiles(percentiles);
      if (!isUnauthorized(hourly)) setHourlyUsage(hourly);
      if (!isUnauthorized(costs)) setCostBreakdown(costs);
      if (!isUnauthorized(errLogs)) setRecentErrors(errLogs);
      if (!isUnauthorized(slow)) setSlowRequests(slow);
      if (!isUnauthorized(uniqueModels)) setModels(uniqueModels);
      if (!isUnauthorized(pricing)) setPricingCache(pricing);
    }
    loadData();
  }, []);

  const handleRefreshPricing = async () => {
    setIsRefreshingPricing(true);
    try {
      await forceRefreshPricingCache();
      const newStatus = await getPricingCacheStatus();
      if (!isUnauthorized(newStatus)) setPricingCache(newStatus);
    } finally {
      setIsRefreshingPricing(false);
    }
  };

  const fetchLogs = async (page: number, currentFilters: typeof filters) => {
    const filterParams = {
      action:
        currentFilters.action !== "all"
          ? (currentFilters.action as any)
          : undefined,
      status:
        currentFilters.status !== "all"
          ? (currentFilters.status as any)
          : undefined,
      model: currentFilters.model !== "all" ? currentFilters.model : undefined,
      limit: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    };

    const [newLogs, count] = await Promise.all([
      getAILogs(filterParams),
      getAILogsCount(filterParams),
    ]);

    return { logs: newLogs, count };
  };

  const handleRefresh = () => {
    startTransition(async () => {
      const { logs: newLogs, count } = await fetchLogs(currentPage, filters);
      if (!isUnauthorized(newLogs)) setLogs(newLogs);
      if (!isUnauthorized(count)) setLogsCount(count);
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    startTransition(async () => {
      const { logs: newLogs, count } = await fetchLogs(page, filters);
      if (!isUnauthorized(newLogs)) setLogs(newLogs);
      if (!isUnauthorized(count)) setLogsCount(count);
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
    startTransition(async () => {
      const { logs: newLogs, count } = await fetchLogs(1, newFilters);
      if (!isUnauthorized(newLogs)) setLogs(newLogs);
      if (!isUnauthorized(count)) setLogsCount(count);
    });
  };

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Cost"
          value={formatCost(initialStats.totalCost)}
          icon={DollarSign}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatCard
          label="Error Rate"
          value={`${initialStats.errorRate}%`}
          icon={AlertTriangle}
          color={initialStats.errorRate > 5 ? "text-red-500" : "text-amber-500"}
          bgColor={
            initialStats.errorRate > 5 ? "bg-red-500/10" : "bg-amber-500/10"
          }
        />
        <StatCard
          label="Avg Latency"
          value={formatLatency(initialStats.avgLatencyMs)}
          icon={Clock}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          label="Time to First Token"
          value={formatLatency(initialStats.avgTimeToFirstToken)}
          icon={Zap}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <div className="flex justify-center">
          <div className="bg-secondary/50 backdrop-blur-xl p-1.5 rounded-full inline-flex">
            <TabsList className="bg-transparent gap-1 h-auto p-0">
              <TabsTrigger
                value="logs"
                className="rounded-full px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Request Logs
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="rounded-full px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="errors"
                className="rounded-full px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Errors
              </TabsTrigger>
              <TabsTrigger
                value="costs"
                className="rounded-full px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Costs
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Request Logs Tab */}
        <TabsContent value="logs" className="mt-0 focus-visible:outline-none">
          <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/50 p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <CardTitle className="text-xl font-bold">
                    AI Request Logs
                  </CardTitle>
                  <CardDescription>
                    Full trace of all AI generation requests
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={filters.action}
                    onValueChange={(v) => handleFilterChange("action", v)}
                  >
                    <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl bg-secondary/50 border-transparent focus:bg-background">
                      <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="GENERATE_BRIEF">
                        Generate Brief
                      </SelectItem>
                      <SelectItem value="GENERATE_TOPICS">
                        Generate Topics
                      </SelectItem>
                      <SelectItem value="GENERATE_MCQ">Generate MCQ</SelectItem>
                      <SelectItem value="GENERATE_RAPID_FIRE">
                        Rapid Fire
                      </SelectItem>
                      <SelectItem value="REGENERATE_ANALOGY">
                        Regenerate Analogy
                      </SelectItem>
                      <SelectItem value="PARSE_PROMPT">Parse Prompt</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.status}
                    onValueChange={(v) => handleFilterChange("status", v)}
                  >
                    <SelectTrigger className="w-full sm:w-32 h-10 rounded-xl bg-secondary/50 border-transparent focus:bg-background">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="timeout">Timeout</SelectItem>
                      <SelectItem value="rate_limited">Rate Limited</SelectItem>
                    </SelectContent>
                  </Select>
                  {models.length > 0 && (
                    <Select
                      value={filters.model}
                      onValueChange={(v) => handleFilterChange("model", v)}
                    >
                      <SelectTrigger className="w-full sm:w-48 h-10 rounded-xl bg-secondary/50 border-transparent focus:bg-background">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Models</SelectItem>
                        {models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isPending}
                    className="h-10 w-10 rounded-xl border-transparent bg-secondary/50 hover:bg-secondary"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {logsCount > 0 ? (
                <AILogViewer
                  logs={logs}
                  totalCount={logsCount}
                  currentPage={currentPage}
                  pageSize={PAGE_SIZE}
                  onPageChange={handlePageChange}
                  isLoading={isPending}
                />
              ) : (
                <EmptyState icon={Cpu} message="No AI logs recorded yet" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent
          value="performance"
          className="mt-0 focus-visible:outline-none"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latency Percentiles */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Latency Percentiles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                {latencyPercentiles ? (
                  <div className="space-y-4">
                    <PercentileBar
                      label="P50"
                      value={latencyPercentiles.p50}
                      max={latencyPercentiles.p99}
                      color="bg-blue-500"
                    />
                    <PercentileBar
                      label="P90"
                      value={latencyPercentiles.p90}
                      max={latencyPercentiles.p99}
                      color="bg-blue-600"
                    />
                    <PercentileBar
                      label="P95"
                      value={latencyPercentiles.p95}
                      max={latencyPercentiles.p99}
                      color="bg-indigo-500"
                    />
                    <PercentileBar
                      label="P99"
                      value={latencyPercentiles.p99}
                      max={latencyPercentiles.p99}
                      color="bg-purple-500"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>

            {/* Usage by Action */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Usage by Action
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                <div className="space-y-4">
                  {usageByAction.length > 0 ? (
                    usageByAction.map((item) => {
                      const maxCount = Math.max(
                        ...usageByAction.map((u) => u.count)
                      );
                      const percentage =
                        maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      return (
                        <div key={item.action} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">
                              {item.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-muted-foreground">
                              {item.count} reqs
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                              {formatLatency(item.avgLatency)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hourly Usage */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden md:col-span-2">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Hourly Request Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                {hourlyUsage.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm text-muted-foreground">
                      Loading hourly data...
                    </p>
                  </div>
                ) : hourlyUsage.every((h) => h.requests === 0) ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm text-muted-foreground">
                      No request data available yet
                    </p>
                  </div>
                ) : (
                  <div className="flex items-end gap-1 h-40 pt-4">
                    {hourlyUsage.map((h) => {
                      const maxRequests = Math.max(
                        ...hourlyUsage.map((x) => x.requests),
                        1
                      );
                      const height = (h.requests / maxRequests) * 100;
                      return (
                        <div
                          key={h.hour}
                          className="flex-1 flex flex-col items-center gap-1 group"
                        >
                          <div
                            className="w-full bg-green-500/20 rounded-t-sm hover:bg-green-500/40 transition-colors relative"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                              {h.requests} reqs
                            </div>
                          </div>
                          {h.hour % 4 === 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {h.hour}h
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Slow Requests */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden md:col-span-2">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Slow Requests (&gt;5s)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                {slowRequests.length > 0 ? (
                  <div className="space-y-2">
                    {slowRequests.map((log) => (
                      <div
                        key={log._id}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-2xl hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium bg-background/50"
                          >
                            {log.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {log.formattedTimestamp}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
                          >
                            {formatLatency(log.latencyMs)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No slow requests detected
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Error Stats */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Error Breakdown (7 days)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                {errorStats.length > 0 ? (
                  <div className="space-y-3">
                    {errorStats.map((err) => (
                      <div
                        key={err.errorCode}
                        className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-2xl"
                      >
                        <div>
                          <p className="font-mono text-sm font-medium text-red-600 dark:text-red-400">
                            {err.errorCode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last:{" "}
                            {new Date(err.lastOccurred).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant="destructive"
                          className="rounded-full px-3"
                        >
                          {err.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      All Systems Operational
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No errors in the last 7 days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Errors */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold">
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                {recentErrors.length > 0 ? (
                  <div className="space-y-2">
                    {recentErrors.map((log) => (
                      <div
                        key={log._id}
                        className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className="text-xs bg-background/50"
                          >
                            {log.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {log.formattedTimestamp}
                          </span>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
                          {log.errorMessage || log.errorCode || "Unknown error"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No recent errors
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost by Model */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Cost by Model
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                {costBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {costBreakdown.map((item) => (
                      <div
                        key={item.model}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-2xl"
                      >
                        <div>
                          <p className="font-mono text-sm font-medium">
                            {item.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.requestCount} requests
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCost(item.totalCost)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCost(item.avgCostPerRequest)}/req
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No cost data
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Token Usage Summary */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-500" />
                  Token Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Input Tokens
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatNumber(initialStats.totalInputTokens)}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{
                          width: `${
                            (initialStats.totalInputTokens /
                              (initialStats.totalInputTokens +
                                initialStats.totalOutputTokens)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Output Tokens
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatNumber(initialStats.totalOutputTokens)}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{
                          width: `${
                            (initialStats.totalOutputTokens /
                              (initialStats.totalInputTokens +
                                initialStats.totalOutputTokens)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Tokens</span>
                      <span className="font-mono text-foreground">
                        {formatNumber(
                          initialStats.totalInputTokens +
                            initialStats.totalOutputTokens
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium">
                        Estimated Total Cost
                      </span>
                      <span className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCost(initialStats.totalCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Cache Status */}
            <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden md:col-span-2">
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">
                    OpenRouter Pricing Cache
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPricing}
                    disabled={isRefreshingPricing}
                    className="h-8 rounded-full text-xs"
                  >
                    <RefreshCw
                      className={`w-3 h-3 mr-2 ${
                        isRefreshingPricing ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </div>
                <CardDescription>
                  Live pricing from OpenRouter API (15 min cache)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                {pricingCache ? (
                  <div className="flex flex-wrap items-center gap-6 p-4 bg-secondary/30 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          pricingCache.isCached
                            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                            : "bg-yellow-500"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {pricingCache.isCached ? "Cached" : "Not cached"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">
                        {pricingCache.modelCount}
                      </span>{" "}
                      models
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Age:{" "}
                      <span className="font-mono font-medium text-foreground">
                        {pricingCache.ageFormatted}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expires in:{" "}
                      <span className="font-mono font-medium text-foreground">
                        {pricingCache.expiresFormatted}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Loading cache status...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-2xl ${bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3`}
          >
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {label}
          </p>
          <p className={`text-2xl font-bold tracking-tight ${color}`}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PercentileBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-mono font-medium w-8 text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-mono font-medium w-16 text-right">
        {formatLatency(value)}
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-lg font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
