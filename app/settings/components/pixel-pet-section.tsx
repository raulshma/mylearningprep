"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PawPrint, Crown, Loader2, Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { PixelPetModelDiagnostics } from "@/components/pixel-pet/pixel-pet-model-diagnostics";

interface PixelPetSectionProps {
  plan: "FREE" | "PRO" | "MAX";
  pixelPet?: PixelPetPreferences;
}

export function PixelPetSection({ plan, pixelPet }: PixelPetSectionProps) {
  const isProPlus = plan === "PRO" || plan === "MAX";

  const hydrate = usePixelPetStore((s) => s.hydrate);
  const enabled = usePixelPetStore((s) => s.prefs.enabled);
  const selectedId = usePixelPetStore((s) => s.prefs.selectedId);
  const setEnabled = usePixelPetStore((s) => s.setEnabled);
  const setSelectedId = usePixelPetStore((s) => s.setSelectedId);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate the shared store from server-provided prefs
  // (store persists across sidebar navigation)
  useEffect(() => {
    if (pixelPet) hydrate(pixelPet);
  }, [pixelPet, hydrate]);

  const selected = useMemo(
    () => PIXEL_PET_REGISTRY.find((p) => p.id === selectedId),
    [selectedId]
  );

  const handleSave = async (next: Partial<{ enabled: boolean; selectedId: PixelPetId }>) => {
    if (!isProPlus) return;

    setIsSaving(true);
    setSaved(false);

    try {
      const result = await updatePixelPetPreferences({
        enabled: next.enabled ?? enabled,
        selectedId: next.selectedId ?? selectedId,
      });

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error(result.error.message ?? "Failed to save pixel pet settings");
      }
    } catch (error) {
      console.error("Failed to save pixel pet preferences:", error);
      toast.error("Failed to save pixel pet settings");
    } finally {
      setIsSaving(false);
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
            Choose a 3D pixel companion that walks along your app&apos;s edges.
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
                Tip: you can pick it up and drag it; it snaps to edges.
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
              <p className="text-xs text-muted-foreground">
                Model: <span className="font-mono">{selected.fileName}</span>
              </p>
            )}

            {selected && (
              <PixelPetModelDiagnostics
                fileName={selected.fileName}
                modelScale={selected.modelScale}
              />
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={() => handleSave({})}
              disabled={isSaving}
              className="w-full h-11 rounded-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
