'use client';

import { useEffect } from 'react';
import { useSharedHeader, type HeaderConfig } from '@/components/dashboard/shared-header-context';

type UsePageHeaderConfig = Omit<HeaderConfig, 'visible'>;

export function usePageHeader(config: UsePageHeaderConfig) {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader(config);
  }, [config, setHeader]);
}

export function useHidePageHeader() {
  const { hideHeader } = useSharedHeader();

  useEffect(() => {
    hideHeader();
  }, [hideHeader]);
}
