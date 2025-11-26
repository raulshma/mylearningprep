'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase, CheckCircle2, Clock } from 'lucide-react';
import { useSharedHeader } from './shared-header-context';
import { DashboardContent } from './dashboard-content';
import { ViewTransitionLink } from '@/components/transitions/view-transition-link';
import type { InterviewWithMeta } from '@/app/(sidebar)/dashboard/page';

interface DashboardPageContentProps {
  interviews: InterviewWithMeta[];
  stats: {
    total: number;
    active: number;
    completed: number;
  };
}

const statCards = [
  {
    key: 'total',
    label: 'Total Interviews',
    icon: Briefcase,
    color: 'text-foreground',
    bgColor: 'bg-secondary',
  },
  {
    key: 'active',
    label: 'In Progress',
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
] as const;

export function DashboardPageContent({ interviews, stats }: DashboardPageContentProps) {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      badge: 'Dashboard',
      badgeIcon: Briefcase,
      title: 'Your Interview Preps',
      description: stats.active > 0
        ? `You have ${stats.active} interview${stats.active > 1 ? 's' : ''} in progress`
        : 'Create your first interview prep to get started',
      actions: (
        <ViewTransitionLink href="/dashboard/new">
          <Button className="group">
            <Plus className="w-4 h-4 mr-2" />
            New Interview
          </Button>
        </ViewTransitionLink>
      ),
    });
  }, [stats.active, setHeader]);

  return (
    <>
      {/* Stats cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.key}
            className="group bg-card border border-border p-5 hover:border-primary/30 transition-all duration-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-mono text-foreground">{stats[stat.key]}</p>
              </div>
              <div
                className={`w-10 h-10 ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <DashboardContent interviews={interviews} />
    </>
  );
}
