import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, Share2, Download } from "lucide-react"
import Link from "next/link"

interface TimelineHeaderProps {
  role: string
  company: string
  date: string
  daysUntil: number
  progress: number
}

export function TimelineHeader({ role, company, date, daysUntil, progress }: TimelineHeaderProps) {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-mono text-foreground">{role}</h1>
              <p className="text-sm text-muted-foreground">{company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {date}
            </span>
            <Badge variant={daysUntil <= 3 ? "destructive" : "secondary"}>
              <Clock className="w-3 h-3 mr-1" />
              {daysUntil} days left
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{progress}% complete</span>
            <div className="w-32 h-2 bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
