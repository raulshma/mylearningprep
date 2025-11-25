"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeft, ArrowRight, CalendarIcon, X, Sparkles, Upload, FileText } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

const techStackOptions = [
  "React",
  "Vue",
  "Angular",
  "Next.js",
  "Node.js",
  "Python",
  "Go",
  "Rust",
  "TypeScript",
  "JavaScript",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST APIs",
  "AWS",
  "GCP",
  "Azure",
  "Kubernetes",
  "Docker",
  "CI/CD",
  "System Design",
  "Data Structures",
  "Algorithms",
]

const focusAreas = [
  { id: "coding", label: "Coding Challenges", description: "LeetCode-style problems" },
  { id: "system", label: "System Design", description: "Architecture and scalability" },
  { id: "behavioral", label: "Behavioral", description: "STAR method questions" },
  { id: "technical", label: "Technical Deep Dives", description: "Framework/language specifics" },
  { id: "live", label: "Live Coding", description: "Pair programming scenarios" },
]

export default function NewInterviewPage() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState("")
  const [company, setCompany] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [techStack, setTechStack] = useState<string[]>([])
  const [selectedFocus, setSelectedFocus] = useState<string[]>([])
  const [date, setDate] = useState<Date | undefined>()
  const [techInput, setTechInput] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const totalSteps = 3

  const addTech = (tech: string) => {
    if (tech && !techStack.includes(tech)) {
      setTechStack([...techStack, tech])
      setTechInput("")
    }
  }

  const removeTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech))
  }

  const toggleFocus = (id: string) => {
    if (selectedFocus.includes(id)) {
      setSelectedFocus(selectedFocus.filter((f) => f !== id))
    } else {
      setSelectedFocus([...selectedFocus, id])
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (
      file &&
      (file.type === "application/pdf" ||
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      setResumeFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setResumeFile(file)
    }
  }

  const canProceed = () => {
    if (step === 1) return role.trim() !== "" && company.trim() !== ""
    if (step === 2) return techStack.length > 0
    if (step === 3) return date !== undefined
    return false
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-mono text-foreground">New Interview Prep</h1>
              <p className="text-sm text-muted-foreground">
                Step {step} of {totalSteps}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`w-8 h-1 ${i + 1 <= step ? "bg-foreground" : "bg-muted"}`} />
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-8 max-w-2xl">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-mono text-foreground mb-2">Tell us about the role</h2>
                <p className="text-muted-foreground">
                  We'll use this information to tailor your preparation materials.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="role" className="text-sm text-muted-foreground mb-2 block">
                    Job Title
                  </Label>
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g., Senior Frontend Engineer"
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="company" className="text-sm text-muted-foreground mb-2 block">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., Stripe"
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="resume" className="text-sm text-muted-foreground mb-2 block">
                    Resume (optional)
                  </Label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed p-8 text-center transition-colors ${
                      isDragging
                        ? "border-foreground bg-muted/50"
                        : resumeFile
                          ? "border-foreground/50 bg-muted/30"
                          : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm text-foreground font-mono">{resumeFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setResumeFile(null)} className="ml-2">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-2">Drag and drop your resume here, or</p>
                        <label>
                          <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
                          <span className="text-sm text-foreground hover:underline cursor-pointer">browse files</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">PDF, DOC, or DOCX up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="jd" className="text-sm text-muted-foreground mb-2 block">
                    Job Description (optional)
                  </Label>
                  <Textarea
                    id="jd"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here for personalized prep materials. The more details, the better we can tailor your preparation..."
                    className="font-mono min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Including the JD helps extract specific requirements, tech stack, and expectations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-mono text-foreground mb-2">Tech stack & focus areas</h2>
                <p className="text-muted-foreground">
                  Select the technologies and interview types you want to focus on.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Tech Stack</Label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTech(techInput))}
                      placeholder="Add technology..."
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={() => addTech(techInput)}>
                      Add
                    </Button>
                  </div>

                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {techStack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="font-mono">
                          {tech}
                          <button onClick={() => removeTech(tech)} className="ml-2 hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-3">Quick add:</p>
                    <div className="flex flex-wrap gap-2">
                      {techStackOptions
                        .filter((t) => !techStack.includes(t))
                        .slice(0, 12)
                        .map((tech) => (
                          <button
                            key={tech}
                            onClick={() => addTech(tech)}
                            className="text-xs px-2 py-1 border border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {tech}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block">Focus Areas</Label>
                  <div className="space-y-2">
                    {focusAreas.map((area) => (
                      <button
                        key={area.id}
                        onClick={() => toggleFocus(area.id)}
                        className={`w-full p-4 border text-left transition-colors flex items-center justify-between ${
                          selectedFocus.includes(area.id)
                            ? "border-foreground bg-card"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <div>
                          <span className="block font-mono text-sm text-foreground">{area.label}</span>
                          <span className="text-xs text-muted-foreground">{area.description}</span>
                        </div>
                        <div
                          className={`w-4 h-4 border ${
                            selectedFocus.includes(area.id)
                              ? "border-foreground bg-foreground"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedFocus.includes(area.id) && (
                            <svg viewBox="0 0 16 16" className="w-full h-full text-background">
                              <path
                                fill="currentColor"
                                d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06l2.72 2.72 6.72-6.72a.75.75 0 011.06 0z"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-mono text-foreground mb-2">When is your interview?</h2>
                <p className="text-muted-foreground">We'll create a timeline to help you prepare efficiently.</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Interview Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-mono bg-transparent">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {date ? format(date, "PPP") : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} />
                  </PopoverContent>
                </Popover>
              </div>

              {date && (
                <div className="border border-border p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-mono text-foreground">Prep Summary</h3>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Role</dt>
                      <dd className="text-foreground font-mono">{role}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Company</dt>
                      <dd className="text-foreground font-mono">{company}</dd>
                    </div>
                    {resumeFile && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Resume</dt>
                        <dd className="text-foreground font-mono text-xs">{resumeFile.name}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Technologies</dt>
                      <dd className="text-foreground font-mono">{techStack.length} selected</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Days until interview</dt>
                      <dd className="text-foreground font-mono">
                        {Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <footer className="border-t border-border px-8 py-4 flex items-center justify-between">
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
            <Link href="/interview/new">
              <Button disabled={!canProceed()}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Prep
              </Button>
            </Link>
          )}
        </footer>
      </main>
    </div>
  )
}
