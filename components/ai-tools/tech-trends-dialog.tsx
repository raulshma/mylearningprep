'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  Building2,
  Award,
  BookOpen,
  Briefcase,
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActiveTools } from '@/components/streaming/tool-status';
import { useTechTrendsAnalysis, type TechTrendsResult } from '@/hooks/use-ai-tools';
import { cn } from '@/lib/utils';

interface TechTrendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TechTrendsDialog({ open, onOpenChange }: TechTrendsDialogProps) {
  const [technologies, setTechnologies] = useState('');
  const [context, setContext] = useState('');
  const { data, status, error, activeTools, execute, reset } = useTechTrendsAnalysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const techList = technologies.split(',').map((t) => t.trim()).filter(Boolean);
    if (techList.length === 0) return;

    await execute({
      technologies: techList,
      context: context || undefined,
    });
  };

  const handleClose = () => {
    reset();
    setTechnologies('');
    setContext('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            Technology Trend Analysis
          </DialogTitle>
          <DialogDescription>
            Analyze technology market trends, job demand, and growth trajectory to make informed learning decisions.
          </DialogDescription>
        </DialogHeader>

        {!data && status !== 'loading' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Technologies to Analyze</label>
              <Input
                value={technologies}
                onChange={(e) => setTechnologies(e.target.value)}
                placeholder="React, TypeScript, Go, Rust (comma separated)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter technologies separated by commas
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Context (optional)</label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., I'm a frontend developer looking to expand into backend development..."
                className="mt-1"
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full">
              Analyze Trends
            </Button>
          </form>
        )}

        {status === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing technology trends...</p>
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
          <TechTrendsResults data={data} onReset={reset} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TechTrendsResults({ data, onReset }: { data: TechTrendsResult; onReset: () => void }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Market Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Technology Cards */}
      <div className="grid gap-4">
        {data.trends.map((trend, index) => (
          <motion.div
            key={trend.technology}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{trend.technology}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        trend.growthTrend === 'rising' && 'border-green-500 text-green-500',
                        trend.growthTrend === 'declining' && 'border-red-500 text-red-500',
                        trend.growthTrend === 'stable' && 'border-yellow-500 text-yellow-500'
                      )}
                    >
                      {trend.growthTrend === 'rising' && <ArrowUp className="h-3 w-3 mr-1" />}
                      {trend.growthTrend === 'declining' && <ArrowDown className="h-3 w-3 mr-1" />}
                      {trend.growthTrend === 'stable' && <Minus className="h-3 w-3 mr-1" />}
                      {trend.growthTrend}
                    </Badge>
                    <Badge variant="secondary">
                      Popularity: {trend.popularityScore}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{trend.marketDemand}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                      <ArrowUp className="h-4 w-4 text-green-500" />
                      Strengths
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {trend.keyStrengths.slice(0, 3).map((strength, i) => (
                        <li key={i}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                      <ArrowDown className="h-4 w-4 text-red-500" />
                      Weaknesses
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {trend.keyWeaknesses.slice(0, 3).map((weakness, i) => (
                        <li key={i}>• {weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {trend.relatedSkills.slice(0, 5).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {skill}
                    </Badge>
                  ))}
                </div>

                {trend.companiesHiring.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Hiring:
                    </span>
                    {trend.companiesHiring.slice(0, 4).map((company) => (
                      <Badge key={company} variant="secondary" className="text-xs">
                        {company}
                      </Badge>
                    ))}
                  </div>
                )}

                {trend.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      Certifications:
                    </span>
                    {trend.certifications.slice(0, 3).map((cert) => (
                      <Badge key={cert} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-medium">{i + 1}.</span>
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onReset} className="w-full">
        Analyze More Technologies
      </Button>
    </div>
  );
}
