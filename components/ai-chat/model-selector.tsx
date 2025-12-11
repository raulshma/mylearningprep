"use client";

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  Search,
  Sparkles,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Check,
  Loader2,
  BrainCircuit,
  Wrench,
  Globe,
  Zap,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpenRouterModel, GroupedModels } from "@/app/api/models/route";
import { PROVIDER_INFO } from "@/lib/ai/types";
import type { AIProviderType } from "@/lib/ai/types";
import { useChatStore, useModelActions } from "@/lib/store/chat/store";
import { motion, AnimatePresence } from "framer-motion";

const PROVIDER_STORAGE_KEY = "ai-chat-selected-provider";
const STORAGE_KEY = "ai-chat-selected-model";

// Capability badge config for consistent styling
const CAPABILITY_BADGES = {
  vision: { icon: ImageIcon, label: "Vision", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  reasoning: { icon: BrainCircuit, label: "Reasoning", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  tools: { icon: Wrench, label: "Tools", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  web: { icon: Globe, label: "Web", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
} as const;

// Helper functions
const modelSupportsImages = (model: OpenRouterModel): boolean => {
  const modality = model.architecture?.modality?.toLowerCase() || "";
  return (
    modality.includes("image") ||
    modality.includes("multimodal") ||
    modality.includes("vision")
  );
};

const formatPrice = (price: string) => {
  const num = parseFloat(price);
  if (num === 0) return "Free";
  if (num < 0.000001) return "<$0.01/M";
  return `$${(num * 1000000).toFixed(2)}/M`;
};

const formatContextLength = (length: number) => {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
  return `${(length / 1000).toFixed(0)}K`;
};

// Model capabilities helper
const getModelCapabilities = (model: OpenRouterModel) => {
  const caps: (keyof typeof CAPABILITY_BADGES)[] = [];
  if (modelSupportsImages(model)) caps.push("vision");
  if (model.supported_parameters?.some((p) => p === "reasoning" || p === "include_reasoning")) caps.push("reasoning");
  if (model.supported_parameters?.some((p) => p === "tools" || p === "tool_choice")) caps.push("tools");
  if (model.supported_parameters?.includes("web_search_options")) caps.push("web");
  return caps;
};

// Empty state component
const EmptySearchState = memo(function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <SearchX className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No models found</p>
      <p className="text-xs text-muted-foreground">
        No results for &quot;{query}&quot;. Try a different search term.
      </p>
    </div>
  );
});

// Model card component
const ModelCard = memo(function ModelCard({
  model,
  isSelected,
  onSelect,
}: {
  model: OpenRouterModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const capabilities = getModelCapabilities(model);
  const isFree = parseFloat(model.pricing.prompt) === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full p-3 rounded-xl text-left transition-all duration-200 border group relative overflow-hidden",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/50 hover:border-border hover:bg-muted/30"
      )}
      role="option"
      aria-selected={isSelected}
      aria-label={`${model.name} from ${model.provider === 'google' ? 'Google' : 'OpenRouter'}`}
    >
      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-primary-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start gap-2.5 pr-6">
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 text-base">
          {model.provider === 'google' ? '🔷' : '🌐'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate leading-tight">{model.name}</p>
          <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5 opacity-70">
            {model.id}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {formatContextLength(model.context_length)}
        </span>
        <span className={cn(
          "flex items-center gap-1",
          isFree && "text-green-600 dark:text-green-400 font-medium"
        )}>
          {isFree ? <Zap className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
          {formatPrice(model.pricing.prompt)}
        </span>
      </div>

      {/* Capability badges */}
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {capabilities.map((cap) => {
            const config = CAPABILITY_BADGES[cap];
            const Icon = config.icon;
            return (
              <Badge
                key={cap}
                variant="secondary"
                className={cn("text-[10px] h-5 px-1.5 font-normal border-0", config.className)}
              >
                <Icon className="w-3 h-3 mr-0.5" />
                {config.label}
              </Badge>
            );
          })}
        </div>
      )}
    </button>
  );
});


interface VirtualizedModelListProps {
  models: OpenRouterModel[];
  selectedModelId: string | null;
  onSelectModel: (model: OpenRouterModel) => void;
  searchQuery?: string;
}

