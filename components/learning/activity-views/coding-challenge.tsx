'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, ChevronRight, Copy, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { CodingChallenge } from '@/lib/db/schemas/learning-path';

interface CodingChallengeViewProps {
  content: CodingChallenge;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}

export function CodingChallengeView({ content, onComplete }: CodingChallengeViewProps) {
  const [code, setCode] = useState(content.starterCode || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    // For now, we just pass the code to the reflection form
    // In a real implementation, this could run tests
    onComplete(code);
  };

  return (
    <div className="space-y-6">
      {/* Problem Description */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-lg text-foreground font-medium">{content.problemDescription}</p>
      </div>

      {/* Input/Output Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-border bg-secondary/30">
          <h4 className="text-sm font-mono text-muted-foreground mb-2">Input Format</h4>
          <p className="text-sm text-foreground">{content.inputFormat}</p>
        </div>
        <div className="p-4 border border-border bg-secondary/30">
          <h4 className="text-sm font-mono text-muted-foreground mb-2">Output Format</h4>
          <p className="text-sm text-foreground">{content.outputFormat}</p>
        </div>
      </div>

      {/* Sample Input/Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-mono text-muted-foreground">Sample Input</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(content.sampleInput)}
              className="h-6 px-2"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <pre className="text-sm font-mono text-foreground bg-secondary/50 p-3 overflow-x-auto">
            {content.sampleInput}
          </pre>
        </div>
        <div className="p-4 border border-border bg-card">
          <h4 className="text-sm font-mono text-muted-foreground mb-2">Sample Output</h4>
          <pre className="text-sm font-mono text-foreground bg-secondary/50 p-3 overflow-x-auto">
            {content.sampleOutput}
          </pre>
        </div>
      </div>

      {/* Evaluation Criteria */}
      <div className="p-4 border border-border bg-secondary/20">
        <h4 className="text-sm font-mono text-muted-foreground mb-3">Evaluation Criteria</h4>
        <div className="flex flex-wrap gap-2">
          {content.evaluationCriteria.map((criteria, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {criteria}
            </Badge>
          ))}
        </div>
      </div>

      {/* Code Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <Code className="w-4 h-4" />
            Your Solution
          </h4>
        </div>
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Write your solution here..."
          className="font-mono min-h-[200px] bg-secondary/30 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleSubmit}>
          Submit Solution
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
