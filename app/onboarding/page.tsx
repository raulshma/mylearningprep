"use client"

import { useState } from "react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import Link from "next/link"

const roles = [
  { id: "frontend", label: "Frontend Engineer", icon: "FE" },
  { id: "backend", label: "Backend Engineer", icon: "BE" },
  { id: "fullstack", label: "Full Stack Engineer", icon: "FS" },
  { id: "devops", label: "DevOps / SRE", icon: "DO" },
  { id: "data", label: "Data Engineer", icon: "DE" },
  { id: "mobile", label: "Mobile Developer", icon: "MB" },
]

const experienceLevels = [
  { id: "junior", label: "Junior", years: "0-2 years" },
  { id: "mid", label: "Mid-Level", years: "2-5 years" },
  { id: "senior", label: "Senior", years: "5-8 years" },
  { id: "staff", label: "Staff+", years: "8+ years" },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [name, setName] = useState("")

  const totalSteps = 3

  const canProceed = () => {
    if (step === 1) return selectedRole !== null
    if (step === 2) return selectedLevel !== null
    if (step === 3) return name.trim() !== ""
    return false
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 h-16 flex items-center justify-between">
        <Logo />
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Skip for now
        </Link>
      </header>

      {/* Progress */}
      <div className="border-b border-border">
        <div className="max-w-xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 ${i + 1 <= step ? "bg-foreground" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Step {step} of {totalSteps}
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-mono text-foreground mb-2">What role are you preparing for?</h1>
              <p className="text-muted-foreground mb-8">This helps us tailor your interview preparation content.</p>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-4 border text-left transition-colors ${
                      selectedRole === role.id
                        ? "border-foreground bg-card"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <span className="inline-block w-8 h-8 border border-border text-xs font-mono flex items-center justify-center mb-3 text-muted-foreground">
                      {role.icon}
                    </span>
                    <span className="block font-mono text-sm text-foreground">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-mono text-foreground mb-2">What's your experience level?</h1>
              <p className="text-muted-foreground mb-8">We'll adjust the depth and complexity of explanations.</p>
              <div className="space-y-3">
                {experienceLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`w-full p-4 border text-left transition-colors flex items-center justify-between ${
                      selectedLevel === level.id
                        ? "border-foreground bg-card"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div>
                      <span className="block font-mono text-foreground">{level.label}</span>
                      <span className="text-sm text-muted-foreground">{level.years}</span>
                    </div>
                    {selectedLevel === level.id && <Check className="w-4 h-4 text-foreground" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-2xl font-mono text-foreground mb-2">Almost there! What should we call you?</h1>
              <p className="text-muted-foreground mb-8">
                Just a first name is fine. This is how we'll address you in your prep materials.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm text-muted-foreground mb-2 block">
                    Your name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button disabled={!canProceed()}>
                Start Preparing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}
