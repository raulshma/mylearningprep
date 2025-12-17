'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, 
  Clock, 
  TrendingUp, 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  ChevronDown,
  ChevronRight,
  Target,
  BookOpen,
  Sparkles,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import { getPublicJourneyBySlug } from '@/lib/actions/public-journeys';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { useMDXComponents } from '@/mdx-components';
import type { PublicJourney, PublicJourneyNode } from '@/lib/db/schemas/visibility';

/**
 * Render a card for a journey node (milestone or topic) including header metadata and an optional expandable
 * list of learning objectives.
 *
 * When expanded, the card shows each objective's title, a "content" badge if the objective is public, and
 * renders MDX content for objectives that include MDX.
 *
 * @param node - The public journey node to display (milestone or topic), including title, description,
 *   difficulty, estimatedMinutes, and learningObjectives.
 * @param index - Zero-based position of this card in the list; used to stagger entrance animation.
 * @param isExpanded - Whether the card is currently expanded to reveal learning objectives.
 * @param onToggle - Callback invoked when the card header is clicked to toggle expansion.
 * @returns A JSX element representing the rendered milestone/topic card.
 */

function MilestoneCard({ 
  node, 
  index,
  isExpanded,
  onToggle 
}: { 
  node: PublicJourneyNode; 
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isMilestone = node.type === 'milestone';
  const mdxComponents = useMDXComponents({});
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group"
    >
      <div 
        className={`bg-card rounded-2xl border border-border/60 overflow-hidden transition-all duration-300 ${
          isExpanded ? 'ring-2 ring-primary/20' : 'hover:border-primary/20 hover:shadow-md'
        }`}
      >
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full p-5 flex items-start gap-4 text-left"
        >
          <div className={`p-3 rounded-xl shrink-0 ${
            isMilestone 
              ? 'bg-primary/10 text-primary' 
              : 'bg-secondary text-muted-foreground'
          }`}>
            {isMilestone ? <Target className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {node.type}
              </Badge>
              {node.difficulty && (
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  {node.difficulty}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {node.title}
            </h3>
            {node.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {node.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {node.estimatedMinutes} min
              </span>
              {node.learningObjectives.length > 0 && (
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {node.learningObjectives.length} objectives
                </span>
              )}
            </div>
          </div>
          
          <div className="shrink-0 p-2">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </button>
        
        {/* Expanded Content - Learning Objectives */}
        <AnimatePresence>
          {isExpanded && node.learningObjectives.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0">
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Learning Objectives
                  </h4>
                  <ul className="space-y-2">
                    {node.learningObjectives.map((objective, objIndex) => (
                      <li 
                        key={objIndex}
                        className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-medium">
                          {objIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-foreground">{objective.title}</span>
                            {objective.contentPublic && (
                              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                content
                              </Badge>
                            )}
                          </div>

                          {objective.contentMdx && (
                            <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4">
                              <article className="prose prose-sm dark:prose-invert max-w-none">
                                <MDXRemote
                                  {...(objective.contentMdx as MDXRemoteSerializeResult)}
                                  components={mdxComponents}
                                />
                              </article>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


function NotFoundState() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 rounded-3xl bg-secondary/30 flex items-center justify-center mx-auto mb-8"
          >
            <Lock className="w-12 h-12 text-muted-foreground" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-foreground mb-4"
          >
            Journey Not Found
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground mb-8"
          >
            This journey doesn&apos;t exist or isn&apos;t publicly available.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/explore">
              <Button variant="outline" className="rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse Journeys
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button className="rounded-full">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PublicJourneyDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [journey, setJourney] = useState<PublicJourney | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadJourney() {
      try {
        const data = await getPublicJourneyBySlug(slug);
        if (!data) {
          setNotFoundState(true);
        } else {
          setJourney(data);
        }
      } catch (error) {
        console.error('Failed to load journey:', error);
        setNotFoundState(true);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (slug) {
      loadJourney();
    }
  }, [slug]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFoundState || !journey) {
    return <NotFoundState />;
  }

  // Separate milestones and topics
  const milestones = journey.nodes.filter(n => n.type === 'milestone');
  const topics = journey.nodes.filter(n => n.type !== 'milestone');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-12 pb-8 md:pt-20 md:pb-12 px-6 bg-linear-to-b from-secondary/30 to-background">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Link 
                href="/explore" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Journeys
              </Link>
            </motion.div>
            
            {/* Title & Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary" className="uppercase text-xs tracking-wider">
                  {journey.category}
                </Badge>
                <Badge variant="outline" className="uppercase text-xs tracking-wider">
                  {journey.difficulty}
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                {journey.title}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                {journey.description}
              </p>
              
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  <span>{journey.nodes.length} topics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{journey.estimatedHours} hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>
                    {journey.nodes.reduce((acc, n) => acc + n.learningObjectives.length, 0)} objectives
                  </span>
                </div>
              </div>
            </motion.div>
            
            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex flex-col sm:flex-row gap-4"
            >
              <Link href="/onboarding">
                <Button size="lg" className="rounded-full h-12 px-8">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Learning
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-8">
                  View Plans
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 md:py-20 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Milestones */}
            {milestones.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-1.5 h-6 rounded-full bg-primary" />
                  <h2 className="text-2xl font-bold tracking-tight">Milestones</h2>
                  <Badge variant="secondary" className="ml-2">{milestones.length}</Badge>
                </div>
                <div className="space-y-4">
                  {milestones.map((node, index) => (
                    <MilestoneCard
                      key={node.id}
                      node={node}
                      index={index}
                      isExpanded={expandedNodes.has(node.id)}
                      onToggle={() => toggleNode(node.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {topics.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-1.5 h-6 rounded-full bg-indigo-500" />
                  <h2 className="text-2xl font-bold tracking-tight">Topics</h2>
                  <Badge variant="secondary" className="ml-2">{topics.length}</Badge>
                </div>
                <div className="space-y-4">
                  {topics.map((node, index) => (
                    <MilestoneCard
                      key={node.id}
                      node={node}
                      index={index}
                      isExpanded={expandedNodes.has(node.id)}
                      onToggle={() => toggleNode(node.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {journey.nodes.length === 0 && (
              <div className="text-center py-16 bg-card/50 rounded-3xl border border-dashed border-border">
                <div className="w-16 h-16 rounded-2xl bg-secondary/30 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No public content yet</h3>
                <p className="text-muted-foreground">
                  This journey&apos;s content is being prepared. Check back soon!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-24 px-6 bg-secondary/20">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to master {journey.title}?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Sign up for free to track your progress, get AI assistance, and unlock the full learning experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/onboarding">
                <Button size="lg" className="h-14 px-10 text-base font-medium rounded-2xl bg-foreground text-background hover:opacity-90 w-full sm:w-auto">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" className="h-14 px-10 text-base font-medium rounded-2xl w-full sm:w-auto">
                  Explore More Journeys
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}