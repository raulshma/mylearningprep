import { redirect } from 'next/navigation';
import { getAuthUserId } from '@/lib/auth/get-user';
import { userRepository } from '@/lib/db/repositories/user-repository';
import { getUserAnalyticsDashboardData } from '@/lib/actions/user-analytics';
import { UserAnalyticsDashboard } from '@/components/settings/user-analytics-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import Link from 'next/link';

export default async function AnalyticsPage() {
  const clerkId = await getAuthUserId();
  const user = await userRepository.findByClerkId(clerkId);

  if (!user) {
    redirect('/dashboard');
  }

  // Check if user has MAX plan
  if (user.plan !== 'MAX') {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track your interview preparation progress
          </p>
        </div>

        <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">MAX Plan Feature</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Analytics and visualizations are available exclusively for MAX plan subscribers.
              Upgrade to unlock detailed insights into your interview preparation journey.
            </p>
            <Button asChild size="lg" className="rounded-full gap-2">
              <Link href="/settings/upgrade">
                <Crown className="w-4 h-4" />
                Upgrade to MAX
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await getUserAnalyticsDashboardData();

  if (!data) {
    redirect('/dashboard');
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <span className="px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
            MAX
          </span>
        </div>
        <p className="text-muted-foreground mt-2">
          Track your interview preparation progress and insights
        </p>
      </div>

      <UserAnalyticsDashboard data={data} />
    </>
  );
}
