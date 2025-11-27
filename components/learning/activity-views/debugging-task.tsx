'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, ChevronRight, Lightbulb, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { DebuggingTask } from '@/lib/db/schemas/learning-path';

interface DebuggingTaskViewProps {
  content: DebuggingTask;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}

export function DebuggingTaskView({ content, onComplete }: DebuggingTaskViewProps) {
  const [fixedCode, setFixedCode] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);

  const handleRevealHint = (index: number) => {
    if (!revealedHints.includes(index)) {
      setRevealedHints([...revealedHints, index]);
    }
  };

  const handleSubmit = () => {
    onComplete(fixedCode);
  };

  return (
    <div className="space-y-6">
      {/* Expected Behavior */}
      <div className="p-4 border border-primary/30 bg-primary/5">
        <h4 className="text-sm font-mono text-primary mb-2 flex items-center gap-2">
          <Bug className="w-4 h-4" />
          Expected Behavior
        </h4>
        <p className="text-foreground">{content.expectedBehavior}</p>
      </div>

      {/* Buggy Code */}
      <div className="space-y-2">
        <h4 className="text-sm font-mono text-muted-foreground">Buggy Code</h4>
        <div className="relative">
          <pre className="text-sm font-mono text-foreground bg-secondary/50 p-4 overflow-x-auto border border-destructive/30">
            {content.buggyCode}
          </pre>
          <div className="absolute top-2 right-2">
            <span className="text-xs px-2 py-1 bg-destructive/20 text-destructive font-mono">
              Contains Bug(s)
            </span>
          </div>
        </div>
      </div>

      {/* Hints */}
      {content.hints && content.hints.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHints(!showHints)}
            className="gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            {showHints ? 'Hide Hints' : 'Show Hints'}
            {showHints ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          {showHints && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              {content.hints.map((hint, index) => (
                <div
                  key={index}
                  className="p-3 border border-border bg-secondary/20"
                >
                  {revealedHints.includes(index) ? (
                    <p className="text-sm text-foreground">{hint}</p>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevealHint(index)}
                      className="text-muted-foreground"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Reveal Hint {index + 1}
                    </Button>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Fixed Code Input */}
      <div className="space-y-2">
        <h4 className="text-sm font-mono text-muted-foreground">Your Fixed Code</h4>
        <Textarea
          value={fixedCode}
          onChange={(e) => setFixedCode(e.target.value)}
          placeholder="Paste or write your fixed code here..."
          className="font-mono min-h-[200px] bg-secondary/30 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleSubmit}>
          Submit Fix
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
