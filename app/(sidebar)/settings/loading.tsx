import { ProfileSectionSkeleton, SubscriptionSectionSkeleton, SettingsSectionSkeleton } from "./skeletons";

export default function SettingsLoading() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid gap-6 lg:grid-cols-2 w-full max-w-full">
        {/* Left column */}
        <div className="space-y-6 min-w-0">
          <ProfileSectionSkeleton />
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
        </div>

        {/* Right column */}
        <div className="space-y-6 min-w-0">
          <SubscriptionSectionSkeleton />
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
        </div>
      </div>
    </div>
  );
}
