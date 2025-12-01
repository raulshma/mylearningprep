"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "syntaxstate-custom-theme";

// External store for localStorage theme
function subscribe(callback: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };
  const handleCustomUpdate = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener("custom-theme-update", handleCustomUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("custom-theme-update", handleCustomUpdate);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useCustomTheme() {
  const customCSS = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  // isLoaded is always true on client since useSyncExternalStore handles hydration
  const isLoaded = typeof window !== "undefined";

  const setCustomCSS = useCallback((css: string | null) => {
    if (css === null || css.trim() === "") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, css);
    }
    // Trigger re-render via custom event (useSyncExternalStore will pick up the change)
    window.dispatchEvent(new CustomEvent("custom-theme-update"));
  }, []);

  const clearCustomTheme = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("custom-theme-update"));
  }, []);

  return {
    customCSS,
    setCustomCSS,
    clearCustomTheme,
    isLoaded,
    hasCustomTheme: !!customCSS,
  };
}
