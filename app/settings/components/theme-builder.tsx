"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useReducer, useEffect } from "react";
import {
  RotateCcw,
  Download,
  Upload,
  Copy,
  Check,
  Sparkles,
  Sun,
  Moon,
  Undo2,
  Redo2,
  Save,
  Trash2,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Link2Off,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { useToast } from "@/hooks/use-toast";
import { generateThemeWithAI, type AIThemeConfig } from "@/lib/actions/theme-actions";

// ============================================================================
// Types
// ============================================================================

interface ThemeColors {
  // Base colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  // Brand colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  // UI colors
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  // Form colors
  border: string;
  input: string;
  ring: string;
  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // Sidebar colors
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

interface ShadowConfig {
  x: string;
  y: string;
  blur: string;
  spread: string;
  opacity: string;
  color: string;
}

interface ThemeConfig {
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
  radius: number;
  shadow: ShadowConfig;
}

interface SavedTheme {
  id: string;
  name: string;
  config: ThemeConfig;
  createdAt: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

type HistoryAction =
  | { type: "SET_CONFIG"; config: ThemeConfig }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR" };

interface HistoryState {
  past: ThemeConfig[];
  present: ThemeConfig;
  future: ThemeConfig[];
}


// ============================================================================
// Color Utilities
// ============================================================================

function hexToHSL(hex: string): HSL {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getLuminance(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  const [r, g, b] = [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getWCAGLevel(ratio: number): { level: string; color: string; icon: "pass" | "warn" | "fail" } {
  if (ratio >= 7) return { level: "AAA", color: "text-green-500", icon: "pass" };
  if (ratio >= 4.5) return { level: "AA", color: "text-green-500", icon: "pass" };
  if (ratio >= 3) return { level: "AA Large", color: "text-yellow-500", icon: "warn" };
  return { level: "Fail", color: "text-red-500", icon: "fail" };
}

// Color harmony functions
function getComplementary(hex: string): string {
  const hsl = hexToHSL(hex);
  return hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
}

function getAnalogous(hex: string): [string, string] {
  const hsl = hexToHSL(hex);
  return [
    hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 330) % 360, hsl.s, hsl.l),
  ];
}

function getTriadic(hex: string): [string, string] {
  const hsl = hexToHSL(hex);
  return [
    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ];
}

function getSplitComplementary(hex: string): [string, string] {
  const hsl = hexToHSL(hex);
  return [
    hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
  ];
}

function lighten(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  return hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + amount));
}

function darken(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - amount));
}

function generateDarkFromLight(light: ThemeColors): ThemeColors {
  return {
    background: darken(light.background, 90),
    foreground: lighten(light.foreground, 85),
    card: darken(light.card, 88),
    cardForeground: lighten(light.cardForeground, 85),
    popover: darken(light.popover, 88),
    popoverForeground: lighten(light.popoverForeground, 85),
    primary: light.primary,
    primaryForeground: getLuminance(light.primary) > 0.5 ? darken(light.primary, 70) : lighten(light.primary, 70),
    secondary: darken(light.secondary, 70),
    secondaryForeground: lighten(light.secondaryForeground, 85),
    muted: darken(light.muted, 70),
    mutedForeground: lighten(light.mutedForeground, 30),
    accent: darken(light.accent, 70),
    accentForeground: lighten(light.accentForeground, 85),
    destructive: light.destructive,
    destructiveForeground: light.destructiveForeground,
    border: darken(light.border, 70),
    input: darken(light.input, 70),
    ring: light.ring,
    chart1: light.chart1,
    chart2: light.chart2,
    chart3: light.chart3,
    chart4: light.chart4,
    chart5: light.chart5,
    sidebar: darken(light.sidebar, 85),
    sidebarForeground: lighten(light.sidebarForeground, 85),
    sidebarPrimary: light.sidebarPrimary,
    sidebarPrimaryForeground: getLuminance(light.sidebarPrimary) > 0.5 ? darken(light.sidebarPrimary, 70) : lighten(light.sidebarPrimary, 70),
    sidebarAccent: darken(light.sidebarAccent, 70),
    sidebarAccentForeground: lighten(light.sidebarAccentForeground, 85),
    sidebarBorder: darken(light.sidebarBorder, 70),
    sidebarRing: light.sidebarRing,
  };
}

function generateLightFromDark(dark: ThemeColors): ThemeColors {
  return {
    background: lighten(dark.background, 90),
    foreground: darken(dark.foreground, 85),
    card: lighten(dark.card, 88),
    cardForeground: darken(dark.cardForeground, 85),
    popover: lighten(dark.popover, 88),
    popoverForeground: darken(dark.popoverForeground, 85),
    primary: dark.primary,
    primaryForeground: getLuminance(dark.primary) > 0.5 ? darken(dark.primary, 70) : lighten(dark.primary, 70),
    secondary: lighten(dark.secondary, 70),
    secondaryForeground: darken(dark.secondaryForeground, 85),
    muted: lighten(dark.muted, 70),
    mutedForeground: darken(dark.mutedForeground, 30),
    accent: lighten(dark.accent, 70),
    accentForeground: darken(dark.accentForeground, 85),
    destructive: dark.destructive,
    destructiveForeground: dark.destructiveForeground,
    border: lighten(dark.border, 70),
    input: lighten(dark.input, 70),
    ring: dark.ring,
    chart1: dark.chart1,
    chart2: dark.chart2,
    chart3: dark.chart3,
    chart4: dark.chart4,
    chart5: dark.chart5,
    sidebar: lighten(dark.sidebar, 85),
    sidebarForeground: darken(dark.sidebarForeground, 85),
    sidebarPrimary: dark.sidebarPrimary,
    sidebarPrimaryForeground: getLuminance(dark.sidebarPrimary) > 0.5 ? darken(dark.sidebarPrimary, 70) : lighten(dark.sidebarPrimary, 70),
    sidebarAccent: lighten(dark.sidebarAccent, 70),
    sidebarAccentForeground: darken(dark.sidebarAccentForeground, 85),
    sidebarBorder: lighten(dark.sidebarBorder, 70),
    sidebarRing: dark.sidebarRing,
  };
}


// ============================================================================
// Default Colors & Presets
// ============================================================================

const DEFAULT_LIGHT: ThemeColors = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  cardForeground: "#0a0a0a",
  popover: "#ffffff",
  popoverForeground: "#0a0a0a",
  primary: "#171717",
  primaryForeground: "#fafafa",
  secondary: "#f5f5f5",
  secondaryForeground: "#171717",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  accent: "#f5f5f5",
  accentForeground: "#171717",
  destructive: "#ef4444",
  destructiveForeground: "#fafafa",
  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#171717",
  chart1: "#171717",
  chart2: "#27272a",
  chart3: "#52525b",
  chart4: "#71717a",
  chart5: "#a1a1aa",
  sidebar: "#fbfbfb",
  sidebarForeground: "#0a0a0a",
  sidebarPrimary: "#171717",
  sidebarPrimaryForeground: "#fafafa",
  sidebarAccent: "#f5f5f5",
  sidebarAccentForeground: "#171717",
  sidebarBorder: "#e5e5e5",
  sidebarRing: "#171717",
};

