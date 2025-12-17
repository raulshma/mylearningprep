import { getDashboardInterviews } from "@/lib/actions/dashboard";
import { DashboardContent } from "./dashboard-content";

interface InterviewsSectionProps {
  page: number;
  search?: string;
  status?: 'active' | 'completed' | 'all';
}

/**
 * Async Server Component for interviews section
 * Streams independently with its own Suspense boundary
 */
export async function InterviewsSection({ page, search, status }: InterviewsSectionProps) {
  const { interviews, total } = await getDashboardInterviews(page, search, status);

  return (
    <DashboardContent 
      interviews={interviews} 
      total={total}
      currentPage={page}
    />
  );
}
