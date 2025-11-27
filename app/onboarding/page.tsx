"use client"

import { useState } from "react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const roles = [
  { id: "frontend", label: "Frontend Engineer", icon: "🎨", description: "Crafting beautiful user interfaces" },
  { id: "backend", label: "Backend Engineer", icon: "⚙️", description: "Building robust server-side logic" },
  { id: "fullstack", label: "Full Stack Engineer", icon: "🚀", description: "Mastering the entire stack" },
  { id: "devops", label: "DevOps / SRE", icon: "🛠️", description: "Ensuring reliability and scale" },
  { id: "data", label: "Data Engineer", icon: "📊", description: "Wrangling big data pipelines" },
  { id: "mobile", label: "Mobile Developer", icon: "📱", description: "Creating native mobile experiences" },
]

const experienceLevels = [
  { id: "junior", label: "Junior", years: "0-2 years", description: "Just starting your journey" },
  { id: "mid", label: "Mid-Level", years: "2-5 years", description: "Ready for more complexity" },
  { id: "senior", label: "Senior", years: "5-8 years", description: "Leading technical decisions" },
  { id: "staff", label: "Staff+", years: "8+ years", description: "Setting strategic direction" },
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

  const handleNext = () => {
    if (canProceed() && step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-background to-background opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 h-20 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Logo />
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-secondary/50"
        >
          Skip for now
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 relative z-10 pb-20">
        <div className="w-full max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <div className="text-center mb-12 space-y-4">
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                    Choose your path.
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Select the role you're preparing for to get a tailored experience.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
                  {roles.map((role) => (
                    <motion.button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "group relative p-6 rounded-2xl border text-left transition-all duration-300 overflow-hidden",
                        selectedRole === role.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/50 bg-card/50 hover:bg-card hover:border-border hover:shadow-lg"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <span className="text-3xl mb-4 block filter grayscale group-hover:grayscale-0 transition-all duration-300">
                          {role.icon}
                        </span>
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {role.label}
                        </h3>
                        <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80">
                          {role.description}
                        </p>
                      </div>
                      {selectedRole === role.id && (
                        <div className="absolute top-4 right-4 text-primary">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center w-full max-w-2xl mx-auto"
              >
                <div className="text-center mb-12 space-y-4">
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                    What's your level?
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    We'll adapt the content complexity to match your expertise.
                  </p>
                </div>

                <div className="space-y-3 w-full">
                  {experienceLevels.map((level) => (
                    <motion.button
                      key={level.id}
                      onClick={() => setSelectedLevel(level.id)}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "w-full p-5 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group",
                        selectedLevel === level.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 bg-card/50 hover:bg-card hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                          selectedLevel === level.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                        )}>
                          {level.id.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{level.label}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                              {level.years}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {level.description}
                          </p>
                        </div>
                      </div>
                      {selectedLevel === level.id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-primary"
                        >
                          <Check className="w-6 h-6" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center w-full max-w-xl mx-auto"
              >
                <div className="text-center mb-12 space-y-4">
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                    One last thing.
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    How should we address you?
                  </p>
                </div>

                <div className="w-full space-y-8">
                  <div className="relative group">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your First Name"
                      className="h-16 text-2xl px-6 rounded-2xl border-2 border-border/50 bg-card/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-center placeholder:text-muted-foreground/30"
                      autoFocus
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      We'll use this to personalize your dashboard and daily greetings.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-20">
        <div className="max-w-4xl mx-auto relative flex items-center justify-center">
          <div className="absolute left-0 hidden sm:flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i + 1 === step ? "w-8 bg-primary" : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className={cn(
                "transition-opacity duration-200",
                step === 1 ? "opacity-0 pointer-events-none" : "opacity-100"
              )}
            >
              Back
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                size="lg"
                className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Link href="/dashboard">
                <Button
                  disabled={!canProceed()}
                  size="lg"
                  className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
