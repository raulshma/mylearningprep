'use client';

import { useEffect, type ReactNode } from 'react';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';
import { RoadmapCommandMenu } from './roadmap-command-menu';

interface RoadmapsPageClientProps {
  children: ReactNode;
}

export function RoadmapsPageClient({ children }: RoadmapsPageClientProps) {
  const { hideHeader } = useSharedHeader();

  useEffect(() => {
    hideHeader();
  }, [hideHeader]);

  return (
    <>
      {children}
      <RoadmapCommandMenu />
    </>
  );
}