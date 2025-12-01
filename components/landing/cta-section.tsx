"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-32 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="relative rounded-[3rem] overflow-hidden bg-foreground text-background px-6 py-24 md:px-20 md:py-32 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Abstract background shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] rounded-full bg-linear-to-br from-primary/30 to-transparent blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[80%] rounded-full bg-linear-to-tl from-secondary/30 to-transparent blur-[100px] animate-pulse delay-1000" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/10 backdrop-blur-md border border-background/10 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-background/90">
                Join the top 1% of engineers
              </span>
            </motion.div>

            <motion.h2
              className="text-5xl md:text-7xl md:leading-[1.1] font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-linear-to-b from-background to-background/60"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              Ready to ace your next interview
            </motion.h2>

            <motion.p
              className="text-xl md:text-2xl text-background/70 mb-12 font-medium max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              Join thousands of engineers who&apos;ve transformed their career
              trajectory with our comprehensive prep platform.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <Link href="/onboarding" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full h-16 px-10 text-lg font-semibold bg-background text-foreground hover:bg-background/90 hover:scale-105 transition-all shadow-xl shadow-background/10"
                >
                  Start Preparing Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full h-16 px-10 text-lg font-semibold border-background/20 text-background hover:bg-background/10 bg-transparent backdrop-blur-sm transition-all"
                >
                  View Plans
                </Button>
              </Link>
            </motion.div>

            <motion.p
              className="mt-8 text-sm text-background/40 font-medium"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              No credit card required for free tier. Cancel anytime.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
