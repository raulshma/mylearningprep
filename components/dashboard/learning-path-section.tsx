'use client';

import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { LearningPathCard } from './learning-path-card';
import type { LearningPath } from '@/lib/db/schemas/learning-path';

interface LearningPathSectionProps {
  learningPath: LearningPath | null;
}

export function LearningPathSection({ learningPath }: LearningPathSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="font-mono text-foreground">Learning Path</h2>
      </div>
      <LearningPathCard learningPath={learningPath} />
    </motion.div>
  );
}
