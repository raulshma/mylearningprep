"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, CreditCard, Key, Download, Trash2, AlertTriangle, ExternalLink, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-mono text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="subscription">
                <CreditCard className="w-4 h-4 mr-2" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="api">
                <Key className="w-4 h-4 mr-2" />
                API Keys
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-lg">Profile Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-sm text-muted-foreground mb-2 block">
                        Name
                      </Label>
                      <Input id="name" defaultValue="Alex Chen" className="font-mono" />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm text-muted-foreground mb-2 block">
                        Email
                      </Label>
                      <Input id="email" type="email" defaultValue="alex@example.com" className="font-mono" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="role" className="text-sm text-muted-foreground mb-2 block">
                      Primary Role
                    </Label>
                    <Input id="role" defaultValue="Frontend Engineer" className="font-mono" />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-lg">Notifications</CardTitle>
                  <CardDescription>Manage your notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground">Email notifications</p>
                      <p className="text-xs text-muted-foreground">Receive updates about your interviews</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground">Marketing emails</p>
                      <p className="text-xs text-muted-foreground">Receive tips and product updates</p>
                    </div>
                    <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-lg">Data Management</CardTitle>
                  <CardDescription>Export or delete your data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-foreground">Export all data</p>
                      <p className="text-xs text-muted-foreground">Download all your preps and settings</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                    <div>
                      <p className="text-sm text-foreground">Delete account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-mono text-lg">Current Plan</CardTitle>
                      <CardDescription>You're on the Pro plan</CardDescription>
                    </div>
                    <Badge>Pro</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Monthly Usage</p>
                      <div className="h-3 bg-muted mb-2">
                        <div className="h-full bg-foreground" style={{ width: "60%" }} />
                      </div>
                      <p className="text-xs text-muted-foreground">6 of 10 interview preps used this month</p>
                    </div>
                    <div className="flex gap-3">
                      <Button>Upgrade to Max</Button>
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage in Stripe
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-lg">Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div>
                        <p className="text-sm text-foreground">Pro Plan - Monthly</p>
                        <p className="text-xs text-muted-foreground">Nov 1, 2024</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-foreground">$19.00</p>
                        <Badge variant="outline" className="text-xs">
                          Paid
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm text-foreground">Pro Plan - Monthly</p>
                        <p className="text-xs text-muted-foreground">Oct 1, 2024</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-foreground">$19.00</p>
                        <Badge variant="outline" className="text-xs">
                          Paid
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-lg">Bring Your Own Key (BYOK)</CardTitle>
                  <CardDescription>
                    Use your own API keys for unlimited usage
                    <Badge variant="default" className="ml-2">
                      Max Plan
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      With BYOK, you get unlimited interview preps and AI interactions. Your API keys are encrypted and
                      never stored in plain text.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="openai" className="text-sm text-muted-foreground mb-2 block">
                      OpenAI API Key
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="openai"
                          type={showOpenAIKey ? "text" : "password"}
                          placeholder="sk-..."
                          className="font-mono pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your key from{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        platform.openai.com
                      </a>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="anthropic" className="text-sm text-muted-foreground mb-2 block">
                      Anthropic API Key
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="anthropic"
                          type={showAnthropicKey ? "text" : "password"}
                          placeholder="sk-ant-..."
                          className="font-mono pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your key from{" "}
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        console.anthropic.com
                      </a>
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-yellow-500/30 bg-yellow-500/5">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Your API usage will be billed directly by OpenAI/Anthropic. We recommend setting up usage limits
                      in your provider dashboard.
                    </p>
                  </div>

                  <Button>Save API Keys</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
