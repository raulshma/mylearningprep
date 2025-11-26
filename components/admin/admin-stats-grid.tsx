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
      color: "text-foreground",
      bgColor: "bg-secondary",
    },
    {
      label: "Active This Week",
      value: formatNumber(stats.activeThisWeek),
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Interviews",
      value: formatNumber(stats.totalInterviews),
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "AI Requests",
      value: formatNumber(stats.totalAIRequests),
      icon: Cpu,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
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
      color: "text-yellow-500",
    },
    {
      label: "Total Cost",
      value: formatCost(stats.totalCost),
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      label: "Error Rate",
      value: `${stats.errorRate}%`,
      icon: AlertTriangle,
      color: stats.errorRate > 5 ? "text-red-500" : "text-yellow-500",
    },
    {
      label: "Time to First Token",
      value: formatLatency(stats.avgTimeToFirstToken),
      icon: TrendingUp,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {primaryStats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className="bg-card/80 backdrop-blur-sm border-border hover:border-primary/30 transition-all duration-300 group overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className={`text-3xl font-mono ${stat.color}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* AI Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {aiStats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className="bg-card/60 backdrop-blur-sm border-border hover:border-primary/20 transition-all duration-300 overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <p className="text-xs text-muted-foreground truncate">
                    {stat.label}
                  </p>
                </div>
                <p className={`text-xl font-mono ${stat.color}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
