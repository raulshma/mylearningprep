'use client';

import { useEffect } from 'react';
import { Activity, Crown, Lock } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-2xl shadow-black/10 dark:shadow-black/30 bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />
          <CardContent className="p-12 flex flex-col items-center text-center relative z-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mb-8 ring-1 ring-amber-500/20">
              <Lock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">Unlock AI Usage Insights</h2>
            <p className="text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
              Get detailed visibility into your AI requests, token usage, costs, and performance metrics with our MAX plan.
            </p>
            <div className="flex flex-col gap-3 text-left mb-8 w-full max-w-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Real-time request logs</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Token usage analytics</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Cost tracking & breakdown</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Model performance metrics</span>
              </div>
            </div>
            <Button asChild size="lg" className="rounded-full h-12 px-8 text-base font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border-0">
              <Link href="/settings/upgrade" className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Upgrade to MAX
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
