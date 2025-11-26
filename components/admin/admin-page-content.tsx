'use client';

import { useEffect } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';

interface AdminPageContentProps {
  children: React.ReactNode;
}

export function AdminPageContent({ children }: AdminPageContentProps) {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      badge: 'Admin',
      badgeIcon: Shield,
      title: 'System Dashboard',
      description: 'Monitor platform health, manage users, and configure AI systems',
      actions: (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400 font-mono">Systems Online</span>
          </div>
          <Badge variant="outline" className="px-3 py-1.5 font-mono text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        </div>
      ),
    });
  }, [setHeader]);

  return <>{children}</>;
}