const DEFAULT_DARK: ThemeColors = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  card: "#0a0a0a",
  cardForeground: "#fafafa",
  popover: "#0a0a0a",
  popoverForeground: "#fafafa",
  primary: "#fafafa",
  primaryForeground: "#171717",
  secondary: "#262626",
  secondaryForeground: "#fafafa",
  muted: "#262626",
  mutedForeground: "#a3a3a3",
  accent: "#262626",
  accentForeground: "#fafafa",
  destructive: "#ef4444",
  destructiveForeground: "#fafafa",
  border: "#262626",
  input: "#262626",
  ring: "#d4d4d4",
  chart1: "#737373",
  chart2: "#737373",
  chart3: "#737373",
  chart4: "#737373",
  chart5: "#737373",
  sidebar: "#171717",
  sidebarForeground: "#fafafa",
  sidebarPrimary: "#fafafa",
  sidebarPrimaryForeground: "#171717",
  sidebarAccent: "#262626",
  sidebarAccentForeground: "#fafafa",
  sidebarBorder: "#262626",
  sidebarRing: "#525252",
};

const DEFAULT_SHADOW: ShadowConfig = {
  x: "0px",
  y: "1px",
  blur: "2px",
  spread: "0px",
  opacity: "0.05",
  color: "#000000",
};

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  background: "Background",
  foreground: "Foreground",
  card: "Card",
  cardForeground: "Card Text",
  popover: "Popover",
  popoverForeground: "Popover Text",
  primary: "Primary",
  primaryForeground: "Primary Text",
  secondary: "Secondary",
  secondaryForeground: "Secondary Text",
  muted: "Muted",
  mutedForeground: "Muted Text",
  accent: "Accent",
  accentForeground: "Accent Text",
  destructive: "Destructive",
  destructiveForeground: "Destructive Text",
  border: "Border",
  input: "Input",
  ring: "Ring",
  chart1: "Chart 1",
  chart2: "Chart 2",
  chart3: "Chart 3",
  chart4: "Chart 4",
  chart5: "Chart 5",
  sidebar: "Sidebar",
  sidebarForeground: "Sidebar Text",
  sidebarPrimary: "Sidebar Primary",
  sidebarPrimaryForeground: "Sidebar Primary Text",
  sidebarAccent: "Sidebar Accent",
  sidebarAccentForeground: "Sidebar Accent Text",
  sidebarBorder: "Sidebar Border",
  sidebarRing: "Sidebar Ring",
};

// Helper to create complete theme colors from partial overrides
function createThemeColors(base: ThemeColors, overrides: Partial<ThemeColors>): ThemeColors {
  return { ...base, ...overrides };
}

