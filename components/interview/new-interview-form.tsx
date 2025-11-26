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
} from 'lucide-react';
import { createInterview, createInterviewFromPrompt } from '@/lib/actions/interview';
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
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isAtLimit ? 'bg-destructive' : 'bg-green-500'}`} />
          <span className="text-muted-foreground">
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
      const result = await createInterviewFromPrompt({ prompt: prompt.trim() });
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
    <div className="max-w-full">
      {/* Error banner */}
      <AnimatePresence>
        {generalError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{generalError}</p>
            <button onClick={() => setGeneralError(null)} className="ml-auto hover:bg-destructive/20 p-1">
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
          className="mb-6 flex items-center gap-3 p-4 bg-secondary border border-border text-sm"
        >
          <Info className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            You've reached your {usageData.plan} plan limit.{' '}
            <Link href="/settings" className="text-foreground underline hover:no-underline">
              Upgrade your plan
            </Link>{' '}
            to create more interviews.
          </p>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Main form area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Start Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <form onSubmit={handlePromptSubmit}>
              <div className="bg-card border border-border p-6 md:p-8 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-mono text-foreground">Quick Start</h2>
                    <p className="text-sm text-muted-foreground">Describe your interview in natural language</p>
                  </div>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., I'm preparing for a Senior Frontend Engineer interview at Stripe..."
                  className="font-mono min-h-[140px] bg-secondary/30 border-border focus:border-primary/50 resize-none"
                  disabled={isLoading || isAtLimit}
                />
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    {prompt.length < 10 ? `${10 - prompt.length} more characters needed` : '✓ Ready to create'}
                  </p>
                  <Button type="submit" disabled={!canSubmitPrompt || isLoading}>
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

          {/* Divider */}
          <motion.div className="relative flex items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </motion.div>

          {/* Detailed Form Toggle */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between bg-card hover:bg-secondary/50 border-border h-14"
              onClick={() => setShowDetailedForm(!showDetailedForm)}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Fill in details manually</span>
              </div>
              {showDetailedForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </motion.div>

          {/* Detailed Form */}
          <AnimatePresence>
            {showDetailedForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                <form onSubmit={handleDetailedSubmit} className="space-y-6">
                  <div className="bg-card border border-border p-6 md:p-8 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="jobTitle" className="text-sm text-muted-foreground mb-2 block">
                          Job Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="jobTitle"
                          value={jobTitle}
                          onChange={(e) => { setJobTitle(e.target.value); if (errors.jobTitle) setErrors((prev) => ({ ...prev, jobTitle: '' })); }}
                          placeholder="Senior Frontend Engineer"
                          className={`font-mono bg-secondary/30 ${errors.jobTitle ? 'border-destructive' : ''}`}
                          disabled={isLoading || isAtLimit}
                        />
                        {errors.jobTitle && <p className="text-xs text-destructive mt-1">{errors.jobTitle}</p>}
                      </div>
                      <div>
                        <Label htmlFor="company" className="text-sm text-muted-foreground mb-2 block">
                          Company <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="company"
                          value={company}
                          onChange={(e) => { setCompany(e.target.value); if (errors.company) setErrors((prev) => ({ ...prev, company: '' })); }}
                          placeholder="Stripe"
                          className={`font-mono bg-secondary/30 ${errors.company ? 'border-destructive' : ''}`}
                          disabled={isLoading || isAtLimit}
                        />
                        {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
                      </div>
                    </div>

                    {/* Resume Upload */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">Resume (optional)</Label>
                      {!showManualResume ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed p-6 text-center transition-all ${
                            isDragging ? 'border-primary bg-primary/5' : resumeFile ? 'border-primary/50 bg-primary/5' : errors.resumeFile ? 'border-destructive' : 'border-border hover:border-muted-foreground bg-secondary/20'
                          }`}
                        >
                          {resumeFile ? (
                            <div className="flex items-center justify-center gap-3">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                              <div className="text-left">
                                <p className="text-sm text-foreground font-mono">{resumeFile.name}</p>
                                <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => setResumeFile(null)} className="ml-2" disabled={isLoading}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground mb-1">
                                Drag and drop your resume, or{' '}
                                <label className="text-foreground hover:underline cursor-pointer">
                                  browse
                                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" disabled={isLoading || isAtLimit} />
                                </label>
                              </p>
                              <p className="text-xs text-muted-foreground">PDF or DOCX up to 5MB</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div>
                          <Textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume text here..." className="font-mono min-h-[120px] bg-secondary/30" disabled={isLoading || isAtLimit} />
                          <Button type="button" variant="link" size="sm" className="mt-1 p-0 h-auto text-xs" onClick={() => { setShowManualResume(false); setResumeText(''); }}>
                            Upload file instead
                          </Button>
                        </div>
                      )}
                      {errors.resumeFile && (
                        <div className="mt-2">
                          <p className="text-xs text-destructive">{errors.resumeFile}</p>
                          {!showManualResume && (
                            <Button type="button" variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setShowManualResume(true); setResumeFile(null); setErrors((prev) => ({ ...prev, resumeFile: '' })); }}>
                              Enter resume text manually
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Job Description */}
                    <div>
                      <Label htmlFor="jobDescription" className="text-sm text-muted-foreground mb-2 block">
                        Job Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="jobDescription"
                        value={jobDescription}
                        onChange={(e) => { setJobDescription(e.target.value); if (errors.jobDescription) setErrors((prev) => ({ ...prev, jobDescription: '' })); }}
                        placeholder="Paste the full job description here..."
                        className={`font-mono min-h-[180px] bg-secondary/30 resize-none ${errors.jobDescription ? 'border-destructive' : ''}`}
                        disabled={isLoading || isAtLimit}
                      />
                      <div className="flex justify-between mt-1">
                        {errors.jobDescription ? (
                          <p className="text-xs text-destructive">{errors.jobDescription}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{jobDescription.length < 50 ? `${50 - jobDescription.length} more characters needed` : '✓ Minimum length met'}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{jobDescription.length}/10000</p>
                      </div>
                    </div>

                    <Button type="submit" disabled={!canSubmitDetailed || isLoading} className="w-full">
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
          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-mono text-sm text-foreground">Tips for best results</h3>
            </div>
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <motion.li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {tip}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-card to-secondary/20 border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="font-mono text-sm text-foreground">What you'll get</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Personalized opening brief</li>
              <li>• Key revision topics</li>
              <li>• Practice MCQs</li>
              <li>• Rapid-fire questions</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
