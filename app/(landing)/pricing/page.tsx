'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, HelpCircle, Key, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createCheckout } from '@/lib/actions/stripe';
import { toast } from 'sonner';
import { Header } from '@/components/landing/header';
import { Footer } from '@/components/landing/footer';
import { 
  PRICING_TIERS, 
  COMPARISON_FEATURES, 
  PRICING_FAQS, 
  formatPrice,
  type PricingTier 
} from '@/lib/pricing-data';

function PricingCard({ tier, index }: { tier: PricingTier; index: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleSubscribe = async () => {
    if (!tier.plan) {
      router.push(tier.href || '/onboarding');
      return;
    }

    if (!isSignedIn) {
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
    <motion.div
      className={`bg-background p-8 flex flex-col relative ${
        tier.featured ? 'ring-1 ring-foreground' : ''
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {tier.badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          {tier.badge}
        </Badge>
      )}

      <div className="mb-6">
        <h3 className="font-mono text-xl text-foreground mb-1">{tier.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-mono text-foreground">{formatPrice(tier.price)}</span>
          <span className="text-muted-foreground">{tier.period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {tier.features.map((feature) => (
          <li key={feature.name} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
    </motion.div>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-4 px-4 font-mono text-foreground">Feature</th>
            {PRICING_TIERS.map((tier) => (
              <th key={tier.id} className="text-center py-4 px-4 font-mono text-foreground">
                {tier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_FEATURES.map((feature, index) => (
            <tr key={feature.name} className={index < COMPARISON_FEATURES.length - 1 ? 'border-b border-border' : ''}>
              <td className="py-4 px-4 text-muted-foreground">{feature.name}</td>
              {(['free', 'pro', 'max'] as const).map((plan) => {
                const value = feature[plan];
                return (
                  <td key={plan} className="py-4 px-4 text-center">
                    {typeof value === 'boolean' ? (
                      value ? (
                        <Check className="w-4 h-4 mx-auto text-foreground" />
                      ) : (
                        <X className="w-4 h-4 mx-auto text-muted-foreground" />
                      )
                    ) : (
                      <span className="text-foreground">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="inline-flex items-center gap-2 border border-border bg-secondary/50 px-4 py-2 mb-6 text-sm">
                <span className="text-muted-foreground">Pricing</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-mono text-foreground mb-4">
                Simple, transparent pricing
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Start free, upgrade when you need more. No hidden fees, no surprises.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-6 bg-secondary/30">
          <div className="max-w-5xl mx-auto">
            <TooltipProvider>
              <div className="grid md:grid-cols-3 gap-px bg-border">
                {PRICING_TIERS.map((tier, index) => (
                  <PricingCard key={tier.id} tier={tier} index={index} />
                ))}
              </div>
            </TooltipProvider>
          </div>
        </section>

        {/* Plan Comparison */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-mono text-foreground mb-4">Plan Comparison</h2>
              <p className="text-muted-foreground">See exactly what you get with each plan</p>
            </motion.div>
            <ComparisonTable />
          </div>
        </section>

        {/* BYOK Notice */}
        <section className="py-16 px-6 bg-secondary/30">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2 mb-4">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bring Your Own Key</span>
            </div>
            <h2 className="text-2xl font-mono text-foreground mb-3">Use your own API keys</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              With the Max plan, you can use your own OpenRouter API key. This gives you full control over
              costs and lets you use the latest models.
            </p>
          </motion.div>
        </section>

        {/* FAQs */}
        <section className="py-24 px-6">
          <div className="max-w-2xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-mono text-foreground mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">Everything you need to know</p>
            </motion.div>
            <div className="divide-y divide-border border-y border-border">
              {PRICING_FAQS.map((faq, index) => (
                <motion.div 
                  key={faq.question} 
                  className="py-6"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <h3 className="font-mono text-foreground mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 bg-secondary/30">
          <motion.div 
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-mono text-foreground mb-4">Ready to ace your interview?</h2>
            <p className="text-muted-foreground mb-8">
              Start preparing today with our free plan. No credit card required.
            </p>
            <Link href="/onboarding">
              <Button size="lg">Get Started Free</Button>
            </Link>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
