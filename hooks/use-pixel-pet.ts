"use client";

import { create } from "zustand";

import type { PixelPetPreferences, PixelPetId, PixelPetEdge, PixelPetOffset } from "@/lib/db/schemas/user";

interface PixelPetStore {
  hydrated: boolean;
  prefs: PixelPetPreferences;

  hydrate: (prefs: PixelPetPreferences) => void;
  setEnabled: (enabled: boolean) => void;
  setSelectedId: (selectedId: PixelPetId) => void;
  setPlacement: (placement: { surfaceId: string; edge: PixelPetEdge; progress: number }) => void;
  setOffset: (offset: Partial<PixelPetOffset>) => void;
}

const DEFAULT_PREFS: PixelPetPreferences = {
  schemaVersion: 1,
  enabled: false,
  selectedId: "pixel_dog",
  surfaceId: "app-shell",
  edge: "bottom",
  progress: 0.5,
  offset: { x: 0, y: 0 },
};

export const usePixelPetStore = create<PixelPetStore>((set) => ({
  hydrated: false,
  prefs: DEFAULT_PREFS,

  hydrate: (prefs) =>
    set(() => ({
      hydrated: true,
      prefs: { ...DEFAULT_PREFS, ...prefs, offset: { ...DEFAULT_PREFS.offset, ...(prefs.offset ?? {}) } },
    })),

  setEnabled: (enabled) =>
    set((s) => ({
      prefs: { ...s.prefs, enabled },
    })),

  setSelectedId: (selectedId) =>
    set((s) => ({
      prefs: { ...s.prefs, selectedId },
    })),

  setPlacement: ({ surfaceId, edge, progress }) =>
    set((s) => ({
      prefs: { ...s.prefs, surfaceId, edge, progress },
    })),

  setOffset: (offset) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        offset: {
          ...s.prefs.offset,
          ...offset,
        },
      },
    })),
}));
