import { getIterationStatus, getUserProfile } from "@/lib/actions/user";
import { isAdmin } from "@/lib/auth/get-user";
import { Logo } from "@/components/ui/logo";
import { ViewTransitionLink } from "@/components/transitions/view-transition-link";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUsage } from "./sidebar-usage";
import { SidebarUser } from "./sidebar-user";
import { Sparkles } from "lucide-react";

export interface SidebarData {
  isAdmin: boolean;
  usage: {
    iterations: { count: number; limit: number };
    interviews: { count: number; limit: number };
    plan: string;
    isByok: boolean;
  };
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

/**
 * Fetch sidebar data independently (used when not on dashboard page)
 * For dashboard page, use getDashboardData() which includes sidebar data
 * 
 * Optimized: Uses parallel queries and cached functions to minimize latency
 */
export async function getSidebarData(): Promise<SidebarData> {
  // All three calls use React cache() internally, so they deduplicate
  // and share the same underlying auth/DB calls
  const [userIsAdmin, iterationResult, profileResult] = await Promise.all([
    isAdmin(),
    getIterationStatus(),
    getUserProfile(),
  ]);

  const iterationData = iterationResult.success
    ? iterationResult.data
    : {
        count: 0,
        limit: 20,
        remaining: 20,
        resetDate: new Date(),
        plan: "FREE",
        isByok: false,
        interviews: { count: 0, limit: 3, resetDate: new Date() },
      };

  const profile = profileResult.success
    ? profileResult.data
    : {
        firstName: null,
        lastName: null,
        email: null,
        imageUrl: null,
      };

  return {
    isAdmin: userIsAdmin,
    usage: {
      iterations: { count: iterationData.count, limit: iterationData.limit },
      interviews: {
        count: iterationData.interviews.count,
        limit: iterationData.interviews.limit,
      },
      plan: iterationData.plan,
      isByok: iterationData.isByok,
    },
    user: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      imageUrl: profile.imageUrl,
    },
  };
}

export async function Sidebar() {
  const data = await getSidebarData();

  return (
    <aside className="w-64 bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-primary/[0.02] pointer-events-none" />

      {/* Logo Section */}
      <div className="relative p-6">
        <ViewTransitionLink href="/" viewTransitionName="logo">
          <Logo />
        </ViewTransitionLink>
      </div>

      {/* Navigation */}
      <div className="relative flex-1 overflow-y-auto">
        <SidebarNav isAdmin={data.isAdmin} />
      </div>

      {/* Bottom Section */}
      <div className="relative">
        {/* Usage Stats */}
        <div className="p-4">
          <SidebarUsage
            iterations={data.usage.iterations}
            interviews={data.usage.interviews}
            plan={data.usage.plan}
            isByok={data.usage.isByok}
          />
        </div>

        {/* Plan Badge */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 ${
                  data.usage.plan === "FREE"
                    ? "bg-muted-foreground"
                    : data.usage.plan === "PRO"
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
              />
              <span className="text-xs font-mono text-muted-foreground">
                {data.usage.isByok ? "BYOK" : data.usage.plan} plan
              </span>
            </div>
            {data.usage.plan === "FREE" && !data.usage.isByok && (
              <ViewTransitionLink
                href="/settings/upgrade"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-foreground transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Upgrade</span>
              </ViewTransitionLink>
            )}
          </div>
        </div>

        {/* User Section */}
        <SidebarUser
          firstName={data.user.firstName}
          lastName={data.user.lastName}
          email={data.user.email}
          imageUrl={data.user.imageUrl}
        />
      </div>
    </aside>
  );
}
