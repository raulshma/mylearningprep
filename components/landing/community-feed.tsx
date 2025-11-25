import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Eye, Copy } from "lucide-react"

const communityPreps = [
  {
    role: "Senior Frontend Engineer",
    company: "Tech Startup",
    topics: ["React", "System Design", "TypeScript"],
    views: 1240,
    daysAgo: 2,
  },
  {
    role: "Backend Developer",
    company: "Enterprise",
    topics: ["Node.js", "PostgreSQL", "Microservices"],
    views: 890,
    daysAgo: 5,
  },
  {
    role: "Full Stack Engineer",
    company: "Fintech",
    topics: ["Next.js", "GraphQL", "AWS"],
    views: 2100,
    daysAgo: 1,
  },
  {
    role: "DevOps Engineer",
    company: "SaaS Company",
    topics: ["Kubernetes", "CI/CD", "Terraform"],
    views: 650,
    daysAgo: 7,
  },
]

export function CommunityFeed() {
  return (
    <section id="community" className="py-24 px-6 border-t border-border bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-mono text-foreground mb-4">Community Preps</h2>
          <p className="text-muted-foreground">
            See what others are preparing for. Clone and customize for your own interviews.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {communityPreps.map((prep, index) => (
            <Card
              key={index}
              className="bg-background border-border hover:border-muted-foreground/50 transition-colors group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-mono text-foreground mb-1">{prep.role}</h3>
                    <p className="text-sm text-muted-foreground">{prep.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {prep.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {prep.daysAgo}d ago
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {prep.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="font-mono text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent"
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Clone Prep
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
