"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function NewInterviewSkeleton() {
  return (
    <div className="relative flex-1 flex flex-col">
      {/* Header */}
      <header className="relative z-10 border-b border-border px-4 md:px-6 py-8">
        <div className="max-w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              {/* Badge */}
              <Skeleton className="h-6 w-28 mb-3" />
              {/* Title */}
              <Skeleton className="h-8 w-56 mb-1" />
              {/* Subtitle */}
              <Skeleton className="h-4 w-72" />
            </div>
          </div>

          {/* Usage indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto pt-0 md:pt-0">
        <div className="max-w-full">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Main form area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Quick Start Card */}
              <div className="bg-card border border-border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="w-10 h-10" />
                  <div>
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                </div>
                {/* Textarea */}
                <Skeleton className="w-full h-[140px] mb-4" />
                {/* Footer */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <Skeleton className="w-6 h-4" />
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Detailed Form Toggle */}
              <Skeleton className="w-full h-14" />
            </div>

            {/* Side panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tips card */}
              <div className="bg-card border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <ul className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Skeleton className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                    </li>
                  ))}
                </ul>
              </div>

              {/* What you'll get card */}
              <div className="bg-card border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-8 h-8 flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating tags */}
              <div className="hidden lg:flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-20" />
                ))}
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-8 pt-6 border-t border-border">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
