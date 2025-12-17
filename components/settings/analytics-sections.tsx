import {
  getCachedAnalyticsStats,
  getCachedInterviewTrends,
  getCachedTopicProgress,
  getCachedConfidenceDistribution,
  getCachedTopCompanies,
  getCachedTopSkills,
  getCachedJourneyAnalytics,
} from '@/lib/actions/user-analytics-cached';
import {
  StatsGrid,
  JourneyStatsGrid,
  InterviewActivityChart,
  TopicProgressChart,
  ConfidenceChart,
  JourneyActivityChart,
  JourneyProgressChart,
  CompaniesListCard,
  SkillsListCard,
  TopJourneysListCard,
} from './analytics-charts';

/**
 * Stats section - fetches and renders main stats grid
 * Uses 'use cache' directive for automatic caching
 */
export async function AnalyticsStatsSection() {
  const stats = await getCachedAnalyticsStats();
  if (!stats) return null;
  return <StatsGrid stats={stats} />;
}

/**
 * Journey stats section
 */
export async function AnalyticsJourneyStatsSection() {
  const journeyData = await getCachedJourneyAnalytics();
  if (!journeyData) return null;
  return <JourneyStatsGrid stats={journeyData.stats} />;
}

/**
 * Interview activity chart section
 */
export async function AnalyticsInterviewChartSection() {
  const trends = await getCachedInterviewTrends();
  if (!trends) return null;
  return <InterviewActivityChart trends={trends} />;
}

/**
 * Progress charts section - parallel data fetching for topic progress + confidence
 */
export async function AnalyticsProgressChartsSection() {
  // Parallel fetch - both requests start immediately
  const topicProgressPromise = getCachedTopicProgress();
  const confidencePromise = getCachedConfidenceDistribution();
  
  const [topicProgress, confidenceDistribution] = await Promise.all([
    topicProgressPromise,
    confidencePromise,
  ]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TopicProgressChart data={topicProgress ?? []} />
      <ConfidenceChart data={confidenceDistribution ?? []} />
    </div>
  );
}

/**
 * Journey charts section (activity + progress buckets)
 */
export async function AnalyticsJourneyChartsSection() {
  const journeyData = await getCachedJourneyAnalytics();
  if (!journeyData) return null;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <JourneyActivityChart trends={journeyData.nodeCompletionTrends} />
      <JourneyProgressChart data={journeyData.progressBuckets} />
    </div>
  );
}

/**
 * Lists section - parallel data fetching for companies + skills
 */
export async function AnalyticsListsSection() {
  // Parallel fetch - both requests start immediately
  const companiesPromise = getCachedTopCompanies();
  const skillsPromise = getCachedTopSkills();
  
  const [companies, skills] = await Promise.all([
    companiesPromise,
    skillsPromise,
  ]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CompaniesListCard data={companies ?? []} />
      <SkillsListCard data={skills ?? []} />
    </div>
  );
}

/**
 * Top journeys list section
 */
export async function AnalyticsJourneyListSection() {
  const journeyData = await getCachedJourneyAnalytics();
  if (!journeyData) return null;
  return <TopJourneysListCard data={journeyData.topjourneys} />;
}
