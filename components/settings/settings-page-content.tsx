'use client';

import { useEffect } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';

interface Profile {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
  plan: string;
  hasByokKey: boolean;
}

interface SettingsPageContentProps {
  profile: Profile;
  children: React.ReactNode;
}

export function SettingsPageContent({ profile, children }: SettingsPageContentProps) {
  const { setHeader } = useSharedHeader();
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User';

  useEffect(() => {
    setHeader({
      badge: 'Settings',
      badgeIcon: Settings,
      title: fullName,
      description: profile.email || 'Manage your account',
      actions: (
        <Badge
          variant={profile.plan === 'MAX' ? 'default' : 'secondary'}
          className="text-sm px-4 py-1.5 flex items-center gap-2 w-fit"
        >
          {profile.plan === 'MAX' && <Sparkles className="w-3 h-3" />}
          {profile.plan} Plan
        </Badge>
      ),
    });
  }, [setHeader, fullName, profile.email, profile.plan]);

  return <>{children}</>;
}
