'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Check,
  Lock,
  Zap,
  FileDown,
  Key,
  Settings,
  Wand2,
  Palette,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { getAvailableFeatures, type PlanFeature } from '@/lib/utils/feature-gate';
import type { UserPlan } from '@/lib/db/schemas/user';

interface PlanFeaturesSectionProps {
  plan: UserPlan;
}

const FEATURE_INFO: Record<PlanFeature, { label: string; description: string; icon: React.ReactNode; minPlan: UserPlan }> = {
  analogy_all_styles: {
    label: 'All Analogy Styles',
    description: 'Professional, construction, and simple explanations',
    icon: <Wand2 className="w-5 h-5" />,
    minPlan: 'PRO',
  },
  pdf_export: {
    label: 'PDF Export',
    description: 'Export interview prep as downloadable PDF',
    icon: <FileDown className="w-5 h-5" />,
    minPlan: 'PRO',
  },
  byok: {
    label: 'Bring Your Own Key',
    description: 'Use your own OpenRouter API key',
    icon: <Key className="w-5 h-5" />,
    minPlan: 'MAX',
  },
  custom_prompts: {
    label: 'Custom System Prompts',
    description: 'Customize AI behavior with your instructions',
    icon: <Settings className="w-5 h-5" />,
    minPlan: 'MAX',
  },
  advanced_ai: {
    label: 'Advanced AI Generation',
    description: 'Higher-quality AI models for better content',
    icon: <Sparkles className="w-5 h-5" />,
    minPlan: 'PRO',
  },
  custom_theme: {
    label: 'Custom Theme',
    description: 'Personalize your workspace with custom shadcn/ui themes',
    icon: <Palette className="w-5 h-5" />,
    minPlan: 'PRO',
  },
  analytics: {
    label: 'Analytics & Insights',
    description: 'Track your preparation progress with visualizations',
    icon: <BarChart3 className="w-5 h-5" />,
    minPlan: 'MAX',
  },
};

const ALL_FEATURES: PlanFeature[] = [
  'analogy_all_styles',
  'pdf_export',
  'advanced_ai',
  'custom_theme',
  'analytics',
  'custom_prompts',
  'byok',
];

export function PlanFeaturesSection({ plan }: PlanFeaturesSectionProps) {
  const availableFeatures = getAvailableFeatures(plan);
  const isMaxPlan = plan === 'MAX';
  const isProPlan = plan === 'PRO';
  const isFreePlan = plan === 'FREE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Plan Features</h2>
          <p className="text-sm text-muted-foreground">
            Your {plan} plan includes:
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {ALL_FEATURES.map((feature) => {
          const info = FEATURE_INFO[feature];
          const isAvailable = availableFeatures.includes(feature);

          return (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                isAvailable
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border/30 bg-secondary/20 opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isAvailable
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted-foreground/10 text-muted-foreground'
                }`}
              >
                {info.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-semibold text-sm ${isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {info.label}
                  </p>
                  {isAvailable ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full">
                      {info.minPlan}+
                    </Badge>
                  )}
                </div>
                <p className={`text-xs ${isAvailable ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                  {info.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isFreePlan && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground mb-1">Unlock Premium Features</p>
            <p className="text-xs text-muted-foreground">
              Upgrade to PRO or MAX to access all features and unlock your full potential.
            </p>
          </div>
          <Button
            asChild
            className="h-10 rounded-full px-6 font-medium shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0"
          >
            <Link href="/settings/upgrade">Upgrade Now</Link>
          </Button>
        </div>
      )}

      {isProPlan && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20">
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground mb-1">Upgrade to MAX</p>
            <p className="text-xs text-muted-foreground">
              Get BYOK and custom system prompts with the MAX plan.
            </p>
          </div>
          <Button
            asChild
            className="h-10 rounded-full px-6 font-medium shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0 bg-purple-600 hover:bg-purple-700"
          >
            <Link href="/settings/upgrade">Upgrade to MAX</Link>
          </Button>
        </div>
      )}

      {isMaxPlan && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-green-500/5 border border-green-500/20">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            You have access to all premium features. Enjoy unlimited possibilities!
          </p>
        </div>
      )}
    </motion.div>
  );
}
