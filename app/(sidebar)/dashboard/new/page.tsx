import { getIterationStatus } from '@/lib/actions/user';
import { NewInterviewForm } from '@/components/interview/new-interview-form';

/**
 * New Interview Page
 * 
 * Performance: getIterationStatus() uses React cache() internally,
 * so this call shares data with the sidebar's getSidebarData() call
 * in the parent layout - no duplicate DB/API requests.
 */
export default async function NewInterviewPage() {
  const result = await getIterationStatus();
  
  const usageData = result.success
    ? {
        interviews: {
          count: result.data.interviews.count,
          limit: result.data.interviews.limit,
        },
        plan: result.data.plan,
        isByok: result.data.isByok,
      }
    : {
        interviews: { count: 0, limit: 3 },
        plan: 'FREE' as const,
        isByok: false,
      };

  return <NewInterviewForm usageData={usageData} />;
}
