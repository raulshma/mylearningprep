import { Suspense } from "react"
import { Logo } from "@/components/ui/logo"
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
    : { count: 0, limit: 5, remaining: 5, resetDate: new Date(), plan: 'FREE', isByok: false, interviews: { count: 0, limit: 3, resetDate: new Date() } }

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
    <nav className="flex-1 p-4 space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </nav>
  )
}

// Loading skeleton for usage
function UsageSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <Logo />
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
