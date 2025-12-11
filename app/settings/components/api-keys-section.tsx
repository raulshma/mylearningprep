'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Trash2,
  AlertTriangle,
  Infinity,
  ExternalLink,
} from "lucide-react";
import { saveByokApiKey, removeByokApiKey } from "@/lib/actions/user";

import { canAccess } from "@/lib/utils/feature-gate";
import type { UserPlan } from "@/lib/db/schemas/user";
import type { AIProviderType } from "@/lib/ai/types";

interface ApiKeysSectionProps {
  hasByokKey: boolean;
  hasOpenRouterKey?: boolean;
  hasGoogleKey?: boolean;
  plan: UserPlan;
}

export function ApiKeysSection({ hasByokKey, hasOpenRouterKey, hasGoogleKey, plan }: ApiKeysSectionProps) {
  const byokAccess = canAccess("byok", plan);
  const router = useRouter();

  if (!byokAccess.allowed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
              <Key className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">API Keys</h2>
              <p className="text-sm text-muted-foreground">Bring Your Own Key</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Infinity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Unlimited Usage</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use your own API key for unlimited iterations
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">MAX Plan Required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  BYOK is only available on the MAX plan. Upgrade to unlock unlimited API usage with your own key.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="w-full h-11 rounded-full font-medium shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <a href="/settings/upgrade">Upgrade to MAX</a>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">Bring Your Own Key</p>
          </div>
        </div>
        {hasByokKey && (
          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/30 self-start sm:self-auto px-4 py-1.5 rounded-full">
            <Check className="w-3 h-3 mr-2" />
            Active
          </Badge>
        )}
      </div>

      <Tabs defaultValue="openrouter" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
          <TabsTrigger value="google">Google Gemini</TabsTrigger>
        </TabsList>
        
        <TabsContent value="openrouter">
          <ApiKeyForm 
            provider="openrouter"
            hasKey={!!hasOpenRouterKey}
            label="OpenRouter API Key"
            placeholder="sk-or-..."
            helpLink="https://openrouter.ai/keys"
            helpLabel="Get your key from openrouter.ai"
          />
        </TabsContent>
        
        <TabsContent value="google">
          <ApiKeyForm 
            provider="google"
            hasKey={!!hasGoogleKey}
            label="Google AI Studio Key"
            placeholder="AIza..."
            helpLink="https://aistudio.google.com/app/apikey"
            helpLabel="Get your key from Google AI Studio"
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

interface ApiKeyFormProps {
  provider: AIProviderType;
  hasKey: boolean;
  label: string;
  placeholder: string;
  helpLink: string;
  helpLabel: string;
}

function ApiKeyForm({ provider, hasKey, label, placeholder, helpLink, helpLabel }: ApiKeyFormProps) {
  const router = useRouter();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await saveByokApiKey(apiKey.trim(), provider);
      if (result.success) {
        setApiKey("");
        router.refresh();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("Failed to save API key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await removeByokApiKey(provider);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("Failed to remove API key");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* BYOK benefits */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Infinity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Unlimited Usage</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use your own {provider === 'google' ? 'Google' : 'OpenRouter'} key for unlimited iterations
          </p>
        </div>
      </div>

      {hasKey ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-green-500/5 border border-green-500/20">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">API key configured</p>
              <p className="text-xs text-muted-foreground mt-1">Your key is encrypted and stored securely</p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveApiKey}
            disabled={isLoading}
            className="w-full h-11 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Remove API Key
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <Label htmlFor={`apikey-${provider}`} className="text-sm font-medium text-foreground mb-2 block">
              {label}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id={`apikey-${provider}`}
                  type={showApiKey ? "text" : "password"}
                  placeholder={placeholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="h-11 rounded-xl bg-secondary/50 border-transparent focus:bg-background pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <a
              href={helpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-2 transition-colors"
            >
              {helpLabel}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </p>
          )}

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Usage will be billed directly by {provider === 'google' ? 'Google' : 'OpenRouter'}. Set up usage limits in your provider dashboard.
            </p>
          </div>

          <Button
            onClick={handleSaveApiKey}
            disabled={isLoading}
            className="w-full h-11 rounded-full font-medium shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save API Key
          </Button>
        </div>
      )}
    </div>
  );
}
