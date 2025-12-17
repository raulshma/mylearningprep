"use client";

import { useEffect } from "react";
import { Briefcase } from "lucide-react";
import { useSharedHeader } from "./shared-header-context";

/**
 * Client component to set the dashboard header
 * Separated to keep the main page as a Server Component
 */
export function DashboardHeader() {
  const { setHeader } = useSharedHeader();

  useEffect(() => {
    setHeader({
      badge: 'Dashboard',
      badgeIcon: Briefcase,
      title: 'Your Interview Preps',
      description: 'Manage your interview preparations'
    });
  }, [setHeader]);

  return null;
}
