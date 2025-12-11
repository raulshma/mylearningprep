"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Activity,
  FileText,
  Cpu,
  Database,
  DollarSign,
  AlertTriangle,
  Zap,
  Clock,
  TrendingUp,
} from "lucide-react";
import type { AdminStats } from "@/lib/actions/admin";
import { formatLatency } from "@/lib/utils";

interface AdminStatsGridProps {
  stats: AdminStats;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `${(cost * 100).toFixed(2)}¢`;
  return `$${cost.toFixed(2)}`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  const primaryStats = [
    {
      label: "Total Users",
      value: formatNumber(stats.totalUsers),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      label: "Active This Week",
      value: formatNumber(stats.activeThisWeek),
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      label: "Total Interviews",
      value: formatNumber(stats.totalInterviews),
      icon: FileText,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
    },
    {
      label: "AI Requests",
      value: formatNumber(stats.totalAIRequests),
      icon: Cpu,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
  ];

  const aiStats = [
    {
      label: "Input Tokens",
      value: formatNumber(stats.totalInputTokens),
      icon: Database,
      color: "text-emerald-500",
    },
    {
      label: "Output Tokens",
      value: formatNumber(stats.totalOutputTokens),
      icon: Zap,
      color: "text-blue-500",
    },
    {
      label: "Avg Latency",
      value: formatLatency(stats.avgLatencyMs),
      icon: Clock,
      color: "text-amber-500",
    },
    {
      label: "Total Cost",
      value: formatCost(stats.totalCost),
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Error Rate",
      value: `${stats.errorRate}%`,
      icon: AlertTriangle,
      color: stats.errorRate > 5 ? "text-red-500" : "text-amber-500",
    },
    {
      label: "Time to First Token",
      value: formatLatency(stats.avgTimeToFirstToken),
      icon: TrendingUp,
      color: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Primary Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {primaryStats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className="relative overflow-hidden border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card hover:shadow-xl transition-all duration-300 rounded-3xl h-full group">
              <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl ${stat.bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3`}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* AI Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4 px-1">AI Performance</h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {aiStats.map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="border-0 shadow-md shadow-black/5 dark:shadow-black/20 bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-1.5 rounded-lg bg-secondary/50 group-hover:bg-secondary transition-colors">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground truncate leading-none">
                      {stat.label}
                    </p>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-foreground pl-0.5">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
