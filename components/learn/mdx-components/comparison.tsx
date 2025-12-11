'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ComparisonProps {
  left: {
    title: string;
    items: string[];
    variant?: 'positive' | 'negative' | 'neutral';
  };
  right: {
    title: string;
    items: string[];
    variant?: 'positive' | 'negative' | 'neutral';
  };
}

const variantStyles = {
  positive: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    title: 'text-green-500',
    bullet: 'bg-green-500',
  },
  negative: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    title: 'text-red-500',
    bullet: 'bg-red-500',
  },
  neutral: {
    bg: 'bg-secondary/50',
    border: 'border-border',
    title: 'text-foreground',
    bullet: 'bg-muted-foreground',
  },
};

/**
 * Comparison Component
 * Side-by-side comparison for explaining differences
 */
export function Comparison({ left, right }: ComparisonProps) {
  const leftStyle = variantStyles[left.variant || 'neutral'];
  const rightStyle = variantStyles[right.variant || 'neutral'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className={cn('p-4 rounded-xl border', leftStyle.bg, leftStyle.border)}>
        <h4 className={cn('font-semibold mb-3', leftStyle.title)}>{left.title}</h4>
        <ul className="space-y-2">
          {left.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', leftStyle.bullet)} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={cn('p-4 rounded-xl border', rightStyle.bg, rightStyle.border)}>
        <h4 className={cn('font-semibold mb-3', rightStyle.title)}>{right.title}</h4>
        <ul className="space-y-2">
          {right.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', rightStyle.bullet)} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