// Extended preset themes including popular community themes
const PRESET_THEMES: ThemeConfig[] = [
  {
    name: "Zinc",
    radius: 0.5,
    light: DEFAULT_LIGHT,
    dark: DEFAULT_DARK,
    shadow: DEFAULT_SHADOW,
  },
  {
    name: "Rose",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, { primary: "#e11d48", primaryForeground: "#fff1f2", ring: "#e11d48", chart1: "#e11d48", sidebarPrimary: "#e11d48" }),
    dark: createThemeColors(DEFAULT_DARK, { primary: "#e11d48", primaryForeground: "#fff1f2", ring: "#e11d48", chart1: "#e11d48", sidebarPrimary: "#e11d48" }),
    shadow: DEFAULT_SHADOW,
  },
  {
    name: "Blue",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, { primary: "#2563eb", primaryForeground: "#eff6ff", ring: "#2563eb", chart1: "#2563eb", sidebarPrimary: "#2563eb" }),
    dark: createThemeColors(DEFAULT_DARK, { primary: "#3b82f6", primaryForeground: "#eff6ff", ring: "#3b82f6", chart1: "#3b82f6", sidebarPrimary: "#3b82f6" }),
    shadow: DEFAULT_SHADOW,
  },
  {
    name: "Green",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, { primary: "#16a34a", primaryForeground: "#f0fdf4", ring: "#16a34a", chart1: "#16a34a", sidebarPrimary: "#16a34a" }),
    dark: createThemeColors(DEFAULT_DARK, { primary: "#22c55e", primaryForeground: "#f0fdf4", ring: "#22c55e", chart1: "#22c55e", sidebarPrimary: "#22c55e" }),
    shadow: DEFAULT_SHADOW,
  },
  {
    name: "Orange",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, { primary: "#ea580c", primaryForeground: "#fff7ed", ring: "#ea580c", chart1: "#ea580c", sidebarPrimary: "#ea580c" }),
    dark: createThemeColors(DEFAULT_DARK, { primary: "#f97316", primaryForeground: "#fff7ed", ring: "#f97316", chart1: "#f97316", sidebarPrimary: "#f97316" }),
    shadow: DEFAULT_SHADOW,
  },
  {
    name: "Violet",
    radius: 0.75,
    light: createThemeColors(DEFAULT_LIGHT, { primary: "#7c3aed", primaryForeground: "#f5f3ff", ring: "#7c3aed", chart1: "#7c3aed", sidebarPrimary: "#7c3aed" }),
    dark: createThemeColors(DEFAULT_DARK, { primary: "#8b5cf6", primaryForeground: "#f5f3ff", ring: "#8b5cf6", chart1: "#8b5cf6", sidebarPrimary: "#8b5cf6" }),
    shadow: DEFAULT_SHADOW,
  },
  // Catppuccin Mocha
  {
    name: "Catppuccin",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, {
      background: "#eff1f5", foreground: "#4c4f69", card: "#e6e9ef", cardForeground: "#4c4f69",
      popover: "#e6e9ef", popoverForeground: "#4c4f69", primary: "#8839ef", primaryForeground: "#eff1f5",
      secondary: "#ccd0da", secondaryForeground: "#4c4f69", muted: "#ccd0da", mutedForeground: "#6c6f85",
      accent: "#ea76cb", accentForeground: "#eff1f5", destructive: "#d20f39", destructiveForeground: "#eff1f5",
      border: "#bcc0cc", input: "#bcc0cc", ring: "#8839ef",
      chart1: "#8839ef", chart2: "#ea76cb", chart3: "#40a02b", chart4: "#df8e1d", chart5: "#d20f39",
      sidebar: "#e6e9ef", sidebarForeground: "#4c4f69", sidebarPrimary: "#8839ef", sidebarPrimaryForeground: "#eff1f5",
      sidebarAccent: "#ccd0da", sidebarAccentForeground: "#4c4f69", sidebarBorder: "#bcc0cc", sidebarRing: "#8839ef",
    }),
    dark: createThemeColors(DEFAULT_DARK, {
      background: "#1e1e2e", foreground: "#cdd6f4", card: "#181825", cardForeground: "#cdd6f4",
      popover: "#181825", popoverForeground: "#cdd6f4", primary: "#cba6f7", primaryForeground: "#1e1e2e",
      secondary: "#313244", secondaryForeground: "#cdd6f4", muted: "#313244", mutedForeground: "#a6adc8",
      accent: "#f5c2e7", accentForeground: "#1e1e2e", destructive: "#f38ba8", destructiveForeground: "#1e1e2e",
      border: "#45475a", input: "#45475a", ring: "#cba6f7",
      chart1: "#cba6f7", chart2: "#f5c2e7", chart3: "#a6e3a1", chart4: "#f9e2af", chart5: "#f38ba8",
      sidebar: "#181825", sidebarForeground: "#cdd6f4", sidebarPrimary: "#cba6f7", sidebarPrimaryForeground: "#1e1e2e",
      sidebarAccent: "#313244", sidebarAccentForeground: "#cdd6f4", sidebarBorder: "#45475a", sidebarRing: "#cba6f7",
    }),
    shadow: DEFAULT_SHADOW,
  },
  // Dracula
  {
    name: "Dracula",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, {
      background: "#f8f8f2", foreground: "#282a36", card: "#ffffff", cardForeground: "#282a36",
      popover: "#ffffff", popoverForeground: "#282a36", primary: "#bd93f9", primaryForeground: "#282a36",
      secondary: "#e6e6e6", secondaryForeground: "#282a36", muted: "#e6e6e6", mutedForeground: "#6272a4",
      accent: "#ff79c6", accentForeground: "#282a36", destructive: "#ff5555", destructiveForeground: "#f8f8f2",
      border: "#d6d6d6", input: "#d6d6d6", ring: "#bd93f9",
      chart1: "#bd93f9", chart2: "#ff79c6", chart3: "#50fa7b", chart4: "#f1fa8c", chart5: "#ff5555",
    }),
    dark: createThemeColors(DEFAULT_DARK, {
      background: "#282a36", foreground: "#f8f8f2", card: "#21222c", cardForeground: "#f8f8f2",
      popover: "#21222c", popoverForeground: "#f8f8f2", primary: "#bd93f9", primaryForeground: "#282a36",
      secondary: "#44475a", secondaryForeground: "#f8f8f2", muted: "#44475a", mutedForeground: "#6272a4",
      accent: "#ff79c6", accentForeground: "#282a36", destructive: "#ff5555", destructiveForeground: "#f8f8f2",
      border: "#44475a", input: "#44475a", ring: "#bd93f9",
      chart1: "#bd93f9", chart2: "#ff79c6", chart3: "#50fa7b", chart4: "#f1fa8c", chart5: "#ff5555",
      sidebar: "#21222c", sidebarForeground: "#f8f8f2", sidebarPrimary: "#bd93f9", sidebarPrimaryForeground: "#282a36",
      sidebarAccent: "#44475a", sidebarAccentForeground: "#f8f8f2", sidebarBorder: "#44475a", sidebarRing: "#bd93f9",
    }),
    shadow: DEFAULT_SHADOW,
  },
  // Nord
  {
    name: "Nord",
    radius: 0.375,
    light: createThemeColors(DEFAULT_LIGHT, {
      background: "#eceff4", foreground: "#2e3440", card: "#e5e9f0", cardForeground: "#2e3440",
      popover: "#e5e9f0", popoverForeground: "#2e3440", primary: "#5e81ac", primaryForeground: "#eceff4",
      secondary: "#d8dee9", secondaryForeground: "#2e3440", muted: "#d8dee9", mutedForeground: "#4c566a",
      accent: "#88c0d0", accentForeground: "#2e3440", destructive: "#bf616a", destructiveForeground: "#eceff4",
      border: "#d8dee9", input: "#d8dee9", ring: "#5e81ac",
      chart1: "#5e81ac", chart2: "#88c0d0", chart3: "#a3be8c", chart4: "#ebcb8b", chart5: "#bf616a",
    }),
    dark: createThemeColors(DEFAULT_DARK, {
      background: "#2e3440", foreground: "#eceff4", card: "#3b4252", cardForeground: "#eceff4",
      popover: "#3b4252", popoverForeground: "#eceff4", primary: "#88c0d0", primaryForeground: "#2e3440",
      secondary: "#434c5e", secondaryForeground: "#eceff4", muted: "#434c5e", mutedForeground: "#d8dee9",
      accent: "#81a1c1", accentForeground: "#2e3440", destructive: "#bf616a", destructiveForeground: "#eceff4",
      border: "#4c566a", input: "#4c566a", ring: "#88c0d0",
      chart1: "#88c0d0", chart2: "#81a1c1", chart3: "#a3be8c", chart4: "#ebcb8b", chart5: "#bf616a",
      sidebar: "#3b4252", sidebarForeground: "#eceff4", sidebarPrimary: "#88c0d0", sidebarPrimaryForeground: "#2e3440",
      sidebarAccent: "#434c5e", sidebarAccentForeground: "#eceff4", sidebarBorder: "#4c566a", sidebarRing: "#88c0d0",
    }),
    shadow: DEFAULT_SHADOW,
  },
  // Solarized
  {
    name: "Solarized",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, {
      background: "#fdf6e3", foreground: "#657b83", card: "#eee8d5", cardForeground: "#657b83",
      popover: "#eee8d5", popoverForeground: "#657b83", primary: "#268bd2", primaryForeground: "#fdf6e3",
      secondary: "#eee8d5", secondaryForeground: "#657b83", muted: "#eee8d5", mutedForeground: "#93a1a1",
      accent: "#2aa198", accentForeground: "#fdf6e3", destructive: "#dc322f", destructiveForeground: "#fdf6e3",
      border: "#93a1a1", input: "#93a1a1", ring: "#268bd2",
      chart1: "#268bd2", chart2: "#2aa198", chart3: "#859900", chart4: "#b58900", chart5: "#dc322f",
    }),
    dark: createThemeColors(DEFAULT_DARK, {
      background: "#002b36", foreground: "#839496", card: "#073642", cardForeground: "#839496",
      popover: "#073642", popoverForeground: "#839496", primary: "#268bd2", primaryForeground: "#002b36",
      secondary: "#073642", secondaryForeground: "#839496", muted: "#073642", mutedForeground: "#586e75",
      accent: "#2aa198", accentForeground: "#002b36", destructive: "#dc322f", destructiveForeground: "#fdf6e3",
      border: "#586e75", input: "#586e75", ring: "#268bd2",
      chart1: "#268bd2", chart2: "#2aa198", chart3: "#859900", chart4: "#b58900", chart5: "#dc322f",
      sidebar: "#073642", sidebarForeground: "#839496", sidebarPrimary: "#268bd2", sidebarPrimaryForeground: "#002b36",
      sidebarAccent: "#073642", sidebarAccentForeground: "#839496", sidebarBorder: "#586e75", sidebarRing: "#268bd2",
    }),
    shadow: DEFAULT_SHADOW,
  },
  // GitHub
  {
    name: "GitHub",
    radius: 0.375,
    light: createThemeColors(DEFAULT_LIGHT, {
      background: "#ffffff", foreground: "#24292f", card: "#f6f8fa", cardForeground: "#24292f",
      popover: "#ffffff", popoverForeground: "#24292f", primary: "#0969da", primaryForeground: "#ffffff",
      secondary: "#f6f8fa", secondaryForeground: "#24292f", muted: "#f6f8fa", mutedForeground: "#57606a",
      accent: "#ddf4ff", accentForeground: "#0969da", destructive: "#cf222e", destructiveForeground: "#ffffff",
      border: "#d0d7de", input: "#d0d7de", ring: "#0969da",
      chart1: "#0969da", chart2: "#1a7f37", chart3: "#8250df", chart4: "#bf8700", chart5: "#cf222e",
    }),
    dark: createThemeColors(DEFAULT_DARK, {
      background: "#0d1117", foreground: "#c9d1d9", card: "#161b22", cardForeground: "#c9d1d9",
      popover: "#161b22", popoverForeground: "#c9d1d9", primary: "#58a6ff", primaryForeground: "#0d1117",
      secondary: "#21262d", secondaryForeground: "#c9d1d9", muted: "#21262d", mutedForeground: "#8b949e",
      accent: "#388bfd", accentForeground: "#0d1117", destructive: "#f85149", destructiveForeground: "#0d1117",
      border: "#30363d", input: "#30363d", ring: "#58a6ff",
      chart1: "#58a6ff", chart2: "#3fb950", chart3: "#a371f7", chart4: "#d29922", chart5: "#f85149",
      sidebar: "#161b22", sidebarForeground: "#c9d1d9", sidebarPrimary: "#58a6ff", sidebarPrimaryForeground: "#0d1117",
      sidebarAccent: "#21262d", sidebarAccentForeground: "#c9d1d9", sidebarBorder: "#30363d", sidebarRing: "#58a6ff",
    }),
    shadow: DEFAULT_SHADOW,
  },
  // One Dark
  {
    name: "One Dark",
    radius: 0.5,
    light: createThemeColors(DEFAULT_LIGHT, {
      background: "#fafafa", foreground: "#383a42", card: "#ffffff", cardForeground: "#383a42",
      popover: "#ffffff", popoverForeground: "#383a42", primary: "#4078f2", primaryForeground: "#fafafa",
      secondary: "#e5e5e6", secondaryForeground: "#383a42", muted: "#e5e5e6", mutedForeground: "#a0a1a7",
      accent: "#a626a4", accentForeground: "#fafafa", destructive: "#e45649", destructiveForeground: "#fafafa",
      border: "#d4d4d5", input: "#d4d4d5", ring: "#4078f2",
      chart1: "#4078f2", chart2: "#a626a4", chart3: "#50a14f", chart4: "#c18401", chart5: "#e45649",
    }),
    dark: createThemeColors(DEFAULT_DARK, {
      background: "#282c34", foreground: "#abb2bf", card: "#21252b", cardForeground: "#abb2bf",
      popover: "#21252b", popoverForeground: "#abb2bf", primary: "#61afef", primaryForeground: "#282c34",
      secondary: "#3e4451", secondaryForeground: "#abb2bf", muted: "#3e4451", mutedForeground: "#5c6370",
      accent: "#c678dd", accentForeground: "#282c34", destructive: "#e06c75", destructiveForeground: "#282c34",
      border: "#3e4451", input: "#3e4451", ring: "#61afef",
      chart1: "#61afef", chart2: "#c678dd", chart3: "#98c379", chart4: "#e5c07b", chart5: "#e06c75",
      sidebar: "#21252b", sidebarForeground: "#abb2bf", sidebarPrimary: "#61afef", sidebarPrimaryForeground: "#282c34",
      sidebarAccent: "#3e4451", sidebarAccentForeground: "#abb2bf", sidebarBorder: "#3e4451", sidebarRing: "#61afef",
    }),
    shadow: DEFAULT_SHADOW,
  },
  // Cyberpunk
  {
    name: "Cyberpunk",
    radius: 0,
    light: createThemeColors(DEFAULT_LIGHT, {
      background: "#f0f0f5", foreground: "#0d0d1a", primary: "#ff00ff", primaryForeground: "#0d0d1a",
      secondary: "#e0e0e8", secondaryForeground: "#0d0d1a", accent: "#00ffff", accentForeground: "#0d0d1a",
      destructive: "#ff0040", destructiveForeground: "#ffffff", border: "#ff00ff", ring: "#00ffff",
      chart1: "#00ffff", chart2: "#ff00ff", chart3: "#ffff00", chart4: "#00ff00", chart5: "#ff0080",
    }),
    dark: createThemeColors(DEFAULT_DARK, {
      background: "#0d0d1a", foreground: "#00ffff", card: "#1a1a2e", cardForeground: "#00ffff",
      popover: "#16162a", popoverForeground: "#00ffff", primary: "#ff00ff", primaryForeground: "#0d0d1a",
      secondary: "#1a1a2e", secondaryForeground: "#00ffff", muted: "#1a1a2e", mutedForeground: "#00b3b3",
      accent: "#ff00ff", accentForeground: "#0d0d1a", destructive: "#ff0040", destructiveForeground: "#ffffff",
      border: "#ff00ff", input: "#2a2a4e", ring: "#00ffff",
      chart1: "#00ffff", chart2: "#ff00ff", chart3: "#ffff00", chart4: "#00ff00", chart5: "#ff0080",
      sidebar: "#0a0a14", sidebarForeground: "#00ffff", sidebarPrimary: "#ff00ff", sidebarPrimaryForeground: "#0d0d1a",
      sidebarAccent: "#1a1a2e", sidebarAccentForeground: "#00ffff", sidebarBorder: "#ff00ff", sidebarRing: "#00ffff",
    }),
    shadow: { x: "0px", y: "0px", blur: "2px", spread: "0px", opacity: "0.45", color: "#ff00ff" },
  },
];


