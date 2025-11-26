import { redirect } from 'next/navigation';
import {
  getAdminStats,
  getAILogs,
  getAILogsCount,
  getSearchToolStatus,
  getAIUsageByAction,
  getAdminUsers,
  getUsageTrends,
  getPopularTopics,
  getPlanDistribution,
  getTokenUsageTrends,
  getTopCompanies,
  getModelUsageDistribution,
  getAIConcurrencyLimit,
  getTieredModelConfig,
} from '@/lib/actions/admin';
import { isAdmin } from '@/lib/auth/get-user';
import { AdminPageContent } from '@/components/admin/admin-page-content';
import { AdminStatsGrid } from '@/components/admin/admin-stats-grid';
import { AdminTabs } from '@/components/admin/admin-tabs';

function isValidData<T>(data: T | { success: false; error: string }): data is T {
  return !data || typeof data !== 'object' || !('success' in data && data.success === false);
}

async function getAdminData() {
  const [
    statsRaw, aiLogsRaw, aiLogsCountRaw, searchStatusRaw, usageByActionRaw,
    usersRaw, usageTrendsRaw, popularTopicsRaw, planDistributionRaw,
    tokenUsageTrendsRaw, topCompaniesRaw, modelUsageRaw, concurrencyLimitRaw, tieredModelConfigRaw,
  ] = await Promise.all([
    getAdminStats(), getAILogs({ limit: 10 }), getAILogsCount({}), getSearchToolStatus(),
    getAIUsageByAction(), getAdminUsers(), getUsageTrends(30), getPopularTopics(10),
    getPlanDistribution(), getTokenUsageTrends(30), getTopCompanies(10),
    getModelUsageDistribution(), getAIConcurrencyLimit(), getTieredModelConfig(),
  ]);

  return {
    stats: isValidData(statsRaw) ? statsRaw : { totalUsers: 0, activeThisWeek: 0, totalInterviews: 0, totalAIRequests: 0, totalInputTokens: 0, totalOutputTokens: 0, avgLatencyMs: 0, totalCost: 0, errorCount: 0, errorRate: 0, avgTimeToFirstToken: 0 },
    aiLogs: isValidData(aiLogsRaw) ? aiLogsRaw : [],
    aiLogsCount: isValidData(aiLogsCountRaw) ? aiLogsCountRaw : 0,
    searchStatus: isValidData(searchStatusRaw) ? searchStatusRaw : { enabled: false },
    usageByAction: isValidData(usageByActionRaw) ? usageByActionRaw : [],
    users: isValidData(usersRaw) ? usersRaw : [],
    usageTrends: isValidData(usageTrendsRaw) ? usageTrendsRaw : [],
    popularTopics: isValidData(popularTopicsRaw) ? popularTopicsRaw : [],
    planDistribution: isValidData(planDistributionRaw) ? planDistributionRaw : [],
    tokenUsageTrends: isValidData(tokenUsageTrendsRaw) ? tokenUsageTrendsRaw : [],
    topCompanies: isValidData(topCompaniesRaw) ? topCompaniesRaw : [],
    modelUsage: isValidData(modelUsageRaw) ? modelUsageRaw : [],
    concurrencyLimit: isValidData(concurrencyLimitRaw) ? concurrencyLimitRaw : 3,
    tieredModelConfig: isValidData(tieredModelConfigRaw) ? tieredModelConfigRaw : {
      high: { primaryModel: null, fallbackModel: null, temperature: 0.7, maxTokens: 4096 },
      medium: { primaryModel: null, fallbackModel: null, temperature: 0.7, maxTokens: 4096 },
      low: { primaryModel: null, fallbackModel: null, temperature: 0.7, maxTokens: 4096 },
    },
  };
}

export default async function AdminPage() {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    redirect('/dashboard');
  }

  const data = await getAdminData();

  return (
    <AdminPageContent>
      <div className="space-y-8">
        <AdminStatsGrid stats={data.stats} />
        <AdminTabs
          stats={data.stats}
          aiLogs={data.aiLogs}
          aiLogsCount={data.aiLogsCount}
          searchStatus={data.searchStatus}
          usageByAction={data.usageByAction}
          users={data.users}
          usageTrends={data.usageTrends}
          popularTopics={data.popularTopics}
          planDistribution={data.planDistribution}
          tokenUsageTrends={data.tokenUsageTrends}
          topCompanies={data.topCompanies}
          modelUsage={data.modelUsage}
          concurrencyLimit={data.concurrencyLimit}
          tieredModelConfig={data.tieredModelConfig}
        />
      </div>
    </AdminPageContent>
  );
}
