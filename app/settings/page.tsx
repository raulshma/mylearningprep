import { getUserProfile } from "@/lib/actions/user";
import { getUserSubscriptionStatus } from "@/lib/actions/stripe";
import { redirect } from "next/navigation";
import { SettingsHeader } from "@/app/settings/components/settings-header";
import { ProfileSection } from "@/app/settings/components/profile-section";
import { SubscriptionSection } from "@/app/settings/components/subscription-section";
import { ApiKeysSection } from "@/app/settings/components/api-keys-section";
import { DataManagementSection } from "@/app/settings/components/data-management-section";

export default async function SettingsPage() {
  const [profileResult, subscriptionResult] = await Promise.all([
    getUserProfile(),
    getUserSubscriptionStatus(),
  ]);

  if (!profileResult.success) {
    redirect("/login");
  }

  const profile = profileResult.data;
  const subscription = subscriptionResult;

  return (
    <main className="flex-1 overflow-auto relative">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <SettingsHeader profile={profile} />

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              <ProfileSection profile={profile} />
              <ApiKeysSection hasByokKey={profile.hasByokKey} plan={profile.plan} />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <SubscriptionSection profile={profile} subscription={subscription} />
              <DataManagementSection />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
