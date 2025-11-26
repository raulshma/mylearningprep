import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicPlan } from '@/lib/actions/public';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  BookOpen, 
  HelpCircle, 
  Zap, 
  Calendar, 
  Building2, 
  Briefcase,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { PlanMarkdown } from './plan-content';

interface PublicPlanPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Generate SEO metadata for public plan pages
 * Requirements: 7.2 - Server-render the page for SEO optimization
 */
export async function generateMetadata({ params }: PublicPlanPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicPlan(id);
  
  if (!result.success) {
    return {
      title: 'Plan Not Found | SyntaxState',
      description: 'This interview preparation plan is not available.',
    };
  }

  const plan = result.data;
  const title = `${plan.jobDetails.title} at ${plan.jobDetails.company} | SyntaxState`;
  const description = `AI-generated interview preparation plan for ${plan.jobDetails.title} position at ${plan.jobDetails.company}. Includes revision topics, MCQs, and rapid-fire questions.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'SyntaxState',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}


/**
 * Public Plan Page - Server-rendered for SEO
 * Requirements: 7.1, 7.2, 7.4
 * - 7.1: Make accessible via /plan/[id] URL
 * - 7.2: Server-render the page for SEO optimization
 * - 7.4: Display content with CTA for non-authenticated users
 */
export default async function PublicPlanPage({ params }: PublicPlanPageProps) {
  const { id } = await params;
  const result = await getPublicPlan(id);

  if (!result.success) {
    notFound();
  }

  const plan = result.data;
  const { jobDetails, modules, createdAt } = plan;
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate completion stats
  const topicsCount = modules.revisionTopics?.length ?? 0;
  const mcqsCount = modules.mcqs?.length ?? 0;
  const rapidFireCount = modules.rapidFire?.length ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 px-6 border-b border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
              <span className="mx-2">•</span>
              <Badge variant="secondary">Public Plan</Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-mono text-foreground mb-3">
              {jobDetails.title}
            </h1>
            
            <div className="flex items-center gap-2 text-muted-foreground mb-6">
              <Building2 className="w-4 h-4" />
              <span>{jobDetails.company}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-md">
              <div className="border border-border p-3 text-center">
                <p className="text-2xl font-mono text-foreground">{topicsCount}</p>
                <p className="text-xs text-muted-foreground">Topics</p>
              </div>
              <div className="border border-border p-3 text-center">
                <p className="text-2xl font-mono text-foreground">{mcqsCount}</p>
                <p className="text-xs text-muted-foreground">MCQs</p>
              </div>
              <div className="border border-border p-3 text-center">
                <p className="text-2xl font-mono text-foreground">{rapidFireCount}</p>
                <p className="text-xs text-muted-foreground">Rapid Fire</p>
              </div>
            </div>
          </div>
        </section>

        {/* Opening Brief */}
        {modules.openingBrief && (
          <section className="py-8 px-6 border-b border-border">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-lg">
                    <Target className="w-5 h-5" />
                    Opening Brief
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground leading-relaxed mb-4">
                    <PlanMarkdown content={modules.openingBrief.content} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Experience Match</p>
                      <p className="font-mono text-foreground">{modules.openingBrief.experienceMatch}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Key Skills</p>
                      <p className="font-mono text-foreground text-sm">
                        {modules.openingBrief.keySkills.slice(0, 3).join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Prep Time</p>
                      <p className="font-mono text-foreground">{modules.openingBrief.prepTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Revision Topics */}
        {modules.revisionTopics && modules.revisionTopics.length > 0 && (
          <section className="py-8 px-6 border-b border-border">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-foreground" />
                <h2 className="text-xl font-mono text-foreground">Revision Topics</h2>
              </div>
              <div className="space-y-3">
                {modules.revisionTopics.map((topic) => (
                  <Card key={topic.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-2 h-2 mt-2 flex-shrink-0 ${
                              topic.confidence === 'low'
                                ? 'bg-red-500'
                                : topic.confidence === 'medium'
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                          />
                          <div>
                            <p className="font-mono text-foreground mb-1">{topic.title}</p>
                            <p className="text-sm text-muted-foreground mb-2">{topic.reason}</p>
                            <div className="text-sm text-muted-foreground/80">
                              <PlanMarkdown content={topic.content} />
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize flex-shrink-0 ml-4">
                          {topic.confidence}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* MCQs */}
        {modules.mcqs && modules.mcqs.length > 0 && (
          <section className="py-8 px-6 border-b border-border">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <HelpCircle className="w-5 h-5 text-foreground" />
                <h2 className="text-xl font-mono text-foreground">Multiple Choice Questions</h2>
              </div>
              <div className="space-y-4">
                {modules.mcqs.map((mcq, index) => (
                  <Card key={mcq.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-mono text-foreground">
                          {index + 1}. {mcq.question}
                        </p>
                        {mcq.source === 'search' && (
                          <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                            Web
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        {mcq.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 border ${
                              option === mcq.answer
                                ? 'border-green-500/50 bg-green-500/10'
                                : 'border-border'
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground/70">Explanation:</span> {mcq.explanation}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Rapid Fire */}
        {modules.rapidFire && modules.rapidFire.length > 0 && (
          <section className="py-8 px-6 border-b border-border">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-foreground" />
                <h2 className="text-xl font-mono text-foreground">Rapid Fire Questions</h2>
              </div>
              <div className="space-y-2">
                {modules.rapidFire.map((q, index) => (
                  <Card key={q.id}>
                    <CardContent className="p-4">
                      <p className="font-mono text-foreground mb-1">
                        {index + 1}. {q.question}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground/70">A:</span> {q.answer}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section for non-authenticated users */}
        {/* Requirements: 7.4 - Display content with CTA for non-authenticated users */}
        <section className="py-16 px-6 bg-card">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 border border-border px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">AI-Powered Interview Prep</span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-mono text-foreground mb-4">
              Create your own interview prep plan
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Get personalized revision topics, MCQs, and rapid-fire questions tailored to your 
              target role and resume. Start preparing smarter today.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/onboarding">
                <Button size="lg" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  Create Your Plan
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
