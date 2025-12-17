import Link from "next/link";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getJourneyProgress } from "@/lib/actions/dashboard";
import { JourneyProgressCard } from "./journey-progress-card";

/**
 * Async Server Component for journey section
 * Streams independently with its own Suspense boundary
 */
export async function JourneySection() {
  const journeyProgress = await getJourneyProgress();

  // Get the most recently active journey
  const activeJourney = journeyProgress.sort((a, b) => {
    const dateA = new Date(a.lastActivityAt || a.updatedAt || 0).getTime();
    const dateB = new Date(b.lastActivityAt || b.updatedAt || 0).getTime();
    return dateB - dateA;
  })[0];

  if (!activeJourney) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300 min-h-[240px] flex flex-col items-center justify-center text-center space-y-4 py-8 p-6">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <Map className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">No active journey</p>
          <p className="text-sm text-muted-foreground">Pick a journey to start learning</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/journeys">View All journeys</Link>
        </Button>
      </div>
    );
  }

  return <JourneyProgressCard progress={activeJourney} />;
}
