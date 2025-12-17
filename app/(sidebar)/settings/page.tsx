import { Suspense } from 'react';
import { getSettingsPageData } from '@/lib/actions/user';
import { redirect } from 'next/navigation';
import { SettingsPageContent } from '@/components/settings/settings-page-content';
import { ProfileSection } from '@/app/settings/components/profile-section';
import { SubscriptionSection } from '@/app/settings/components/subscription-section';
import { ApiKeysSection } from '@/app/settings/components/api-keys-section';
import { DataManagementSection } from '@/app/settings/components/data-management-section';
import { CustomThemeSection } from '@/app/settings/components/custom-theme-section';
import { PlanFeaturesSection } from '@/app/settings/components/plan-features-section';
import { GenerationPreferencesSection } from '@/app/settings/components/generation-preferences-section';
import { PixelPetSection } from '@/app/settings/components/pixel-pet-section';
import { SettingsSectionSkeleton } from '@/app/(sidebar)/settings/skeletons';

// Lazy load heavy components that aren't immediately visible
import dynamic from 'next/dynamic';

const BYOKTierConfigSection = dynamic(
  () => import('@/app/settings/components/byok-tier-config').then(m => m.BYOKTierConfigSection),
  { ssr: true, loading: () => <SettingsSectionSkeleton /> }
);

const BYOKUsageStatsSection = dynamic(
  () => import('@/app/settings/components/byok-usage-stats').then(m => m.BYOKUsageStatsSection),
  { ssr: true, loading: () => <SettingsSectionSkeleton /> }
);

export default async function SettingsPage() {
  const result = await getSettingsPageData();

  if (!result.success) {
    redirect('/login');
  }

  const { profile, subscription } = result.data;

  return (
    <SettingsPageContent profile={profile}>
      <div className="grid gap-6 lg:grid-cols-2 w-full max-w-full">
        {/* Left column - Profile & Plan info (high priority) */}
        <div className="space-y-6 min-w-0">
          <ProfileSection profile={profile} />
          
          <Suspense fallback={<SettingsSectionSkeleton />}>
            <PlanFeaturesSection plan={profile.plan} />
          </Suspense>
          
          <Suspense fallback={<SettingsSectionSkeleton />}>
            <ApiKeysSection 
              hasByokKey={profile.hasByokKey} 
              hasOpenRouterKey={profile.hasOpenRouterKey}
              hasGoogleKey={profile.hasGoogleKey}
              plan={profile.plan} 
            />
          </Suspense>
          
          {profile.hasByokKey && (
            <Suspense fallback={<SettingsSectionSkeleton />}>
              <BYOKTierConfigSection hasByokKey={profile.hasByokKey} />
            </Suspense>
          )}
        </div>

        {/* Right column - Subscription & Preferences */}
        <div className="space-y-6 min-w-0">
          <SubscriptionSection profile={profile} subscription={subscription} />
          
          <Suspense fallback={<SettingsSectionSkeleton />}>
            <GenerationPreferencesSection 
              plan={profile.plan} 
              generationPreferences={profile.generationPreferences} 
            />
          </Suspense>
          
          <Suspense fallback={<SettingsSectionSkeleton />}>
            <PixelPetSection plan={profile.plan} pixelPet={profile.pixelPet} />
          </Suspense>
          
          {profile.hasByokKey && (
            <Suspense fallback={<SettingsSectionSkeleton />}>
              <BYOKUsageStatsSection hasByokKey={profile.hasByokKey} />
            </Suspense>
          )}
          
          <Suspense fallback={<SettingsSectionSkeleton />}>
            <CustomThemeSection plan={profile.plan} />
          </Suspense>
          
          <DataManagementSection />
        </div>
      </div>
    </SettingsPageContent>
  );
}
