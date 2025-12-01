"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Check,
  DollarSign,
  Layers,
  Zap,
  Gauge,
  Feather,
  AlertTriangle,
  Trash2,
  Maximize,
  Thermometer,
  Image as ImageIcon,
  BrainCircuit,
  Wrench,
  Globe,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  getTieredModelConfig,
  updateTierConfig,
  clearTieredModelConfig,
  getTaskTierMappings,
  type TaskTierInfo,
} from "@/lib/actions/admin";
import type { OpenRouterModel, GroupedModels } from "@/app/api/models/route";
import type {
  ModelTier,
  TierModelConfig,
  FullTieredModelConfig,
} from "@/lib/db/schemas/settings";

interface TieredModelConfigProps {
  initialConfig: FullTieredModelConfig;
}

const TIER_INFO: Record<
  ModelTier,
  {
    label: string;
    icon: typeof Zap;
    description: string;
    color: string;
    bgColor: string;
  }
> = {
  high: {
    label: "High Capability",
    icon: Zap,
    description:
      "Complex reasoning, detailed content generation (topics, briefs, MCQs, analogies)",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  medium: {
    label: "Medium Capability",
    icon: Gauge,
    description: "Structured output, moderate complexity (rapid-fire)",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  low: {
    label: "Low Capability",
    icon: Feather,
    description: "Simple parsing, extraction tasks (prompt parsing)",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
};

export function TieredModelConfig({ initialConfig }: TieredModelConfigProps) {
  const [config, setConfig] = useState<FullTieredModelConfig>(initialConfig);
  const [models, setModels] = useState<GroupedModels | null>(null);
  const [taskMappings, setTaskMappings] = useState<TaskTierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTier, setActiveTier] = useState<ModelTier>("high");
  const [selectingFor, setSelectingFor] = useState<"primary" | "fallback">(
    "primary"
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    vision: false,
    reasoning: false,
    tools: false,
    web: false,
    minContext: 0,
  });

  const ActiveIcon = TIER_INFO[activeTier].icon;

  // Check which tiers are missing configuration
  const missingTiers = (["high", "medium", "low"] as ModelTier[]).filter(
    (tier) => !config[tier].primaryModel
  );

  useEffect(() => {
    fetchModels();
    getTaskTierMappings().then((result) => {
      if (Array.isArray(result)) {
        setTaskMappings(result);
      }
    });
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error("Failed to fetch models");
      const data = await response.json();
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  };

  const filterModels = (modelList: OpenRouterModel[]) => {
    return modelList.filter((m) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !m.id.toLowerCase().includes(query) &&
          !m.name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Vision filter
      if (filters.vision) {
        const modality = m.architecture?.modality?.toLowerCase() || "";
        if (
          !modality.includes("image") &&
          !modality.includes("multimodal") &&
          !modality.includes("vision")
        ) {
          return false;
        }
      }

      // Reasoning filter
      if (filters.reasoning) {
        if (
          !m.supported_parameters?.some(
            (p) => p === "reasoning" || p === "include_reasoning"
          )
        ) {
          return false;
        }
      }

      // Tools filter
      if (filters.tools) {
        if (
          !m.supported_parameters?.some(
            (p) => p === "tools" || p === "tool_choice"
          )
        ) {
          return false;
        }
      }

      // Web search filter
      if (filters.web) {
        if (!m.supported_parameters?.includes("web_search_options")) {
          return false;
        }
      }

      // Min context length filter
      if (filters.minContext > 0) {
        if (m.context_length < filters.minContext * 1000) {
          return false;
        }
      }

      return true;
    });
  };

  const activeFilterCount = [
    filters.vision,
    filters.reasoning,
    filters.tools,
    filters.web,
    filters.minContext > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      vision: false,
      reasoning: false,
      tools: false,
      web: false,
      minContext: 0,
    });
  };

  const findModel = (modelId: string): OpenRouterModel | undefined => {
    if (!models) return undefined;
    return (
      models.paid.find((m) => m.id === modelId) ||
      models.free.find((m) => m.id === modelId)
    );
  };

  const handleSelectModel = (
    modelId: string,
    tier: ModelTier,
    type: "primary" | "fallback"
  ) => {
    const model = findModel(modelId);
    // Use max_completion_tokens if available, otherwise fall back to context_length
    const maxTokens =
      model?.top_provider?.max_completion_tokens || model?.context_length;

    setConfig((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [type === "primary" ? "primaryModel" : "fallbackModel"]: modelId,
        // Auto-populate maxTokens from model data when selecting primary model
        ...(type === "primary" && maxTokens ? { maxTokens } : {}),
        // Auto-populate fallbackMaxTokens from model data when selecting fallback model
        ...(type === "fallback" && maxTokens ? { fallbackMaxTokens: maxTokens } : {}),
        // Auto-populate temperature from model data when selecting primary model
        ...(type === "primary" && model?.default_parameters?.temperature
          ? { temperature: model.default_parameters.temperature }
          : {}),
      },
    }));
    setSaved(false);
  };

  const handleUpdateSettings = (
    tier: ModelTier,
    field: "temperature" | "maxTokens" | "fallbackMaxTokens" | "toolsEnabled",
    value: number | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
    setSaved(false);
  };

  const handleSaveTier = (tier: ModelTier) => {
    startTransition(async () => {
      await updateTierConfig(tier, config[tier]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleClearAll = () => {
    if (
      !confirm(
        "Are you sure you want to clear all tier configurations? AI features will be disabled until reconfigured."
      )
    ) {
      return;
    }
    startTransition(async () => {
      await clearTieredModelConfig();
      setConfig({
        high: {
          primaryModel: null,
          fallbackModel: null,
          temperature: 0.7,
          maxTokens: 4096,
          fallbackMaxTokens: 4096,
          toolsEnabled: true,
        },
        medium: {
          primaryModel: null,
          fallbackModel: null,
          temperature: 0.7,
          maxTokens: 4096,
          fallbackMaxTokens: 4096,
          toolsEnabled: true,
        },
        low: {
          primaryModel: null,
          fallbackModel: null,
          temperature: 0.7,
          maxTokens: 4096,
          fallbackMaxTokens: 4096,
          toolsEnabled: true,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return "Free";
    return `$${(num * 1000000).toFixed(2)}/M`;
  };

  const modelSupportsImages = (model: OpenRouterModel): boolean => {
    const modality = model.architecture?.modality?.toLowerCase() || "";
    return (
      modality.includes("image") ||
      modality.includes("multimodal") ||
      modality.includes("vision")
    );
  };

  const getMaxTokens = (model: OpenRouterModel): number => {
    // Use max_completion_tokens if available, otherwise fall back to context_length
    return model.top_provider?.max_completion_tokens || model.context_length;
  };

  const ModelCard = ({
    model,
    isSelected,
    onSelect,
  }: {
    model: OpenRouterModel;
    isSelected: boolean;
    onSelect: () => void;
  }) => {
    const supportsImages = modelSupportsImages(model);
    const maxTokens = getMaxTokens(model);

    return (
      <div
        onClick={onSelect}
        className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
          isSelected
            ? "border-primary bg-primary/5 shadow-md"
            : "border-border/50 bg-card hover:border-border hover:shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground truncate">
                {model.name}
              </p>
              {isSelected && (
                <div className="bg-primary/10 rounded-full p-0.5">
                  <Check className="w-3 h-3 text-primary shrink-0" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
              {model.id}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge
            variant="secondary"
            className="text-[10px] h-5 px-1.5 font-normal bg-secondary/50"
          >
            <Layers className="w-3 h-3 mr-1 opacity-70" />
            {(model.context_length / 1000).toFixed(0)}K
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] h-5 px-1.5 font-normal bg-secondary/50"
          >
            <DollarSign className="w-3 h-3 mr-1 opacity-70" />
            {formatPrice(model.pricing.prompt)}
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] h-5 px-1.5 font-normal bg-secondary/50"
            title="Max Output Tokens"
          >
            <Maximize className="w-3 h-3 mr-1 opacity-70" />
            {(maxTokens / 1000).toFixed(0)}K
          </Badge>
          {model.default_parameters?.temperature !== undefined && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 font-normal bg-secondary/50"
              title="Default Temperature"
            >
              <Thermometer className="w-3 h-3 mr-1 opacity-70" />
              {model.default_parameters.temperature}
            </Badge>
          )}
          {supportsImages && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 font-normal bg-blue-500/10 text-blue-600"
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              Vision
            </Badge>
          )}
          {model.supported_parameters?.some(
            (p) => p === "reasoning" || p === "include_reasoning"
          ) && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 font-normal bg-purple-500/10 text-purple-600"
            >
              <BrainCircuit className="w-3 h-3 mr-1" />
              Reasoning
            </Badge>
          )}
          {model.supported_parameters?.some(
            (p) => p === "tools" || p === "tool_choice"
          ) && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 font-normal bg-orange-500/10 text-orange-600"
            >
              <Wrench className="w-3 h-3 mr-1" />
              Tools
            </Badge>
          )}
          {model.supported_parameters?.includes("web_search_options") && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 font-normal bg-green-500/10 text-green-600"
            >
              <Globe className="w-3 h-3 mr-1" />
              Web
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const TierBadge = ({ tier }: { tier: ModelTier }) => {
    const info = TIER_INFO[tier];
    const Icon = info.icon;
    return (
      <Badge
        variant="outline"
        className={`${info.color} ${info.bgColor} border-transparent`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  const TierStatus = ({ tier }: { tier: ModelTier }) => {
    const tierConfig = config[tier];
    const isConfigured = !!tierConfig.primaryModel;
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          isConfigured
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isConfigured ? "bg-green-500" : "bg-red-500"
          }`}
        />
        {isConfigured ? "Configured" : "Not Set"}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b border-border/50">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-6 md:p-8">
          {/* Tier Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-5 rounded-3xl border-2 border-transparent bg-secondary/50 h-48 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Task Mappings Skeleton */}
          <div className="p-6 bg-secondary/30 rounded-3xl space-y-4">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>

          {/* Active Tier Config Skeleton */}
          <div className="space-y-6 p-6 md:p-8 border border-border/50 rounded-3xl bg-background/50">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 rounded-lg" />
                <Skeleton className="h-4 w-64 rounded-lg" />
              </div>
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-10 w-64 rounded-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl">
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-foreground font-medium mb-2">
            Failed to load models
          </p>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Button
            onClick={fetchModels}
            variant="outline"
            className="rounded-full"
          >
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="p-6 md:p-8 border-b border-border/50">
        <CardTitle className="text-xl font-bold">
          Tiered Model Configuration
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Configure different models for different task complexities. Each tier
          requires a primary model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-6 md:p-8">
        {/* Warning for unconfigured tiers */}
        {missingTiers.length > 0 && (
          <Alert
            variant="destructive"
            className="border-0 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2 font-medium">
              Missing configuration for:{" "}
              {missingTiers.map((t) => TIER_INFO[t].label).join(", ")}.
            </AlertDescription>
          </Alert>
        )}

        {/* Tier Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["high", "medium", "low"] as ModelTier[]).map((tier) => {
            const info = TIER_INFO[tier];
            const Icon = info.icon;
            const tierConfig = config[tier];
            const isActive = activeTier === tier;

            return (
              <div
                key={tier}
                className={`p-5 rounded-3xl cursor-pointer transition-all duration-300 border-2 ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/5 scale-[1.02]"
                    : "border-transparent bg-secondary/50 hover:bg-secondary hover:scale-[1.01]"
                }`}
                onClick={() => setActiveTier(tier)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-2xl ${info.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${info.color}`} />
                  </div>
                  <TierStatus tier={tier} />
                </div>

                <h3 className="font-bold text-foreground mb-1">{info.label}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">
                  {info.description}
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Primary</span>
                    <span
                      className="font-mono font-medium truncate max-w-[100px]"
                      title={tierConfig.primaryModel || ""}
                    >
                      {tierConfig.primaryModel || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fallback</span>
                    <span
                      className="font-mono text-muted-foreground/70 truncate max-w-[100px]"
                      title={tierConfig.fallbackModel || ""}
                    >
                      {tierConfig.fallbackModel || "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Task Mappings */}
        <div className="p-6 bg-secondary/30 rounded-3xl">
          <Label className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Task Routing
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {taskMappings.map((mapping) => (
              <div
                key={mapping.task}
                className="flex items-center justify-between text-sm p-3 rounded-xl bg-background/80 shadow-sm border border-border/50"
              >
                <span className="text-foreground font-medium truncate mr-4">
                  {mapping.description}
                </span>
                <TierBadge tier={mapping.tier} />
              </div>
            ))}
          </div>
        </div>

        {/* Active Tier Configuration */}
        <div className="space-y-6 p-6 md:p-8 border border-border/50 rounded-3xl bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl ${TIER_INFO[activeTier].bgColor} flex items-center justify-center`}
              >
                <ActiveIcon
                  className={`w-5 h-5 ${TIER_INFO[activeTier].color}`}
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {TIER_INFO[activeTier].label} Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  {TIER_INFO[activeTier].description}
                </p>
              </div>
            </div>
          </div>

          {/* Model Selection Type */}
          <Tabs
            value={selectingFor}
            onValueChange={(v) => setSelectingFor(v as "primary" | "fallback")}
            className="w-full"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-secondary/50 backdrop-blur-xl p-1 rounded-full inline-flex">
                <TabsList className="bg-transparent gap-1 h-auto p-0">
                  <TabsTrigger
                    value="primary"
                    className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                  >
                    Primary Model
                    {!config[activeTier].primaryModel && (
                      <div className="w-2 h-2 rounded-full bg-red-500 ml-2 animate-pulse" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="fallback"
                    className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                  >
                    Fallback Model
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="primary" className="space-y-4 mt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Required. The main model used for this tier&apos;s tasks.
              </div>
              {config[activeTier].primaryModel && (
                <div className="p-3 bg-secondary/50 rounded-xl font-mono text-sm flex items-center justify-between">
                  <span>Current: {config[activeTier].primaryModel}</span>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="fallback" className="space-y-4 mt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                Optional. Used when the primary model fails or is unavailable.
              </div>
              {config[activeTier].fallbackModel && (
                <div className="p-3 bg-secondary/50 rounded-xl font-mono text-sm flex items-center justify-between">
                  <span>Current: {config[activeTier].fallbackModel}</span>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-background focus:border-primary/20 transition-all"
                />
              </div>
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-12 rounded-xl px-4 gap-2 ${
                      activeFilterCount > 0
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-secondary/30"
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge className="h-5 w-5 p-0 justify-center text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>

            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleContent>
                <div className="p-4 bg-secondary/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Filter by Capabilities
                    </Label>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear all
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Toggle
                      pressed={filters.vision}
                      onPressedChange={(pressed) =>
                        setFilters((f) => ({ ...f, vision: pressed }))
                      }
                      className="h-8 px-3 rounded-lg data-[state=on]:bg-blue-500/10 data-[state=on]:text-blue-600 data-[state=on]:border-blue-500/30"
                      variant="outline"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                      Vision
                    </Toggle>
                    <Toggle
                      pressed={filters.reasoning}
                      onPressedChange={(pressed) =>
                        setFilters((f) => ({ ...f, reasoning: pressed }))
                      }
                      className="h-8 px-3 rounded-lg data-[state=on]:bg-purple-500/10 data-[state=on]:text-purple-600 data-[state=on]:border-purple-500/30"
                      variant="outline"
                    >
                      <BrainCircuit className="w-3.5 h-3.5 mr-1.5" />
                      Reasoning
                    </Toggle>
                    <Toggle
                      pressed={filters.tools}
                      onPressedChange={(pressed) =>
                        setFilters((f) => ({ ...f, tools: pressed }))
                      }
                      className="h-8 px-3 rounded-lg data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-600 data-[state=on]:border-orange-500/30"
                      variant="outline"
                    >
                      <Wrench className="w-3.5 h-3.5 mr-1.5" />
                      Tools
                    </Toggle>
                    <Toggle
                      pressed={filters.web}
                      onPressedChange={(pressed) =>
                        setFilters((f) => ({ ...f, web: pressed }))
                      }
                      className="h-8 px-3 rounded-lg data-[state=on]:bg-green-500/10 data-[state=on]:text-green-600 data-[state=on]:border-green-500/30"
                      variant="outline"
                    >
                      <Globe className="w-3.5 h-3.5 mr-1.5" />
                      Web Search
                    </Toggle>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Min Context Length
                      </Label>
                      <span className="text-sm text-muted-foreground font-mono">
                        {filters.minContext > 0
                          ? `${filters.minContext}K+`
                          : "Any"}
                      </span>
                    </div>
                    <Slider
                      value={[filters.minContext]}
                      onValueChange={([value]) =>
                        setFilters((f) => ({ ...f, minContext: value }))
                      }
                      max={200}
                      step={8}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Any</span>
                      <span>200K</span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Model List */}
          <Tabs defaultValue="paid" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/50 rounded-none h-auto p-0 mb-4 gap-6">
              <TabsTrigger
                value="paid"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Paid Models{" "}
                  <Badge
                    variant="secondary"
                    className="ml-1 text-[10px] h-5 px-1.5"
                  >
                    {models?.paid.length || 0}
                  </Badge>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="free"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Free Models{" "}
                  <Badge
                    variant="secondary"
                    className="ml-1 text-[10px] h-5 px-1.5"
                  >
                    {models?.free.length || 0}
                  </Badge>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paid" className="mt-0">
              <ScrollArea className="h-[300px] pr-4 -mr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                  {filterModels(models?.paid || []).map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isSelected={
                        selectingFor === "primary"
                          ? config[activeTier].primaryModel === model.id
                          : config[activeTier].fallbackModel === model.id
                      }
                      onSelect={() =>
                        handleSelectModel(model.id, activeTier, selectingFor)
                      }
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="free" className="mt-0">
              <ScrollArea className="h-[300px] pr-4 -mr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                  {filterModels(models?.free || []).map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isSelected={
                        selectingFor === "primary"
                          ? config[activeTier].primaryModel === model.id
                          : config[activeTier].fallbackModel === model.id
                      }
                      onSelect={() =>
                        handleSelectModel(model.id, activeTier, selectingFor)
                      }
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Model Settings */}
          <div className="space-y-6 pt-6 border-t border-border/50">
            {/* Primary Model Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-foreground">
                Primary Model Settings
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Temperature
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config[activeTier].temperature}
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
                      className="font-mono h-10 rounded-xl bg-secondary/30 border-transparent focus:bg-background"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      0.0 – 2.0
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Max Tokens
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config[activeTier].maxTokens}
                      onChange={(e) =>
                        handleUpdateSettings(
                          activeTier,
                          "maxTokens",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="font-mono h-10 rounded-xl bg-secondary/30 border-transparent focus:bg-background"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      tokens
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fallback Model Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-foreground">
                Fallback Model Settings
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Fallback Max Tokens
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config[activeTier].fallbackMaxTokens}
                      onChange={(e) =>
                        handleUpdateSettings(
                          activeTier,
                          "fallbackMaxTokens",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="font-mono h-10 rounded-xl bg-secondary/30 border-transparent focus:bg-background"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      tokens
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tools Configuration */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-foreground">
                Capabilities
              </Label>
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tools</p>
                    <p className="text-xs text-muted-foreground">
                      Allow AI to use function calling tools
                    </p>
                  </div>
                </div>
                <Toggle
                  pressed={config[activeTier].toolsEnabled}
                  onPressedChange={(pressed) =>
                    handleUpdateSettings(activeTier, "toolsEnabled", pressed)
                  }
                  className="h-9 px-4 data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-600"
                  aria-label="Toggle tools"
                >
                  {config[activeTier].toolsEnabled ? "Enabled" : "Disabled"}
                </Toggle>
              </div>
            </div>
          </div>

          {/* Save Tier Button */}
          <Button
            onClick={() => handleSaveTier(activeTier)}
            disabled={isPending}
            className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20"
          >
            {isPending ? (
              <>
                <Spinner className="w-5 h-5 mr-2" />
                Saving Configuration...
              </>
            ) : saved ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Configuration Saved
              </>
            ) : (
              `Save ${TIER_INFO[activeTier].label} Settings`
            )}
          </Button>
        </div>

        {/* Clear All Button */}
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            onClick={handleClearAll}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset All Configurations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
