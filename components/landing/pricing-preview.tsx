import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Try it out",
    features: ["3 interview preps/month", "Basic AI generation", "Community access"],
    cta: "Get Started",
    href: "/onboarding",
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For active job seekers",
    features: ["Unlimited preps", "Advanced analogies", "Priority generation", "Export to PDF"],
    cta: "Start Free Trial",
    href: "/onboarding?plan=pro",
    featured: true,
  },
  {
    name: "Max",
    price: "$39",
    period: "/month",
    description: "Power users",
    features: ["Everything in Pro", "BYOK option", "API access", "Team features"],
    cta: "Contact Us",
    href: "/onboarding?plan=max",
  },
]

export function PricingPreview() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 text-center">
          <h2 className="text-2xl md:text-3xl font-mono text-foreground mb-4">Simple pricing</h2>
          <p className="text-muted-foreground">Start free, upgrade when you need more.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-border max-w-4xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`bg-background p-8 flex flex-col ${tier.featured ? "ring-1 ring-foreground" : ""}`}
            >
              <div className="mb-6">
                <h3 className="font-mono text-foreground mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-mono text-foreground">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-foreground" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={tier.href}>
                <Button variant={tier.featured ? "default" : "outline"} className="w-full">
                  {tier.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
