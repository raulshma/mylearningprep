'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Calendar,
  DollarSign,
  Activity,
  AlertTriangle,
  Clock,
  Loader2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getBYOKUsageStats } from '@/lib/actions/byok';
import type { BYOKUsageStats } from '@/lib/db/schemas/byok';

interface BYOKUsageStatsSectionProps {
  hasByokKey: boolean;
}

export function BYOKUsageStatsSection({ hasByokKey }: BYOKUsageStatsSectionProps) {
  const [stats, setStats] = useState<BYOKUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasByokKey) {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [hasByokKey]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await getBYOKUsageStats();
      if (result.success && result.data) {
        setStats(result.data);
      } else if (!result.success) {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  if (!hasByokKey) return null;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading stats...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl"
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </motion.div>
    );
  }

  if (!stats) return null;

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtext,
    color,
  }: {
    icon: any;
    label: string;
    value: string;
    subtext?: string;
    color: string;
  }) => (
    <div className="p-5 rounded-2xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full ${color} bg-opacity-10 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Usage Statistics</h2>
          <p className="text-sm text-muted-foreground">Last 30 days activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
        <StatCard
          icon={Activity}
          label="Total Requests"
          value={stats.totalRequests.toLocaleString()}
          color="bg-blue-500"
        />
        <StatCard
          icon={Zap}
          label="Token Usage"
          value={((stats.totalInputTokens + stats.totalOutputTokens) / 1000).toFixed(1) + 'k'}
          subtext={`${stats.totalInputTokens.toLocaleString()} in / ${stats.totalOutputTokens.toLocaleString()} out`}
          color="bg-yellow-500"
        />
        <StatCard
          icon={DollarSign}
          label="Est. Cost"
          value={`$${stats.totalCost.toFixed(4)}`}
          color="bg-green-500"
        />
        <StatCard
          icon={Clock}
          label="Avg Latency"
          value={`${Math.round(stats.avgLatencyMs)}ms`}
          color="bg-purple-500"
        />
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full justify-start h-12 bg-secondary/30 p-1 rounded-2xl mb-6">
          <TabsTrigger value="activity" className="rounded-xl px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">Recent Activity</TabsTrigger>
          <TabsTrigger value="actions" className="rounded-xl px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">By Action</TabsTrigger>
          <TabsTrigger value="models" className="rounded-xl px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">By Model</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <ScrollArea className="h-[300px] rounded-2xl border border-white/5 bg-secondary/10 p-4">
            <div className="space-y-3">
              {stats.recentActivity.map((req, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-white/5 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${req.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{req.action}</p>
                      <p className="text-xs text-muted-foreground font-mono">{req.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-foreground">{req.latencyMs}ms</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.byAction.map((item) => (
              <div key={item.action} className="p-4 rounded-2xl bg-secondary/30 border border-white/5 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground capitalize">{item.action.replace(/_/g, ' ')}</span>
                <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="models">
          <div className="space-y-3">
            {stats.byModel.map((item) => (
              <div key={item.model} className="p-4 rounded-2xl bg-secondary/30 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-sm font-mono text-foreground">{item.model}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Requests</p>
                    <p className="text-sm font-bold text-foreground">{item.count}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-right min-w-[60px]">
                    <p className="text-xs text-muted-foreground">Share</p>
                    <p className="text-sm font-bold text-foreground">
                      {((item.count / stats.totalRequests) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
