"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

interface SidebarUserProps {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
}

export function SidebarUser({
  firstName,
  lastName,
  email,
  imageUrl,
  isCollapsed = false,
}: SidebarUserProps & { isCollapsed?: boolean }) {
  const { signOut } = useClerk();
  const { setTheme, theme } = useTheme();

  const initials = getInitials(firstName, lastName, email);
  const displayName = getDisplayName(firstName, lastName, email);

  return (
    <div className={cn("p-3 py-0", isCollapsed && "p-0 flex justify-center")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-3 p-2 hover:bg-sidebar-accent/50 transition-colors text-left group outline-none",
              isCollapsed
                ? "justify-center rounded-full w-10 h-10 p-0"
                : "rounded-xl"
            )}
          >
            <Avatar className="h-9 w-9 border border-sidebar-border transition-transform group-hover:scale-105">
              <AvatarImage src={imageUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-mono">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sidebar-foreground truncate">
                    {displayName}
                  </div>
                  {email && (
                    <div className="text-xs text-muted-foreground truncate font-normal opacity-80">
                      {email}
                    </div>
                  )}
                </div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="w-72 p-2 rounded-2xl bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-2xl"
          sideOffset={8}
        >
          <div className="px-3 py-3 mb-1">
            <p className="text-sm font-semibold text-foreground">
              {displayName}
            </p>
            {email && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium opacity-80">
                {email}
              </p>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-1" />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer data-[state=open]:bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Sun className="col-start-1 row-start-1 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="col-start-1 row-start-1 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </div>
                <span>Theme</span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-1.5 rounded-xl bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xl">
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Sun className="mr-2 h-4 w-4 text-orange-500" />
                Light
                {theme === "light" && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Moon className="mr-2 h-4 w-4 text-indigo-500" />
                Dark
                {theme === "dark" && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("system")}
                className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Monitor className="mr-2 h-4 w-4 text-slate-500" />
                System
                {theme === "system" && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-1" />

          <DropdownMenuItem
            onClick={() => signOut({ redirectUrl: "/" })}
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <LogOut className="h-4 w-4" />
              </div>
              Sign Out
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
  email: string | null
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName[0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
}

function getDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string | null
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (email) {
    return email.split("@")[0];
  }
  return "User";
}
