import { AlertCircle } from 'lucide-react';

export function TestPaymentWarning() {
  return (
    <div className="mb-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">
          Test Payment Environment
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This is a test environment. No real money will be deducted from your account. You can use test payment methods.
        </p>
      </div>
    </div>
  );
}
