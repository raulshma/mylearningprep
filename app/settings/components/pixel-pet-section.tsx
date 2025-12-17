"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PawPrint, Crown, Loader2, Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { PixelPetPreferences, PixelPetId } from "@/lib/db/schemas/user";
import { PIXEL_PET_REGISTRY } from "@/lib/pixel-pet/registry";
import { updatePixelPetPreferences } from "@/lib/actions/user";
import { usePixelPetStore } from "@/hooks/use-pixel-pet";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const PixelPetCalibration = dynamic(
  () => import("@/components/pixel-pet/pixel-pet-calibration").then((mod) => mod.PixelPetCalibration),
  { ssr: false }
);

interface PixelPetSectionProps {
  plan: "FREE" | "PRO" | "MAX";
  pixelPet?: PixelPetPreferences;
}

export function PixelPetSection({ plan, pixelPet }: PixelPetSectionProps) {
  const isProPlus = plan === "PRO" || plan === "MAX";

  const hydrate = usePixelPetStore((s) => s.hydrate);
  const enabled = usePixelPetStore((s) => s.prefs.enabled);
  const selectedId = usePixelPetStore((s) => s.prefs.selectedId);
  const size = usePixelPetStore((s) => s.prefs.size);
  const setEnabled = usePixelPetStore((s) => s.setEnabled);
  const setSelectedId = usePixelPetStore((s) => s.setSelectedId);
  const setSize = usePixelPetStore((s) => s.setSize);
  const idleAnimation = usePixelPetStore((s) => s.prefs.idleAnimation);
  const walkAnimation = usePixelPetStore((s) => s.prefs.walkAnimation);
  const defaultOrientation = usePixelPetStore((s) => s.prefs.defaultOrientation);
  const availableAnimations = usePixelPetStore((s) => s.availableAnimations);
  const setIdleAnimation = usePixelPetStore((s) => s.setIdleAnimation);
  const setWalkAnimation = usePixelPetStore((s) => s.setWalkAnimation);
  const setDefaultOrientation = usePixelPetStore((s) => s.setDefaultOrientation);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate the shared store from server-provided prefs
  useEffect(() => {
    if (pixelPet) hydrate(pixelPet);
  }, [pixelPet, hydrate]);

  // Use store size directly, with fallback
  const localSize = size ?? 1;

  const selected = useMemo(
    () => PIXEL_PET_REGISTRY.find((p) => p.id === selectedId),
    [selectedId]
  );

  const handleSizeChange = (value: number[]) => {
    const newSize = value[0];
    setSize(newSize); // Update store immediately for live preview
  };

  const handleSizeCommit = async (value: number[]) => {
    const newSize = value[0];
    try {
      const result = await updatePixelPetPreferences({ size: newSize });
      if (!result.success) {
        toast.error(result.error.message ?? "Failed to save pet size");
        setSize(size ?? 1);
      }
    } catch (error) {
      console.error("Failed to save pet size:", error);
      toast.error("Failed to save pet size");
      setSize(size ?? 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
          <PawPrint className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">Pixel Pets</h2>
          <p className="text-sm text-muted-foreground">
            Choose a 3D pixel companion that roams around your screen.
          </p>
        </div>
        {isProPlus && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">PRO+</span>
          </div>
        )}
      </div>

      {!isProPlus ? (
        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">PRO Plan Feature</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pixel pets are available on PRO and MAX plans.
              </p>
              <Link href="/settings/upgrade">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  Upgrade to PRO
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable pixel pet</Label>
              <p className="text-xs text-muted-foreground">
                Your pet will walk around the screen and take rests. Pick it up to move it!
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={async (checked) => {
                const prev = enabled;
                setEnabled(checked);
                try {
                  const result = await updatePixelPetPreferences({ enabled: checked });
                  if (!result.success) {
                    setEnabled(prev);
                    toast.error(result.error.message ?? "Failed to save pixel pet settings");
                    return;
                  }
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                } catch (error) {
                  console.error("Failed to save pixel pet preferences:", error);
                  setEnabled(prev);
                  toast.error("Failed to save pixel pet settings");
                }
              }}
              aria-label="Enable pixel pet"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Choose your companion</Label>
            <Select
              value={selectedId}
              onValueChange={async (value) => {
                const v = value as PixelPetId;
                const prev = selectedId;
                setSelectedId(v);
                try {
                  const result = await updatePixelPetPreferences({ selectedId: v });
                  if (!result.success) {
                    setSelectedId(prev);
                    toast.error(result.error.message ?? "Failed to save pixel pet settings");
                    return;
                  }
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                } catch (error) {
                  console.error("Failed to save pixel pet preferences:", error);
                  setSelectedId(prev);
                  toast.error("Failed to save pixel pet settings");
                }
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select a pixel pet" />
              </SelectTrigger>
              <SelectContent>
                {PIXEL_PET_REGISTRY.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Model by{" "}
                  <a 
                    href={selected.attribution.authorUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {selected.attribution.author}
                  </a>
                  {" "}({" "}
                  <a 
                    href={selected.attribution.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Sketchfab
                  </a>
                  {" "})
                </p>
                <p>
                  License:{" "}
                  <a 
                    href={selected.attribution.licenseUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {selected.attribution.license}
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Animation Settings */}
          {selected?.hasAnimations && availableAnimations.length > 0 && (
            <div className="space-y-4">
              {/* Idle Animation */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Idle Animation</Label>
                <Select
                  value={idleAnimation ?? "__random__"}
                  onValueChange={async (value) => {
                    const animVal = value === "__random__" ? undefined : value;
                    const prev = idleAnimation;
                    setIdleAnimation(animVal);
                    try {
                      const result = await updatePixelPetPreferences({ idleAnimation: animVal });
                      if (!result.success) {
                        setIdleAnimation(prev);
                        toast.error(result.error.message ?? "Failed to save animation");
                      }
                    } catch (error) {
                      console.error("Failed to save animation:", error);
                      setIdleAnimation(prev);
                      toast.error("Failed to save animation");
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Random" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__random__">Random</SelectItem>
                    {availableAnimations.map((anim) => (
                      <SelectItem key={anim} value={anim}>
                        {anim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Animation when your pet is resting.
                </p>
              </div>

              {/* Walk Animation */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Walk Animation</Label>
                <Select
                  value={walkAnimation ?? "__random__"}
                  onValueChange={async (value) => {
                    const animVal = value === "__random__" ? undefined : value;
                    const prev = walkAnimation;
                    setWalkAnimation(animVal);
                    try {
                      const result = await updatePixelPetPreferences({ walkAnimation: animVal });
                      if (!result.success) {
                        setWalkAnimation(prev);
                        toast.error(result.error.message ?? "Failed to save animation");
                      }
                    } catch (error) {
                      console.error("Failed to save animation:", error);
                      setWalkAnimation(prev);
                      toast.error("Failed to save animation");
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Random" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__random__">Random</SelectItem>
                    {availableAnimations.map((anim) => (
                      <SelectItem key={anim} value={anim}>
                        {anim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Animation when your pet is walking around.
                </p>
              </div>
            </div>
          )}

          {/* Model Calibration - Visual front direction selection */}
          {selected && (
            <PixelPetCalibration
              fileName={selected.fileName}
              modelScale={selected.modelScale}
              hasAnimations={selected.hasAnimations}
              currentOrientation={defaultOrientation ?? 0}
              onOrientationChange={setDefaultOrientation}
              onOrientationConfirm={async (degrees) => {
                try {
                  const result = await updatePixelPetPreferences({ defaultOrientation: degrees });
                  if (!result.success) {
                    toast.error(result.error.message ?? "Failed to save front direction");
                    throw new Error(result.error.message);
                  }
                  toast.success("Front direction saved!");
                } catch (error) {
                  console.error("Failed to save front direction:", error);
                  throw error;
                }
              }}
            />
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Pet size</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={Math.round(localSize * 100)}
                  onChange={(e) => {
                    const percent = parseInt(e.target.value, 10);
                    if (!isNaN(percent)) {
                      const clamped = Math.max(30, Math.min(300, percent));
                      setSize(clamped / 100);
                    }
                  }}
                  onBlur={async () => {
                    try {
                      const result = await updatePixelPetPreferences({ size: localSize });
                      if (!result.success) {
                        toast.error(result.error.message ?? "Failed to save pet size");
                      }
                    } catch (error) {
                      console.error("Failed to save pet size:", error);
                      toast.error("Failed to save pet size");
                    }
                  }}
                  className="w-20 h-8 text-center text-sm font-mono"
                  min={30}
                  max={300}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <Slider
              value={[localSize]}
              onValueChange={handleSizeChange}
              onValueCommit={handleSizeCommit}
              min={0.3}
              max={3}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Adjust how big your pet appears on screen (30% - 300%).
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-sm text-green-500">
                <Check className="w-4 h-4" />
                <span>Saved</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
