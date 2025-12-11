'use client';

import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyConceptProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Key Concept Component
 * Highlights important concepts that learners should remember
 */
export function KeyConcept({ title, children, icon }: KeyConceptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 p-5 rounded-xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          {icon || <Lightbulb className="w-5 h-5 text-primary" />}
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-2 mt-0">{title}</h4>
          <div className="text-sm text-muted-foreground [&>p]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
