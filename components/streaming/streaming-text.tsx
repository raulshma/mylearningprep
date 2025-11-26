'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
  onComplete?: (text: string) => void;
  className?: string;
}

/**
 * StreamingText component for displaying text content during streaming
 * Works with the new @ai-sdk/react-based streaming hooks
 */
export function StreamingText({ content, isStreaming = false, className }: StreamingTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('whitespace-pre-wrap', className)}
    >
      {content}
      {isStreaming && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block w-2 h-4 bg-primary ml-0.5 align-middle"
        />
      )}
    </motion.div>
  );
}
