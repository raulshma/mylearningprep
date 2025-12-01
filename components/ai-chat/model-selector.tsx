"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  Search,
  Sparkles,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpenRouterModel, GroupedModels } from "@/app/api/models/route";

const STORAGE_KEY = "ai-chat-selected-model";

interface ModelSelectorProps {
  selectedModelId: string | null;
  onModelSelect: (modelId: string, supportsImages: boolean) => void;
  disabled?: boolean;
}

export function ModelSelector({
  selectedModelId,
  onModelSelect,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<GroupedModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error("Failed to fetch models");
      const data: GroupedModels = await response.json();
      setModels(data);

      // Try to restore previously selected model
      const savedModelId = localStorage.getItem(STORAGE_KEY);
      if (savedModelId && !selectedModelId) {
        const allModels = [...data.paid, ...data.free];
        const savedModel = allModels.find((m) => m.id === savedModelId);
        if (savedModel) {
          onModelSelect(savedModelId, modelSupportsImages(savedModel));
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    } finally {
      setLoading(false);
    }
  };

  const modelSupportsImages = (model: OpenRouterModel): boolean => {
    // Check architecture modality for image support
    const modality = model.architecture?.modality?.toLowerCase() || "";
    return (
      modality.includes("image") ||
      modality.includes("multimodal") ||
      modality.includes("vision")
    );
  };

  const allModels = useMemo(() => {
    if (!models) return [];
    return [...models.paid, ...models.free];
  }, [models]);

  const selectedModel = useMemo(() => {
    if (!selectedModelId || !models) return null;
    return allModels.find((m) => m.id === selectedModelId) || null;
  }, [selectedModelId, allModels, models]);

  const filterModels = (modelList: OpenRouterModel[]) => {
    if (!searchQuery) return modelList;
    const query = searchQuery.toLowerCase();
    return modelList.filter(
      (m) =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query)
    );
  };

  const handleSelectModel = (model: OpenRouterModel) => {
    localStorage.setItem(STORAGE_KEY, model.id);
    onModelSelect(model.id, modelSupportsImages(model));
    setOpen(false);
    setSearchQuery("");
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return "Free";
    return `$${(num * 1000000).toFixed(2)}/M`;
  };

  const ModelCard = ({ model }: { model: OpenRouterModel }) => {
    const isSelected = selectedModelId === model.id;
    const supportsImages = modelSupportsImages(model);

    return (
      <button
        type="button"
        onClick={() => handleSelectModel(model)}
        className={cn(
          "w-full p-3 rounded-xl text-left transition-all duration-200 border",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-transparent hover:bg-muted/50"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{model.name}</p>
              {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
              {model.id}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
            <Layers className="w-3 h-3 mr-1 opacity-70" />
            {(model.context_length / 1000).toFixed(0)}K
          </Badge>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
            <DollarSign className="w-3 h-3 mr-1 opacity-70" />
            {formatPrice(model.pricing.prompt)}
          </Badge>
          {supportsImages && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-blue-500/10 text-blue-600">
              <ImageIcon className="w-3 h-3 mr-1" />
              Vision
            </Badge>
          )}
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 gap-2 rounded-full">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">Loading models...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 gap-2 rounded-full max-w-[200px]",
            !selectedModel && "border-dashed border-amber-500/50 text-amber-600"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs truncate">
            {selectedModel ? selectedModel.name : "Select model"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 rounded-2xl" align="start">
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-muted/30 border-transparent"
            />
          </div>
        </div>
        <Tabs defaultValue="paid" className="w-full">
          <div className="px-3 pt-2">
            <TabsList className="w-full h-8 bg-muted/30 rounded-lg p-0.5">
              <TabsTrigger value="paid" className="flex-1 h-7 text-xs rounded-md">
                Paid ({models?.paid.length || 0})
              </TabsTrigger>
              <TabsTrigger value="free" className="flex-1 h-7 text-xs rounded-md">
                Free ({models?.free.length || 0})
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="paid" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="p-2 space-y-1">
                {filterModels(models?.paid || []).map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="free" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="p-2 space-y-1">
                {filterModels(models?.free || []).map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
