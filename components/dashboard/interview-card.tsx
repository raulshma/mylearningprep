"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface InterviewCardProps {
  id: string
  role: string
  company: string
  date: string
  daysUntil: number
  topics: string[]
  progress: number
  status: "upcoming" | "active" | "completed"
}

export function InterviewCard({ id, role, company, date, daysUntil, topics, progress, status }: InterviewCardProps) {
  return (
    <Link href={`/interview/${id}`}>
      <Card className="bg-card border-border hover:border-muted-foreground/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-mono text-foreground truncate">{role}</h3>
              <p className="text-sm text-muted-foreground">{company}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={(e) => e.preventDefault()}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysUntil > 0 ? `${daysUntil} days` : "Today"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {topics.slice(0, 3).map((topic) => (
              <Badge key={topic} variant="secondary" className="font-mono text-xs">
                {topic}
              </Badge>
            ))}
            {topics.length > 3 && (
              <Badge variant="secondary" className="font-mono text-xs">
                +{topics.length - 3}
              </Badge>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground">{progress}%</span>
            </div>
            <div className="h-1 bg-muted">
              <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
