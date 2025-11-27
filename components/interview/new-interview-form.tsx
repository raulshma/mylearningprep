'use client';

import { useState, useCallback, useEffect } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Upload,
  FileText,
  X,
  Loader2,
  AlertCircle,
  Wand2,
  ChevronDown,
  ChevronUp,
  Target,
  Brain,
  CheckCircle2,
  Info,
  ArrowRight,
  Settings2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createInterview, createInterviewFromPrompt } from '@/lib/actions/interview';
import { MODULE_LABELS, type ModuleType } from '@/lib/db/schemas/interview';
import { useSharedHeader } from '@/components/dashboard/shared-header-context';

interface UsageData {
  interviews: { count: number; limit: number };
  plan: string;
  isByok: boolean;
}

interface NewInterviewFormProps {
  usageData: UsageData;
}

const tips = [
  'Include the job title and company name',
  'Mention your years of experience',
  'List key technologies from the job posting',
  'Note any specific interview focus areas',
];

export function NewInterviewForm({ usageData }: NewInterviewFormProps) {
  const router = useRouter();
  const { setHeader } = useSharedHeader();

  const isAtLimit = !usageData.isByok && usageData.interviews.count >= usageData.interviews.limit;
  const remainingInterviews = usageData.interviews.limit - usageData.interviews.count;

  // Set header on mount
  useEffect(() => {
    setHeader({
      badge: 'New Interview',
      badgeIcon: Sparkles,
      title: 'Create Interview Prep',
      description: 'Create your personalized preparation plan',
      actions: !usageData.isByok ? (
        <div className="flex items-center gap-2 text-sm bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
          <div className={`w-2 h-2 rounded-full ${isAtLimit ? 'bg-destructive' : 'bg-green-500'}`} />
          <span className="text-muted-foreground font-medium">
            {remainingInterviews} of {usageData.interviews.limit} remaining
          </span>
        </div>
      ) : undefined,
    });
  }, [setHeader, usageData.isByok, isAtLimit, remainingInterviews, usageData.interviews.limit]);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [isPromptSubmitting, setIsPromptSubmitting] = useState(false);
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showManualResume, setShowManualResume] = useState(false);
  const [showSectionSettings, setShowSectionSettings] = useState(false);
  const [excludedModules, setExcludedModules] = useState<Set<ModuleType>>(new Set());

  const allModules: ModuleType[] = ['openingBrief', 'revisionTopics', 'mcqs', 'rapidFire'];

  const toggleModule = (module: ModuleType) => {
    setExcludedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        // Don't allow excluding all modules
        if (next.size < allModules.length - 1) {
          next.add(module);
        }
      }
      return next;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return validTypes.includes(file.type);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidFileType(file)) {
      setResumeFile(file);
      setShowManualResume(false);
      setErrors((prev) => ({ ...prev, resumeFile: '' }));
    } else {
      setErrors((prev) => ({ ...prev, resumeFile: 'Please upload a PDF or DOCX file' }));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isValidFileType(file)) {
        setResumeFile(file);
        setShowManualResume(false);
        setErrors((prev) => ({ ...prev, resumeFile: '' }));
      } else {
        setErrors((prev) => ({ ...prev, resumeFile: 'Please upload a PDF or DOCX file' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (jobTitle.trim().length < 2) newErrors.jobTitle = 'Job title must be at least 2 characters';
    else if (jobTitle.length > 100) newErrors.jobTitle = 'Job title must be at most 100 characters';
    if (company.trim().length < 1) newErrors.company = 'Company name is required';
    else if (company.length > 100) newErrors.company = 'Company name must be at most 100 characters';
    if (jobDescription.trim().length < 50) newErrors.jobDescription = 'Job description must be at least 50 characters';
    else if (jobDescription.length > 10000) newErrors.jobDescription = 'Job description must be at most 10000 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    if (prompt.trim().length < 10) {
      setGeneralError('Please provide a more detailed prompt (at least 10 characters)');
      return;
    }
    setIsPromptSubmitting(true);
    try {
      const result = await createInterviewFromPrompt({ 
        prompt: prompt.trim(),
        excludedModules: Array.from(excludedModules),
      });
      if (result.success) {
        router.push(`/interview/${result.data._id}`);
      } else {
        setGeneralError(result.error.message);
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setIsPromptSubmitting(false);
    }
  };

  const handleDetailedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const result = await createInterview({
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        jobDescription: jobDescription.trim(),
        resumeFile: resumeFile ?? undefined,
        resumeText: showManualResume ? resumeText.trim() : undefined,
        excludedModules: Array.from(excludedModules),
      });
      if (result.success) {
        router.push(`/interview/${result.data._id}`);
      } else {
        if (result.error.code === 'VALIDATION_ERROR' && result.error.details) {
          setErrors(result.error.details);
        } else if (result.error.code === 'PARSE_ERROR') {
          setErrors((prev) => ({ ...prev, resumeFile: result.error.message }));
          setShowManualResume(true);
        } else {
          setGeneralError(result.error.message);
        }
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitPrompt = prompt.trim().length >= 10 && !isAtLimit;
  const canSubmitDetailed =
    jobTitle.trim().length >= 2 &&
    company.trim().length >= 1 &&
    jobDescription.trim().length >= 50 &&
    !isAtLimit;
  const isLoading = isPromptSubmitting || isSubmitting;

  return (
    <div className="max-w-full px-4 md:px-0">
      {/* Error banner */}
      <AnimatePresence>
        {generalError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{generalError}</p>
            <button onClick={() => setGeneralError(null)} className="ml-auto hover:bg-destructive/20 p-1 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Limit reached banner */}
      {isAtLimit && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-border text-sm"
        >
          <Info className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            You've reached your {usageData.plan} plan limit.{' '}
            <Link href="/settings" className="text-foreground underline hover:no-underline font-medium">
              Upgrade your plan
            </Link>{' '}
            to create more interviews.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        {/* Main form area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Start Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <form onSubmit={handlePromptSubmit}>
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl hover:border-primary/20 transition-all duration-300 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <Wand2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Quick Start</h2>
                    <p className="text-sm text-muted-foreground">Describe your interview in natural language</p>
                  </div>
                </div>
                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., I'm preparing for a Senior Frontend Engineer interview at Stripe. I have 5 years of experience with React, Node.js, and TypeScript..."
                    className="font-mono text-sm min-h-[160px] bg-secondary/30 border-border/50 focus:border-primary/30 focus:ring-0 resize-none rounded-2xl p-4 leading-relaxed"
                    disabled={isLoading || isAtLimit}
                  />
                  <div className="absolute bottom-4 right-4">
                    <p className="text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border/50">
                      {prompt.length < 10 ? `${10 - prompt.length} more chars` : 'Ready'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-4">
                  <Button
                    type="submit"
                    disabled={!canSubmitPrompt || isLoading}
                    className="rounded-full px-6 h-11 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isPromptSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Prep
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Section Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between h-12 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-300"
              onClick={() => setShowSectionSettings(!showSectionSettings)}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <Settings2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Customize sections
                  {excludedModules.size > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({allModules.length - excludedModules.size} of {allModules.length} selected)
                    </span>
                  )}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSectionSettings ? 'rotate-180' : ''}`} />
            </Button>

            <AnimatePresence>
              {showSectionSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 pb-1 px-1">
                    <p className="text-xs text-muted-foreground mb-3">
                      Select which sections to generate. At least one must be selected.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {allModules.map((module) => {
                        const isExcluded = excludedModules.has(module);
                        const isLastEnabled = !isExcluded && excludedModules.size === allModules.length - 1;
                        return (
                          <label
                            key={module}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isExcluded
                                ? 'border-border/30 bg-secondary/20 opacity-60'
                                : 'border-border/50 bg-secondary/30 hover:border-primary/30'
                            } ${isLastEnabled ? 'cursor-not-allowed' : ''}`}
                          >
                            <Checkbox
                              checked={!isExcluded}
                              onCheckedChange={() => toggleModule(module)}
                              disabled={isLoading || isLastEnabled}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <span className={`text-sm font-medium ${isExcluded ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {MODULE_LABELS[module]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Divider */}
          <motion.div className="relative flex items-center gap-4 py-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </motion.div>

          {/* Detailed Form Toggle */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between bg-card/30 hover:bg-card/50 border-border/50 h-16 rounded-2xl group transition-all duration-300"
              onClick={() => setShowDetailedForm(!showDetailedForm)}
              disabled={isLoading}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-medium text-foreground">Fill in details manually</span>
                  <span className="block text-xs text-muted-foreground">Upload resume and job description</span>
                </div>
              </div>
              {showDetailedForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </Button>
          </motion.div>

          {/* Detailed Form */}
          <AnimatePresence>
            {showDetailedForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                <form onSubmit={handleDetailedSubmit} className="pt-2">
                  <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle" className="text-sm font-medium text-foreground ml-1">
                          Job Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="jobTitle"
                          value={jobTitle}
                          onChange={(e) => { setJobTitle(e.target.value); if (errors.jobTitle) setErrors((prev) => ({ ...prev, jobTitle: '' })); }}
                          placeholder="Senior Frontend Engineer"
                          className={`h-12 rounded-xl bg-secondary/30 border-border/50 focus:border-primary/30 focus:ring-0 ${errors.jobTitle ? 'border-destructive/50' : ''}`}
                          disabled={isLoading || isAtLimit}
                        />
                        {errors.jobTitle && <p className="text-xs text-destructive ml-1">{errors.jobTitle}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm font-medium text-foreground ml-1">
                          Company <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="company"
                          value={company}
                          onChange={(e) => { setCompany(e.target.value); if (errors.company) setErrors((prev) => ({ ...prev, company: '' })); }}
                          placeholder="Stripe"
                          className={`h-12 rounded-xl bg-secondary/30 border-border/50 focus:border-primary/30 focus:ring-0 ${errors.company ? 'border-destructive/50' : ''}`}
                          disabled={isLoading || isAtLimit}
                        />
                        {errors.company && <p className="text-xs text-destructive ml-1">{errors.company}</p>}
                      </div>
                    </div>

                    {/* Resume Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground ml-1">Resume (optional)</Label>
                      {!showManualResume ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 min-h-[120px] flex flex-col items-center justify-center group ${isDragging ? 'border-primary bg-primary/5' : resumeFile ? 'border-primary/20 bg-primary/5' : errors.resumeFile ? 'border-destructive/50' : 'border-border/50 hover:border-primary/20 hover:bg-secondary/20'
                            }`}
                        >
                          {resumeFile ? (
                            <div className="flex items-center justify-center gap-4 w-full max-w-md bg-background/50 p-3 rounded-xl border border-border/50">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{resumeFile.name}</p>
                                <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => setResumeFile(null)} className="rounded-full hover:bg-destructive/10 hover:text-destructive" disabled={isLoading}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <p className="text-sm text-foreground font-medium mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                PDF or DOCX up to 5MB
                              </p>
                              <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" id="resume-upload" disabled={isLoading || isAtLimit} />
                              <label htmlFor="resume-upload" className="absolute inset-0 cursor-pointer" />
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <Textarea
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste your resume text here..."
                            className="w-full font-mono text-sm min-h-[140px] bg-secondary/30 border-border/50 rounded-2xl p-4 focus:border-primary/30 focus:ring-0"
                            disabled={isLoading || isAtLimit}
                          />
                          <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 h-8 text-xs" onClick={() => { setShowManualResume(false); setResumeText(''); }}>
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      )}
                      {errors.resumeFile && (
                        <div className="mt-2 ml-1">
                          <p className="text-xs text-destructive">{errors.resumeFile}</p>
                        </div>
                      )}
                      {!showManualResume && !resumeFile && (
                        <div className="text-right">
                          <Button type="button" variant="link" size="sm" className="h-auto text-xs text-muted-foreground hover:text-primary px-0" onClick={() => { setShowManualResume(true); setResumeFile(null); setErrors((prev) => ({ ...prev, resumeFile: '' })); }}>
                            Or paste text manually
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Job Description */}
                    <div className="space-y-2">
                      <Label htmlFor="jobDescription" className="text-sm font-medium text-foreground ml-1">
                        Job Description <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Textarea
                          id="jobDescription"
                          value={jobDescription}
                          onChange={(e) => { setJobDescription(e.target.value); if (errors.jobDescription) setErrors((prev) => ({ ...prev, jobDescription: '' })); }}
                          placeholder="Paste the full job description here..."
                          className={`w-full font-mono text-sm min-h-[200px] bg-secondary/30 border-border/50 rounded-2xl p-4 focus:border-primary/30 focus:ring-0 resize-none ${errors.jobDescription ? 'border-destructive/50' : ''}`}
                          disabled={isLoading || isAtLimit}
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-3">
                          {errors.jobDescription ? (
                            <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded-full">{errors.jobDescription}</span>
                          ) : (
                            <span className={`text-[10px] px-2 py-1 rounded-full border ${jobDescription.length < 50 ? 'bg-secondary text-muted-foreground border-border' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                              {jobDescription.length < 50 ? `${50 - jobDescription.length} more needed` : 'Minimum met'}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border/50">
                            {jobDescription.length}/10000
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={!canSubmitDetailed || isLoading}
                      className="w-full h-12 rounded-full font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-4"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create Interview Prep
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side panel */}
        <motion.div className="lg:col-span-2 space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Tips for best results</h3>
            </div>
            <ul className="space-y-4">
              {tips.map((tip, i) => (
                <motion.li key={tip} className="flex items-start gap-3 text-sm text-muted-foreground" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                  <CheckCircle2 className="w-5 h-5 text-green-500/80 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-purple-500/5 border border-white/10 p-6 rounded-3xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground">What you'll get</h3>
              </div>
              <ul className="space-y-3">
                {([
                  { module: 'openingBrief' as ModuleType, label: 'Personalized opening brief' },
                  { module: 'revisionTopics' as ModuleType, label: 'Key revision topics' },
                  { module: 'mcqs' as ModuleType, label: 'Practice MCQs' },
                  { module: 'rapidFire' as ModuleType, label: 'Rapid-fire questions' },
                ]).map(({ module, label }) => {
                  const isExcluded = excludedModules.has(module);
                  return (
                    <li key={module} className={`flex items-center gap-3 text-sm transition-opacity ${isExcluded ? 'opacity-40 line-through' : 'text-muted-foreground'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isExcluded ? 'bg-muted-foreground/40' : 'bg-primary/40'}`} />
                      {label}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Powered by AI</span>
                  <Sparkles className="w-3 h-3 text-primary/50" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
