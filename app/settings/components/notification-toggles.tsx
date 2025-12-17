'use client';

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Mail } from "lucide-react";

export function NotificationToggles() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Email notifications</p>
            <p className="text-xs text-muted-foreground truncate">Updates about your interviews</p>
          </div>
        </div>
        <Switch
          checked={emailNotifications}
          onCheckedChange={setEmailNotifications}
          className="shrink-0"
        />
      </div>

      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Marketing emails</p>
            <p className="text-xs text-muted-foreground truncate">Tips and product updates</p>
          </div>
        </div>
        <Switch
          checked={marketingEmails}
          onCheckedChange={setMarketingEmails}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