// ============================================================================
// History Reducer for Undo/Redo
// ============================================================================

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "SET_CONFIG":
      // Don't add to history if config is the same
      if (JSON.stringify(state.present) === JSON.stringify(action.config)) {
        return state;
      }
      return {
        past: [...state.past.slice(-19), state.present], // Keep last 20 states
        present: action.config,
        future: [],
      };
    case "UNDO":
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case "REDO":
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    case "CLEAR":
      return {
        past: [],
        present: state.present,
        future: [],
      };
    default:
      return state;
  }
}

// ============================================================================
// Local Storage for Saved Themes
// ============================================================================

const SAVED_THEMES_KEY = "syntaxstate-saved-themes";

function getSavedThemes(): SavedTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(SAVED_THEMES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveThemesToStorage(themes: SavedTheme[]) {
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
}

// ============================================================================
// CSS Generation
// ============================================================================

function generateCSS(config: ThemeConfig): string {
  // Map camelCase keys to CSS variable names
  const keyToCSSVar: Record<string, string> = {
    background: "background",
    foreground: "foreground",
    card: "card",
    cardForeground: "card-foreground",
    popover: "popover",
    popoverForeground: "popover-foreground",
    primary: "primary",
    primaryForeground: "primary-foreground",
    secondary: "secondary",
    secondaryForeground: "secondary-foreground",
    muted: "muted",
    mutedForeground: "muted-foreground",
    accent: "accent",
    accentForeground: "accent-foreground",
    destructive: "destructive",
    destructiveForeground: "destructive-foreground",
    border: "border",
    input: "input",
    ring: "ring",
    chart1: "chart-1",
    chart2: "chart-2",
    chart3: "chart-3",
    chart4: "chart-4",
    chart5: "chart-5",
    sidebar: "sidebar",
    sidebarForeground: "sidebar-foreground",
    sidebarPrimary: "sidebar-primary",
    sidebarPrimaryForeground: "sidebar-primary-foreground",
    sidebarAccent: "sidebar-accent",
    sidebarAccentForeground: "sidebar-accent-foreground",
    sidebarBorder: "sidebar-border",
    sidebarRing: "sidebar-ring",
  };

  const lightVars = Object.entries(config.light)
    .map(([key, value]) => `  --${keyToCSSVar[key] || key}: ${value};`)
    .join("\n");

  const darkVars = Object.entries(config.dark)
    .map(([key, value]) => `  --${keyToCSSVar[key] || key}: ${value};`)
    .join("\n");

  const shadowVars = `  --shadow-x: ${config.shadow.x};
  --shadow-y: ${config.shadow.y};
  --shadow-blur: ${config.shadow.blur};
  --shadow-spread: ${config.shadow.spread};
  --shadow-opacity: ${config.shadow.opacity};
  --shadow-color: ${config.shadow.color};`;

  // Generate CSS that overrides all theme variants
  // Using higher specificity selectors to ensure custom theme takes precedence
  return `/* Custom Theme - Light Mode */
:root {
${lightVars}
  --radius: ${config.radius}rem;
${shadowVars}
}

/* Custom Theme - Dark Mode (overrides .dark, .dark-dim, .cyberpunk) */
.dark,
.dark-dim,
.cyberpunk,
html.dark,
html.dark-dim,
html.cyberpunk {
${darkVars}
${shadowVars}
}`;
}

// ============================================================================
// Components
// ============================================================================

interface ContrastBadgeProps {
  bg: string;
  fg: string;
}

function ContrastBadge({ bg, fg }: ContrastBadgeProps) {
  const ratio = getContrastRatio(bg, fg);
  const { level, color, icon } = getWCAGLevel(ratio);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${color}`}>
            {icon === "pass" && <CheckCircle2 className="w-3 h-3" />}
            {icon === "warn" && <AlertTriangle className="w-3 h-3" />}
            {icon === "fail" && <AlertTriangle className="w-3 h-3" />}
            {level}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Contrast ratio: {ratio.toFixed(2)}:1</p>
          <p className="text-xs text-muted-foreground">
            {ratio >= 4.5 ? "Passes WCAG AA for normal text" : ratio >= 3 ? "Passes WCAG AA for large text only" : "Does not meet WCAG standards"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  contrastWith?: string;
  showHSL?: boolean;
}

function ColorPicker({ label, value, onChange, contrastWith, showHSL = false }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showHSLSliders, setShowHSLSliders] = useState(false);
  const hsl = useMemo(() => hexToHSL(value), [value]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleHSLChange = (type: "h" | "s" | "l", val: number) => {
    const newHSL = { ...hsl, [type]: val };
    const newHex = hslToHex(newHSL.h, newHSL.s, newHSL.l);
    onChange(newHex);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setInputValue(e.target.value);
            }}
            className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground truncate">{label}</Label>
            {contrastWith && <ContrastBadge bg={contrastWith} fg={value} />}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              className="h-8 text-xs font-mono flex-1"
              placeholder="#000000"
            />
            {showHSL && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowHSLSliders(!showHSLSliders)}
              >
                <Wand2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {showHSL && showHSLSliders && (
        <div className="pl-13 space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6">H</span>
            <Slider
              value={[hsl.h]}
              onValueChange={([v]) => handleHSLChange("h", v)}
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8">{hsl.h}°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6">S</span>
            <Slider
              value={[hsl.s]}
              onValueChange={([v]) => handleHSLChange("s", v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8">{hsl.s}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6">L</span>
            <Slider
              value={[hsl.l]}
              onValueChange={([v]) => handleHSLChange("l", v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8">{hsl.l}%</span>
          </div>
        </div>
      )}
    </div>
  );
}


interface ColorSwatchProps {
  color: string;
  label: string;
  onSelect: (color: string) => void;
}

function ColorSwatch({ color, label, onSelect }: ColorSwatchProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onSelect(color)}
            className="w-8 h-8 rounded-lg border border-white/10 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
          <p className="text-xs text-muted-foreground">{color}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ColorHarmonyProps {
  baseColor: string;
  onSelect: (color: string) => void;
}

function ColorHarmony({ baseColor, onSelect }: ColorHarmonyProps) {
  const complementary = getComplementary(baseColor);
  const analogous = getAnalogous(baseColor);
  const triadic = getTriadic(baseColor);
  const splitComp = getSplitComplementary(baseColor);

  return (
    <div className="space-y-3 p-3 bg-secondary/30 rounded-xl">
      <Label className="text-xs font-medium">Color Harmony</Label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-20">Complementary</span>
          <ColorSwatch color={complementary} label="Complementary" onSelect={onSelect} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-20">Analogous</span>
          <ColorSwatch color={analogous[0]} label="Analogous 1" onSelect={onSelect} />
          <ColorSwatch color={analogous[1]} label="Analogous 2" onSelect={onSelect} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-20">Triadic</span>
          <ColorSwatch color={triadic[0]} label="Triadic 1" onSelect={onSelect} />
          <ColorSwatch color={triadic[1]} label="Triadic 2" onSelect={onSelect} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-20">Split Comp.</span>
          <ColorSwatch color={splitComp[0]} label="Split Complementary 1" onSelect={onSelect} />
          <ColorSwatch color={splitComp[1]} label="Split Complementary 2" onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

interface ThemePreviewProps {
  colors: ThemeColors;
  radius: number;
}

function ThemePreview({ colors, radius }: ThemePreviewProps) {
  return (
    <div
      className="p-4 border rounded-2xl space-y-4 transition-colors"
      style={{
        backgroundColor: colors.background,
        color: colors.foreground,
        borderColor: colors.border,
        borderRadius: `${radius + 0.5}rem`,
      }}
    >
      {/* Card */}
      <div
        className="p-4 space-y-3"
        style={{
          backgroundColor: colors.card,
          borderRadius: `${radius}rem`,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: colors.cardForeground }}>
            Interview Prep
          </div>
          <div
            className="px-2 py-0.5 text-[10px] font-medium rounded-full"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Active
          </div>
        </div>
        <div className="text-xs" style={{ color: colors.mutedForeground }}>
          Senior Frontend Developer at TechCorp
        </div>
        <div className="flex gap-2">
          <div
            className="flex-1 h-1.5 rounded-full"
            style={{ backgroundColor: colors.muted }}
          >
            <div
              className="h-full rounded-full w-3/4"
              style={{ backgroundColor: colors.primary }}
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          className="px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: colors.primary,
            color: colors.primaryForeground,
            borderRadius: `${radius}rem`,
          }}
        >
          Primary
        </button>
        <button
          className="px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: colors.secondary,
            color: colors.secondaryForeground,
            borderRadius: `${radius}rem`,
          }}
        >
          Secondary
        </button>
        <button
          className="px-3 py-1.5 text-xs font-medium transition-colors border"
          style={{
            backgroundColor: "transparent",
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: `${radius}rem`,
          }}
        >
          Outline
        </button>
        <button
          className="px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: colors.destructive,
            color: colors.destructiveForeground,
            borderRadius: `${radius}rem`,
          }}
        >
          Delete
        </button>
      </div>

      {/* Muted & Accent */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="p-2 text-xs"
          style={{
            backgroundColor: colors.muted,
            color: colors.mutedForeground,
            borderRadius: `${radius}rem`,
          }}
        >
          Muted area
        </div>
        <div
          className="p-2 text-xs"
          style={{
            backgroundColor: colors.accent,
            color: colors.accentForeground,
            borderRadius: `${radius}rem`,
          }}
        >
          Accent area
        </div>
      </div>

      {/* Form Elements */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Input field..."
          className="w-full px-3 py-2 text-xs outline-none transition-colors"
          style={{
            backgroundColor: colors.background,
            color: colors.foreground,
            border: `1px solid ${colors.input}`,
            borderRadius: `${radius}rem`,
          }}
          readOnly
        />
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border flex items-center justify-center"
            style={{ borderColor: colors.primary, backgroundColor: colors.primary }}
          >
            <Check className="w-3 h-3" style={{ color: colors.primaryForeground }} />
          </div>
          <span className="text-xs" style={{ color: colors.foreground }}>Checkbox option</span>
        </div>
      </div>

      {/* Popover simulation */}
      <div
        className="p-3 text-xs shadow-lg"
        style={{
          backgroundColor: colors.popover,
          color: colors.popoverForeground,
          borderRadius: `${radius}rem`,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="font-medium mb-1">Popover Content</div>
        <div style={{ color: colors.mutedForeground }}>Additional information here</div>
      </div>

      {/* Chart Colors Preview */}
      <div className="space-y-2">
        <div className="text-xs font-medium" style={{ color: colors.foreground }}>Chart Colors</div>
        <div className="flex gap-1">
          {[colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5].map((color, i) => (
            <div
              key={i}
              className="flex-1 h-6 first:rounded-l-lg last:rounded-r-lg"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Sidebar Preview */}
      <div
        className="p-3 space-y-2"
        style={{
          backgroundColor: colors.sidebar,
          borderRadius: `${radius}rem`,
          border: `1px solid ${colors.sidebarBorder}`,
        }}
      >
        <div className="text-xs font-medium" style={{ color: colors.sidebarForeground }}>Sidebar</div>
        <div className="flex flex-col gap-1">
          <div
            className="px-2 py-1 text-[10px] rounded"
            style={{ backgroundColor: colors.sidebarPrimary, color: colors.sidebarPrimaryForeground }}
          >
            Active Item
          </div>
          <div
            className="px-2 py-1 text-[10px] rounded"
            style={{ backgroundColor: colors.sidebarAccent, color: colors.sidebarAccentForeground }}
          >
            Hover Item
          </div>
          <div
            className="px-2 py-1 text-[10px]"
            style={{ color: colors.sidebarForeground }}
          >
            Normal Item
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Main Component
// ============================================================================

const INITIAL_CONFIG: ThemeConfig = {
  name: "Custom",
  radius: 0.5,
  light: { ...DEFAULT_LIGHT },
  dark: { ...DEFAULT_DARK },
  shadow: { ...DEFAULT_SHADOW },
};

export function ThemeBuilder() {
  const { setCustomCSS, clearCustomTheme } = useCustomTheme();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark");
  const [syncModes, setSyncModes] = useState(false);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => getSavedThemes());
  const [themeName, setThemeName] = useState("My Theme");

  // AI Theme Generation State
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: INITIAL_CONFIG,
    future: [],
  });

  const config = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const setConfig = useCallback((newConfig: ThemeConfig | ((prev: ThemeConfig) => ThemeConfig)) => {
    const resolved = typeof newConfig === "function" ? newConfig(config) : newConfig;
    dispatch({ type: "SET_CONFIG", config: resolved });
  }, [config]);

  const currentColors = previewMode === "light" ? config.light : config.dark;

  const updateColor = useCallback(
    (mode: "light" | "dark", key: keyof ThemeColors, value: string) => {
      setConfig((prev) => {
        const newConfig = {
          ...prev,
          [mode]: { ...prev[mode], [key]: value },
        };

        // If sync is enabled, update the other mode too
        if (syncModes) {
          const otherMode = mode === "light" ? "dark" : "light";
          if (mode === "light") {
            newConfig[otherMode] = generateDarkFromLight(newConfig.light);
          } else {
            newConfig[otherMode] = generateLightFromDark(newConfig.dark);
          }
        }

        return newConfig;
      });
    },
    [setConfig, syncModes]
  );

  const applyTheme = useCallback(() => {
    const css = generateCSS(config);
    setCustomCSS(css);
    window.dispatchEvent(new CustomEvent("custom-theme-update"));
    toast({ title: "Theme applied", description: "Your custom theme is now active." });
  }, [config, setCustomCSS, toast]);

  const resetTheme = useCallback(() => {
    setConfig(INITIAL_CONFIG);
    dispatch({ type: "CLEAR" });
    clearCustomTheme();
    window.dispatchEvent(new CustomEvent("custom-theme-update"));
    toast({ title: "Theme reset", description: "Default theme restored." });
  }, [setConfig, clearCustomTheme, toast]);

  const applyPreset = useCallback((preset: ThemeConfig) => {
    setConfig({ ...preset, name: "Custom" });
  }, [setConfig]);

  const syncFromCurrentMode = useCallback(() => {
    setConfig((prev) => {
      if (previewMode === "light") {
        return { ...prev, dark: generateDarkFromLight(prev.light) };
      } else {
        return { ...prev, light: generateLightFromDark(prev.dark) };
      }
    });
    toast({
      title: "Synced",
      description: `${previewMode === "light" ? "Dark" : "Light"} mode generated from ${previewMode} mode.`,
    });
  }, [previewMode, setConfig, toast]);

  const exportTheme = useCallback(() => {
    const data = { ...config, name: themeName };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${themeName.toLowerCase().replace(/\s+/g, "-")}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Theme exported", description: "JSON file downloaded." });
  }, [config, themeName, toast]);

  const exportCSS = useCallback(() => {
    const css = generateCSS(config);
    const blob = new Blob([css], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${themeName.toLowerCase().replace(/\s+/g, "-")}-theme.css`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSS exported", description: "CSS file downloaded." });
  }, [config, themeName, toast]);

  const copyCSS = useCallback(async () => {
    const css = generateCSS(config);
    await navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "CSS copied to clipboard." });
  }, [config, toast]);

  const importTheme = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.css";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();

      // Try JSON first
      try {
        const parsed = JSON.parse(text);
        if (parsed.light && parsed.dark) {
          setConfig(parsed);
          if (parsed.name) setThemeName(parsed.name);
          toast({ title: "Theme imported", description: "Theme configuration loaded." });
          return;
        }
      } catch {
        // Not JSON
      }

      // Apply raw CSS
      setCustomCSS(text);
      window.dispatchEvent(new CustomEvent("custom-theme-update"));
      toast({ title: "CSS imported", description: "Custom CSS applied directly." });
    };
    input.click();
  }, [setConfig, setCustomCSS, toast]);

  const saveTheme = useCallback(() => {
    const newTheme: SavedTheme = {
      id: Date.now().toString(),
      name: themeName,
      config: { ...config, name: themeName },
      createdAt: Date.now(),
    };
    const updated = [...savedThemes, newTheme];
    setSavedThemes(updated);
    saveThemesToStorage(updated);
    toast({ title: "Theme saved", description: `"${themeName}" saved to your collection.` });
  }, [config, themeName, savedThemes, toast]);

  const loadSavedTheme = useCallback((theme: SavedTheme) => {
    setConfig(theme.config);
    setThemeName(theme.name);
    toast({ title: "Theme loaded", description: `"${theme.name}" loaded.` });
  }, [setConfig, toast]);

  const deleteSavedTheme = useCallback((id: string) => {
    const updated = savedThemes.filter((t) => t.id !== id);
    setSavedThemes(updated);
    saveThemesToStorage(updated);
    toast({ title: "Theme deleted", description: "Theme removed from your collection." });
  }, [savedThemes, toast]);

  // AI Theme Generation Handler
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;

    setAiLoading(true);
    try {
      const result = await generateThemeWithAI(aiPrompt);
      
      if (!result.success) {
        toast({
          title: "Generation failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Convert AI response to ThemeConfig format
      const aiTheme = result.data;
      const newConfig: ThemeConfig = {
        name: aiTheme.name,
        light: aiTheme.light,
        dark: aiTheme.dark,
        radius: aiTheme.radius,
        shadow: aiTheme.shadow,
      };

      // Apply the generated theme
      setConfig(newConfig);
      setThemeName(aiTheme.name);

      // Save to saved themes
      const newTheme: SavedTheme = {
        id: Date.now().toString(),
        name: aiTheme.name,
        config: newConfig,
        createdAt: Date.now(),
      };
      const updated = [...savedThemes, newTheme];
      setSavedThemes(updated);
      saveThemesToStorage(updated);

      // Close dialog and reset
      setAiDialogOpen(false);
      setAiPrompt("");

      toast({
        title: "Theme generated!",
        description: `"${aiTheme.name}" has been created and saved.`,
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, setConfig, savedThemes, toast]);

  const colorGroups = useMemo(() => {
    const keys = Object.keys(currentColors) as (keyof ThemeColors)[];
    return {
      base: keys.filter((k) =>
        ["background", "foreground", "card", "cardForeground", "popover", "popoverForeground"].includes(k)
      ),
      brand: keys.filter((k) =>
        ["primary", "primaryForeground", "secondary", "secondaryForeground"].includes(k)
      ),
      ui: keys.filter((k) =>
        ["muted", "mutedForeground", "accent", "accentForeground", "destructive", "destructiveForeground"].includes(k)
      ),
      form: keys.filter((k) => ["border", "input", "ring"].includes(k)),
      charts: keys.filter((k) =>
        ["chart1", "chart2", "chart3", "chart4", "chart5"].includes(k)
      ),
      sidebar: keys.filter((k) =>
        ["sidebar", "sidebarForeground", "sidebarPrimary", "sidebarPrimaryForeground", "sidebarAccent", "sidebarAccentForeground", "sidebarBorder", "sidebarRing"].includes(k)
      ),
    };
  }, [currentColors]);

  // Get contrast pairs for accessibility checking
  const getContrastPair = (key: keyof ThemeColors): string | undefined => {
    const pairs: Partial<Record<keyof ThemeColors, keyof ThemeColors>> = {
      foreground: "background",
      cardForeground: "card",
      popoverForeground: "popover",
      primaryForeground: "primary",
      secondaryForeground: "secondary",
      mutedForeground: "muted",
      accentForeground: "accent",
      destructiveForeground: "destructive",
      sidebarForeground: "sidebar",
      sidebarPrimaryForeground: "sidebarPrimary",
      sidebarAccentForeground: "sidebarAccent",
    };
    const bgKey = pairs[key];
    return bgKey ? currentColors[bgKey] : undefined;
  };

  return (
    <div className="space-y-6">
      {/* Theme Name & Save */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          className="w-48 h-9"
          placeholder="Theme name"
        />
        <Button variant="outline" size="sm" onClick={saveTheme} className="rounded-full">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: "UNDO" })}
                  disabled={!canUndo}
                  className="h-8 w-8 p-0"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: "REDO" })}
                  disabled={!canRedo}
                  className="h-8 w-8 p-0"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Saved Themes */}
      {savedThemes.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-3 block">Your Saved Themes</Label>
          <div className="flex flex-wrap gap-2">
            {savedThemes.map((theme) => (
              <div
                key={theme.id}
                className="group flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border border-white/10 hover:border-primary/30 transition-colors"
              >
                <button onClick={() => loadSavedTheme(theme)} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.config.dark.primary }}
                  />
                  {theme.name}
                </button>
                <button
                  onClick={() => deleteSavedTheme(theme.id)}
                  className="opacity-0 group-hover:opacity-100 ml-1 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preset Themes */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Presets</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_THEMES.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: preset.dark.primary }}
              />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* AI Theme Generation */}
      <div>
        <Label className="text-sm font-medium mb-3 block">AI Generation</Label>
        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-full gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40"
            >
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate Theme with AI
              </DialogTitle>
              <DialogDescription>
                Describe the theme you want and AI will generate a complete color palette for both light and dark modes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">Theme Description</Label>
                <Textarea
                  id="ai-prompt"
                  placeholder="e.g., Ocean blue professional theme with coral accents, warm sunset colors, minimalist dark forest theme..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={aiLoading}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Tips for better results:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Include mood or style (professional, playful, minimal)</li>
                  <li>Mention primary colors you want</li>
                  <li>Reference themes you like (cyberpunk, nature, etc.)</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAiDialogOpen(false)}
                disabled={aiLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAIGenerate}
                disabled={!aiPrompt.trim() || aiLoading}
                className="gap-2"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Theme
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mode Toggle & Sync */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Editing:</Label>
          <div className="flex rounded-full border border-white/10 p-1">
            <button
              onClick={() => setPreviewMode("light")}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1.5 transition-colors ${
                previewMode === "light" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"
              }`}
            >
              <Sun className="w-3 h-3" />
              Light
            </button>
            <button
              onClick={() => setPreviewMode("dark")}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1.5 transition-colors ${
                previewMode === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"
              }`}
            >
              <Moon className="w-3 h-3" />
              Dark
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={syncModes} onCheckedChange={setSyncModes} id="sync-modes" />
          <Label htmlFor="sync-modes" className="text-xs text-muted-foreground flex items-center gap-1">
            {syncModes ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
            Auto-sync modes
          </Label>
        </div>

        <Button variant="outline" size="sm" onClick={syncFromCurrentMode} className="rounded-full text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          Generate {previewMode === "light" ? "dark" : "light"} from {previewMode}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Color Editor */}
        <div className="space-y-4">
          <Tabs defaultValue="base" className="w-full">
            <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="base" className="text-xs">Base</TabsTrigger>
              <TabsTrigger value="brand" className="text-xs">Brand</TabsTrigger>
              <TabsTrigger value="ui" className="text-xs">UI</TabsTrigger>
              <TabsTrigger value="form" className="text-xs">Form</TabsTrigger>
              <TabsTrigger value="charts" className="text-xs">Charts</TabsTrigger>
              <TabsTrigger value="sidebar" className="text-xs">Sidebar</TabsTrigger>
            </TabsList>

            {(["base", "brand", "ui", "form", "charts", "sidebar"] as const).map((group) => (
              <TabsContent key={group} value={group} className="mt-4 space-y-3">
                {colorGroups[group].map((key) => (
                  <ColorPicker
                    key={key}
                    label={COLOR_LABELS[key]}
                    value={currentColors[key]}
                    onChange={(v) => updateColor(previewMode, key, v)}
                    contrastWith={getContrastPair(key)}
                    showHSL
                  />
                ))}
              </TabsContent>
            ))}
          </Tabs>

          {/* Color Harmony */}
          <ColorHarmony
            baseColor={currentColors.primary}
            onSelect={(color) => updateColor(previewMode, "primary", color)}
          />

          {/* Radius & Shadow Settings */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Border Radius: {config.radius}rem
              </Label>
              <Slider
                value={[config.radius]}
                onValueChange={([v]) => setConfig((prev) => ({ ...prev, radius: v }))}
                min={0}
                max={1}
                step={0.125}
                className="w-full"
              />
            </div>

            {/* Shadow Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Shadow Settings</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">X Offset</Label>
                  <Input
                    value={config.shadow.x}
                    onChange={(e) => setConfig((prev) => ({ ...prev, shadow: { ...prev.shadow, x: e.target.value } }))}
                    className="h-8 text-xs"
                    placeholder="0px"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Y Offset</Label>
                  <Input
                    value={config.shadow.y}
                    onChange={(e) => setConfig((prev) => ({ ...prev, shadow: { ...prev.shadow, y: e.target.value } }))}
                    className="h-8 text-xs"
                    placeholder="1px"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Blur</Label>
                  <Input
                    value={config.shadow.blur}
                    onChange={(e) => setConfig((prev) => ({ ...prev, shadow: { ...prev.shadow, blur: e.target.value } }))}
                    className="h-8 text-xs"
                    placeholder="2px"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Spread</Label>
                  <Input
                    value={config.shadow.spread}
                    onChange={(e) => setConfig((prev) => ({ ...prev, shadow: { ...prev.shadow, spread: e.target.value } }))}
                    className="h-8 text-xs"
                    placeholder="0px"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Opacity</Label>
                  <Input
                    value={config.shadow.opacity}
                    onChange={(e) => setConfig((prev) => ({ ...prev, shadow: { ...prev.shadow, opacity: e.target.value } }))}
                    className="h-8 text-xs"
                    placeholder="0.05"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.shadow.color}
                      onChange={(e) => setConfig((prev) => ({ ...prev, shadow: { ...prev.shadow, color: e.target.value } }))}
                      className="w-8 h-8 rounded cursor-pointer border border-white/10"
                    />
                    <Input
                      value={config.shadow.color}
                      onChange={(e) => setConfig((prev) => ({ ...prev, shadow: { ...prev.shadow, color: e.target.value } }))}
                      className="h-8 text-xs font-mono flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Preview ({previewMode} mode)</Label>
          <ThemePreview colors={currentColors} radius={config.radius} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
        <Button onClick={applyTheme} className="rounded-full">
          <Sparkles className="w-4 h-4 mr-2" />
          Apply Theme
        </Button>
        <Button variant="outline" onClick={copyCSS} className="rounded-full">
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          Copy CSS
        </Button>
        <Select onValueChange={(v) => (v === "json" ? exportTheme() : exportCSS())}>
          <SelectTrigger className="w-32 rounded-full">
            <Download className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Export" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">Export JSON</SelectItem>
            <SelectItem value="css">Export CSS</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={importTheme} className="rounded-full">
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        <Button variant="ghost" onClick={resetTheme} className="rounded-full text-muted-foreground">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
