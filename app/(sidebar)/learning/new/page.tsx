'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  Target,
  Brain,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { createLearningPath } from '@/lib/actions/learning-path';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';

const tips = [
  'Be specific about your learning goal',
  'Include the technology or framework you want to learn',
  'Mention your target level (beginner, intermediate, senior)',
  'Add context like "for interviews" or "for a project"',
];

const examples = [
  'Learn .NET for senior dev interviews',
  'Master React hooks and state management',
  'Understand system design patterns for distributed systems',
  'Learn TypeScript advanced types and generics',
];

export default function NewLearningPathPage() {
  const router = useRouter();
  const { setHeader } = useSharedHeader();

  // Form state
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set header on mount
  useEffect(() => {
    setHeader({
      badge: 'Learning Path',
      badgeIcon: BookOpen,
      title: 'Start Your Learning Journey',
      description: 'Create a personalized, adaptive learning path',
    });
  }, [setHeader]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation (minimum 10 characters per Requirements 1.5)
    if (goal.trim().length < 10) {
      setError('Please provide a more detailed goal (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createLearningPath(goal.trim());
      if (result.success) {
        router.push(`/learning/${result.data._id}`);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setGoal(example);
    setError(null);
  };

  const canSubmit = goal.trim().length >= 10;

  return (
    <div className="max-w-full px-4 md:px-0">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto hover:bg-destructive/20 p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        {/* Main form area */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          {/* Goal Input Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <form onSubmit={handleSubmit}>
              <div className="bg-card border border-border p-4 md:p-8 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-mono text-foreground">What do you want to learn?</h2>
                    <p className="text-sm text-muted-foreground">Describe your learning goal in detail</p>
                  </div>
                </div>
                <Textarea
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g., Learn .NET for senior dev interviews, focusing on dependency injection, LINQ, and async patterns..."
                  className="font-mono min-h-[140px] bg-secondary/30 border-border focus:border-primary/50 resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                  <p className="text-xs text-muted-foreground">
                    {goal.trim().length < 10
                      ? `${10 - goal.trim().length} more characters needed`
                      : '✓ Ready to create'}
                  </p>
                  <Button type="submit" disabled={!canSubmit || isSubmitting} className="w-full sm:w-auto min-h-[44px]">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Learning
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Example Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="bg-card border border-border p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h3 className="font-mono text-sm text-foreground">Example goals</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    disabled={isSubmitting}
                    className="text-xs px-3 py-2 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Side panel */}
        <motion.div
          className="lg:col-span-2 space-y-4 md:space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-mono text-sm text-foreground">Tips for best results</h3>
            </div>
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <motion.li
                  key={tip}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {tip}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-card to-secondary/20 border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="font-mono text-sm text-foreground">What you'll get</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Adaptive difficulty based on your performance
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                MCQs, coding challenges, and debugging tasks
              </li>
              <li className="flex items-center gap-2">
                <Target className="w-3 h-3" />
                Personalized topic selection
              </li>
              <li className="flex items-center gap-2">
                <Brain className="w-3 h-3" />
                Insights into strengths and weaknesses
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
