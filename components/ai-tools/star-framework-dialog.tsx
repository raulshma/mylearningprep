'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Target,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Star,
  Lightbulb,
  Loader2,
  Copy,
  Check,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActiveTools } from '@/components/streaming/tool-status';
import { useSTARFramework, type STARFrameworkResult } from '@/hooks/use-ai-tools';
import { cn } from '@/lib/utils';

interface STARFrameworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sampleSituations = [
  "Led a project to migrate our monolith to microservices",
  "Resolved a critical production outage affecting thousands of users",
  "Mentored a junior developer who struggled with performance reviews",
  "Disagreed with team lead on technical approach for a feature",
  "Had to quickly learn a new technology to deliver a project",
];

export function STARFrameworkDialog({ open, onOpenChange }: STARFrameworkDialogProps) {
  const [situation, setSituation] = useState('');
  const [questionType, setQuestionType] = useState('');
  const { data, status, error, activeTools, execute, reset } = useSTARFramework();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!situation) return;

    await execute({
      situation,
      questionType: questionType || undefined,
    });
  };

  const handleClose = () => {
    reset();
    setSituation('');
    setQuestionType('');
    onOpenChange(false);
  };

  const selectSampleSituation = (s: string) => {
    setSituation(s);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            STAR Framework Builder
          </DialogTitle>
          <DialogDescription>
            Transform your experience into a structured STAR response for behavioral interviews.
          </DialogDescription>
        </DialogHeader>

        {!data && status !== 'loading' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Describe Your Situation</label>
              <Textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="e.g., Led a project to migrate our monolith to microservices..."
                className="mt-1 min-h-20"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Describe a real experience you had - we&apos;ll structure it using STAR
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Sample Situations</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {sampleSituations.map((s: string, i: number) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => selectSampleSituation(s)}
                  >
                    {s.slice(0, 35)}...
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Question Type (Optional)</label>
              <Input
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                placeholder="e.g., Leadership, Conflict resolution, Problem solving..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Helps tailor the response to specific interview question types
              </p>
            </div>

            <Button type="submit" className="w-full">
              Build STAR Response
            </Button>
          </form>
        )}

        {status === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Building your STAR framework...</p>
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
          <STARFrameworkResults data={data} onReset={reset} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function STARFrameworkResults({
  data,
  onReset,
}: {
  data: STARFrameworkResult;
  onReset: () => void;
}) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showImproved, setShowImproved] = useState(false);

  const copySection = async (section: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyImproved = async () => {
    await navigator.clipboard.writeText(data.improvedVersion);
    setCopiedSection('improved');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sections = [
    {
      key: 'situation',
      title: 'Situation',
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      content: data.situation,
    },
    {
      key: 'task',
      title: 'Task',
      icon: ClipboardList,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      content: data.task,
    },
    {
      key: 'action',
      title: 'Action',
      icon: Star,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      content: data.action,
    },
    {
      key: 'result',
      title: 'Result',
      icon: CheckCircle2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      content: data.result,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Original Situation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-medium">Your Original Input</p>
              <p className="text-muted-foreground">{data.originalSituation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STAR Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section, i) => (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className={cn('p-2 rounded-lg', section.bgColor)}>
                      <section.icon className={cn('h-4 w-4', section.color)} />
                    </div>
                    {section.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copySection(section.key, section.content)}
                  >
                    {copiedSection === section.key ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{section.content}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Metrics */}
      {data.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Key Metrics to Mention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.metrics.map((metric: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                  {metric}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {data.tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Delivery Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.tips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 font-medium">{i + 1}.</span>
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Follow-up Preparation */}
      {data.followUpPreparation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Prepare for Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {data.followUpPreparation.map((item, i: number) => (
                <li
                  key={i}
                  className="p-3 rounded-lg bg-muted/50"
                >
                  <p className="text-sm font-medium text-primary mb-2">
                    Q: {item.question}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.suggestedResponse}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Improved Version */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Polished Full Response</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImproved(!showImproved)}
              >
                {showImproved ? 'Hide' : 'Show'} Response
              </Button>
              {showImproved && (
                <Button variant="outline" size="sm" onClick={copyImproved}>
                  {copiedSection === 'improved' ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {showImproved && (
          <CardContent>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {data.improvedVersion}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Button variant="outline" onClick={onReset} className="w-full">
        Build Another Response
      </Button>
    </div>
  );
}
