import { User, Bell, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotificationToggles } from "@/app/settings/components/notification-toggles";

interface ProfileSectionProps {
  profile: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "";

  return (
    <div className="bg-card/50 border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground">Your account information</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Profile fields - static, no client JS needed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="min-w-0">
            <Label htmlFor="name" className="text-sm font-medium text-foreground mb-2 block">
              Name
            </Label>
            <Input
              id="name"
              value={fullName}
              disabled
              className="h-11 rounded-xl bg-secondary/50 border-transparent focus:bg-background transition-all"
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ""}
              disabled
              className="h-11 rounded-xl bg-secondary/50 border-transparent focus:bg-background transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/30 border border-white/5">
          <div className="w-1 h-8 bg-primary/30 rounded-full" />
          <p className="text-xs text-muted-foreground">
            Profile information is managed through your login provider.
          </p>
        </div>

        {/* Notifications - interactive, needs client component */}
        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Notifications</span>
          </div>
          <NotificationToggles />
        </div>
      </div>
    </div>
  );
}
