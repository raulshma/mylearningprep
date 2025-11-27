'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Question */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-lg text-foreground font-medium">{content.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {content.options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrectOption = option === content.correctAnswer;
          const showResult = isSubmitted;

          let optionClass = 'border-border hover:border-primary/50 bg-secondary/30';
          if (showResult) {
            if (isCorrectOption) {
              optionClass = 'border-green-500 bg-green-500/10';
            } else if (isSelected && !isCorrectOption) {
              optionClass = 'border-destructive bg-destructive/10';
            }
          } else if (isSelected) {
            optionClass = 'border-primary bg-primary/10';
          }

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => !isSubmitted && setSelectedOption(option)}
              disabled={isSubmitted}
              className={`w-full p-4 border text-left transition-all flex items-center gap-3 ${optionClass} ${
                isSubmitted ? 'cursor-default' : 'cursor-pointer'
              }`}
              whileHover={!isSubmitted ? { scale: 1.01 } : {}}
              whileTap={!isSubmitted ? { scale: 0.99 } : {}}
            >
              <div
                className={`w-8 h-8 flex items-center justify-center border text-sm font-mono ${
                  showResult && isCorrectOption
                    ? 'border-green-500 text-green-500'
                    : showResult && isSelected && !isCorrectOption
                    ? 'border-destructive text-destructive'
                    : isSelected
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {showResult && isCorrectOption ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : showResult && isSelected && !isCorrectOption ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </div>
              <span className="flex-1 text-foreground">{option}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 border ${
            isCorrect
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-destructive/30 bg-destructive/5'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-mono text-green-500">Correct!</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-destructive" />
                <span className="font-mono text-destructive">Incorrect</span>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{content.explanation}</p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!isSubmitted ? (
          <Button onClick={handleSubmit} disabled={!selectedOption}>
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleContinue}>
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
