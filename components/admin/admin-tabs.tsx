"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Terminal,
  Search,
  Cpu,
  BarChart3,
  Layers,
} from "lucide-react";
import { AIMonitoringDashboard } from "@/components/admin/ai-monitoring-dashboard";
import { TieredModelConfig } from "@/components/admin/tiered-model-config";
import { ConcurrencyConfig } from "@/components/admin/concurrency-config";
import { AIToolsConfig } from "@/components/admin/ai-tools-config";
import { UserActions } from "@/components/admin/user-management";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import type {
  AdminStats,
  AdminUser,
  AILogWithDetails,
  FullTieredModelConfig,
  UsageTrendData,
  PopularTopicData,
  PlanDistribution,
  TokenUsageTrend,
  AIToolConfig,
} from "@/lib/actions/admin";

interface AdminTabsProps {
  stats: AdminStats;
  aiLogs: AILogWithDetails[];
  aiLogsCount: number;
  searchStatus: { enabled: boolean };
  usageByAction: Array<{ action: string; count: number; avgLatency: number }>;
  users: AdminUser[];
  usageTrends: UsageTrendData[];
  popularTopics: PopularTopicData[];
  planDistribution: PlanDistribution[];
  tokenUsageTrends: TokenUsageTrend[];
  topCompanies: PopularTopicData[];
  modelUsage: Array<{ model: string; count: number; percentage: number }>;
  concurrencyLimit: number;
  tieredModelConfig: FullTieredModelConfig;
  aiToolsConfig: AIToolConfig[];
}

export function AdminTabs({
  stats,
  aiLogs,
  aiLogsCount,
  searchStatus,
  usageByAction,
  users,
  usageTrends,
  popularTopics,
  planDistribution,
  tokenUsageTrends,
  topCompanies,
  modelUsage,
  concurrencyLimit,
  tieredModelConfig,
  aiToolsConfig,
}: AdminTabsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-8"
    >
      <Tabs defaultValue="users" className="space-y-8">
        <div className="flex justify-center">
          <div className="bg-secondary/50 backdrop-blur-xl p-1.5 rounded-full inline-flex">
            <TabsList className="bg-transparent gap-1 h-auto p-0">
              <TabsTrigger
                value="users"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="ai-monitoring"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  <span>AI Monitoring</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="models"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>Models</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="prompts"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span>Prompts</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-0 focus-visible:outline-none">
          <UsersTab users={users} />
        </TabsContent>

        {/* AI Monitoring Tab */}
        <TabsContent value="ai-monitoring" className="mt-0 focus-visible:outline-none">
          <AIMonitoringDashboard
            initialLogs={aiLogs}
            initialStats={stats}
            initialLogsCount={aiLogsCount}
            usageByAction={usageByAction}
          />
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="mt-0 focus-visible:outline-none">
          <ModelsTab
            tieredModelConfig={tieredModelConfig}
            concurrencyLimit={concurrencyLimit}
            aiToolsConfig={aiToolsConfig}
          />
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="mt-0 focus-visible:outline-none">
          <PromptsTab />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
          <AnalyticsDashboard
            usageTrends={usageTrends}
            popularTopics={popularTopics}
            planDistribution={planDistribution}
            tokenUsageTrends={tokenUsageTrends}
            topCompanies={topCompanies}
            modelUsage={modelUsage}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function UsersTab({ users }: { users: AdminUser[] }) {
  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/50 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight">
              User Management
            </CardTitle>
            <CardDescription className="text-base">
              View and manage all platform users
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10 h-11 rounded-xl bg-secondary/50 border-transparent focus:bg-background transition-all duration-200"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="pl-8 h-12 font-medium text-muted-foreground">User</TableHead>
                <TableHead className="h-12 font-medium text-muted-foreground">Plan</TableHead>
                <TableHead className="h-12 font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="h-12 font-medium text-muted-foreground">Interviews</TableHead>
                <TableHead className="h-12 font-medium text-muted-foreground">Last Active</TableHead>
                <TableHead className="h-12 font-medium text-muted-foreground w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`group border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors ${user.suspended ? "opacity-60" : ""
                      }`}
                  >
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="secondary"
                        className={`rounded-full px-3 py-1 font-medium ${user.plan === "MAX"
                            ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 border-purple-200/20"
                            : "bg-secondary text-secondary-foreground"
                          }`}
                      >
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${user.suspended ? "bg-red-500" : "bg-emerald-500"
                            }`}
                        />
                        <span className={`text-sm font-medium ${user.suspended ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                          {user.suspended ? "Suspended" : "Active"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-medium text-foreground/80">
                      {user.interviewCount}
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground text-sm">
                      {user.lastActive}
                    </TableCell>
                    <TableCell className="py-4 pr-8">
                      <UserActions user={user} />
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
                        <Users className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">
                        No users found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ModelsTab({
  tieredModelConfig,
  concurrencyLimit,
  aiToolsConfig,
}: {
  tieredModelConfig: FullTieredModelConfig;
  concurrencyLimit: number;
  aiToolsConfig: AIToolConfig[];
}) {
  return (
    <div className="space-y-8">
      {/* Tiered Model Configuration */}
      <TieredModelConfig initialConfig={tieredModelConfig} />

      {/* AI Concurrency Configuration */}
      <ConcurrencyConfig initialLimit={concurrencyLimit} />

      {/* Tool Configuration */}
      <AIToolsConfig initialConfig={aiToolsConfig} />
    </div>
  );
}

function PromptsTab() {
  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/50 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/10">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">System Prompts</CardTitle>
        </div>
        <CardDescription>
          Configure AI system prompts and behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-8">
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full" />
            Main System Prompt
          </Label>
          <Textarea
            className="font-mono text-sm min-h-[200px] w-full rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all p-4 resize-y"
            defaultValue="You are an expert technical interview coach specializing in software engineering roles. Your goal is to help candidates understand complex concepts through clear explanations and relatable analogies..."
          />
        </div>
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Analogy Generation Prompt
          </Label>
          <Textarea
            className="font-mono text-sm min-h-[120px] w-full rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all p-4 resize-y"
            defaultValue="Generate an analogy for the following technical concept. The analogy should be relatable to everyday experiences and appropriate for the specified expertise level..."
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button className="rounded-full px-8 h-11 font-medium shadow-lg shadow-primary/20">Save Prompts</Button>
        </div>
      </CardContent>
    </Card>
  );
}
