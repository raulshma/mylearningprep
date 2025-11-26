'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Mail } from "lucide-react";

interface ProfileSectionProps {
  profile: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border p-6 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <User className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="font-mono text-lg text-foreground">Profile</h2>
          <p className="text-xs text-muted-foreground">Your account information</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Profile fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-xs text-muted-foreground mb-2 block">
              Name
            </Label>
            <Input
              id="name"
              value={fullName}
              disabled
              className="font-mono bg-muted/50 border-border"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs text-muted-foreground mb-2 block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ""}
              disabled
              className="font-mono bg-muted/50 border-border"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
          Profile information is managed through your login provider.
        </p>

        {/* Notifications */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-mono text-foreground">Notifications</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Updates about your interviews</p>
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">Marketing emails</p>
                  <p className="text-xs text-muted-foreground">Tips and product updates</p>
                </div>
              </div>
              <Switch
                checked={marketingEmails}
                onCheckedChange={setMarketingEmails}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
