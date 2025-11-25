"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Key } from "lucide-react";
import { ProfileTab } from "./tabs/profile-tab";
import { SubscriptionTab } from "./tabs/subscription-tab";
import { ApiKeysTab } from "./tabs/api-keys-tab";

interface SettingsContentProps {
  profile: {
    clerkId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    plan: string;
    iterations: { count: number; limit: number; resetDate: Date };
    interviews: { count: number; limit: number; resetDate: Date };
    hasStripeSubscription: boolean;
    hasByokKey: boolean;
  };
  subscription: {
    plan: string;
    hasSubscription: boolean;
    iterations?: { count: number; limit: number; resetDate: Date };
    interviews?: { count: number; limit: number; resetDate: Date };
  };
}

export function SettingsContent({
  profile,
  subscription,
}: SettingsContentProps) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList>
        <TabsTrigger value="profile">
          <User className="w-4 h-4 mr-2" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="subscription">
          <CreditCard className="w-4 h-4 mr-2" />
          Subscription
        </TabsTrigger>
        <TabsTrigger value="api">
          <Key className="w-4 h-4 mr-2" />
          API Keys
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab profile={profile} />
      </TabsContent>

      <TabsContent value="subscription">
        <SubscriptionTab profile={profile} subscription={subscription} />
      </TabsContent>

      <TabsContent value="api">
        <ApiKeysTab hasByokKey={profile.hasByokKey} plan={profile.plan} />
      </TabsContent>
    </Tabs>
  );
}
