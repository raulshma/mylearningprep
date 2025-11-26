import { getIterationStatus } from '@/lib/actions/user';
import { NewInterviewForm } from '@/components/interview/new-interview-form';

async function getUsageData() {
  const result = await getIterationStatus();
  if (!result.success) {
    return {
      interviews: { count: 0, limit: 3 },
      plan: 'FREE' as const,
      isByok: false,
    };
  }
  return {
    interviews: {
      count: result.data.interviews.count,
      limit: result.data.interviews.limit,
    },
    plan: result.data.plan,
    isByok: result.data.isByok,
  };
}

export default async function NewInterviewPage() {
  const usageData = await getUsageData();
  return <NewInterviewForm usageData={usageData} />;
}
