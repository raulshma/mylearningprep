'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  Server,
  Database,
  Cloud,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Loader2,
  Copy,
  Check,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActiveTools } from '@/components/streaming/tool-status';
import { useSystemDesign, type SystemDesignResult } from '@/hooks/use-ai-tools';
import { cn } from '@/lib/utils';

interface SystemDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemDesignDialog({ open, onOpenChange }: SystemDesignDialogProps) {
  const [system, setSystem] = useState('');
  const [scale, setScale] = useState<'startup' | 'medium' | 'large-scale'>('large-scale');
  const { data, status, error, activeTools, execute, reset } = useSystemDesign();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!system) return;

    await execute({
      system,
      scale,
    });
  };

  const handleClose = () => {
    reset();
    setSystem('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-indigo-500" />
            System Design Generator
          </DialogTitle>
          <DialogDescription>
            Generate comprehensive system design templates for common interview problems.
          </DialogDescription>
        </DialogHeader>

        {!data && status !== 'loading' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">System to Design</label>
              <Input
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="e.g., URL shortener, Twitter feed, Payment system, Chat application"
                className="mt-1"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a system you want to design for interview practice
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Scale</label>
              <Select value={scale} onValueChange={(v) => setScale(v as typeof scale)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup - Simple, quick to implement</SelectItem>
                  <SelectItem value="medium">Medium - Moderate scale, some optimization</SelectItem>
                  <SelectItem value="large-scale">Large Scale - High availability, distributed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
              Generate System Design
            </Button>
          </form>
        )}

        {status === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Designing your system...</p>
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
          <SystemDesignResults data={data} onReset={reset} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SystemDesignResults({ data, onReset }: { data: SystemDesignResult; onReset: () => void }) {
  const [copiedDiagram, setCopiedDiagram] = useState(false);

  const copyDiagram = async () => {
    await navigator.clipboard.writeText(data.diagram);
    setCopiedDiagram(true);
    setTimeout(() => setCopiedDiagram(false), 2000);
  };

  const componentTypeIcons: Record<string, typeof Server> = {
    client: Cloud,
    server: Server,
    database: Database,
    cache: Database,
    queue: Server,
    cdn: Cloud,
    loadBalancer: Network,
    service: Server,
    storage: Database,
    other: Server,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold">{data.systemName}</h3>
          <p className="text-muted-foreground mt-2">{data.overview}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="requirements" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
          <TabsTrigger value="tradeoffs">Tradeoffs</TabsTrigger>
          <TabsTrigger value="diagram">Diagram</TabsTrigger>
        </TabsList>

        {/* Requirements */}
        <TabsContent value="requirements" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Functional Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.requirements.functional.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Non-Functional Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.requirements.nonFunctional.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {data.estimations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capacity Estimations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {data.estimations.qps && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{data.estimations.qps}</p>
                      <p className="text-xs text-muted-foreground">QPS</p>
                    </div>
                  )}
                  {data.estimations.storage && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{data.estimations.storage}</p>
                      <p className="text-xs text-muted-foreground">Storage</p>
                    </div>
                  )}
                  {data.estimations.bandwidth && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{data.estimations.bandwidth}</p>
                      <p className="text-xs text-muted-foreground">Bandwidth</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Components */}
        <TabsContent value="components" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {data.components.map((component, i) => {
              const Icon = componentTypeIcons[component.type] || Server;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{component.name}</CardTitle>
                          <Badge variant="outline" className="text-xs mt-1">
                            {component.type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{component.description}</p>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium mb-1">Responsibilities:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {component.responsibilities.slice(0, 3).map((r, j) => (
                              <li key={j}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {component.technologies.map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Data Flow */}
        <TabsContent value="dataflow" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {data.dataFlow.map((flow, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                  >
                    <Badge variant="outline" className="shrink-0">{flow.from}</Badge>
                    <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                    <Badge variant="outline" className="shrink-0">{flow.to}</Badge>
                    <span className="text-sm text-muted-foreground flex-1">{flow.description}</span>
                    {flow.protocol && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {flow.protocol}
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Scalability Considerations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.scalabilityConsiderations.map((consideration, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-500">→</span>
                    <span className="text-muted-foreground">{consideration}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tradeoffs */}
        <TabsContent value="tradeoffs" className="space-y-4 mt-4">
          {data.tradeoffs.map((tradeoff, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{tradeoff.decision}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-green-500 mb-2">Pros</p>
                      <ul className="space-y-1">
                        {tradeoff.pros.map((pro, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-500 mb-2">Cons</p>
                      <ul className="space-y-1">
                        {tradeoff.cons.map((con, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* Diagram */}
        <TabsContent value="diagram" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Architecture Diagram (Mermaid)</CardTitle>
                <Button variant="outline" size="sm" onClick={copyDiagram}>
                  {copiedDiagram ? (
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
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{data.diagram}</code>
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Paste this into a Mermaid renderer (like mermaid.live) to visualize the diagram.
              </p>
            </CardContent>
          </Card>

          {data.interviewTips.length > 0 && (
            <Card className="mt-4 bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Interview Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.interviewTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-medium">{i + 1}.</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Button variant="outline" onClick={onReset} className="w-full">
        Design Another System
      </Button>
    </div>
  );
}
