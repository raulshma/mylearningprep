import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getAuthUserId } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { getAIUsageDashboardData } from '@/lib/actions/ai-usage';
import { AIUsageDashboard } from '@/components/settings/ai-usage-dashboard';
import { AIUsageSkeleton } from '@/components/settings/ai-usage-skeleton';
import { UsagePageContent } from '@/components/settings/usage-page-content';
import { UsageUpgradePrompt } from '@/components/settings/usage-upgrade-prompt';

async function DashboardContent() {
  const data = await getAIUsageDashboardData();

  if (!data) {
    redirect('/dashboard');
  }

  return <AIUsageDashboard data={data} />;
}

export default async function UsagePage() {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);

  if (!user) {
    redirect('/dashboard');
  }

  // Check if user has MAX plan - this is a MAX exclusive feature
  if (user.plan !== 'MAX') {
    return <UsageUpgradePrompt />;
  }

  return (
    <UsagePageContent>
      <Suspense fallback={<AIUsageSkeleton />}>
        <DashboardContent />
      </Suspense>
    </UsagePageContent>
  );
}
