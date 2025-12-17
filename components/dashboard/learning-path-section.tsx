import Link from "next/link";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveLearningPath } from "@/lib/actions/dashboard";
import { LearningPathSummaryCard } from "./learning-path-summary-card";

/**
 * Async Server Component for learning path section
 * Streams independently with its own Suspense boundary
 */
export async function LearningPathSection() {
  const learningPath = await getActiveLearningPath();

  if (!learningPath) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 hover:border-primary/20 transition-all duration-300 min-h-[240px] flex flex-col items-center justify-center text-center space-y-4 py-8 p-6">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <Brain className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">No active focus</p>
          <p className="text-sm text-muted-foreground">Start a learning path to track progress</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/learning">Explore Paths</Link>
        </Button>
      </div>
    );
  }

  return <LearningPathSummaryCard learningPath={learningPath} />;
}
