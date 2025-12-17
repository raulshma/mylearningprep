"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
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
  Settings,
  Globe,
} from "lucide-react";
import { AIMonitoringDashboard } from "@/components/admin/ai-monitoring-dashboard";
import { TieredModelConfig } from "@/components/admin/tiered-model-config";
import { ConcurrencyConfig } from "@/components/admin/concurrency-config";
import { AIToolsConfig } from "@/components/admin/ai-tools-config";
import { UserActions } from "@/components/admin/user-management";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { VisibilityManagement } from "@/components/admin/visibility-management";
import { VisibilityStats } from "@/components/admin/visibility-stats";
import {
  UsersTabSkeleton,
  AnalyticsSkeleton,
  ModelConfigSkeleton,
  AIMonitoringSkeleton,
  VisibilitySkeleton,
} from "@/components/admin/admin-skeletons";
import {
  fetchUsersTab,
  fetchAIMonitoringTab,
  fetchModelsTab,
  fetchAnalyticsTab,
  fetchVisibilityTab,
} from "@/lib/actions/admin-data";
import type {
  AdminStats,
  AdminUser,
  AILogWithDetails,
  FullTieredModelConfig,
  UsageTrendData,
  PopularTopicData,
  PlanDistribution,
  TokenUsageTrend,
  journeyAnalyticsStats,
  journeyTrendData,
  PopularJourneyData,
  AIToolConfig,
} from "@/lib/actions/admin";
import type { VisibilityOverview } from "@/lib/db/schemas/visibility";

type TabValue = "users" | "ai-monitoring" | "models" | "prompts" | "analytics" | "visibility" | "configuration";

interface UsersTabData {
  users: AdminUser[];
}

interface AIMonitoringTabData {
  stats: AdminStats;
  aiLogs: AILogWithDetails[];
  aiLogsCount: number;
  searchStatus: { enabled: boolean };
  usageByAction: Array<{ action: string; count: number; avgLatency: number }>;
}

interface ModelsTabData {
  tieredModelConfig: FullTieredModelConfig;
  concurrencyLimit: number;
  aiToolsConfig: AIToolConfig[];
}

interface AnalyticsTabData {
  usageTrends: UsageTrendData[];
  popularTopics: PopularTopicData[];
  planDistribution: PlanDistribution[];
  tokenUsageTrends: TokenUsageTrend[];
  topCompanies: PopularTopicData[];
  modelUsage: Array<{ model: string; count: number; percentage: number }>;
  journeyStats: journeyAnalyticsStats;
  journeyTrends: journeyTrendData[];
  popularJourneys: PopularJourneyData[];
}

interface VisibilityTabData {
  visibilityOverview: VisibilityOverview;
}

interface TabDataCache {
  users?: UsersTabData;
  "ai-monitoring"?: AIMonitoringTabData;
  models?: ModelsTabData;
  analytics?: AnalyticsTabData;
  visibility?: VisibilityTabData;
}

interface AdminTabsLazyProps {
  initialUsersData: UsersTabData;
}

