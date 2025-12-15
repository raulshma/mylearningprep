"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for a single roadmap card in the grid
 */
export function RoadmapCardSkeleton() {
  return (
    <article className="h-full flex flex-col rounded-3xl border border-border bg-card overflow-hidden">
      <div className="p-6 flex-1 flex flex-col">
        {/* Header with icon and badge */}
        <div className="flex items-start justify-between mb-5">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Title */}
        <Skeleton className="h-7 w-3/4 mb-3" />
        
        {/* Description */}
        <div className="space-y-2 mb-6 flex-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 mb-6">
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>

        {/* Progress placeholder */}
        <div className="mt-auto">
            <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Action button area */}
      <div className="p-4 bg-secondary/20 border-t border-border/50">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </article>
  );
}

/**
 * Skeleton for the roadmaps list page
 */
export function RoadmapsPageSkeleton() {
  return (
    <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
      {/* Hero Skeleton matching RoadmapHero */}
      <div className="relative w-full mb-10 overflow-hidden rounded-3xl border border-border/40 bg-card">
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            {/* Left side: Welcome text */}
            <div className="max-w-xl space-y-4 w-full">
                 <div className="flex items-center gap-3 mb-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                 </div>
                 <Skeleton className="h-10 w-3/4 md:w-[400px] rounded-lg" />
                 <div className="space-y-2">
                    <Skeleton className="h-5 w-full md:w-[500px]" />
                    <Skeleton className="h-5 w-2/3 md:w-[350px]" />
                 </div>
                 
                 <div className="pt-2 max-w-xs space-y-2">
                    <div className="flex justify-between">
                         <Skeleton className="h-3 w-24" />
                         <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                 </div>
            </div>

            {/* Right side: Stats Grid */}
             <div className="shrink-0 grid grid-cols-2 gap-4 w-full md:w-auto">
                 <div className="p-4 rounded-2xl border border-border/50 bg-background/50 h-[84px] w-[140px] md:w-[160px]">
                      <div className="flex items-center gap-3 mb-2">
                           <Skeleton className="w-9 h-9 rounded-lg" />
                           <Skeleton className="h-6 w-8" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                 </div>
                 <div className="p-4 rounded-2xl border border-border/50 bg-background/50 h-[84px] w-[140px] md:w-[160px]">
                      <div className="flex items-center gap-3 mb-2">
                           <Skeleton className="w-9 h-9 rounded-lg" />
                           <Skeleton className="h-6 w-12" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                 </div>
                 <div className="col-span-2 p-4 rounded-2xl border border-border/50 bg-background/50 h-[76px]">
                      <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                                <Skeleton className="w-9 h-9 rounded-lg" />
                                <div>
                                     <Skeleton className="h-4 w-16 mb-1" />
                                     <Skeleton className="h-3 w-20" />
                                </div>
                           </div>
                           <div className="text-right">
                                <Skeleton className="h-5 w-8 mb-1 ml-auto" />
                                <Skeleton className="h-3 w-16" />
                           </div>
                      </div>
                 </div>
             </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-12 pb-12">
        {/* Continue Learning Section (Simulated) */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
               <Skeleton className="w-1.5 h-6 rounded-full" />
               <Skeleton className="h-8 w-48 rounded-lg" />
           </div>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
               {[...Array(3)].map((_, i) => (
                    <RoadmapCardSkeleton key={`continue-${i}`} />
               ))}
           </div>
        </section>

         {/* All Roadmaps Section */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
               <Skeleton className="w-1.5 h-6 rounded-full" />
               <Skeleton className="h-8 w-40 rounded-lg" />
           </div>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
               {[...Array(6)].map((_, i) => (
                    <RoadmapCardSkeleton key={`all-${i}`} />
               ))}
           </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Skeleton for the sidebar in roadmap detail page
 */
function RoadmapSidebarSkeleton() {
  return (
    <aside className="w-full flex flex-col bg-sidebar border border-border rounded-2xl">
      {/* Header */}
      <div className="p-6 border-b border-border">
        {/* Back link */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Title with icon */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      
      {/* Progress Overview */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full mb-3" />
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-8" />
          </div>
          <div className="p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
        
        {/* Lesson availability stats */}
        <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
      
      {/* Node List */}
      <div className="p-4 space-y-6">
        {/* Milestones section */}
        <div>
          <Skeleton className="h-3 w-20 mb-3 ml-2" />
          <div className="space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={`milestone-${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="w-8 h-4 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Topics section */}
        <div>
          <Skeleton className="h-3 w-14 mb-3 ml-2" />
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <div key={`topic-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                <Skeleton className="w-3.5 h-3.5 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

/**
 * Skeleton for the roadmap flow viewer
 */
function RoadmapViewerSkeleton() {
  return (
    <div className="relative w-full h-[500px] bg-card/30 rounded-2xl border border-border overflow-hidden">
      {/* Layout selector panel */}
      <div className="absolute top-3 left-3 z-20">
        <div className="flex gap-1 p-1 bg-background/95 backdrop-blur-md rounded-lg border border-border shadow-lg">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-12 rounded" />
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute top-3 right-3 z-20">
        <div className="flex flex-col gap-1 p-1 bg-background/95 backdrop-blur-md rounded-lg border border-border shadow-lg">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-7 rounded" />
          ))}
        </div>
      </div>
      
      {/* Simulated nodes */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-8">
          {/* Top node */}
          <Skeleton className="w-48 h-16 rounded-xl" />
          
          {/* Middle row */}
          <div className="flex gap-12">
            <Skeleton className="w-40 h-14 rounded-xl" />
            <Skeleton className="w-40 h-14 rounded-xl" />
            <Skeleton className="w-40 h-14 rounded-xl" />
          </div>
          
          {/* Bottom row */}
          <div className="flex gap-8">
            <Skeleton className="w-36 h-14 rounded-xl" />
            <Skeleton className="w-36 h-14 rounded-xl" />
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-3 p-3 bg-background/95 backdrop-blur-md rounded-xl border border-border">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for the topic detail panel
 */
function RoadmapTopicDetailSkeleton() {
  return (
    <aside className="w-full bg-card rounded-2xl border border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      
      {/* Learning objectives */}
      <div className="p-6 border-b border-border">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
              <Skeleton className="w-5 h-5 rounded shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Resources */}
      <div className="p-6 border-b border-border">
        <Skeleton className="h-4 w-20 mb-4" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="w-4 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="p-6">
        <Skeleton className="h-10 w-full rounded-lg mb-3" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </aside>
  );
}

/**
 * Skeleton for the roadmap detail page ([slug])
 */
export function RoadmapPageSkeleton() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row gap-6 min-h-full">
        {/* Left Sidebar */}
        <div className="md:w-80 shrink-0">
          <RoadmapSidebarSkeleton />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-w-0">
          {/* Roadmap Viewer */}
          <div className="flex-1 min-w-0">
            <RoadmapViewerSkeleton />
          </div>
          
          {/* Detail Panel */}
          <div className="w-full lg:w-96 shrink-0">
            <RoadmapTopicDetailSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the lesson/objective page
 */
export function LessonPageSkeleton() {
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-64" />
            </div>

            {/* XP Display */}
            <Skeleton className="w-24 h-12 rounded-xl" />
          </div>
        </div>

        {/* Experience Level Selector */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl w-fit">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="mb-8 p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full mb-4" />
          <div className="flex gap-2 flex-wrap">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </div>

        {/* MDX Content Area */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
          {/* Content placeholder */}
          <div className="space-y-6">
            {/* Heading */}
            <Skeleton className="h-8 w-3/4" />
            
            {/* Paragraph */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            
            {/* Code block */}
            <Skeleton className="h-32 w-full rounded-lg" />
            
            {/* Another paragraph */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            
            {/* Interactive element */}
            <Skeleton className="h-48 w-full rounded-xl" />
            
            {/* More content */}
            <Skeleton className="h-6 w-1/2" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            
            {/* Progress checkpoint */}
            <div className="p-4 rounded-xl border border-border bg-secondary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        </article>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
