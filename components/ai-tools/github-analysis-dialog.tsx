'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  FileCode,
  CheckCircle2,
  XCircle,
  BookOpen,
  MessageSquare,
  Lightbulb,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActiveTools } from '@/components/streaming/tool-status';
import { useGitHubAnalysis, type GitHubAnalysisResult } from '@/hooks/use-ai-tools';
import { cn } from '@/lib/utils';

interface GitHubAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubAnalysisDialog({ open, onOpenChange }: GitHubAnalysisDialogProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [focus, setFocus] = useState<'architecture' | 'interview-prep' | 'learning' | 'code-review'>('learning');
  const { data, status, error, activeTools, execute, reset } = useGitHubAnalysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    await execute({
      repoUrl,
      focus,
    });
  };

  const handleClose = () => {
    reset();
    setRepoUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5 text-slate-500" />
            GitHub Repository Analysis
          </DialogTitle>
          <DialogDescription>
            Analyze a repository to understand its architecture, technologies, and generate interview questions.
          </DialogDescription>
        </DialogHeader>

        {!data && status !== 'loading' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Repository URL or owner/repo</label>
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="e.g., https://github.com/vercel/next.js or vercel/next.js"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Analysis Focus</label>
              <Select value={focus} onValueChange={(v) => setFocus(v as typeof focus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learning">Learning - Understand the codebase</SelectItem>
                  <SelectItem value="interview-prep">Interview Prep - Generate questions</SelectItem>
                  <SelectItem value="architecture">Architecture - Analyze design patterns</SelectItem>
                  <SelectItem value="code-review">Code Review - Find improvements</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
              Analyze Repository
            </Button>
          </form>
        )}

        {status === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing repository...</p>
            <ActiveTools
              tools={activeTools.map((t) => ({ toolName: t.toolName, status: 'calling' }))}
              className="justify-center mt-4"
            />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" onClick={reset} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {data && (
          <GitHubAnalysisResults data={data} onReset={reset} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GitHubAnalysisResults({ data, onReset }: { data: GitHubAnalysisResult; onReset: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Github className="h-5 w-5" />
                {data.repoName}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
            </div>
            <Badge variant="secondary">{data.primaryLanguage}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Technologies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Technologies & Frameworks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.technologies.map((tech) => (
              <Badge key={tech} variant="outline">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Architecture */}
      {data.architecturePatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Architecture Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.architecturePatterns.map((pattern, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary">•</span>
                  <span className="text-muted-foreground">{pattern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Code Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Code Quality Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <QualityIndicator label="Tests" value={data.codeQualityIndicators.hasTests} />
            <QualityIndicator label="CI/CD" value={data.codeQualityIndicators.hasCI} />
            <QualityIndicator label="Documentation" value={data.codeQualityIndicators.hasDocumentation} />
            <QualityIndicator label="Linting" value={data.codeQualityIndicators.hasLinting} />
            <QualityIndicator label="TypeScript" value={data.codeQualityIndicators.hasTypeScript} />
          </div>
        </CardContent>
      </Card>

      {/* Key Files */}
      {data.keyFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Key Files to Understand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.keyFiles.map((file, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">{file.path}</code>
                  <span className="text-muted-foreground">{file.purpose}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Questions */}
      {data.interviewQuestions.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Interview Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.interviewQuestions.map((question, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-primary font-medium shrink-0">Q{i + 1}.</span>
                  <span>{question}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Learning Opportunities */}
      {data.learningOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learning Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.learningOpportunities.map((opportunity, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{opportunity}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suggested Improvements */}
      {data.suggestedImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Suggested Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.suggestedImprovements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500">→</span>
                  <span className="text-muted-foreground">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onReset} className="w-full">
        Analyze Another Repository
      </Button>
    </div>
  );
}

function QualityIndicator({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-md',
      value ? 'bg-green-500/10' : 'bg-muted'
    )}>
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={cn('text-sm', value ? 'text-green-500' : 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  );
}