const VirtualizedModelList = memo(function VirtualizedModelList({
  models,
  selectedModelId,
  onSelectModel,
  searchQuery = "",
}: VirtualizedModelListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(2);

  useEffect(() => {
    const updateColumnCount = () => {
      setColumnCount(window.innerWidth < 768 ? 1 : 2);
    };
    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  const rows = useMemo(() => {
    const result: OpenRouterModel[][] = [];
    for (let i = 0; i < models.length; i += columnCount) {
      result.push(models.slice(i, i + columnCount));
    }
    return result;
  }, [models, columnCount]);

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer is intentionally used
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 10,
  });

  if (models.length === 0 && searchQuery) {
    return <EmptySearchState query={searchQuery} />;
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-sm text-muted-foreground">No models available</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[350px] overflow-auto"
      style={{ contain: "strict", WebkitOverflowScrolling: "touch" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowModels = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="px-3 py-1.5 grid grid-cols-1 md:grid-cols-2 gap-2">
                {rowModels.map((model) => {
                  const isSelected = selectedModelId === model.id || selectedModelId === `google:${model.id}`;
                  return (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isSelected={isSelected}
                      onSelect={() => onSelectModel(model)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});


// Provider button component for cleaner code
const ProviderButton = memo(function ProviderButton({
  isActive,
  onClick,
  icon,
  label,
}: {
  provider: AIProviderType | "all";
  isActive: boolean;
  onClick: () => void;
  icon?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon && <span className="text-sm">{icon}</span>}
      {label}
    </button>
  );
});

interface ModelSelectorProps {
  selectedModelId?: string | null;
  onModelSelect?: (modelId: string, supportsImages: boolean, provider: AIProviderType) => void;
  disabled?: boolean;
  useStore?: boolean;
  variant?: "default" | "compact";
}

/**
 * Model selector component with provider grouping and capability indicators
 */
export const ModelSelector = memo(function ModelSelector({
  selectedModelId: propSelectedModelId,
  onModelSelect: propOnModelSelect,
  disabled,
  useStore = false,
  variant = "default",
}: ModelSelectorProps) {
  const isCompact = variant === "compact";
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<GroupedModels | null>(null);
  const [allModelsCache, setAllModelsCache] = useState<{ openrouter: GroupedModels; google: GroupedModels } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProvider, setActiveProvider] = useState<AIProviderType | "all">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const storeModelState = useChatStore((state) => state.models);
  const modelActions = useModelActions();

  const selectedModelId = useStore ? storeModelState.selectedId : (propSelectedModelId ?? null);
  
  const handleModelSelect = useCallback((modelId: string, supportsImages: boolean, provider: AIProviderType) => {
    if (useStore) {
      modelActions.select(modelId, provider, supportsImages);
    }
    propOnModelSelect?.(modelId, supportsImages, provider);
  }, [useStore, modelActions, propOnModelSelect]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const [openRouterRes, googleRes] = await Promise.all([
        fetch("/api/models?provider=openrouter"),
        fetch("/api/models?provider=google")
      ]);

      const openRouterData: GroupedModels = openRouterRes.ok ? await openRouterRes.json() : { free: [], paid: [] };
      const googleData: GroupedModels = googleRes.ok ? await googleRes.json() : { free: [], paid: [] };
      
      setAllModelsCache({ openrouter: openRouterData, google: googleData });
      
      const savedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY) as AIProviderType | "all" | null;
      const providerToUse = savedProvider || "all";
      setActiveProvider(providerToUse);
      
      const modelsToShow = getModelsForProvider(providerToUse, openRouterData, googleData);
      setModels(modelsToShow);

      const savedModelId = localStorage.getItem(STORAGE_KEY);
      if (savedModelId) {
        const merged: GroupedModels = {
          free: [...openRouterData.free, ...googleData.free],
          paid: [...openRouterData.paid, ...googleData.paid]
        };
        const allModels = [...merged.paid, ...merged.free];
        const savedModel = allModels.find((m) => {
          const mId = m.provider === 'google' ? `google:${m.id}` : m.id;
          return mId === savedModelId || m.id === savedModelId;
        });
        
        if (savedModel) {
          const idToUse = savedModel.provider === 'google' ? `google:${savedModel.id}` : savedModel.id;
          const provider: AIProviderType = savedModel.provider === 'google' ? 'google' : 'openrouter';
          handleModelSelect(idToUse, modelSupportsImages(savedModel), provider);
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    } finally {
      setLoading(false);
    }
  };

  const getModelsForProvider = (
    provider: AIProviderType | "all",
    openRouterData: GroupedModels,
    googleData: GroupedModels
  ): GroupedModels => {
    if (provider === "openrouter") {
      return {
        free: openRouterData.free.sort((a, b) => a.name.localeCompare(b.name)),
        paid: openRouterData.paid.sort((a, b) => a.name.localeCompare(b.name))
      };
    }
    if (provider === "google") {
      return {
        free: googleData.free.sort((a, b) => a.name.localeCompare(b.name)),
        paid: googleData.paid.sort((a, b) => a.name.localeCompare(b.name))
      };
    }
    return {
      free: [...openRouterData.free, ...googleData.free].sort((a, b) => a.name.localeCompare(b.name)),
      paid: [...openRouterData.paid, ...googleData.paid].sort((a, b) => a.name.localeCompare(b.name))
    };
  };

  const handleProviderChange = (provider: AIProviderType | "all") => {
    setActiveProvider(provider);
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    if (allModelsCache) {
      const modelsToShow = getModelsForProvider(provider, allModelsCache.openrouter, allModelsCache.google);
      setModels(modelsToShow);
    }
  };

  const allModels = useMemo(() => {
    if (!models) return [];
    return [...models.paid, ...models.free];
  }, [models]);

  const selectedModel = useMemo(() => {
    if (!selectedModelId || !models) return null;
    return allModels.find((m) => {
      const mId = m.provider === 'google' ? `google:${m.id}` : m.id;
      return mId === selectedModelId || m.id === selectedModelId;
    }) || null;
  }, [selectedModelId, allModels, models]);

  const filterModels = useCallback((modelList: OpenRouterModel[]) => {
    if (!searchQuery) return modelList;
    const query = searchQuery.toLowerCase();
    return modelList.filter(
      (m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectModel = (model: OpenRouterModel) => {
    const idToUse = model.provider === 'google' ? `google:${model.id}` : model.id;
    const provider: AIProviderType = model.provider === 'google' ? 'google' : 'openrouter';
    localStorage.setItem(STORAGE_KEY, idToUse);
    handleModelSelect(idToUse, modelSupportsImages(model), provider);
    setOpen(false);
    setSearchQuery("");
  };

  const filteredPaidModels = useMemo(() => filterModels(models?.paid || []), [filterModels, models?.paid]);
  const filteredFreeModels = useMemo(() => filterModels(models?.free || []), [filterModels, models?.free]);


  if (loading) {
    return isCompact ? (
      <div className="flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-muted/40 border border-border/40 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </div>
    ) : (
      <Button variant="outline" size="sm" disabled className="h-8 gap-2 rounded-full">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">Loading models...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {isCompact ? (
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              selectedModel
                ? "bg-muted/60 border border-border/40 hover:bg-muted/80 hover:border-border"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-600 hover:bg-amber-500/15"
            )}
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="max-w-[100px] truncate font-medium">
              {selectedModel ? selectedModel.name : "Select model"}
            </span>
            <ChevronDown className={cn(
              "h-3 w-3 shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )} />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "h-8 gap-2 rounded-full max-w-[200px] transition-all duration-200",
              !selectedModel && "border-dashed border-amber-500/50 text-amber-600 hover:border-amber-500"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs truncate">
              {selectedModel ? selectedModel.name : "Select model"}
            </span>
            <ChevronDown className={cn(
              "h-3 w-3 shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )} />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[95vw] md:w-[620px] p-0 rounded-2xl shadow-xl border-border/50"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50 space-y-3">
          {/* Title & Provider Selector */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Select Model</h3>
            <div className="flex gap-1.5">
              <ProviderButton
                provider="all"
                isActive={activeProvider === "all"}
                onClick={() => handleProviderChange("all")}
                label="All"
              />
              <ProviderButton
                provider="openrouter"
                isActive={activeProvider === "openrouter"}
                onClick={() => handleProviderChange("openrouter")}
                icon={PROVIDER_INFO.openrouter.icon}
                label="OpenRouter"
              />
              <ProviderButton
                provider="google"
                isActive={activeProvider === "google"}
                onClick={() => handleProviderChange("google")}
                icon={PROVIDER_INFO.google.icon}
                label="Google"
              />
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Search by name or model ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 flex items-center justify-center transition-colors"
              >
                <span className="text-[10px] text-muted-foreground">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="paid" className="w-full">
          <div className="px-4 pt-3">
            <TabsList className="w-full h-9 bg-muted/30 rounded-xl p-1">
              <TabsTrigger value="paid" className="flex-1 h-7 text-xs rounded-lg gap-1.5">
                <DollarSign className="w-3 h-3" />
                Paid
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal ml-1">
                  {filteredPaidModels.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="free" className="flex-1 h-7 text-xs rounded-lg gap-1.5">
                <Zap className="w-3 h-3" />
                Free
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal ml-1">
                  {filteredFreeModels.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="paid" className="mt-0">
            <VirtualizedModelList
              models={filteredPaidModels}
              selectedModelId={selectedModelId}
              onSelectModel={handleSelectModel}
              searchQuery={searchQuery}
            />
          </TabsContent>
          <TabsContent value="free" className="mt-0">
            <VirtualizedModelList
              models={filteredFreeModels}
              selectedModelId={selectedModelId}
              onSelectModel={handleSelectModel}
              searchQuery={searchQuery}
            />
          </TabsContent>
        </Tabs>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
          <p className="text-[11px] text-muted-foreground text-center">
            {selectedModel ? (
              <>Currently using <span className="font-medium text-foreground">{selectedModel.name}</span></>
            ) : (
              "Select a model to start chatting"
            )}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
});
