'use client';

import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Quiz Context for managing state
interface QuizContextType {
  selectedAnswer: string | null;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  selectAnswer: (answer: string) => void;
  submitAnswer: () => void;
  resetQuiz: () => void;
  correctAnswer: string | null;
  setCorrectAnswer: (answer: string) => void;
}

const QuizContext = createContext<QuizContextType | null>(null);

function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('Quiz components must be used within a Quiz');
  }
  return context;
}

interface QuizProps {
  id: string;
  children: React.ReactNode;
  onComplete?: (isCorrect: boolean) => void;
}

export function Quiz({ id, children, onComplete }: QuizProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  const selectAnswer = (answer: string) => {
    if (!isSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const submitAnswer = () => {
    if (selectedAnswer && correctAnswer) {
      const correct = selectedAnswer === correctAnswer;
      setIsCorrect(correct);
      setIsSubmitted(true);
      onComplete?.(correct);
    }
  };

  const resetQuiz = () => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setIsCorrect(null);
  };

  return (
    <QuizContext.Provider
      value={{
        selectedAnswer,
        isSubmitted,
        isCorrect,
        selectAnswer,
        submitAnswer,
        resetQuiz,
        correctAnswer,
        setCorrectAnswer,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-6 p-6 rounded-xl border border-border bg-card"
        data-quiz-id={id}
      >
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground mb-0 mt-0">Quick Check</h4>
        </div>
        {children}
        
        {/* Submit/Reset buttons */}
        <div className="flex items-center gap-3 mt-4">
          {!isSubmitted ? (
            <Button
              onClick={submitAnswer}
              disabled={!selectedAnswer}
              size="sm"
            >
              Check Answer
            </Button>
          ) : (
            <Button onClick={resetQuiz} variant="outline" size="sm">
              Try Again
            </Button>
          )}
          
          {/* Result feedback */}
          <AnimatePresence>
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium',
                  isCorrect ? 'text-green-500' : 'text-red-500'
                )}
              >
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct! +5 XP</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Not quite. Try again!</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </QuizContext.Provider>
  );
}

interface QuestionProps {
  children: React.ReactNode;
}

export function Question({ children }: QuestionProps) {
  return (
    <p className="text-base font-medium text-foreground mb-4">
      {children}
    </p>
  );
}

interface AnswerProps {
  children: React.ReactNode;
  correct?: boolean;
}

export function Answer({ children, correct }: AnswerProps) {
  const { 
    selectedAnswer, 
    isSubmitted, 
    selectAnswer, 
    setCorrectAnswer 
  } = useQuiz();
  
  const answerText = typeof children === 'string' ? children : String(children);
  const isSelected = selectedAnswer === answerText;
  
  // Register correct answer
  if (correct) {
    // Use effect-like pattern with ref to avoid re-renders
    if (setCorrectAnswer) {
      // This is a bit hacky but works for MDX context
      setTimeout(() => setCorrectAnswer(answerText), 0);
    }
  }

  return (
    <motion.button
      onClick={() => selectAnswer(answerText)}
      disabled={isSubmitted}
      whileHover={!isSubmitted ? { scale: 1.01 } : {}}
      whileTap={!isSubmitted ? { scale: 0.99 } : {}}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors mb-2',
        'flex items-center gap-3',
        isSelected && !isSubmitted && 'border-primary bg-primary/10',
        !isSelected && !isSubmitted && 'border-border hover:border-muted-foreground/50',
        isSubmitted && isSelected && correct && 'border-green-500 bg-green-500/10',
        isSubmitted && isSelected && !correct && 'border-red-500 bg-red-500/10',
        isSubmitted && !isSelected && correct && 'border-green-500/50 bg-green-500/5',
        isSubmitted && 'cursor-not-allowed'
      )}
    >
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
          isSelected ? 'border-primary' : 'border-muted-foreground/40'
        )}
      >
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2.5 h-2.5 rounded-full bg-primary"
          />
        )}
      </div>
      <span className="text-sm text-foreground">{children}</span>
      {isSubmitted && correct && (
        <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
      )}
    </motion.button>
  );
}
