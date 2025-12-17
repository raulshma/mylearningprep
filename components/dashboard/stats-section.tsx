import { getDashboardStats } from "@/lib/actions/dashboard";
import { StatsOverview } from "./stats-overview";

/**
 * Async Server Component for stats section
 * Streams independently with its own Suspense boundary
 */
export async function StatsSection() {
  const stats = await getDashboardStats();
  
  return (
    <StatsOverview 
      total={stats.total} 
      active={stats.active} 
      completed={stats.completed} 
    />
  );
}
