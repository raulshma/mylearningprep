'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, Clock, Cpu, Database, DollarSign, 
  Filter, RefreshCw, Zap, AlertCircle
} from 'lucide-react';
import { AILogViewer } from './ai-log-viewer';
import type { 
  AILogWithDetails, 
  AdminStats, 
  ErrorStatsData, 
  LatencyPercentiles,
  HourlyUsageData,
  CostBreakdown,
  PricingCacheStatus,
} from '@/lib/actions/admin';
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
} from '@/lib/actions/admin';
import { formatLatency } from '@/lib/utils';

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
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
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
    action: 'all',
    status: 'all',
    model: 'all',
  });
  const [errorStats, setErrorStats] = useState<ErrorStatsData[]>([]);
  const [latencyPercentiles, setLatencyPercentiles] = useState<LatencyPercentiles | null>(null);
  const [hourlyUsage, setHourlyUsage] = useState<HourlyUsageData[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [recentErrors, setRecentErrors] = useState<AILogWithDetails[]>([]);
  const [slowRequests, setSlowRequests] = useState<AILogWithDetails[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [pricingCache, setPricingCache] = useState<PricingCacheStatus | null>(null);
  const [isRefreshingPricing, setIsRefreshingPricing] = useState(false);

  // Helper to check if response is unauthorized
  const isUnauthorized = <T,>(data: T | { success: false; error: string }): data is { success: false; error: string } => {
    return data !== null && typeof data === 'object' && 'success' in data && data.success === false;
  };

  // Load additional data on mount
  useEffect(() => {
    async function loadData() {
      const [errors, percentiles, hourly, costs, errLogs, slow, uniqueModels, pricing] = await Promise.all([
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
      action: currentFilters.action !== 'all' ? currentFilters.action as any : undefined,
      status: currentFilters.status !== 'all' ? currentFilters.status as any : undefined,
      model: currentFilters.model !== 'all' ? currentFilters.model : undefined,
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
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Cost"
          value={formatCost(initialStats.totalCost)}
          icon={DollarSign}
          color="text-green-500"
        />
        <StatCard
          label="Error Rate"
          value={`${initialStats.errorRate}%`}
          icon={AlertTriangle}
          color={initialStats.errorRate > 5 ? 'text-red-500' : 'text-yellow-500'}
        />
        <StatCard
          label="Avg Latency"
          value={formatLatency(initialStats.avgLatencyMs)}
          icon={Clock}
          color="text-blue-500"
        />
        <StatCard
          label="Time to First Token"
          value={formatLatency(initialStats.avgTimeToFirstToken)}
          icon={Zap}
          color="text-purple-500"
        />
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex-nowrap">
            <TabsTrigger value="logs">Request Logs</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>
        </div>

        {/* Request Logs Tab */}
        <TabsContent value="logs">
          <Card className="bg-card border-border">
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-mono">AI Request Logs</CardTitle>
                  <CardDescription>Full trace of all AI generation requests</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={filters.action} onValueChange={(v) => handleFilterChange('action', v)}>
                    <SelectTrigger className="w-full sm:w-40 min-h-[44px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="GENERATE_BRIEF">Generate Brief</SelectItem>
                      <SelectItem value="GENERATE_TOPICS">Generate Topics</SelectItem>
                      <SelectItem value="GENERATE_MCQ">Generate MCQ</SelectItem>
                      <SelectItem value="GENERATE_RAPID_FIRE">Rapid Fire</SelectItem>
                      <SelectItem value="REGENERATE_ANALOGY">Regenerate Analogy</SelectItem>
                      <SelectItem value="PARSE_PROMPT">Parse Prompt</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                    <SelectTrigger className="w-full sm:w-32 min-h-[44px]">
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
                    <Select value={filters.model} onValueChange={(v) => handleFilterChange('model', v)}>
                      <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Models</SelectItem>
                        {models.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isPending} className="min-h-[44px] min-w-[44px]">
                    <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Latency Percentiles */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm">Latency Percentiles</CardTitle>
              </CardHeader>
              <CardContent>
                {latencyPercentiles ? (
                  <div className="space-y-3">
                    <PercentileBar label="P50" value={latencyPercentiles.p50} max={latencyPercentiles.p99} />
                    <PercentileBar label="P90" value={latencyPercentiles.p90} max={latencyPercentiles.p99} />
                    <PercentileBar label="P95" value={latencyPercentiles.p95} max={latencyPercentiles.p99} />
                    <PercentileBar label="P99" value={latencyPercentiles.p99} max={latencyPercentiles.p99} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>

            {/* Usage by Action */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm">Usage by Action</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usageByAction.length > 0 ? (
                    usageByAction.map((item) => {
                      const maxCount = Math.max(...usageByAction.map(u => u.count));
                      const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      return (
                        <div key={item.action} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-xs min-w-[120px]">
                              {item.action.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatLatency(item.avgLatency)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded">
                              <div className="h-full bg-foreground rounded" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{item.count}</span>
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
            <Card className="bg-card border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="font-mono text-sm">Hourly Request Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {hourlyUsage.map((h) => {
                    const maxRequests = Math.max(...hourlyUsage.map(x => x.requests), 1);
                    const height = (h.requests / maxRequests) * 100;
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-foreground/20 rounded-t hover:bg-foreground/40 transition-colors"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${h.hour}:00 - ${h.requests} requests, ${formatLatency(h.avgLatency)} avg`}
                        />
                        {h.hour % 4 === 0 && (
                          <span className="text-[10px] text-muted-foreground">{h.hour}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Slow Requests */}
            <Card className="bg-card border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Slow Requests (&gt;5s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slowRequests.length > 0 ? (
                  <div className="space-y-2">
                    {slowRequests.map((log) => (
                      <div key={log._id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">{log.model}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{log.formattedTimestamp}</span>
                          <Badge variant="secondary" className="text-yellow-500">{formatLatency(log.latencyMs)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No slow requests</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Error Stats */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Error Breakdown (7 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {errorStats.length > 0 ? (
                  <div className="space-y-3">
                    {errorStats.map((err) => (
                      <div key={err.errorCode} className="flex items-center justify-between p-2 bg-red-500/10 rounded">
                        <div>
                          <p className="font-mono text-sm">{err.errorCode}</p>
                          <p className="text-xs text-muted-foreground">
                            Last: {new Date(err.lastOccurred).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="destructive">{err.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-muted-foreground">No errors in the last 7 days</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Errors */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm">Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                {recentErrors.length > 0 ? (
                  <div className="space-y-2">
                    {recentErrors.map((log) => (
                      <div key={log._id} className="p-2 bg-red-500/10 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">{log.formattedTimestamp}</span>
                        </div>
                        <p className="text-xs text-red-400 font-mono truncate">
                          {log.errorMessage || log.errorCode || 'Unknown error'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent errors</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost by Model */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Cost by Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                {costBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {costBreakdown.map((item) => (
                      <div key={item.model} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div>
                          <p className="font-mono text-sm">{item.model}</p>
                          <p className="text-xs text-muted-foreground">{item.requestCount} requests</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-green-500">{formatCost(item.totalCost)}</p>
                          <p className="text-xs text-muted-foreground">{formatCost(item.avgCostPerRequest)}/req</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No cost data</p>
                )}
              </CardContent>
            </Card>

            {/* Token Usage Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  Token Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Input Tokens</span>
                    <span className="font-mono text-green-500">{formatNumber(initialStats.totalInputTokens)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Output Tokens</span>
                    <span className="font-mono text-blue-500">{formatNumber(initialStats.totalOutputTokens)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Tokens</span>
                    <span className="font-mono">{formatNumber(initialStats.totalInputTokens + initialStats.totalOutputTokens)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estimated Total Cost</span>
                      <span className="font-mono text-lg text-green-500">{formatCost(initialStats.totalCost)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Cache Status */}
            <Card className="bg-card border-border md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm">OpenRouter Pricing Cache</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshPricing}
                    disabled={isRefreshingPricing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingPricing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <CardDescription>Live pricing from OpenRouter API (15 min cache)</CardDescription>
              </CardHeader>
              <CardContent>
                {pricingCache ? (
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${pricingCache.isCached ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-sm">{pricingCache.isCached ? 'Cached' : 'Not cached'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono">{pricingCache.modelCount}</span> models
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Age: <span className="font-mono">{pricingCache.ageFormatted}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expires in: <span className="font-mono">{pricingCache.expiresFormatted}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading cache status...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { 
  label: string; 
  value: string; 
  icon: any; 
  color: string;
}) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className={`text-xl md:text-2xl font-mono ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function PercentileBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono w-8">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded">
        <div 
          className="h-full bg-blue-500 rounded" 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      <span className="text-xs font-mono w-16 text-right">{formatLatency(value)}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
