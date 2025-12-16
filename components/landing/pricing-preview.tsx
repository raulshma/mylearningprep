"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Crown, ArrowRight, AlertCircle } from "lucide-react";
import { PRICING_TIERS, formatPrice } from "@/lib/pricing-data";

const tierIcons = {
  free: Sparkles,
  pro: Zap,
  max: Crown,
};

const tierGradients = {
  free: "from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950",
  pro: "from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-violet-950/50",
  max: "from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/50 dark:via-orange-950/50 dark:to-rose-950/50",
};

const tierAccents = {
  free: "text-neutral-600 dark:text-neutral-400",
  pro: "text-blue-600 dark:text-blue-400",
  max: "text-amber-600 dark:text-amber-400",
};

export function PricingPreview() {
  return (
    <section className="py-24 md:py-32 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Test Environment Indicator */}
        <motion.div
          className="mb-8 py-3 px-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 text-center">
              This is a test environment. No real money will be deducted. Test card payments are accepted.
            </p>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-4">
            Pricing
          </p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {PRICING_TIERS.map((tier, index) => {
            const Icon = tierIcons[tier.id];

            return (
              <motion.div
                key={tier.id}
                className="relative group"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: index * 0.15,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Glow effect for featured */}
                {tier.featured && (
                  <div className="absolute -inset-px bg-linear-to-b from-blue-500/20 via-indigo-500/20 to-violet-500/20 rounded-[2.5rem] blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                )}

                <div
                  className={`relative h-full bg-linear-to-b ${
                    tierGradients[tier.id]
                  } rounded-4xl p-8 flex flex-col overflow-hidden transition-all duration-500 ${
                    tier.featured
                      ? "ring-2 ring-blue-500/50 dark:ring-blue-400/50 shadow-2xl shadow-blue-500/10"
                      : "ring-1 ring-border/50 hover:ring-border shadow-lg hover:shadow-xl"
                  }`}
                >
                  {/* Badge */}
                  {tier.badge && (
                    <motion.div
                      className="absolute top-6 right-6"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                        <Zap className="w-3 h-3" />
                        {tier.badge}
                      </span>
                    </motion.div>
                  )}

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center mb-5 ${
                      tierAccents[tier.id]
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Tier name */}
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {tier.shortDescription}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
                      ${tier.price}
                    </span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.previewFeatures.map((feature, i) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            tier.featured
                              ? "bg-blue-600 text-white"
                              : "bg-foreground text-background"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={tier.href || `/pricing?plan=${tier.id}`}
                    className="w-full"
                  >
                    <Button
                      size="lg"
                      className={`w-full h-12 text-base font-medium rounded-xl transition-all duration-300 ${
                        tier.featured
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                          : "bg-foreground text-background hover:opacity-90"
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Compare link */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors group"
          >
            Compare all features
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
