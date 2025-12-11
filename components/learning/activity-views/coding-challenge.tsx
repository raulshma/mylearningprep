'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, ChevronRight, Copy, Check, FileInput, FileOutput } from 'lucide-react';
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
import type { CodingChallenge } from '@/lib/db/schemas/learning-path';

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

interface CodingChallengeViewProps {
  content: CodingChallenge;
  language?: string;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}

export function CodingChallengeView({
  content,
  language: initialLanguage = 'typescript',
  onComplete
}: CodingChallengeViewProps) {
  const [code, setCode] = useState(content.starterCode || '');
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState(initialLanguage);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    onComplete(code);
  };

  return (
    <div className="space-y-8">
      {/* Problem Description */}
      <p className="text-2xl font-medium text-foreground leading-relaxed tracking-tight">
        {content.problemDescription}
      </p>

      {/* Input/Output Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-border/40 bg-secondary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <FileInput className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Input Format</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{content.inputFormat}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border border-border/40 bg-secondary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-green-500/10">
              <FileOutput className="w-4 h-4 text-green-600" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Output Format</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{content.outputFormat}</p>
        </motion.div>
      </div>

      {/* Sample Input/Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="group rounded-2xl border border-border/40 bg-background/50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-secondary/20">
            <h4 className="text-xs font-medium text-muted-foreground">Sample Input</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(content.sampleInput)}
              className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <pre className="p-5 text-sm font-mono text-foreground overflow-x-auto">
            {content.sampleInput}
          </pre>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/40 bg-background/50 overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-border/30 bg-secondary/20">
            <h4 className="text-xs font-medium text-muted-foreground">Expected Output</h4>
          </div>
          <pre className="p-5 text-sm font-mono text-foreground overflow-x-auto">
            {content.sampleOutput}
          </pre>
        </motion.div>
      </div>

      {/* Evaluation Criteria */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-6 rounded-2xl border border-primary/20 bg-primary/5"
      >
        <h4 className="text-sm font-semibold text-foreground mb-4">Evaluation Criteria</h4>
        <div className="flex flex-wrap gap-2">
          {content.evaluationCriteria.map((criteria, index) => (
            <Badge
              key={index}
              className="rounded-xl px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20"
            >
              {criteria}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Code Editor */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/50">
              <Code className="w-4 h-4 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Your Solution</h4>
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
        <div className="rounded-2xl border border-border/40 overflow-hidden shadow-sm">
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            height="400px"
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
          Submit Solution
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
