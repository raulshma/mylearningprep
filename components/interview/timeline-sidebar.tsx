import { CheckCircle } from "lucide-react"

interface TimelineItem {
  id: string
  title: string
  status: "completed" | "current" | "upcoming"
  daysFromNow: number
}

const timelineItems: TimelineItem[] = [
  { id: "1", title: "Fundamentals Review", status: "completed", daysFromNow: -5 },
  { id: "2", title: "React Deep Dive", status: "completed", daysFromNow: -3 },
  { id: "3", title: "System Design Basics", status: "current", daysFromNow: 0 },
  { id: "4", title: "TypeScript Advanced", status: "upcoming", daysFromNow: 2 },
  { id: "5", title: "Behavioral Prep", status: "upcoming", daysFromNow: 4 },
  { id: "6", title: "Mock Interview", status: "upcoming", daysFromNow: 6 },
]

export function TimelineSidebar() {
  return (
    <aside className="w-64 border-r border-border bg-sidebar p-6 hidden lg:block">
      <h2 className="font-mono text-sm text-foreground mb-4">Prep Timeline</h2>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-2 top-3 bottom-3 w-px bg-border" />

        <ul className="space-y-4">
          {timelineItems.map((item) => (
            <li key={item.id} className="flex items-start gap-3 relative">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center z-10 ${
                  item.status === "completed"
                    ? "bg-foreground"
                    : item.status === "current"
                      ? "bg-background border-2 border-foreground"
                      : "bg-background border border-muted-foreground"
                }`}
              >
                {item.status === "completed" && <CheckCircle className="w-3 h-3 text-background" />}
              </div>
              <div className="flex-1 -mt-0.5">
                <p
                  className={`text-sm ${
                    item.status === "current" ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.daysFromNow === 0
                    ? "Today"
                    : item.daysFromNow < 0
                      ? `${Math.abs(item.daysFromNow)} days ago`
                      : `In ${item.daysFromNow} days`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
