'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight, CheckCircle2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { ConceptExplanation } from '@/lib/db/schemas/learning-path';

interface ConceptExplanationViewProps {
  content: ConceptExplanation;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}

export function ConceptExplanationView({ content, onComplete }: ConceptExplanationViewProps) {
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set());

  const handleCheckPoint = (index: number) => {
    const newChecked = new Set(checkedPoints);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedPoints(newChecked);
  };

  const allPointsChecked = checkedPoints.size === content.keyPoints.length;

  const handleComplete = () => {
    onComplete('read', true);
  };

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div className="p-6 border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm text-muted-foreground">Concept Explanation</span>
          </div>
          <div className="text-foreground whitespace-pre-wrap">{content.content}</div>
        </div>
      </div>

      {/* Key Points */}
      <div className="p-4 border border-primary/30 bg-primary/5">
        <h4 className="text-sm font-mono text-primary mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Key Points to Remember
        </h4>
        <div className="space-y-3">
          {content.keyPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3"
            >
              <Checkbox
                id={`point-${index}`}
                checked={checkedPoints.has(index)}
                onCheckedChange={() => handleCheckPoint(index)}
                className="mt-0.5"
              />
              <label
                htmlFor={`point-${index}`}
                className={`text-sm cursor-pointer transition-colors ${
                  checkedPoints.has(index)
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                }`}
              >
                {point}
              </label>
            </motion.div>
          ))}
        </div>
        {allPointsChecked && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-green-500 mt-4 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Great! You've reviewed all key points.
          </motion.p>
        )}
      </div>

      {/* Examples */}
      {content.examples && content.examples.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-mono text-muted-foreground">Examples</h4>
          {content.examples.map((example, index) => (
            <div
              key={index}
              className="p-4 border border-border bg-secondary/30"
            >
              <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                {example}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleComplete}>
          I've Understood This
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
