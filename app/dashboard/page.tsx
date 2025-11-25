import Link from "next/link"
import { Sidebar } from "@/components/dashboard/sidebar"
import { InterviewCard } from "@/components/dashboard/interview-card"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const interviews = [
  {
    id: "1",
    role: "Senior Frontend Engineer",
    company: "Stripe",
    date: "Dec 5, 2024",
    daysUntil: 9,
    topics: ["React", "TypeScript", "System Design", "Performance"],
    progress: 45,
    status: "active" as const,
  },
  {
    id: "2",
    role: "Full Stack Developer",
    company: "Vercel",
    date: "Dec 12, 2024",
    daysUntil: 16,
    topics: ["Next.js", "Node.js", "PostgreSQL"],
    progress: 20,
    status: "upcoming" as const,
  },
  {
    id: "3",
    role: "Backend Engineer",
    company: "Linear",
    date: "Nov 20, 2024",
    daysUntil: -6,
    topics: ["Go", "GraphQL", "Distributed Systems"],
    progress: 100,
    status: "completed" as const,
  },
]

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-mono text-foreground mb-1">Welcome back, Alex</h1>
            <p className="text-muted-foreground">You have 2 upcoming interviews to prepare for.</p>
          </div>
          <Link href="/dashboard/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Interview
            </Button>
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search interviews..." className="pl-10 font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              All
            </Button>
            <Button variant="ghost" size="sm">
              Active
            </Button>
            <Button variant="ghost" size="sm">
              Completed
            </Button>
          </div>
        </div>

        {/* Interview Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {interviews.map((interview) => (
            <InterviewCard key={interview.id} {...interview} />
          ))}

          {/* Empty State / Add New Card */}
          <Link href="/dashboard/new">
            <div className="border border-dashed border-border hover:border-muted-foreground transition-colors h-full min-h-[200px] flex items-center justify-center cursor-pointer">
              <div className="text-center">
                <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Add new interview</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <h2 className="text-lg font-mono text-foreground mb-4">Recent Activity</h2>
          <div className="border border-border divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Completed "React Hooks Deep Dive"</p>
                <p className="text-xs text-muted-foreground">Senior Frontend Engineer at Stripe</p>
              </div>
              <span className="text-xs text-muted-foreground">2h ago</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Started "System Design: Chat Application"</p>
                <p className="text-xs text-muted-foreground">Senior Frontend Engineer at Stripe</p>
              </div>
              <span className="text-xs text-muted-foreground">Yesterday</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Created new interview prep</p>
                <p className="text-xs text-muted-foreground">Full Stack Developer at Vercel</p>
              </div>
              <span className="text-xs text-muted-foreground">3 days ago</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
