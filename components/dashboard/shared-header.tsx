'use client';

import { useEffect } from 'react';
import { useSharedHeader, type HeaderConfig } from './shared-header-context';

export function SharedHeader() {
  const { config, setHeader } = useSharedHeader();

  // Listen for header updates from ViewTransitionLink
  useEffect(() => {
    const handleHeaderUpdate = (e: CustomEvent<Omit<HeaderConfig, 'visible' | 'actions'>>) => {
      setHeader(e.detail);
    };

    window.addEventListener('header-update', handleHeaderUpdate as EventListener);
    return () => {
      window.removeEventListener('header-update', handleHeaderUpdate as EventListener);
    };
  }, [setHeader]);

  if (!config?.visible) {
    return null;
  }

  const BadgeIcon = config.badgeIcon;

  return (
    <div className="mb-8">
      <div
        className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1.5 mb-3 text-xs text-foreground"
        style={{ viewTransitionName: 'page-badge' }}
      >
        <BadgeIcon className="w-3 h-3 text-primary" />
        <span>{config.badge}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl md:text-3xl font-mono text-foreground mb-1"
            style={{ viewTransitionName: 'page-title' }}
          >
            {config.title}
          </h1>
          <p
            className="text-muted-foreground text-sm"
            style={{ viewTransitionName: 'page-description' }}
          >
            {config.description}
          </p>
        </div>
        {config.actions && (
          <div className="flex items-center gap-3">{config.actions}</div>
        )}
      </div>
    </div>
  );
}
