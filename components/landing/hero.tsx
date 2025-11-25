import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Terminal } from "lucide-react"

export function Hero() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 border border-border px-3 py-1.5 mb-6 text-xs text-muted-foreground">
            <Terminal className="w-3 h-3" />
            <span>AI-Powered Interview Prep</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-mono tracking-tight text-foreground mb-6 text-balance">
            Ace your next technical interview
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            Personalized preparation tailored to your specific role, company, and tech stack. Our AI breaks down complex
            concepts into digestible insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/onboarding">
              <Button size="lg" className="w-full sm:w-auto">
                Start Preparing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#community">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
                Browse Community Preps
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
