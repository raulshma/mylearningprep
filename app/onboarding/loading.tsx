import { Skeleton } from "@/components/ui/skeleton"

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 px-6 h-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 relative z-10 pb-20">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          {/* Title & Description */}
          <div className="text-center mb-12 space-y-4 w-full max-w-2xl">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>

          {/* Cards Grid (Simulating Role Selection) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl border border-border/50 bg-card/50 h-[160px] flex flex-col justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-background z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-1.5 w-8 rounded-full" />
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
          </div>

          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
        </div>
      </footer>
    </div>
  )
}
