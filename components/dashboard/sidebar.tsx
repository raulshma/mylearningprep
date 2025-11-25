"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { LayoutDashboard, Plus, Settings, CreditCard, LogOut, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/new", label: "New Interview", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/pricing", label: "Upgrade", icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <Logo />
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border space-y-4">
        {/* Preps Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Monthly Preps</p>
            <span className="text-xs font-mono text-foreground">1/3</span>
          </div>
          <div className="h-2 bg-muted">
            <div className="h-full bg-foreground" style={{ width: "33%" }} />
          </div>
        </div>

        {/* Revisions/Iterations Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Revisions
            </p>
            <span className="text-xs font-mono text-foreground">4/10</span>
          </div>
          <div className="h-2 bg-muted">
            <div className="h-full bg-foreground" style={{ width: "40%" }} />
          </div>
        </div>

        {/* Disabled state example for exceeded limit */}
        <div className="opacity-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">AI Chats</p>
            <span className="text-xs font-mono text-red-400">10/10</span>
          </div>
          <div className="h-2 bg-muted">
            <div className="h-full bg-red-500" style={{ width: "100%" }} />
          </div>
          <p className="text-xs text-red-400 mt-1">Limit reached - upgrade for more</p>
        </div>

        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-3 py-2 mt-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
