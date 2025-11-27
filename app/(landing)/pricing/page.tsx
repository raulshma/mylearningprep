'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Key, Loader2, Sparkles, Zap, Crown } from 'lucide-react';
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

const tierIcons = {
  free: Sparkles,
  pro: Zap,
  max: Crown,
};

const tierGradients = {
  free: 'from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950',
  pro: 'from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-violet-950/50',
  max: 'from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/50 dark:via-orange-950/50 dark:to-rose-950/50',
};

const tierAccents = {
  free: 'text-neutral-600 dark:text-neutral-400',
  pro: 'text-blue-600 dark:text-blue-400',
  max: 'text-amber-600 dark:text-amber-400',
};

function ApplePricingCard({ tier, index }: { tier: PricingTier; index: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const Icon = tierIcons[tier.id];

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
      className="relative group"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.15,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect for featured */}
      {tier.featured && (
        <div className="absolute -inset-px bg-gradient-to-b from-blue-500/20 via-indigo-500/20 to-violet-500/20 rounded-[2.5rem] blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      
      <div
        className={`relative h-full bg-gradient-to-b ${tierGradients[tier.id]} rounded-[2rem] p-8 md:p-10 flex flex-col overflow-hidden transition-all duration-500 ${
          tier.featured 
            ? 'ring-2 ring-blue-500/50 dark:ring-blue-400/50 shadow-2xl shadow-blue-500/10' 
            : 'ring-1 ring-border/50 hover:ring-border shadow-lg hover:shadow-xl'
        }`}
      >
        {/* Badge */}
        {tier.badge && (
          <motion.div 
            className="absolute top-6 right-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-full">
              <Zap className="w-3 h-3" />
              {tier.badge}
            </span>
          </motion.div>
        )}

        {/* Icon */}
        <motion.div 
          className={`w-14 h-14 rounded-2xl bg-background/80 backdrop-blur flex items-center justify-center mb-6 ${tierAccents[tier.id]}`}
          animate={{ 
            scale: isHovered ? 1.05 : 1,
            rotate: isHovered ? 5 : 0 
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-7 h-7" />
        </motion.div>

        {/* Tier name & description */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-foreground mb-2">{tier.name}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{tier.description}</p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground">
              ${tier.price}
            </span>
            <span className="text-muted-foreground text-lg">{tier.period}</span>
          </div>
          {tier.price > 0 && (
            <p className="text-xs text-muted-foreground mt-2">Billed monthly. Cancel anytime.</p>
          )}
        </div>

        {/* CTA Button */}
        {tier.href && !tier.plan ? (
          <Link href={tier.href} className="mb-8">
            <Button 
              size="lg" 
              className={`w-full h-14 text-base font-medium rounded-2xl transition-all duration-300 ${
                tier.featured 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30' 
                  : 'bg-foreground text-background hover:opacity-90'
              }`}
            >
              {tier.cta}
            </Button>
          </Link>
        ) : (
          <Button
            size="lg"
            className={`w-full h-14 text-base font-medium rounded-2xl mb-8 transition-all duration-300 ${
              tier.featured 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30' 
                : 'bg-foreground text-background hover:opacity-90'
            }`}
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              tier.cta
            )}
          </Button>
        )}

        {/* Features */}
        <ul className="space-y-4 flex-1">
          {tier.features.slice(0, 6).map((feature, i) => (
            <motion.li 
              key={feature.name} 
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 + i * 0.05 }}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                feature.included 
                  ? tier.featured ? 'bg-blue-600 text-white' : 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Check className="w-3 h-3" />
              </div>
              <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                {feature.name}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function FAQItem({ faq, index }: { faq: typeof PRICING_FAQS[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className="border-b border-border last:border-0"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <button
        className="w-full py-6 flex items-center justify-between text-left group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors pr-4">
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-muted-foreground leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section - Apple style with large typography */}
        <section className="pt-20 pb-8 md:pt-32 md:pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.p
              className="text-blue-600 dark:text-blue-400 font-medium mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Pricing
            </motion.p>
            <motion.h1
              className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Choose your plan.
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Start free and upgrade as you grow. Simple pricing, no surprises.
            </motion.p>
          </div>
        </section>

        {/* Pricing Cards - Product showcase style */}
        <section className="py-12 md:py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {PRICING_TIERS.map((tier, index) => (
                <ApplePricingCard key={tier.id} tier={tier} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section - Clean table */}
        <section className="py-20 md:py-32 px-6 bg-secondary/30">
          <div className="max-w-5xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
                Compare plans
              </h2>
              <p className="text-lg text-muted-foreground">
                Find the perfect plan for your interview prep journey.
              </p>
            </motion.div>

            <motion.div
              className="bg-background rounded-3xl overflow-hidden ring-1 ring-border shadow-xl"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Table Header */}
              <div className="grid grid-cols-4 border-b border-border">
                <div className="p-6 md:p-8">
                  <span className="text-sm font-medium text-muted-foreground">Features</span>
                </div>
                {PRICING_TIERS.map((tier) => (
                  <div key={tier.id} className={`p-6 md:p-8 text-center ${tier.featured ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                    <span className="text-sm font-semibold text-foreground">{tier.name}</span>
                    <p className="text-2xl font-semibold text-foreground mt-1">${tier.price}</p>
                  </div>
                ))}
              </div>

              {/* Table Body */}
              {COMPARISON_FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  className={`grid grid-cols-4 ${index < COMPARISON_FEATURES.length - 1 ? 'border-b border-border' : ''}`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="p-4 md:p-6 flex items-center">
                    <span className="text-sm text-foreground">{feature.name}</span>
                  </div>
                  {(['free', 'pro', 'max'] as const).map((plan) => {
                    const value = feature[plan];
                    const tier = PRICING_TIERS.find(t => t.id === plan);
                    return (
                      <div 
                        key={plan} 
                        className={`p-4 md:p-6 flex items-center justify-center ${tier?.featured ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                      >
                        {typeof value === 'boolean' ? (
                          value ? (
                            <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-background" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-sm font-medium text-foreground">{value}</span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* BYOK Feature Highlight */}
        <section className="py-20 md:py-32 px-6">
          <motion.div 
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-rose-950/30 rounded-[2.5rem] p-10 md:p-16 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-orange-200/30 dark:from-amber-800/20 dark:to-orange-800/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-200/30 to-pink-200/30 dark:from-rose-800/20 dark:to-pink-800/20 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/50 rounded-full mb-6">
                  <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Max Plan Feature</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
                  Bring Your Own Key
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8">
                  Use your own OpenRouter API key for complete control over costs and access to the latest AI models. 
                  Perfect for power users who want maximum flexibility.
                </p>
                
                <Link href="/onboarding">
                  <Button size="lg" className="h-14 px-8 text-base font-medium rounded-2xl bg-foreground text-background hover:opacity-90">
                    Get Max Plan
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 md:py-32 px-6 bg-secondary/30">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
                Questions? Answers.
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about our plans.
              </p>
            </motion.div>

            <motion.div
              className="bg-background rounded-3xl p-6 md:p-10 ring-1 ring-border shadow-lg"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {PRICING_FAQS.map((faq, index) => (
                <FAQItem key={faq.question} faq={faq} index={index} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-40 px-6">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Ready to ace your next interview?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
              Join thousands of developers preparing smarter with AI-powered interview prep.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/onboarding">
                <Button size="lg" className="h-14 px-10 text-base font-medium rounded-2xl bg-foreground text-background hover:opacity-90 w-full sm:w-auto">
                  Start Free
                </Button>
              </Link>
              <Link href="#compare">
                <Button size="lg" variant="outline" className="h-14 px-10 text-base font-medium rounded-2xl w-full sm:w-auto">
                  Compare Plans
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
