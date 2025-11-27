import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Target, Brain, Clock } from 'lucide-react';

export default function LearningLoading() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Skeleton className="h-6 w-64 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-72 border-r border-border bg-sidebar/50 p-6 hidden lg:block min-h-[calc(100vh-73px)]">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-4 h-4 text-muted-foreground" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 border border-border bg-card/50">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Current Topic */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-8 w-96 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>

            {/* Activity Card */}
            <div className="border border-border bg-card/80 backdrop-blur-sm">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />

                {/* Options skeleton */}
                <div className="space-y-3 mt-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-border">
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
