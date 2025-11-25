import { z } from 'zod';

/**
 * Schema for creating a new interview
 * Requirements: 2.3, 2.5 - Input validation with field-level error messages
 */
export const CreateInterviewInputSchema = z.object({
  jobTitle: z.string()
    .min(2, 'Job title must be at least 2 characters')
    .max(100, 'Job title must be at most 100 characters'),
  company: z.string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be at most 100 characters'),
  jobDescription: z.string()
    .min(50, 'Job description must be at least 50 characters')
    .max(10000, 'Job description must be at most 10000 characters'),
  resumeText: z.string()
    .min(100, 'Resume text must be at least 100 characters')
    .max(50000, 'Resume text must be at most 50000 characters')
    .optional(),
});

/**
 * Schema for adding more content to an existing interview section
 * Requirements: 2.3, 2.5 - Input validation with field-level error messages
 */
export const AddMoreInputSchema = z.object({
  interviewId: z.string().min(1, 'Interview ID is required'),
  module: z.enum(['mcqs', 'rapidFire', 'revisionTopics'], {
    errorMap: () => ({ message: 'Module must be one of: mcqs, rapidFire, revisionTopics' }),
  }),
  count: z.number()
    .int('Count must be an integer')
    .min(1, 'Count must be at least 1')
    .max(10, 'Count must be at most 10')
    .default(5),
});

export type CreateInterviewInput = z.infer<typeof CreateInterviewInputSchema>;
export type AddMoreInput = z.infer<typeof AddMoreInputSchema>;
