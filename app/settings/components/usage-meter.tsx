import type { LucideIcon } from "lucide-react";

interface UsageMeterProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  count: number;
  limit: number;
  percentage: number;
}

function getProgressColor(percentage: number) {
  if (percentage >= 90) return "bg-destructive";
  if (percentage >= 70) return "bg-yellow-500";
  return "bg-primary";
}

export function UsageMeter({ 
  icon: Icon, 
  iconColor, 
  iconBg, 
  label, 
  count, 
  limit, 
  percentage 
}: UsageMeterProps) {
  return (
    <div className="p-5 rounded-2xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-xs font-mono font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-white/5">
          {count} / {limit}
        </span>
      </div>
      <div className="h-2 bg-background/50 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full rounded-full ${getProgressColor(percentage)} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
