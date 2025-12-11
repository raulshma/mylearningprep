'use client';

import { useEffect } from 'react';
import { BarChart3, Crown, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function AnalyticsUpgradePrompt() {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      badge: 'Analytics',
      badgeIcon: BarChart3,
      title: 'Your Insights',
      description: 'Track your interview preparation progress',
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
          <div className="absolute inset-0 bg-amber-500/5" />
          <CardContent className="p-12 flex flex-col items-center text-center relative z-10">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-8 ring-1 ring-amber-500/20">
              <Lock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">Unlock Premium Insights</h2>
            <p className="text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
              Get detailed analytics and visualizations to track your interview preparation journey with our MAX plan.
            </p>
            <Button asChild size="lg" className="rounded-full h-12 px-8 text-base font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300 bg-amber-500 hover:bg-amber-600 border-0">
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
