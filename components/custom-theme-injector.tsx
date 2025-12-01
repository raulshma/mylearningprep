"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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

export function CustomThemeInjector() {
  const css = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!css) return null;

  return (
    <style id="custom-theme-css" dangerouslySetInnerHTML={{ __html: css }} />
  );
}
