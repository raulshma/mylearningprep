import { z } from 'zod';
import type { JourneyCategory, JourneyNodeType, NodePosition, JourneyEdge, LearningObjective } from './journey';
import type { DifficultyLevel } from './learning-path';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';

// Entity types that can have visibility settings
export const EntityTypeSchema = z.enum([
  'journey',
  'milestone',
  'objective',
]);

// Visibility setting schema for database storage
export const VisibilitySettingSchema = z.object({
  _id: z.string(),
  entityType: EntityTypeSchema,
  entityId: z.string().min(1),
  // Parent references for hierarchy
  parentJourneySlug: z.string().optional(),
  parentMilestoneId: z.string().optional(),
  // Visibility flag
  isPublic: z.boolean().default(false),
  // Objective-specific option: if true and objective is publicly visible, lesson content may be shown in public explore
  contentPublic: z.boolean().optional(),
  // Audit fields
  updatedBy: z.string().min(1), // Admin clerk ID
  updatedAt: z.date(),
  createdAt: z.date(),
});

// Schema for creating a new visibility setting (without generated fields)
export const CreateVisibilitySettingSchema = VisibilitySettingSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating a visibility setting
export const UpdateVisibilitySettingSchema = z.object({
  isPublic: z.boolean(),
  updatedBy: z.string().min(1),
});

// Export types
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type VisibilitySetting = z.infer<typeof VisibilitySettingSchema>;
export type CreateVisibilitySetting = z.infer<typeof CreateVisibilitySettingSchema>;
export type UpdateVisibilitySetting = z.infer<typeof UpdateVisibilitySettingSchema>;

// Public journey response types (filtered for public consumption)
export interface PublicJourney {
  slug: string;
  title: string;
  description: string;
  category: JourneyCategory;
  difficulty: DifficultyLevel;
  estimatedHours: number;
  // Only public nodes included
  nodes: PublicJourneyNode[];
  edges: JourneyEdge[];
}

export interface PublicJourneyNode {
  id: string;
  title: string;
  description?: string;
  type: JourneyNodeType;
  position: NodePosition;
  // Only public objectives included
  learningObjectives: PublicLearningObjective[];
  estimatedMinutes: number;
  difficulty?: DifficultyLevel;
}

export interface PublicLearningObjective {
  title: string;
  /** Normalized lesson id (slug-like), if available */
  lessonId?: string;
  /** True when admins enabled content visibility for this objective */
  contentPublic?: boolean;
  /** Serialized MDX content for public display (only present when contentPublic is true and content exists) */
  contentMdx?: MDXRemoteSerializeResult;
}

// Visibility overview types for admin UI
export interface VisibilityOverview {
  journeys: JourneyVisibilityInfo[];
  stats: {
    totalJourneys: number;
    publicJourneys: number;
    totalMilestones: number;
    publicMilestones: number;
    totalObjectives: number;
    publicObjectives: number;
  };
}

export interface JourneyVisibilityInfo {
  slug: string;
  title: string;
  isPublic: boolean;
  milestoneCount: number;
  publicMilestoneCount: number;
}

export interface JourneyVisibilityDetails {
  journey: JourneyVisibilityInfo;
  milestones: MilestoneVisibilityInfo[];
}

export interface MilestoneVisibilityInfo {
  nodeId: string;
  title: string;
  isPublic: boolean;
  effectivelyPublic: boolean; // Considering parent visibility
  objectives: ObjectiveVisibilityInfo[];
}

export interface ObjectiveVisibilityInfo {
  index: number;
  title: string;
  isPublic: boolean;
  effectivelyPublic: boolean; // Considering parent visibility
  contentPublic: boolean;
  effectivelyContentPublic: boolean; // Considering parent visibility + objective visibility
}
