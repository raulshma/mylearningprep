'use client';

import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreamingListProps<T> {
  items: T[];
  isStreaming?: boolean;
  renderItem: (item: T, index: number) => ReactNode;
  onComplete?: (items: T[]) => void;
  className?: string;
  itemClassName?: string;
  keyExtractor?: (item: T, index: number) => string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.15, ease: 'easeIn' as const }
  },
};

/**
 * StreamingList component for displaying list items during streaming
 * Works with the new @ai-sdk/react-based streaming hooks
 */
export function StreamingList<T>({
  items,
  isStreaming = false,
  renderItem,
  className,
  itemClassName,
  keyExtractor,
}: StreamingListProps<T>) {
  const getKey = (item: T, index: number): string => {
    if (keyExtractor) {
      return keyExtractor(item, index);
    }
    // Try to use common id fields
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      if ('id' in obj && typeof obj.id === 'string') {
        return obj.id;
      }
      if ('_id' in obj && typeof obj._id === 'string') {
        return obj._id;
      }
    }
    return `item-${index}`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={getKey(item, index)}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
            className={itemClassName}
            style={{ viewTransitionName: `streaming-item-${getKey(item, index)}` } as React.CSSProperties}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
      {isStreaming && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-muted-foreground text-sm"
        >
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-primary"
          />
          Loading more...
        </motion.div>
      )}
    </div>
  );
}
