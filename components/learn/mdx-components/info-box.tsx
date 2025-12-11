'use client';

import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type InfoBoxType = 'tip' | 'warning' | 'info' | 'success' | 'fun-fact';

interface InfoBoxProps {
  type?: InfoBoxType;
  title?: string;
  children: React.ReactNode;
}

const boxStyles: Record<InfoBoxType, { 
  bg: string; 
  border: string; 
  icon: typeof Info; 
  iconColor: string;
  defaultTitle: string;
}> = {
  tip: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: Lightbulb,
    iconColor: 'text-yellow-500',
    defaultTitle: 'Tip',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    defaultTitle: 'Warning',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: Info,
    iconColor: 'text-blue-500',
    defaultTitle: 'Info',
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    defaultTitle: 'Success',
  },
  'fun-fact': {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: Sparkles,
    iconColor: 'text-purple-500',
    defaultTitle: 'Fun Fact',
  },
};

export function InfoBox({ type = 'info', title, children }: InfoBoxProps) {
  const style = boxStyles[type];
  const Icon = style.icon;
  const displayTitle = title || style.defaultTitle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border p-4 my-6',
        style.bg,
        style.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-1.5 rounded-lg', style.bg)}>
          <Icon className={cn('w-5 h-5', style.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold mb-1 mt-0', style.iconColor)}>
            {displayTitle}
          </h4>
          <div className="text-sm text-muted-foreground [&>p]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
