'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MCQActivity } from '@/lib/db/schemas/learning-path';

interface MCQActivityViewProps {
  content: MCQActivity;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}

export function MCQActivityView({ content, onComplete }: MCQActivityViewProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const isCorrect = selectedOption === content.correctAnswer;

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
    setShowExplanation(true);
  };

  const handleContinue = () => {
    onComplete(selectedOption || '', isCorrect);
  };

  return (
    <div className="space-y-8">
      {/* Question */}
      <p className="text-2xl font-medium text-foreground leading-relaxed tracking-tight">
        {content.question}
      </p>

      {/* Options */}
      <div className="space-y-3">
        {content.options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrectOption = option === content.correctAnswer;
          const showResult = isSubmitted;

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => !isSubmitted && setSelectedOption(option)}
              disabled={isSubmitted}
              className={`w-full text-left transition-all duration-300 ${
                isSubmitted ? 'cursor-default' : 'cursor-pointer'
              }`}
              whileHover={!isSubmitted ? { scale: 1.01 } : {}}
              whileTap={!isSubmitted ? { scale: 0.99 } : {}}
            >
              <div
                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                  showResult && isCorrectOption
                    ? 'border-green-500/50 bg-green-500/5'
                    : showResult && isSelected && !isCorrectOption
                    ? 'border-destructive/50 bg-destructive/5'
                    : isSelected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border/40 bg-secondary/20 hover:border-border hover:bg-secondary/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-medium text-sm transition-all duration-300 ${
                      showResult && isCorrectOption
                        ? 'bg-green-500 text-white'
                        : showResult && isSelected && !isCorrectOption
                        ? 'bg-destructive text-white'
                        : isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/60 text-muted-foreground'
                    }`}
                  >
                    {showResult && isCorrectOption ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : showResult && isSelected && !isCorrectOption ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                  <span className={`flex-1 text-base leading-relaxed ${
                    isSelected && !showResult ? 'text-foreground font-medium' : 'text-foreground/80'
                  }`}>
                    {option}
                  </span>
                  {isSelected && !showResult && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div
              className={`p-6 rounded-2xl border ${
                isCorrect
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-destructive/30 bg-destructive/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? 'bg-green-500/20' : 'bg-destructive/20'
                  }`}
                >
                  {isCorrect ? (
                    <Sparkles className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-destructive" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className={`text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-destructive'}`}>
                    {isCorrect ? 'Excellent!' : 'Not quite right'}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">{content.explanation}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end pt-4">
        {!isSubmitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedOption}
            size="lg"
            className="rounded-xl px-8 h-12 text-base font-medium shadow-lg shadow-primary/20 disabled:shadow-none"
          >
            Check Answer
          </Button>
        ) : (
          <Button
            onClick={handleContinue}
            size="lg"
            className="rounded-xl px-8 h-12 text-base font-medium gap-2 shadow-lg shadow-primary/20"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
