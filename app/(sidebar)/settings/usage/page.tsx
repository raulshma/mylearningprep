import { redirect } from 'next/navigation';
import { getAuthUserId } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { getAIUsageDashboardData } from '@/lib/actions/ai-usage';
import { AIUsageDashboard } from '@/components/settings/ai-usage-dashboard';
import { UsagePageContent } from '@/components/settings/usage-page-content';
import { UsageUpgradePrompt } from '@/components/settings/usage-upgrade-prompt';

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

  const data = await getAIUsageDashboardData();

  if (!data) {
    redirect('/dashboard');
  }

  return (
    <UsagePageContent>
      <AIUsageDashboard data={data} />
    </UsagePageContent>
  );
}
