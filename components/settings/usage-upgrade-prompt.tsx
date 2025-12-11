'use client';

import { useEffect } from 'react';
import { Activity, Crown, Lock, Sparkles, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function UsageUpgradePrompt() {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      badge: 'Usage',
      badgeIcon: Activity,
      title: 'AI Usage',
      description: 'Monitor your AI request logs and costs',
    });
  }, [setHeader]);

  return (
    <div className="max-w-4xl mx-auto py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-2xl shadow-black/10 dark:shadow-black/30 bg-zinc-900 text-white rounded-[2.5rem] overflow-hidden relative">
          {/* Background Effects */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />

          <CardContent className="p-12 md:p-16 flex flex-col md:flex-row items-center gap-12 relative z-10">
            {/* Left Side: Content */}
            <div className="flex-1 text-center md:text-left space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium">
                  <Crown className="w-3.5 h-3.5" />
                  <span>MAX Plan Exclusive</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Unlock detailed <br />
                  <span className="text-amber-400">
                    AI insights.
                  </span>
                </h2>
                <p className="text-lg text-zinc-400 max-w-md mx-auto md:mx-0 leading-relaxed">
                  Gain full visibility into your AI usage with real-time logs, token analytics, and cost breakdowns.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  "Real-time request logging",
                  "Detailed token usage analytics",
                  "Cost tracking per model",
                  "Performance & latency metrics"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-zinc-300">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Button asChild size="lg" className="rounded-full h-14 px-10 text-lg font-semibold bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all duration-300 shadow-xl shadow-white/10 border-0">
                  <Link href="/settings/upgrade" className="flex items-center gap-2">
                    Upgrade to MAX
                  </Link>
                </Button>
                <p className="mt-4 text-sm text-zinc-500">
                  Starting at $29/month. Cancel anytime.
                </p>
              </div>
            </div>

            {/* Right Side: Visual */}
            <div className="flex-1 w-full max-w-md md:max-w-none relative">
              <div className="relative aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
                {/* Mock UI for Analytics */}
                <div className="absolute inset-0 p-6 flex flex-col gap-4 opacity-80">
                  {/* Header Mock */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-24 h-4 rounded-full bg-white/20" />
                    <div className="w-8 h-8 rounded-full bg-white/20" />
                  </div>

                  {/* Chart Mock */}
                  <div className="h-32 rounded-2xl bg-amber-500/15 border border-amber-500/20 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-amber-500/20" />
                    <svg className="absolute inset-0 w-full h-full text-amber-500/50" preserveAspectRatio="none">
                      <path d="M0,100 C50,80 100,90 150,60 C200,30 250,40 300,20 L300,128 L0,128 Z" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Stats Grid Mock */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-24 rounded-2xl bg-white/5 border border-white/10 p-4">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 mb-3" />
                      <div className="w-16 h-3 rounded-full bg-white/20 mb-2" />
                      <div className="w-10 h-2 rounded-full bg-white/10" />
                    </div>
                    <div className="h-24 rounded-2xl bg-white/5 border border-white/10 p-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 mb-3" />
                      <div className="w-16 h-3 rounded-full bg-white/20 mb-2" />
                      <div className="w-10 h-2 rounded-full bg-white/10" />
                    </div>
                    <div className="h-24 rounded-2xl bg-white/5 border border-white/10 p-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 mb-3" />
                      <div className="w-16 h-3 rounded-full bg-white/20 mb-2" />
                      <div className="w-10 h-2 rounded-full bg-white/10" />
                    </div>
                    <div className="h-24 rounded-2xl bg-white/5 border border-white/10 p-4">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 mb-3" />
                      <div className="w-16 h-3 rounded-full bg-white/20 mb-2" />
                      <div className="w-10 h-2 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>

                {/* Lock Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                  <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
