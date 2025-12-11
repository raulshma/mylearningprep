"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Layers,
  Search,
  Check,
  DollarSign,
  Zap,
  Gauge,
  Feather,
  AlertTriangle,
  Trash2,
  Loader2,
  Settings,
  Wand2,
} from "lucide-react";
import {
  getBYOKTierConfig,
  saveBYOKTierConfig,
  clearBYOKTierConfig,
  getSystemTierConfig,
} from "@/lib/actions/byok";
import type { BYOKUserConfig, BYOKTierConfig } from "@/lib/db/schemas/byok";
import type { OpenRouterModel, GroupedModels } from "@/app/api/models/route";

type ModelTier = "high" | "medium" | "low";

const TIER_INFO: Record<
  ModelTier,
  { label: string; icon: typeof Zap; description: string; color: string }
> = {
  high: {
    label: "High",
    icon: Zap,
    description: "Topics, briefs, MCQs, analogies",
    color: "text-amber-500",
  },
  medium: {
    label: "Medium",
    icon: Gauge,
    description: "Rapid-fire questions",
    color: "text-blue-500",
  },
  low: {
    label: "Low",
    icon: Feather,
    description: "Prompt parsing",
    color: "text-green-500",
  },
};

const DEFAULT_TIER: BYOKTierConfig = {
  provider: 'openrouter',
  model: "",
  fallback: undefined,
  temperature: 0.7,
  maxTokens: 4096,
};

interface BYOKTierConfigProps {
  hasByokKey: boolean;
}

