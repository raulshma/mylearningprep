import { Check, CalendarClock } from 'lucide-react';

interface SubscriptionNoticeProps {
  plan: string;
  subscriptionCancelAt: string;
}

export function SubscriptionNotice({ plan, subscriptionCancelAt }: SubscriptionNoticeProps) {
  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <CalendarClock className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-foreground mb-1">
              Subscription Ending Soon
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Your {plan} plan is scheduled to end on{' '}
              <span className="font-medium text-foreground">
                {new Date(subscriptionCancelAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-400">
                You still have full access to all {plan} features until then
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
