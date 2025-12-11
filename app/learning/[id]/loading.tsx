import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Target, Brain, Clock, BarChart3, History } from 'lucide-react';

export default function LearningLoading() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-background pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Skeleton className="h-6 w-48 mb-1.5 rounded-full" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-72 border-r border-border/50 bg-sidebar/30 backdrop-blur-xl p-6 hidden lg:block min-h-[calc(100vh-73px)]">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 bg-secondary/50 rounded-xl">
                <Target className="w-4 h-4 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-2xl border border-border/50 bg-background/50">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              ))}
            </div>

            <div className="mt-8 px-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-secondary/50 rounded-xl">
                  <Brain className="w-4 h-4 text-muted-foreground" />
                </div>
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20 rounded-full" />
                      <Skeleton className="h-3 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 lg:p-8 max-w-5xl mx-auto">
            {/* Tabs Skeleton */}
            <div className="flex items-center gap-2 mb-8 bg-secondary/30 p-1 rounded-full w-fit">
              <div className="h-9 w-28 bg-background rounded-full shadow-sm flex items-center justify-center gap-2 px-4">
                <BookOpen className="w-4 h-4 text-foreground" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <div className="h-9 w-28 flex items-center justify-center gap-2 px-4">
                <History className="w-4 h-4 text-muted-foreground" />
                <Skeleton className="h-4 w-12 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="h-9 w-28 flex items-center justify-center gap-2 px-4">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <Skeleton className="h-4 w-12 rounded-full bg-muted-foreground/20" />
              </div>
            </div>

            {/* Current Topic Header */}
            <div className="mb-8 pl-1">
              <Skeleton className="h-6 w-32 mb-3 rounded-full" />
              <Skeleton className="h-10 w-3/4 mb-3 rounded-2xl" />
              <Skeleton className="h-5 w-1/2 rounded-full" />
            </div>

            {/* Activity Card */}
            <div className="rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl shadow-lg overflow-hidden">
              <div className="p-8 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <Skeleton className="h-6 w-40 mb-2 rounded-full" />
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/20 px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full rounded-full" />
                  <Skeleton className="h-5 w-5/6 rounded-full" />
                  <Skeleton className="h-5 w-4/6 rounded-full" />
                </div>

                {/* Options skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              </div>

              <div className="p-6 bg-secondary/10 border-t border-border/50 flex justify-end">
                <Skeleton className="h-12 w-32 rounded-full" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
