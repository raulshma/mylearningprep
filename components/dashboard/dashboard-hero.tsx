"use client";

import { motion } from "framer-motion";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero() {
  // Calculate greeting during render (safe since it's based on current time)
  const greeting = getGreeting();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as any }}
      className="mb-8"
    >
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-2">
        {greeting}, Developer.
      </h1>
      <p className="text-sm md:text-base text-muted-foreground">
        Ready to ace your next interview?
      </p>
    </motion.div>
  );
}
