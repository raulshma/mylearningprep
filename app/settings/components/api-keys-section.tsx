'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface ApiKeysSectionProps {
  hasByokKey: boolean;
  plan: string;
}

export function ApiKeysSection({ hasByokKey, plan }: ApiKeysSectionProps) {
  const router = useRouter();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(hasByokKey);
  const [error, setError] = useState<string | null>(null);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await saveByokApiKey(apiKey.trim());
      if (result.success) {
        setIsSaved(true);
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
      const result = await removeByokApiKey();
      if (result.success) {
        setIsSaved(false);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border p-6 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Key className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h2 className="font-mono text-lg text-foreground">API Keys</h2>
            <p className="text-xs text-muted-foreground">Bring Your Own Key</p>
          </div>
        </div>
        {isSaved && (
          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {/* BYOK benefits */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent border border-primary/20">
          <Infinity className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm font-mono text-foreground">Unlimited Usage</p>
            <p className="text-xs text-muted-foreground">
              Use your own OpenRouter key for unlimited iterations
            </p>
          </div>
        </div>

        {isSaved ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-foreground">API key configured</p>
                <p className="text-xs text-muted-foreground">Your key is encrypted and stored securely</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveApiKey}
              disabled={isLoading}
              className="w-full"
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="apikey" className="text-xs text-muted-foreground mb-2 block">
                OpenRouter API Key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apikey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-or-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono pr-10 bg-muted/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                Get your key from openrouter.ai
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Usage will be billed directly by OpenRouter. Set up usage limits in your provider dashboard.
              </p>
            </div>

            <Button 
              onClick={handleSaveApiKey} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save API Key
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
