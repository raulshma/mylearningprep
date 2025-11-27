'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Loader2, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Activity, Reflection } from '@/lib/db/schemas/learning-path';

interface ReflectionFormProps {
  activity: Activity;
  onSubmit: (reflection: Omit<Reflection, 'timeTakenSeconds'>) => void;
  isSubmitting: boolean;
}

const difficultyLabels = [
  { value: 1, label: 'Too Easy', description: 'I could do this in my sleep' },
  { value: 2, label: 'Easy', description: 'Straightforward, no issues' },
  { value: 3, label: 'Just Right', description: 'Challenging but manageable' },
  { value: 4, label: 'Hard', description: 'Had to think carefully' },
  { value: 5, label: 'Too Hard', description: 'Really struggled with this' },
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="border border-border bg-card/80 backdrop-blur-sm"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-mono text-foreground">How did it go?</h3>
            <p className="text-sm text-muted-foreground">
              Your feedback helps us personalize your learning experience
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Completion Status */}
        <div className="space-y-3">
          <Label className="text-sm font-mono">Did you complete this activity?</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={completed === true ? 'default' : 'outline'}
              onClick={() => setCompleted(true)}
              className="flex-1"
            >
              Yes, I completed it
            </Button>
            <Button
              type="button"
              variant={completed === false ? 'default' : 'outline'}
              onClick={() => setCompleted(false)}
              className="flex-1"
            >
              No, I struggled
            </Button>
          </div>
        </div>

        {/* Difficulty Rating */}
        <div className="space-y-3">
          <Label className="text-sm font-mono">How difficult was this?</Label>
          <RadioGroup
            value={difficultyRating?.toString()}
            onValueChange={(value) => setDifficultyRating(parseInt(value))}
            className="grid grid-cols-1 sm:grid-cols-5 gap-2"
          >
            {difficultyLabels.map(({ value, label, description }) => (
              <div key={value}>
                <RadioGroupItem
                  value={value.toString()}
                  id={`difficulty-${value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`difficulty-${value}`}
                  className="flex flex-col items-center justify-center p-3 border border-border bg-secondary/30 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: value }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          difficultyRating === value
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-foreground">{label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Struggle Points */}
        <div className="space-y-2">
          <Label htmlFor="strugglePoints" className="text-sm font-mono">
            What did you struggle with? (optional)
          </Label>
          <Textarea
            id="strugglePoints"
            value={strugglePoints}
            onChange={(e) => setStrugglePoints(e.target.value)}
            placeholder="Describe any concepts or parts that were confusing..."
            className="min-h-[100px] bg-secondary/30 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This helps us identify areas where you might need more practice
          </p>
        </div>
      </div>

      <div className="p-6 border-t border-border">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Continue to Next Activity
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
