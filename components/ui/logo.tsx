export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 border border-border flex items-center justify-center">
        <span className="text-foreground font-mono text-sm">P</span>
      </div>
      <span className="font-mono text-foreground tracking-tight">PrepPath</span>
    </div>
  )
}
