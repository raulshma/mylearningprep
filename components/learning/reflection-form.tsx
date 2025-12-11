'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Loader2, Star, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Activity, Reflection } from '@/lib/db/schemas/learning-path';

interface ReflectionFormProps {
  activity: Activity;
  onSubmit: (reflection: Omit<Reflection, 'timeTakenSeconds'>) => void;
  isSubmitting: boolean;
}

const difficultyLevels = [
  { value: 1, label: 'Too Easy', emoji: '😴' },
  { value: 2, label: 'Easy', emoji: '😊' },
  { value: 3, label: 'Just Right', emoji: '👍' },
  { value: 4, label: 'Hard', emoji: '🤔' },
  { value: 5, label: 'Too Hard', emoji: '😰' },
];

export function ReflectionForm({ activity, onSubmit, isSubmitting }: ReflectionFormProps) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null);
  const [strugglePoints, setStrugglePoints] = useState('');

  const canSubmit = completed !== null && difficultyRating !== null;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      completed: completed!,
      difficultyRating: difficultyRating!,
      strugglePoints: strugglePoints.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-xl shadow-black/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-border/30 bg-primary/5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <MessageSquare className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">How did it go?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your feedback helps personalize your learning
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Completion Status */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">
            Did you complete this activity?
          </label>
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              type="button"
              onClick={() => setCompleted(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                completed === true
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-border/40 bg-secondary/20 hover:border-border hover:bg-secondary/40'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  completed === true ? 'bg-green-500/20' : 'bg-secondary/50'
                }`}>
                  <ThumbsUp className={`w-6 h-6 ${completed === true ? 'text-green-600' : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-sm font-medium ${completed === true ? 'text-green-600' : 'text-foreground'}`}>
                  Yes, I got it!
                </span>
              </div>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setCompleted(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                completed === false
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-border/40 bg-secondary/20 hover:border-border hover:bg-secondary/40'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  completed === false ? 'bg-amber-500/20' : 'bg-secondary/50'
                }`}>
                  <ThumbsDown className={`w-6 h-6 ${completed === false ? 'text-amber-600' : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-sm font-medium ${completed === false ? 'text-amber-600' : 'text-foreground'}`}>
                  I struggled
                </span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Difficulty Rating */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">
            How difficult was this?
          </label>
          <div className="flex gap-2">
            {difficultyLevels.map(({ value, label, emoji }) => (
              <motion.button
                key={value}
                type="button"
                onClick={() => setDifficultyRating(value)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all duration-300 ${
                  difficultyRating === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border/40 bg-secondary/20 hover:border-border hover:bg-secondary/40'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: value }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          difficultyRating === value
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground/50'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    difficultyRating === value ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {label}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Struggle Points */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            What did you struggle with? <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            value={strugglePoints}
            onChange={(e) => setStrugglePoints(e.target.value)}
            placeholder="Describe any concepts or parts that were confusing..."
            className="min-h-[120px] rounded-2xl bg-secondary/20 border-border/40 resize-none text-base placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground">
            This helps us identify areas where you might need more practice
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 border-t border-border/30 bg-secondary/10">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          size="lg"
          className="w-full rounded-xl h-14 text-base font-medium shadow-lg shadow-primary/20 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue to Next Activity
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
