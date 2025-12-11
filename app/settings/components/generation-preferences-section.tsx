"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  BookOpen,
  ListChecks,
  Zap,
  Loader2,
  Check,
  Crown,
} from "lucide-react";
import { updateGenerationPreferences } from "@/lib/actions/user";
import Link from "next/link";
import { GENERATION_LIMITS } from "@/lib/db/schemas/user";

interface GenerationPreferencesSectionProps {
  plan: "FREE" | "PRO" | "MAX";
  generationPreferences?: {
    topicCount: number;
    mcqCount: number;
    rapidFireCount: number;
  };
}

export function GenerationPreferencesSection({
  plan,
  generationPreferences,
}: GenerationPreferencesSectionProps) {
  const isMax = plan === "MAX";

  const [topicCount, setTopicCount] = useState(
    generationPreferences?.topicCount ?? GENERATION_LIMITS.topics.default
  );
  const [mcqCount, setMcqCount] = useState(
    generationPreferences?.mcqCount ?? GENERATION_LIMITS.mcqs.default
  );
  const [rapidFireCount, setRapidFireCount] = useState(
    generationPreferences?.rapidFireCount ?? GENERATION_LIMITS.rapidFire.default
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    topicCount !== (generationPreferences?.topicCount ?? GENERATION_LIMITS.topics.default) ||
    mcqCount !== (generationPreferences?.mcqCount ?? GENERATION_LIMITS.mcqs.default) ||
    rapidFireCount !== (generationPreferences?.rapidFireCount ?? GENERATION_LIMITS.rapidFire.default);

  const handleSave = async () => {
    if (!isMax) return;

    setIsSaving(true);
    setSaved(false);

    try {
      const result = await updateGenerationPreferences({
        topicCount,
        mcqCount,
        rapidFireCount,
      });

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save generation preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/10">
          <Settings2 className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            Generation Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Customize content generation amounts
          </p>
        </div>
        {isMax && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-500">MAX</span>
          </div>
        )}
      </div>

      {!isMax ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  MAX Plan Feature
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize the number of revision topics, MCQs, and rapid-fire
                  questions generated for each interview.
                </p>
                <Link href="/settings/upgrade">
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Upgrade to MAX
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Preview of settings (disabled) */}
          <div className="space-y-6 opacity-50 pointer-events-none">
            <PreferenceSlider
              icon={BookOpen}
              label="Revision Topics"
              value={GENERATION_LIMITS.topics.default}
              min={GENERATION_LIMITS.topics.min}
              max={GENERATION_LIMITS.topics.max}
              disabled
            />
            <PreferenceSlider
              icon={ListChecks}
              label="MCQs"
              value={GENERATION_LIMITS.mcqs.default}
              min={GENERATION_LIMITS.mcqs.min}
              max={GENERATION_LIMITS.mcqs.max}
              disabled
            />
            <PreferenceSlider
              icon={Zap}
              label="Rapid-Fire Questions"
              value={GENERATION_LIMITS.rapidFire.default}
              min={GENERATION_LIMITS.rapidFire.min}
              max={GENERATION_LIMITS.rapidFire.max}
              disabled
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <PreferenceSlider
            icon={BookOpen}
            label="Revision Topics"
            description="In-depth topics for interview preparation"
            value={topicCount}
            min={GENERATION_LIMITS.topics.min}
            max={GENERATION_LIMITS.topics.max}
            onChange={setTopicCount}
          />
          <PreferenceSlider
            icon={ListChecks}
            label="MCQs"
            description="Multiple choice questions to test knowledge"
            value={mcqCount}
            min={GENERATION_LIMITS.mcqs.min}
            max={GENERATION_LIMITS.mcqs.max}
            onChange={setMcqCount}
          />
          <PreferenceSlider
            icon={Zap}
            label="Rapid-Fire Questions"
            description="Quick Q&A for interview warm-up"
            value={rapidFireCount}
            min={GENERATION_LIMITS.rapidFire.min}
            max={GENERATION_LIMITS.rapidFire.max}
            onChange={setRapidFireCount}
          />

          <div className="pt-4 border-t border-white/10">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
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
                "Save Preferences"
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface PreferenceSliderProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
}

function PreferenceSlider({
  icon: Icon,
  label,
  description,
  value,
  min,
  max,
  disabled,
  onChange,
}: PreferenceSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">
              {label}
            </Label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <span className="text-lg font-semibold text-foreground tabular-nums min-w-[3ch] text-right">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        onValueChange={([v]) => onChange?.(v)}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
