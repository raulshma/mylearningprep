import Link from "next/link";
import { Infinity } from "lucide-react";

interface UsageData {
  count: number;
  limit: number;
}

interface SidebarUsageProps {
  iterations: UsageData;
  interviews: UsageData;
  plan: string;
  isByok: boolean;
}

export function SidebarUsage({
  iterations,
  interviews,
  plan,
  isByok,
}: SidebarUsageProps) {
  const iterationsPercentage = iterations.limit > 0 ? Math.min((iterations.count / iterations.limit) * 100, 100) : 0;
  const interviewsPercentage = interviews.limit > 0 ? Math.min((interviews.count / interviews.limit) * 100, 100) : 0;
  const isIterationsAtLimit = iterations.count >= iterations.limit && !isByok;
  const isInterviewsAtLimit = interviews.count >= interviews.limit && !isByok;
  const isAtLimit = isIterationsAtLimit || isInterviewsAtLimit;

  return (
    <div className="space-y-3">
      {/* Iterations */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Iterations</p>
          {isByok ? (
            <span className="text-xs font-mono text-foreground flex items-center gap-1">
              <Infinity className="w-3 h-3" />
            </span>
          ) : (
            <span
              className={`text-xs font-mono ${
                isIterationsAtLimit ? "text-red-400" : "text-foreground"
              }`}
            >
              {iterations.count}/{iterations.limit}
            </span>
          )}
        </div>
        {!isByok && (
          <div className="h-1.5 bg-muted">
            <div
              className={`h-full ${isIterationsAtLimit ? "bg-red-500" : "bg-foreground"}`}
              style={{ width: `${iterationsPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Interviews */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Interviews</p>
          {isByok ? (
            <span className="text-xs font-mono text-foreground flex items-center gap-1">
              <Infinity className="w-3 h-3" />
            </span>
          ) : (
            <span
              className={`text-xs font-mono ${
                isInterviewsAtLimit ? "text-red-400" : "text-foreground"
              }`}
            >
              {interviews.count}/{interviews.limit}
            </span>
          )}
        </div>
        {!isByok && (
          <div className="h-1.5 bg-muted">
            <div
              className={`h-full ${isInterviewsAtLimit ? "bg-red-500" : "bg-foreground"}`}
              style={{ width: `${interviewsPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Status */}
      {!isByok && isAtLimit && (
        <p className="text-xs text-red-400">
          Limit reached -{" "}
          <Link href="/pricing" className="underline hover:text-red-300">
            upgrade
          </Link>
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {isByok ? "BYOK enabled • " : ""}{plan} plan
      </p>
    </div>
  );
}
