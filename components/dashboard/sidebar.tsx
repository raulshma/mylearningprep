import { Suspense } from "react"
import { Logo } from "@/components/ui/logo"
import { ViewTransitionLink } from "@/components/transitions/view-transition-link"
import { getIterationStatus } from "@/lib/actions/user"
import { isAdmin } from "@/lib/auth/get-user"
import { SidebarNav } from "./sidebar-nav"
import { SidebarUsage } from "./sidebar-usage"
import { SidebarSignOut } from "./sidebar-signout"
import { Skeleton } from "@/components/ui/skeleton"

// Async component for nav with admin check
async function SidebarNavWrapper() {
  const userIsAdmin = await isAdmin()
  return <SidebarNav isAdmin={userIsAdmin} />
}

// Async component for usage stats
async function SidebarUsageWrapper() {
  const iterationResult = await getIterationStatus()
  const iterationData = iterationResult.success 
    ? iterationResult.data 
    : { count: 0, limit: 20, remaining: 20, resetDate: new Date(), plan: 'FREE', isByok: false, interviews: { count: 0, limit: 3, resetDate: new Date() } }

  return (
    <SidebarUsage 
      iterations={{ count: iterationData.count, limit: iterationData.limit }}
      interviews={{ count: iterationData.interviews.count, limit: iterationData.interviews.limit }}
      plan={iterationData.plan}
      isByok={iterationData.isByok}
    />
  )
}

// Loading skeleton for nav
function NavSkeleton() {
  return (
    <nav className="flex-1 p-4">
      <ul className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Loading skeleton for usage
function UsageSkeleton() {
  return (
    <div className="space-y-3">
      {/* Iterations skeleton */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full" />
      </div>

      {/* Interviews skeleton */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full" />
      </div>

      {/* Plan text skeleton */}
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <ViewTransitionLink href="/" viewTransitionName="logo">
          <Logo />
        </ViewTransitionLink>
      </div>

      <Suspense fallback={<NavSkeleton />}>
        <SidebarNavWrapper />
      </Suspense>

      <div className="p-4 border-t border-border space-y-4">
        <Suspense fallback={<UsageSkeleton />}>
          <SidebarUsageWrapper />
        </Suspense>

        <SidebarSignOut />
      </div>
    </aside>
  )
}
