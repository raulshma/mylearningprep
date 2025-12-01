'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Video,
  FileText,
  GraduationCap,
  Globe,
  ExternalLink,
  Clock,
  DollarSign,
  Star,
  Loader2,
  Filter,
  Search,
  Lightbulb,
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
import { useLearningResources, type LearningResourcesResult } from '@/hooks/use-ai-tools';

interface LearningResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const popularTopics = [
  "React Hooks",
  "System Design",
  "Data Structures",
  "Kubernetes",
  "Machine Learning",
  "TypeScript",
  "AWS",
  "GraphQL",
];

export function LearningResourcesDialog({ open, onOpenChange }: LearningResourcesDialogProps) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const { data, status, error, activeTools, execute, reset } = useLearningResources();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    await execute({
      topic,
      level,
    });
  };

  const handleClose = () => {
    reset();
    setTopic('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-rose-500" />
            Learning Resource Aggregator
          </DialogTitle>
          <DialogDescription>
            Find the best tutorials, courses, documentation, and practice resources for any topic.
          </DialogDescription>
        </DialogHeader>

        {!data && status !== 'loading' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Topic to Learn</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., React hooks, System design, GraphQL, Machine learning"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Popular Topics</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {popularTopics.map((t: string) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Skill Level</label>
              <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner - New to the topic</SelectItem>
                  <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                  <SelectItem value="advanced">Advanced - Deep dive required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Find Resources
            </Button>
          </form>
        )}

        {status === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Finding the best learning resources...</p>
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
          <LearningResourcesResults data={data} onReset={reset} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LearningResource {
  title: string;
  type: string;
  url?: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  isFree: boolean;
  provider?: string;
}

function LearningResourcesResults({
  data,
  onReset,
}: {
  data: LearningResourcesResult;
  onReset: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');

  const resourceTypeIcons: Record<string, typeof Video> = {
    video: Video,
    article: FileText,
    course: GraduationCap,
    documentation: Globe,
    book: BookOpen,
    interactive: Star,
    tutorial: FileText,
    practice: Star,
  };

  // Flatten all resources into a single array
  const allResources: Array<LearningResource & { category: string }> = [
    ...data.resources.documentation.map((r) => ({ ...r, category: 'documentation' })),
    ...data.resources.tutorials.map((r) => ({ ...r, category: 'tutorial' })),
    ...data.resources.videos.map((r) => ({ ...r, category: 'video' })),
    ...data.resources.courses.map((r) => ({ ...r, category: 'course' })),
    ...data.resources.books.map((r) => ({ ...r, category: 'book' })),
    ...data.resources.practice.map((r) => ({ ...r, category: 'practice' })),
  ];

  const filteredResources = allResources.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'free') return r.isFree;
    return !r.isFree;
  });

  const totalResources = allResources.length;
  const freeCount = allResources.filter((r) => r.isFree).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-2">Resources for: {data.topic}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {totalResources} resources found
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {freeCount} free resources
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              Level: {data.level}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Learning Path Overview */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Suggested Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.learningPath.map((pathStep, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {pathStep.step}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{pathStep.title}</p>
                  <p className="text-sm text-muted-foreground">{pathStep.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-primary">{pathStep.estimatedTime}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="free">Free Only</SelectItem>
            <SelectItem value="paid">Paid Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resources Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({filteredResources.length})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({data.resources.courses.length})</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials ({data.resources.tutorials.length})</TabsTrigger>
          <TabsTrigger value="docs">Docs ({data.resources.documentation.length})</TabsTrigger>
          <TabsTrigger value="videos">Videos ({data.resources.videos.length})</TabsTrigger>
          <TabsTrigger value="practice">Practice ({data.resources.practice.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ResourceGrid
            resources={filteredResources}
            icons={resourceTypeIcons}
          />
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <ResourceGrid
            resources={data.resources.courses.filter((r) =>
              filter === 'all' ? true : filter === 'free' ? r.isFree : !r.isFree
            ).map((r) => ({ ...r, category: 'course' }))}
            icons={resourceTypeIcons}
          />
        </TabsContent>

        <TabsContent value="tutorials" className="mt-4">
          <ResourceGrid
            resources={data.resources.tutorials.filter((r) =>
              filter === 'all' ? true : filter === 'free' ? r.isFree : !r.isFree
            ).map((r) => ({ ...r, category: 'tutorial' }))}
            icons={resourceTypeIcons}
          />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <ResourceGrid
            resources={data.resources.documentation.filter((r) =>
              filter === 'all' ? true : filter === 'free' ? r.isFree : !r.isFree
            ).map((r) => ({ ...r, category: 'documentation' }))}
            icons={resourceTypeIcons}
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <ResourceGrid
            resources={data.resources.videos.filter((r) =>
              filter === 'all' ? true : filter === 'free' ? r.isFree : !r.isFree
            ).map((r) => ({ ...r, category: 'video' }))}
            icons={resourceTypeIcons}
          />
        </TabsContent>

        <TabsContent value="practice" className="mt-4">
          <ResourceGrid
            resources={data.resources.practice.filter((r) =>
              filter === 'all' ? true : filter === 'free' ? r.isFree : !r.isFree
            ).map((r) => ({ ...r, category: 'practice' }))}
            icons={resourceTypeIcons}
          />
        </TabsContent>
      </Tabs>

      {/* Tips */}
      {data.tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Learning Tips
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

      <Button variant="outline" onClick={onReset} className="w-full">
        Search Another Topic
      </Button>
    </div>
  );
}

function ResourceGrid({
  resources,
  icons,
}: {
  resources: Array<LearningResource & { category: string }>;
  icons: Record<string, typeof Video>;
}) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No resources found with current filter
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {resources.map((resource, i: number) => {
        const Icon = icons[resource.type] || icons[resource.category] || BookOpen;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{resource.title}</h4>
                      {resource.provider && (
                        <p className="text-xs text-muted-foreground">{resource.provider}</p>
                      )}
                    </div>
                  </div>
                  {resource.isFree ? (
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      Free
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      Paid
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {resource.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{resource.estimatedTime}</span>
                    <span className="mx-1">•</span>
                    <Badge variant="outline" className="text-xs">
                      {resource.difficulty}
                    </Badge>
                  </div>
                  {resource.url && (
                    <Button variant="ghost" size="sm" asChild className="h-8">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
