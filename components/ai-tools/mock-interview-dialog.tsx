'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Clock,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ActiveTools } from '@/components/streaming/tool-status';
import { useMockInterview, type MockInterviewResult } from '@/hooks/use-ai-tools';
import { cn } from '@/lib/utils';

interface MockInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MockInterviewDialog({ open, onOpenChange }: MockInterviewDialogProps) {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<'behavioral' | 'technical' | 'system-design' | 'mixed'>('mixed');
  const [difficulty, setDifficulty] = useState<'entry' | 'mid' | 'senior' | 'staff'>('mid');
  const [questionCount, setQuestionCount] = useState(5);
  const { data, status, error, activeTools, execute, reset } = useMockInterview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    await execute({
      role,
      company: company || undefined,
      type,
      difficulty,
      questionCount,
    });
  };

  const handleClose = () => {
    reset();
    setRole('');
    setCompany('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-500" />
            Mock Interview Generator
          </DialogTitle>
          <DialogDescription>
            Generate realistic interview questions with ideal answers, hints, and evaluation criteria.
          </DialogDescription>
        </DialogHeader>

        {!data && status !== 'loading' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Role *</label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company (optional)</label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Google, Meta"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Interview Type</label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="system-design">System Design</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Seniority Level</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="staff">Staff+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Questions</label>
                <Select
                  value={String(questionCount)}
                  onValueChange={(v) => setQuestionCount(Number(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 questions</SelectItem>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="7">7 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Generate Mock Interview
            </Button>
          </form>
        )}

        {status === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Preparing your mock interview...</p>
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
          <MockInterviewResults data={data} onReset={reset} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MockInterviewResults({ data, onReset }: { data: MockInterviewResult; onReset: () => void }) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{data.role}</h3>
              <p className="text-sm text-muted-foreground">
                {data.company} • {data.interviewType} Interview
              </p>
            </div>
            <Badge variant="outline">{data.questions.length} Questions</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      {data.tips.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Interview Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {data.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {data.questions.map((question, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <Collapsible open={expandedQuestions.has(index)}>
                <CollapsibleTrigger asChild>
                  <CardHeader
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleQuestion(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            Q{question.questionNumber}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {question.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              question.difficulty === 'hard' && 'border-red-500 text-red-500',
                              question.difficulty === 'medium' && 'border-yellow-500 text-yellow-500',
                              question.difficulty === 'easy' && 'border-green-500 text-green-500'
                            )}
                          >
                            {question.difficulty}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(question.timeLimit / 60)}m
                          </span>
                        </div>
                        <p className="font-medium">{question.question}</p>
                      </div>
                      {expandedQuestions.has(index) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Hints */}
                    {question.hints.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Hints
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {question.hints.map((hint, i) => (
                            <li key={i}>• {hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ideal Answer */}
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Ideal Answer
                      </h4>
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                        {question.idealAnswer}
                      </div>
                    </div>

                    {/* Evaluation Criteria */}
                    {question.evaluationCriteria.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">What Interviewers Look For</h4>
                        <div className="flex flex-wrap gap-2">
                          {question.evaluationCriteria.map((criteria, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {criteria}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-ups */}
                    {question.followUpQuestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                          Potential Follow-ups
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {question.followUpQuestions.map((followUp, i) => (
                            <li key={i}>• {followUp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Common Mistakes */}
      {data.commonMistakes.length > 0 && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Common Mistakes to Avoid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {data.commonMistakes.map((mistake, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-destructive">✕</span>
                  <span className="text-muted-foreground">{mistake}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onReset} className="w-full">
        Generate New Interview
      </Button>
    </div>
  );
}
