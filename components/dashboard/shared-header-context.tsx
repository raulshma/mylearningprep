'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface HeaderConfig {
  badge: string;
  badgeIcon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
  visible: boolean;
}

interface SharedHeaderContextType {
  config: HeaderConfig | null;
  setHeader: (config: Omit<HeaderConfig, 'visible'>) => void;
  hideHeader: () => void;
  flushPendingUpdate: () => void;
  setPendingHeader: (config: Omit<HeaderConfig, 'visible'>) => void;
}

const SharedHeaderContext = createContext<SharedHeaderContextType | null>(null);

export function SharedHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig | null>(null);
  const pendingConfig = useRef<Omit<HeaderConfig, 'visible'> | null>(null);

  const setHeader = useCallback((newConfig: Omit<HeaderConfig, 'visible'>) => {
    setConfig({ ...newConfig, visible: true });
  }, []);

  const setPendingHeader = useCallback((newConfig: Omit<HeaderConfig, 'visible'>) => {
    pendingConfig.current = newConfig;
  }, []);

  const flushPendingUpdate = useCallback(() => {
    if (pendingConfig.current) {
      setConfig({ ...pendingConfig.current, visible: true });
      pendingConfig.current = null;
    }
  }, []);

  const hideHeader = useCallback(() => {
    setConfig(prev => prev ? { ...prev, visible: false } : null);
  }, []);

  return (
    <SharedHeaderContext.Provider value={{ config, setHeader, hideHeader, flushPendingUpdate, setPendingHeader }}>
      {children}
    </SharedHeaderContext.Provider>
  );
}

export function useSharedHeader() {
  const context = useContext(SharedHeaderContext);
  if (!context) {
    throw new Error('useSharedHeader must be used within SharedHeaderProvider');
  }
  return context;
}
