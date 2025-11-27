"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Clock,
  MessageSquare,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Brain,
    title: "Analogy Engine",
    description: "Complex concepts explained through familiar analogies.",
    className: "md:col-span-2 md:row-span-2",
    gradient: "from-purple-500/20 via-blue-500/5 to-transparent",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description: "Timeline-based prep that adapts to your interview date.",
    className: "md:col-span-1 md:row-span-1",
    gradient: "from-green-500/20 via-emerald-500/5 to-transparent",
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
  },
  {
    icon: MessageSquare,
    title: "AI Coaching",
    description: "Chat with AI to drill deeper into any topic instantly.",
    className: "md:col-span-1 md:row-span-1",
    gradient: "from-orange-500/20 via-red-500/5 to-transparent",
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
  },
  {
    icon: Layers,
    title: "Multi-Mode Learning",
    description: "Rapid Fire, MCQ, and Deep Dive modes.",
    className: "md:col-span-2 md:row-span-1",
    gradient: "from-blue-500/20 via-cyan-500/5 to-transparent",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-32 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
            Everything you need.
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A comprehensive system designed to help you understand, not just
            memorize.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className={cn(
                "group relative rounded-3xl overflow-hidden border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-all duration-500",
                feature.className
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.01 }}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                  feature.gradient
                )}
              />

              <div className="relative h-full p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110",
                    feature.iconBg
                  )}>
                    <feature.icon className={cn("w-6 h-6", feature.iconColor)} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ArrowUpRight className="w-4 h-4 text-foreground" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-3 tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
