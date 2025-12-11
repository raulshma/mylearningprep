import { Skeleton } from "@/components/ui/skeleton";
import { Target, BookOpen, HelpCircle, Zap, Building2, ArrowLeft, Calendar } from "lucide-react";

export default function InterviewLoading() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="px-4 md:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-48 rounded-full" />
                    <Skeleton className="h-4 w-32 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="hidden lg:flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
                <div className="hidden sm:flex items-center gap-3 bg-secondary/20 px-4 py-2 rounded-full border border-border/50">
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-2 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-80 border-r border-border/50 bg-sidebar/30 backdrop-blur-xl p-6 hidden lg:block h-[calc(100vh-81px)]">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="p-2 bg-secondary/50 rounded-xl">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
              </div>
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <div className="space-y-3 px-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/20">
                  <Skeleton className="w-3 h-3 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4 rounded-full" />
                    <Skeleton className="h-2.5 w-1/2 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
            {/* Module Progress */}
            <div className="rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[Target, BookOpen, HelpCircle, Zap].map((Icon, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border/50 bg-secondary/20">
                    <div className="w-10 h-10 rounded-full bg-background shadow-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <Skeleton className="h-3 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Module Cards */}
            {[
              { title: "Opening Brief", icon: Target },
              { title: "Revision Topics", icon: BookOpen },
              { title: "Multiple Choice Questions", icon: HelpCircle },
              { title: "Rapid Fire Questions", icon: Zap },
            ].map((module, index) => (
              <div
                key={index}
                className="rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl shadow-lg overflow-hidden"
              >
                <div className="flex items-start justify-between p-6 md:p-8 pb-4 md:pb-6">
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center flex-shrink-0">
                      <module.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <Skeleton className="h-6 w-48 rounded-full" />
                      <Skeleton className="h-4 w-64 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-4">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-5/6 rounded-full" />
                  <Skeleton className="h-4 w-4/6 rounded-full" />
                </div>
              </div>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
