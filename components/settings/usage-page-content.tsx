'use client';

import { useEffect } from 'react';
import { Activity, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';

interface UsagePageContentProps {
  children: React.ReactNode;
}

export function UsagePageContent({ children }: UsagePageContentProps) {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      badge: 'Usage',
      badgeIcon: Activity,
      title: 'AI Usage',
      description: 'Monitor your AI request logs and costs',
      actions: (
        <Badge
          variant="default"
          className="text-sm px-4 py-1.5 flex items-center gap-2 w-fit rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/10 backdrop-blur-md"
        >
          <Crown className="w-3.5 h-3.5" />
          MAX Exclusive
        </Badge>
      ),
    });
  }, [setHeader]);

  return <>{children}</>;
}
