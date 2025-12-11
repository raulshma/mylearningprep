'use client';

import { useEffect } from 'react';
import { BarChart3, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';

interface AnalyticsPageContentProps {
  children: React.ReactNode;
}

export function AnalyticsPageContent({ children }: AnalyticsPageContentProps) {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      badge: 'Analytics',
      badgeIcon: BarChart3,
      title: 'Your Insights',
      description: 'Track your interview preparation progress',
      actions: (
        <Badge
          variant="default"
          className="text-sm px-4 py-1.5 flex items-center gap-2 w-fit rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/5"
        >
          <Crown className="w-3.5 h-3.5" />
          MAX Feature
        </Badge>
      ),
    });
  }, [setHeader]);

  return <>{children}</>;
}
