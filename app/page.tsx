import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { FeaturesGrid } from "@/components/landing/features-grid"
import { CommunityFeed } from "@/components/landing/community-feed"
import { PricingPreview } from "@/components/landing/pricing-preview"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <FeaturesGrid />
        <CommunityFeed />
        <PricingPreview />
      </main>
      <Footer />
    </div>
  )
}
