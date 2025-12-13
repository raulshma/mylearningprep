'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getSnapshot(): boolean {
  return typeof window !== 'undefined' 
    ? window.matchMedia(QUERY).matches 
    : false;
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia(QUERY);
  
  // Add listener
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', callback);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(callback);
  }

  // Cleanup
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', callback);
    } else {
      // Fallback for older browsers
      mediaQuery.removeListener(callback);
    }
  };
}

/**
 * Hook to detect if the user prefers reduced motion
 * @returns boolean indicating if reduced motion is preferred
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
