import { Brain, Clock, MessageSquare, Layers, Zap, Users } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Analogy Engine",
    description: "Complex concepts explained through familiar analogies. From beginner to expert levels.",
  },
  {
    icon: Clock,
    title: "Timeline-Based Prep",
    description: "Smart scheduling that adapts to your interview date. Focus on what matters most.",
  },
  {
    icon: MessageSquare,
    title: "Interactive Refinement",
    description: "Chat with AI to drill deeper into any topic. Ask follow-ups, get clarification.",
  },
  {
    icon: Layers,
    title: "Multi-Mode Learning",
    description: "Rapid Fire, MCQ, and Deep Dive modes for comprehensive preparation.",
  },
  {
    icon: Zap,
    title: "Real-Time Generation",
    description: "Content generated on-demand based on your specific job requirements.",
  },
  {
    icon: Users,
    title: "Community Insights",
    description: "Learn from anonymized preps. See what others are studying for similar roles.",
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-mono text-foreground mb-4">Everything you need to prepare</h2>
          <p className="text-muted-foreground max-w-xl">
            A comprehensive system designed to help you understand, not just memorize.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {features.map((feature) => (
            <div key={feature.title} className="bg-background p-8">
              <feature.icon className="w-5 h-5 text-muted-foreground mb-4" />
              <h3 className="font-mono text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
