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
import { PlanFeaturesSection } from '@/app/settings/components/plan-features-section';
import { GenerationPreferencesSection } from '@/app/settings/components/generation-preferences-section';
import { PixelPetSection } from '@/app/settings/components/pixel-pet-section';

export default async function SettingsPage() {
  // Single optimized call fetches all settings data
  const result = await getSettingsPageData();

  if (!result.success) {
    redirect('/login');
  }

  const { profile, subscription } = result.data;

  return (
    <SettingsPageContent profile={profile}>
      <div className="grid gap-6 lg:grid-cols-2 w-full max-w-full">
        {/* Left column */}
        <div className="space-y-6 min-w-0">
          <ProfileSection profile={profile} />
          <PlanFeaturesSection plan={profile.plan} />
          <ApiKeysSection 
            hasByokKey={profile.hasByokKey} 
            hasOpenRouterKey={profile.hasOpenRouterKey}
            hasGoogleKey={profile.hasGoogleKey}
            plan={profile.plan} 
          />
          <BYOKTierConfigSection hasByokKey={profile.hasByokKey} />
        </div>

        {/* Right column */}
        <div className="space-y-6 min-w-0">
          <SubscriptionSection profile={profile} subscription={subscription} />
          <GenerationPreferencesSection 
            plan={profile.plan} 
            generationPreferences={profile.generationPreferences} 
          />
          <PixelPetSection plan={profile.plan} pixelPet={profile.pixelPet} />
          <BYOKUsageStatsSection hasByokKey={profile.hasByokKey} />
          <CustomThemeSection plan={profile.plan} />
          <DataManagementSection />
        </div>
      </div>
    </SettingsPageContent>
  );
}
