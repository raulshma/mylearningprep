import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Users, Activity, Terminal, MoreHorizontal, Search, FileText, Filter } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const users = [
  { id: "1", name: "Alex Chen", email: "alex@example.com", plan: "Pro", preps: 12, lastActive: "2h ago" },
  { id: "2", name: "Sarah Kim", email: "sarah@example.com", plan: "Free", preps: 3, lastActive: "1d ago" },
  { id: "3", name: "Mike Johnson", email: "mike@example.com", plan: "Max", preps: 45, lastActive: "5m ago" },
  { id: "4", name: "Emma Wilson", email: "emma@example.com", plan: "Pro", preps: 8, lastActive: "3h ago" },
]

const stats = [
  { label: "Total Users", value: "1,234" },
  { label: "Active This Week", value: "456" },
  { label: "Preps Generated", value: "5,678" },
  { label: "Avg. Session Time", value: "24m" },
]

const auditLogs = [
  {
    id: "1",
    timestamp: "2024-11-26 14:32:05",
    user: "admin@prepwise.io",
    action: "model_config_update",
    details: "Changed primary model to gpt-4-turbo",
    level: "info",
  },
  {
    id: "2",
    timestamp: "2024-11-26 13:15:22",
    user: "admin@prepwise.io",
    action: "user_suspended",
    details: "Suspended user spam@example.com",
    level: "warning",
  },
  {
    id: "3",
    timestamp: "2024-11-26 11:45:00",
    user: "system",
    action: "search_tool_enabled",
    details: "Web search tool enabled globally",
    level: "info",
  },
  {
    id: "4",
    timestamp: "2024-11-26 10:20:33",
    user: "admin@prepwise.io",
    action: "prompt_update",
    details: "Updated main system prompt",
    level: "info",
  },
  {
    id: "5",
    timestamp: "2024-11-25 18:05:12",
    user: "system",
    action: "rate_limit_exceeded",
    details: "User mike@example.com exceeded API rate limit",
    level: "error",
  },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-mono text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage users, models, and system settings</p>
          </div>
          <Badge>Admin</Badge>
        </div>
      </header>

      <main className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-mono text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="models">
              <Settings className="w-4 h-4 mr-2" />
              Model Config
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <Terminal className="w-4 h-4 mr-2" />
              System Prompts
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="w-4 h-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <Activity className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono">User Management</CardTitle>
                    <CardDescription>View and manage all users</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search users..." className="pl-10 w-64" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Preps</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-mono text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.plan === "Max" ? "default" : "secondary"}>{user.plan}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{user.preps}</TableCell>
                        <TableCell className="text-muted-foreground">{user.lastActive}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit User</DropdownMenuItem>
                              <DropdownMenuItem>Impersonate</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Suspend</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono">Model Configuration</CardTitle>
                <CardDescription>Configure AI model settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Primary Model</Label>
                    <Input defaultValue="gpt-4-turbo-preview" className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Fallback Model</Label>
                    <Input defaultValue="gpt-3.5-turbo" className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Temperature</Label>
                    <Input type="number" defaultValue="0.7" step="0.1" className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Max Tokens</Label>
                    <Input type="number" defaultValue="2048" className="font-mono" />
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="font-mono text-foreground mb-4">Tool Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border">
                      <div>
                        <p className="text-sm text-foreground">Web Search Tool</p>
                        <p className="text-xs text-muted-foreground">
                          Enable AI to search the web for up-to-date information
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border">
                      <div>
                        <p className="text-sm text-foreground">Code Execution</p>
                        <p className="text-xs text-muted-foreground">Allow AI to run code snippets in sandbox</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border">
                      <div>
                        <p className="text-sm text-foreground">Citation Generation</p>
                        <p className="text-xs text-muted-foreground">Automatically cite sources in responses</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Button>Save Configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono">System Prompts</CardTitle>
                <CardDescription>Edit the AI system prompts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Main System Prompt</Label>
                  <Textarea
                    className="font-mono min-h-[200px]"
                    defaultValue="You are an expert technical interview coach specializing in software engineering roles. Your goal is to help candidates understand complex concepts through clear explanations and relatable analogies..."
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Analogy Generation Prompt</Label>
                  <Textarea
                    className="font-mono min-h-[120px]"
                    defaultValue="Generate an analogy for the following technical concept. The analogy should be relatable to everyday experiences and appropriate for the specified expertise level..."
                  />
                </div>
                <Button>Save Prompts</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono">Audit Logs</CardTitle>
                    <CardDescription>Track all administrative actions and system events</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="7d">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">Last 24h</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{log.timestamp}</TableCell>
                        <TableCell className="font-mono text-sm">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{log.details}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.level === "error" ? "destructive" : log.level === "warning" ? "secondary" : "outline"
                            }
                            className="capitalize"
                          >
                            {log.level}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono">Usage Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">Chart placeholder</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono">Popular Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["React Hooks", "System Design", "TypeScript", "Algorithms", "Behavioral"].map((topic, i) => (
                      <div key={topic} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{topic}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted">
                            <div className="h-full bg-foreground" style={{ width: `${100 - i * 15}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{100 - i * 15}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
