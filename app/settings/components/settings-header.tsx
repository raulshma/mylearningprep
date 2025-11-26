'use client';

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Settings, Sparkles } from "lucide-react";

interface SettingsHeaderProps {
  profile: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
    plan: string;
  };
}

export function SettingsHeader({ profile }: SettingsHeaderProps) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "User";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Section badge */}
      <motion.div 
        className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-4 py-2 mb-6 text-sm text-foreground"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Settings className="w-4 h-4 text-primary" />
        <span>Account Settings</span>
      </motion.div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          {profile.imageUrl ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <img
                src={profile.imageUrl}
                alt={fullName}
                className="w-16 h-16 md:w-20 md:h-20 border-2 border-border object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-background rounded-full" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 md:w-20 md:h-20 bg-secondary flex items-center justify-center border border-border"
            >
              <span className="text-2xl font-mono text-foreground">
                {fullName.charAt(0).toUpperCase()}
              </span>
            </motion.div>
          )}

          <div>
            <h1 className="text-2xl md:text-3xl font-mono text-foreground mb-1">
              {fullName}
            </h1>
            <p className="text-muted-foreground text-sm">{profile.email}</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Badge 
            variant={profile.plan === "MAX" ? "default" : "secondary"}
            className="text-sm px-4 py-1.5 flex items-center gap-2"
          >
            {profile.plan === "MAX" && <Sparkles className="w-3 h-3" />}
            {profile.plan} Plan
          </Badge>
        </motion.div>
      </div>
    </motion.div>
  );
}