export function BYOKTierConfigSection({ hasByokKey }: BYOKTierConfigProps) {
  const router = useRouter();
  const [config, setConfig] = useState<BYOKUserConfig>({});
  const [models, setModels] = useState<GroupedModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTier, setActiveTier] = useState<ModelTier>("high");
  const [selectingFor, setSelectingFor] = useState<"primary" | "fallback">(
    "primary"
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hasByokKey) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [hasByokKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configResult, openRouterResponse, googleResponse] = await Promise.all([
        getBYOKTierConfig(),
        fetch("/api/models?provider=openrouter"),
        fetch("/api/models?provider=google"),
      ]);

      if (configResult.success && configResult.data) {
        setConfig(configResult.data);
      }

      const mergedModels: GroupedModels = { free: [], paid: [] };

      if (openRouterResponse.ok) {
        const data = await openRouterResponse.json();
        if (data && !data.error) {
           mergedModels.free.push(...(data.free || []));
           mergedModels.paid.push(...(data.paid || []));
        }
      }

      if (googleResponse.ok) {
        const data = await googleResponse.json();
        if (data && !data.error) {
           mergedModels.free.push(...(data.free || []));
           mergedModels.paid.push(...(data.paid || []));
        }
      }

      setModels(mergedModels);
    } catch (err) {
      setError("Failed to load configuration");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterModels = (modelList: OpenRouterModel[]) => {
    if (!searchQuery) return modelList;
    const query = searchQuery.toLowerCase();
    return modelList.filter(
      (m) =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query)
    );
  };

  const findModel = (modelId: string): OpenRouterModel | undefined => {
    if (!models) return undefined;
    return (
      models.paid.find((m) => m.id === modelId) ||
      models.free.find((m) => m.id === modelId)
    );
  };

  const getTierConfig = (tier: ModelTier): BYOKTierConfig => {
    return config[tier] || { ...DEFAULT_TIER };
  };

  const handleSelectModel = (
    modelId: string,
    tier: ModelTier,
    type: "primary" | "fallback"
  ) => {
    const model = findModel(modelId);
    const maxTokens = model?.top_provider?.max_completion_tokens;

    setConfig((prev) => {
      const tierConfig = prev[tier] || { ...DEFAULT_TIER };
      
      // If setting primary model, update provider
      const providerUpdate = type === "primary" && model?.provider 
        ? { provider: model.provider as any } 
        : {};

      return {
        ...prev,
        [tier]: {
          ...tierConfig,
          ...(type === "primary" ? { model: modelId } : { fallback: modelId }),
          ...providerUpdate,
          ...(type === "primary" && maxTokens ? { maxTokens } : {}),
        },
      };
    });
    setSaved(false);
  };

  const handleUpdateSettings = (
    tier: ModelTier,
    field: "temperature" | "maxTokens",
    value: number
  ) => {
    setConfig((prev) => {
      const tierConfig = prev[tier] || { ...DEFAULT_TIER };
      return {
        ...prev,
        [tier]: { ...tierConfig, [field]: value },
      };
    });
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveBYOKTierConfig(config);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  const handleClear = () => {
    if (
      !confirm("Clear all tier configurations? You will use system defaults.")
    )
      return;
    startTransition(async () => {
      const result = await clearBYOKTierConfig();
      if (result.success) {
        setConfig({});
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    });
  };

  const handleAutoFill = () => {
    startTransition(async () => {
      const result = await getSystemTierConfig();
      if (result.success && result.data) {
        setConfig(result.data);
        setSaved(false);
        setError(null);
      } else if (result.success && !result.data) {
        setError(
          "No system configuration available. Admin has not configured models yet."
        );
      } else if (!result.success) {
        setError(result.error.message || "Failed to load system config");
      }
    });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return "Free";
    return `$${(num * 1000000).toFixed(2)}/M`;
  };

  const isConfigured = (tier: ModelTier) => !!config[tier]?.model;
  const configuredCount = (["high", "medium", "low"] as ModelTier[]).filter(
    isConfigured
  ).length;

  if (!hasByokKey) {
    return null;
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading configuration...
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Model Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure models for your API key
            </p>
          </div>
        </div>
        <Badge
          variant={configuredCount === 3 ? "default" : "secondary"}
          className="px-4 py-1.5 rounded-full"
        >
          {configuredCount}/3 Configured
        </Badge>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="mb-6 rounded-2xl bg-destructive/10 border-destructive/20"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Tier Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["high", "medium", "low"] as ModelTier[]).map((tier) => {
            const info = TIER_INFO[tier];
            const Icon = info.icon;
            const tierConfig = getTierConfig(tier);
            return (
              <div
                key={tier}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  activeTier === tier
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                    : "border-white/5 bg-secondary/30 hover:bg-secondary/50 hover:border-white/10"
                }`}
                onClick={() => setActiveTier(tier)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${info.color}`} />
                    <span className="text-sm font-bold">{info.label}</span>
                  </div>
                  {isConfigured(tier) && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground truncate">
                  {tierConfig.model || "Not set"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Active Tier Config */}
        <div className="space-y-4 p-5 border border-white/10 rounded-3xl bg-secondary/20">
          <div className="flex items-center gap-2 text-sm">
            {(() => {
              const Icon = TIER_INFO[activeTier].icon;
              return (
                <Icon className={`w-4 h-4 ${TIER_INFO[activeTier].color}`} />
              );
            })()}
            <span className="font-bold">
              {TIER_INFO[activeTier].label} Tier
            </span>
            <span className="text-muted-foreground">
              — {TIER_INFO[activeTier].description}
            </span>
          </div>

          {/* Model Type Tabs */}
          <Tabs
            value={selectingFor}
            onValueChange={(v) => setSelectingFor(v as "primary" | "fallback")}
          >
            <TabsList className="grid w-full grid-cols-2 h-10 rounded-xl bg-secondary/50 p-1">
              <TabsTrigger
                value="primary"
                className="rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Primary
              </TabsTrigger>
              <TabsTrigger
                value="fallback"
                className="rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Fallback
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-secondary/50 border-transparent focus:bg-background transition-all text-sm"
            />
          </div>

          {/* Model List */}
          <Tabs defaultValue="paid">
            <TabsList className="h-9 rounded-lg bg-transparent p-0 gap-4 mb-2 justify-start">
              <TabsTrigger
                value="paid"
                className="text-xs gap-1 rounded-full px-4 border border-transparent data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20"
              >
                <DollarSign className="w-3 h-3" />
                Paid
              </TabsTrigger>
              <TabsTrigger
                value="free"
                className="text-xs rounded-full px-4 border border-transparent data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20"
              >
                Free
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paid" className="mt-0">
              <ScrollArea className="h-[200px] rounded-xl border border-white/5 bg-background/30 p-2">
                <div className="space-y-1">
                  {filterModels(models?.paid || []).map((model) => {
                    const tierConfig = getTierConfig(activeTier);
                    const isSelected =
                      selectingFor === "primary"
                        ? tierConfig.model === model.id
                        : tierConfig.fallback === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() =>
                          handleSelectModel(model.id, activeTier, selectingFor)
                        }
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-secondary/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs font-medium text-foreground truncate">
                              {model.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {model.id}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 bg-background/50 border-white/10"
                            >
                              <Layers className="w-2.5 h-2.5 mr-1" />
                              {(model.context_length / 1000).toFixed(0)}K
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 bg-background/50 border-white/10"
                            >
                              {formatPrice(model.pricing.prompt)}
                            </Badge>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="free" className="mt-0">
              <ScrollArea className="h-[200px] rounded-xl border border-white/5 bg-background/30 p-2">
                <div className="space-y-1">
                  {filterModels(models?.free || []).map((model) => {
                    const tierConfig = getTierConfig(activeTier);
                    const isSelected =
                      selectingFor === "primary"
                        ? tierConfig.model === model.id
                        : tierConfig.fallback === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() =>
                          handleSelectModel(model.id, activeTier, selectingFor)
                        }
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-secondary/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs font-medium text-foreground truncate">
                              {model.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 text-green-500 bg-green-500/10 border-green-500/20"
                            >
                              Free
                            </Badge>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Temperature & Max Tokens */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Temperature
              </Label>
              <Input
                type="number"
                value={getTierConfig(activeTier).temperature}
                onChange={(e) =>
                  handleUpdateSettings(
                    activeTier,
                    "temperature",
                    parseFloat(e.target.value) || 0
                  )
                }
                step="0.1"
                min="0"
                max="2"
                className="font-mono h-9 rounded-lg bg-secondary/50 border-transparent focus:bg-background text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Max Tokens
              </Label>
              <Input
                type="number"
                value={getTierConfig(activeTier).maxTokens}
                onChange={(e) =>
                  handleUpdateSettings(
                    activeTier,
                    "maxTokens",
                    parseInt(e.target.value) || 0
                  )
                }
                className="font-mono h-9 rounded-lg bg-secondary/50 border-transparent focus:bg-background text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 rounded-full h-11 font-medium shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4 mr-2" />
            ) : null}
            {saved ? "Saved!" : "Save Configuration"}
          </Button>
          <Button
            variant="outline"
            onClick={handleAutoFill}
            disabled={isPending}
            title="Copy system configuration"
            className="rounded-full w-11 h-11 p-0 bg-transparent border-white/10 hover:bg-secondary/50 hover:border-primary/20"
          >
            <Wand2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isPending}
            className="rounded-full w-11 h-11 p-0 bg-transparent border-white/10 hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Use <Wand2 className="w-3 h-3 inline mx-0.5" /> to copy admin&apos;s
          model selection. Your key is always used for API calls.
        </p>
      </div>
    </motion.div>
  );
}
