'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, ChevronRight, Lightbulb, Eye, EyeOff, AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CodeEditor } from '@/components/ui/code-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DebuggingTask } from '@/lib/db/schemas/learning-path';

const SUPPORTED_LANGUAGES = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'scala', label: 'Scala' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'shell', label: 'Shell/Bash' },
];

interface DebuggingTaskViewProps {
  content: DebuggingTask;
  language?: string;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}

export function DebuggingTaskView({ 
  content, 
  language: initialLanguage = 'typescript',
  onComplete 
}: DebuggingTaskViewProps) {
  const [fixedCode, setFixedCode] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [language, setLanguage] = useState(initialLanguage);

  const handleRevealHint = (index: number) => {
    if (!revealedHints.includes(index)) {
      setRevealedHints([...revealedHints, index]);
    }
  };

  const handleSubmit = () => {
    onComplete(fixedCode);
  };

  return (
    <div className="space-y-8">
      {/* Expected Behavior */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-primary/20 bg-primary/5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-primary/20">
            <Bug className="w-5 h-5 text-primary" />
          </div>
          <h4 className="text-base font-semibold text-foreground">Expected Behavior</h4>
        </div>
        <p className="text-lg text-foreground/80 leading-relaxed">{content.expectedBehavior}</p>
      </motion.div>

      {/* Buggy Code */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Buggy Code</h4>
          </div>
          <Badge className="rounded-xl px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive border-destructive/20">
            Contains Bug(s)
          </Badge>
        </div>
        <div className="rounded-2xl border-2 border-destructive/20 overflow-hidden">
          <CodeEditor
            value={content.buggyCode}
            language={language}
            height="200px"
            readOnly
          />
        </div>
      </motion.div>

      {/* Hints */}
      {content.hints && content.hints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <Button
            variant="outline"
            onClick={() => setShowHints(!showHints)}
            className="rounded-xl h-11 px-5 gap-2 border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
          >
            <Lightbulb className="w-4 h-4" />
            {showHints ? 'Hide Hints' : `Show Hints (${content.hints.length})`}
            {showHints ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          <AnimatePresence>
            {showHints && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {content.hints.map((hint, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5"
                  >
                    {revealedHints.includes(index) ? (
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-amber-600">{index + 1}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{hint}</p>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => handleRevealHint(index)}
                        className="w-full justify-start text-amber-600 hover:text-amber-600 hover:bg-amber-500/10 rounded-xl"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Reveal Hint {index + 1}
                      </Button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Fixed Code Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10">
              <Wrench className="w-4 h-4 text-green-600" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Your Fixed Code</h4>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl text-sm font-medium bg-secondary/30 border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-sm">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-2xl border-2 border-green-500/20 overflow-hidden">
          <CodeEditor
            value={fixedCode}
            onChange={setFixedCode}
            language={language}
            height="280px"
          />
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          size="lg"
          className="rounded-xl px-8 h-12 text-base font-medium gap-2 shadow-lg shadow-primary/20"
        >
          Submit Fix
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
