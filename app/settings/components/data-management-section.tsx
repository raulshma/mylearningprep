import { Database, Shield } from "lucide-react";
import { DataManagementActions } from "@/app/settings/components/data-management-actions";

export function DataManagementSection() {
  return (
    <div className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Data & Privacy</h2>
          <p className="text-sm text-muted-foreground">Manage your data</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Privacy info - static */}
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-secondary/30 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground mb-1">Your data is secure</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We encrypt sensitive data and never share your information with third parties.
            </p>
          </div>
        </div>

        {/* Actions - interactive */}
        <DataManagementActions />
      </div>
    </div>
  );
}
