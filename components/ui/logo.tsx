export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 border border-border flex items-center justify-center rounded-lg bg-primary/5">
        <span className="text-foreground font-mono text-sm">M</span>
      </div>
      <span className="font-mono text-foreground tracking-tight">
        MyLearningPrep
      </span>
    </div>
  );
}
