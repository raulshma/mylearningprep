import { Badge } from "@/components/ui/badge";
import { CreditCard, Zap, TrendingUp, Sparkles } from "lucide-react";
import { SubscriptionActions } from "@/app/settings/components/subscription-actions";
import { UsageMeter } from "@/app/settings/components/usage-meter";

interface SubscriptionSectionProps {
  profile: {
    plan: string;
    iterations: { count: number; limit: number; resetDate: Date };
    interviews: { count: number; limit: number; resetDate: Date };
    hasStripeSubscription: boolean;
  };
  subscription: {
    plan: string;
    hasSubscription: boolean;
  };
}

export function SubscriptionSection({ profile, subscription }: SubscriptionSectionProps) {
  const iterations = profile.iterations;
  const interviews = profile.interviews;
  const iterationsPercentage = iterations.limit > 0
    ? Math.min((iterations.count / iterations.limit) * 100, 100)
    : 0;
  const interviewsPercentage = interviews.limit > 0
    ? Math.min((interviews.count / interviews.limit) * 100, 100)
    : 0;

  return (
    <div className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Subscription</h2>
            <p className="text-sm text-muted-foreground">Plan & usage</p>
          </div>
        </div>
        <Badge
          variant={profile.plan === "MAX" ? "default" : "secondary"}
          className="self-start sm:self-auto px-4 py-1.5 rounded-full text-sm font-medium"
        >
          {profile.plan === "MAX" && <Sparkles className="w-3 h-3 mr-2" />}
          {profile.plan} Plan
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Usage meters - static display with CSS animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageMeter
            icon={Zap}
            iconColor="text-yellow-500"
            iconBg="bg-yellow-500/10"
            label="Iterations"
            count={Number(iterations.count.toFixed(2))}
            limit={iterations.limit}
            percentage={iterationsPercentage}
          />
          <UsageMeter
            icon={TrendingUp}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
            label="Interviews"
            count={interviews.count}
            limit={interviews.limit}
            percentage={interviewsPercentage}
          />
        </div>

        {/* Actions - interactive, needs client component */}
        <SubscriptionActions 
          plan={profile.plan} 
          hasStripeSubscription={profile.hasStripeSubscription} 
        />

        {!profile.hasStripeSubscription && profile.plan === "FREE" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Upgrade to unlock more interviews and AI iterations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