export function AdminTabsLazy({ initialUsersData }: AdminTabsLazyProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("users");
  const [isPending, startTransition] = useTransition();
  const [tabData, setTabData] = useState<TabDataCache>({
    users: initialUsersData,
  });
  const [loadingTab, setLoadingTab] = useState<TabValue | null>(null);

  const loadTabData = useCallback(async (tab: TabValue) => {
    if (tabData[tab as keyof TabDataCache] || tab === "prompts" || tab === "configuration") {
      return;
    }

    setLoadingTab(tab);

    try {
      let data: UsersTabData | AIMonitoringTabData | ModelsTabData | AnalyticsTabData | VisibilityTabData | undefined;

      switch (tab) {
        case "users":
          data = await fetchUsersTab();
          break;
        case "ai-monitoring":
          data = await fetchAIMonitoringTab();
          break;
        case "models":
          data = await fetchModelsTab();
          break;
        case "analytics":
          data = await fetchAnalyticsTab();
          break;
        case "visibility":
          data = await fetchVisibilityTab();
          break;
      }

      if (data) {
        setTabData((prev) => ({ ...prev, [tab]: data }));
      }
    } catch (error) {
      console.error(`Failed to load ${tab} tab data:`, error);
    } finally {
      setLoadingTab(null);
    }
  }, [tabData]);

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    startTransition(() => {
      loadTabData(tab);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-8"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <div className="flex w-full overflow-x-auto pb-2 justify-start md:justify-center">
          <div className="bg-secondary/50 p-1.5 rounded-full inline-flex min-w-max">
            <TabsList className="bg-transparent gap-1 h-auto p-0">
              <TabsTrigger value="users" className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="ai-monitoring" className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  <span>AI Monitoring</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="models" className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>Models</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="prompts" className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span>Prompts</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="visibility" className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Visibility</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="configuration" className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Configuration</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="users" className="mt-0 focus-visible:outline-none">
          {tabData.users ? <UsersTab users={tabData.users.users} /> : <UsersTabSkeleton />}
        </TabsContent>

        <TabsContent value="ai-monitoring" className="mt-0 focus-visible:outline-none">
          {loadingTab === "ai-monitoring" || !tabData["ai-monitoring"] ? (
            <AIMonitoringSkeleton />
          ) : (
            <AIMonitoringDashboard
              initialLogs={tabData["ai-monitoring"].aiLogs}
              initialStats={tabData["ai-monitoring"].stats}
              initialLogsCount={tabData["ai-monitoring"].aiLogsCount}
              usageByAction={tabData["ai-monitoring"].usageByAction}
            />
          )}
        </TabsContent>

        <TabsContent value="models" className="mt-0 focus-visible:outline-none">
          {loadingTab === "models" ? (
            <ModelConfigSkeleton />
          ) : tabData.models ? (
            <ModelsTab
              tieredModelConfig={tabData.models.tieredModelConfig}
              concurrencyLimit={tabData.models.concurrencyLimit}
              aiToolsConfig={tabData.models.aiToolsConfig}
            />
          ) : (
            <ModelConfigSkeleton />
          )}
        </TabsContent>

        <TabsContent value="prompts" className="mt-0 focus-visible:outline-none">
          <PromptsTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
          {loadingTab === "analytics" ? (
            <AnalyticsSkeleton />
          ) : tabData.analytics ? (
            <AnalyticsDashboard
              usageTrends={tabData.analytics.usageTrends}
              popularTopics={tabData.analytics.popularTopics}
              planDistribution={tabData.analytics.planDistribution}
              tokenUsageTrends={tabData.analytics.tokenUsageTrends}
              topCompanies={tabData.analytics.topCompanies}
              modelUsage={tabData.analytics.modelUsage}
              journeyStats={tabData.analytics.journeyStats}
              journeyTrends={tabData.analytics.journeyTrends}
              popularJourneys={tabData.analytics.popularJourneys}
            />
          ) : (
            <AnalyticsSkeleton />
          )}
        </TabsContent>

        <TabsContent value="visibility" className="mt-0 focus-visible:outline-none">
          {loadingTab === "visibility" || !tabData.visibility ? (
            <VisibilitySkeleton />
          ) : (
            <div className="space-y-8">
              <VisibilityStats stats={tabData.visibility.visibilityOverview.stats} />
              <VisibilityManagement initialData={tabData.visibility.visibilityOverview} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="configuration" className="mt-0 focus-visible:outline-none">
          <ConfigurationTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function UsersTab({ users }: { users: AdminUser[] }) {
  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/50 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight">User Management</CardTitle>
            <CardDescription className="text-base">View and manage all platform users</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-10 h-11 rounded-xl bg-secondary/50 border-transparent focus:bg-background transition-all duration-200" />
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
                    className={`group border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors ${user.suspended ? "opacity-60" : ""}`}
                  >
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className={`rounded-full px-3 py-1 font-medium ${user.plan === "MAX" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/20" : "bg-secondary text-secondary-foreground"}`}>
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.suspended ? "bg-red-500" : "bg-emerald-500"}`} />
                        <span className={`text-sm font-medium ${user.suspended ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {user.suspended ? "Suspended" : "Active"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-medium text-foreground/80">{user.interviewCount}</TableCell>
                    <TableCell className="py-4 text-muted-foreground text-sm">{user.lastActive}</TableCell>
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
                      <p className="text-lg font-medium text-muted-foreground">No users found</p>
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

function ModelsTab({ tieredModelConfig, concurrencyLimit, aiToolsConfig }: { tieredModelConfig: FullTieredModelConfig; concurrencyLimit: number; aiToolsConfig: AIToolConfig[] }) {
  return (
    <div className="space-y-8">
      <TieredModelConfig initialConfig={tieredModelConfig} />
      <ConcurrencyConfig initialLimit={concurrencyLimit} />
      <AIToolsConfig initialConfig={aiToolsConfig} />
    </div>
  );
}

function PromptsTab() {
  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/50 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/10">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">System Prompts</CardTitle>
        </div>
        <CardDescription>Configure AI system prompts and behavior</CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-8">
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full" />
            Main System Prompt
          </Label>
          <Textarea className="font-mono text-sm min-h-[200px] w-full rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all p-4 resize-y" defaultValue="You are an expert technical interview coach..." />
        </div>
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Analogy Generation Prompt
          </Label>
          <Textarea className="font-mono text-sm min-h-[120px] w-full rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all p-4 resize-y" defaultValue="Generate an analogy for the following technical concept..." />
        </div>
        <div className="flex justify-end pt-4">
          <Button className="rounded-full px-8 h-11 font-medium shadow-lg shadow-primary/20">Save Prompts</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigurationTab() {
  const [isReseeding, setIsReseeding] = useState(false);
  const [reseedResult, setReseedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiTitleEnabled, setAiTitleEnabled] = useState(true);
  const [isLoadingTitleSetting, setIsLoadingTitleSetting] = useState(true);
  const [isSavingTitleSetting, setIsSavingTitleSetting] = useState(false);

  // Load AI title generation setting on mount
  useEffect(() => {
    const loadSetting = async () => {
      try {
        const { getAITitleGenerationEnabled } = await import("@/lib/actions/admin");
        const enabled = await getAITitleGenerationEnabled();
        setAiTitleEnabled(enabled);
      } catch (error) {
        console.error("Failed to load AI title setting:", error);
      } finally {
        setIsLoadingTitleSetting(false);
      }
    };
    loadSetting();
  }, []);

  const handleToggleAiTitle = async () => {
    setIsSavingTitleSetting(true);
    try {
      const { updateAITitleGenerationEnabled } = await import("@/lib/actions/admin");
      const newValue = !aiTitleEnabled;
      const result = await updateAITitleGenerationEnabled(newValue);
      if ("success" in result && result.success) {
        setAiTitleEnabled(newValue);
      }
    } catch (error) {
      console.error("Failed to update AI title setting:", error);
    } finally {
      setIsSavingTitleSetting(false);
    }
  };

  const handleReseedjourneys = async () => {
    setIsReseeding(true);
    setReseedResult(null);
    try {
      const response = await fetch("/api/admin/reseed-journeys", { method: "POST" });
      const data = await response.json();
      setReseedResult(response.ok ? { success: true, message: data.message } : { success: false, message: data.error || "Failed to reseed journeys" });
    } catch {
      setReseedResult({ success: false, message: "Network error occurred" });
    } finally {
      setIsReseeding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* AI Chat Configuration */}
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-border/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">AI Chat Configuration</CardTitle>
          </div>
          <CardDescription>Configure AI chat behavior and features</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">AI-Generated Conversation Titles</h3>
                <p className="text-sm text-muted-foreground">
                  {aiTitleEnabled 
                    ? "Conversation titles are generated using AI based on the first message." 
                    : "Conversation titles use the first words from the message instead of AI generation."}
                </p>
              </div>
              <Button 
                onClick={handleToggleAiTitle} 
                disabled={isLoadingTitleSetting || isSavingTitleSetting} 
                variant={aiTitleEnabled ? "default" : "outline"} 
                className="rounded-full px-6 shrink-0"
              >
                {isLoadingTitleSetting || isSavingTitleSetting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    {isLoadingTitleSetting ? "Loading..." : "Saving..."}
                  </>
                ) : (
                  aiTitleEnabled ? "Enabled" : "Disabled"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Configuration */}
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-border/50 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">Data Configuration</CardTitle>
          </div>
          <CardDescription>Manage journeys, lessons, and other platform data</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">Reseed journeys</h3>
                <p className="text-sm text-muted-foreground">Update the database with the latest journey data.</p>
              </div>
              <Button onClick={handleReseedjourneys} disabled={isReseeding} variant="outline" className="rounded-full px-6 shrink-0">
                {isReseeding ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Reseeding...
                  </>
                ) : (
                  "Reseed journeys"
                )}
              </Button>
            </div>
            {reseedResult && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 p-3 rounded-xl text-sm ${reseedResult.success ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"}`}>
                {reseedResult.message}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
