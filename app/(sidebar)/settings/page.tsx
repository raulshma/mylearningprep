import { getSettingsPageData } from '@/lib/actions/user';
import { redirect } from 'next/navigation';
import { SettingsPageContent } from '@/components/settings/settings-page-content';
import { ProfileSection } from '@/app/settings/components/profile-section';
import { SubscriptionSection } from '@/app/settings/components/subscription-section';
import { ApiKeysSection } from '@/app/settings/components/api-keys-section';
import { DataManagementSection } from '@/app/settings/components/data-management-section';
import { BYOKTierConfigSection } from '@/app/settings/components/byok-tier-config';
import { BYOKUsageStatsSection } from '@/app/settings/components/byok-usage-stats';
import { CustomThemeSection } from '@/app/settings/components/custom-theme-section';

export default async function SettingsPage() {
  // Single optimized call fetches all settings data
  const result = await getSettingsPageData();

  if (!result.success) {
    redirect('/login');
  }

  const { profile, subscription } = result.data;

  return (
    <SettingsPageContent profile={profile}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <ProfileSection profile={profile} />
          <ApiKeysSection hasByokKey={profile.hasByokKey} plan={profile.plan} />
          <BYOKTierConfigSection hasByokKey={profile.hasByokKey} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SubscriptionSection profile={profile} subscription={subscription} />
          <BYOKUsageStatsSection hasByokKey={profile.hasByokKey} />
          <CustomThemeSection />
          <DataManagementSection />
        </div>
      </div>
    </SettingsPageContent>
  );
}
