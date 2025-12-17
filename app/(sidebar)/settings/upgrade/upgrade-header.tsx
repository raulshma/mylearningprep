'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';

export function UpgradeHeader() {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      title: 'Upgrade Plan',
      description: 'Unlock the full potential of MyLearningPrep',
      badge: 'Pricing',
      badgeIcon: Sparkles,
    });
  }, [setHeader]);

  return null;
}
