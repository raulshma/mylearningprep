'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, HelpCircle, Key, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createCheckout, type SubscriptionPlan } from '@/lib/actions/stripe';
import { toast } from 'sonner';

interface TierFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

interface Tier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: TierFeature[];
  cta: string;
  href?: string;
  plan?: SubscriptionPlan;
  badge?: string;
  featured?: boolean;
}

const tiers: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for trying out the platform',
    features: [
      { name: '3 interviews/month', included: true },
      { name: '5 iterations/month', included: true },
      { name: 'Basic AI generation', included: true },
      { name: 'Community preps access', included: true },
      { name: 'Standard analogies', included: true },
      { name: 'PDF export', included: false },
      { name: 'Priority generation', included: false },
      { name: 'BYOK option', included: false },
    ],
    cta: 'Get Started',
    href: '/onboarding',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For active job seekers',
    badge: 'Most Popular',
    features: [
      { name: '25 interviews/month', included: true },
      { name: '50 iterations/month', included: true },
      { name: 'Advanced AI generation', included: true },
      { name: 'Community preps access', included: true },
      { name: 'All analogy levels', included: true },
      { name: 'PDF export', included: true },
      { name: 'Priority generation', included: true },
      { name: 'BYOK option', included: false },
    ],
    cta: 'Subscribe to Pro',
    plan: 'PRO',
    featured: true,
  },
  {
    name: 'Max',
    price: '$39',
    period: '/month',
    description: 'For power users and teams',
    features: [
      { name: '100 interviews/month', included: true },
      { name: '500 iterations/month', included: true },
      { name: 'Everything in Pro', included: true },
      { name: 'BYOK option', included: true, tooltip: 'Bring Your Own Key - use your own OpenAI/Anthropic API keys' },
      { name: 'API access', included: true },
      { name: 'Team collaboration', included: true },
      { name: 'Custom system prompts', included: true },
      { name: 'Priority support', included: true },
    ],
    cta: 'Subscribe to Max',
    plan: 'MAX',
  },
];

const faqs = [
  {
    question: 'What happens when I run out of free preps?',
    answer: "You'll be prompted to upgrade to Pro or wait until the next month when your free preps reset.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.",
  },
  {
    question: 'What is BYOK?',
    answer:
      'Bring Your Own Key lets you use your own OpenAI or Anthropic API keys, giving you more control over costs and model selection.',
  },
  {
    question: 'Do you offer refunds?',
    answer: "We offer a 14-day money-back guarantee if you're not satisfied with the product.",
  },
];


function PricingCard({ tier }: { tier: Tier }) {
  const [isLoading, setIsLoading] = useState(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleSubscribe = async () => {
    if (!tier.plan) {
      // Free tier - redirect to onboarding
      router.push(tier.href || '/onboarding');
      return;
    }

    if (!isSignedIn) {
      // Redirect to login first
      router.push(`/login?redirect_url=/pricing`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCheckout(tier.plan);
      
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`bg-background p-8 flex flex-col relative ${
        tier.featured ? 'ring-1 ring-foreground' : ''
      }`}
    >
      {tier.badge && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{tier.badge}</Badge>}

      <div className="mb-6">
        <h3 className="font-mono text-xl text-foreground mb-1">{tier.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-mono text-foreground">{tier.price}</span>
          <span className="text-muted-foreground">{tier.period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {tier.features.map((feature) => (
          <li key={feature.name} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-4 h-4 text-foreground mt-0.5" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground mt-0.5" />
            )}
            <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
              {feature.name}
              {feature.tooltip && (
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 inline ml-1 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{feature.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
          </li>
        ))}
      </ul>

      {tier.href && !tier.plan ? (
        <Link href={tier.href}>
          <Button variant={tier.featured ? 'default' : 'outline'} className="w-full">
            {tier.cta}
          </Button>
        </Link>
      ) : (
        <Button
          variant={tier.featured ? 'default' : 'outline'}
          className="w-full"
          onClick={handleSubscribe}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            tier.cta
          )}
        </Button>
      )}
    </div>
  );
}


export default function PricingPage() {
  return (
    <main className="flex-1 overflow-auto">
        {/* Hero */}
        <section className="py-16 px-6 border-b border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-mono text-foreground mb-4">Simple, transparent pricing</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, no surprises.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <TooltipProvider>
              <div className="grid md:grid-cols-3 gap-px bg-border">
                {tiers.map((tier) => (
                  <PricingCard key={tier.name} tier={tier} />
                ))}
              </div>
            </TooltipProvider>
          </div>
        </section>

        {/* Plan Comparison */}
        <section className="py-16 px-6 border-y border-border bg-card">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-mono text-foreground mb-8 text-center">Plan Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-mono text-foreground">Feature</th>
                    <th className="text-center py-4 px-4 font-mono text-foreground">Free</th>
                    <th className="text-center py-4 px-4 font-mono text-foreground">Pro</th>
                    <th className="text-center py-4 px-4 font-mono text-foreground">Max</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-4 px-4 text-muted-foreground">Monthly Interviews</td>
                    <td className="py-4 px-4 text-center text-foreground">3</td>
                    <td className="py-4 px-4 text-center text-foreground">25</td>
                    <td className="py-4 px-4 text-center text-foreground">100</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-4 text-muted-foreground">Monthly Iterations</td>
                    <td className="py-4 px-4 text-center text-foreground">5</td>
                    <td className="py-4 px-4 text-center text-foreground">50</td>
                    <td className="py-4 px-4 text-center text-foreground">500</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-4 text-muted-foreground">AI Model</td>
                    <td className="py-4 px-4 text-center text-foreground">Standard</td>
                    <td className="py-4 px-4 text-center text-foreground">Advanced</td>
                    <td className="py-4 px-4 text-center text-foreground">Advanced</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-4 text-muted-foreground">Web Search</td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-foreground" /></td>
                    <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-foreground" /></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-4 text-muted-foreground">PDF Export</td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-foreground" /></td>
                    <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-foreground" /></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-4 text-muted-foreground">BYOK Support</td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-foreground" /></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-4 text-muted-foreground">API Access</td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-foreground" /></td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-muted-foreground">Priority Support</td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-muted-foreground" /></td>
                    <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-foreground" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>


        {/* BYOK Notice */}
        <section className="py-12 px-6 bg-background">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 border border-border px-4 py-2 mb-4">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bring Your Own Key</span>
            </div>
            <h2 className="text-xl font-mono text-foreground mb-3">Use your own API keys</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              With the Max plan, you can use your own OpenAI or Anthropic API keys. This gives you full control over
              costs and lets you use the latest models.
            </p>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-mono text-foreground mb-8 text-center">Frequently Asked Questions</h2>
            <div className="divide-y divide-border border-y border-border">
              {faqs.map((faq) => (
                <div key={faq.question} className="py-6">
                  <h3 className="font-mono text-foreground mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
    </main>
  );
}
