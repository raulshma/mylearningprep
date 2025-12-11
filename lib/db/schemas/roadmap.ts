import { z } from 'zod';
import { DifficultyLevelSchema, SkillClusterSchema, TopicResourceSchema } from './learning-path';

// Roadmap categories (extensible for future roadmaps)
export const RoadmapCategorySchema = z.enum([
  'frontend',
  'backend',
  'devops',
  'mobile',
  'data-science',
  'system-design',
  'full-stack',
]);

// Node types for visual differentiation
export const RoadmapNodeTypeSchema = z.enum([
  'milestone',    // Major learning milestone (colored nodes)
  'topic',        // Regular learning topic (yellow nodes)
  'checkpoint',   // Progress checkpoint
  'optional',     // Optional/alternative paths (gray nodes)
]);

// Connection types for edges between nodes
export const ConnectionTypeSchema = z.enum([
  'sequential',   // Must complete before next
  'optional',     // Nice to have
  'recommended',  // Strongly recommended
]);

// Position for visual layout
export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Individual node in roadmap
export const RoadmapNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: RoadmapNodeTypeSchema,
  // Position for visual layout (x, y coordinates)
  position: NodePositionSchema,
  // Learning content
  learningObjectives: z.array(z.string()).default([]),
  resources: z.array(TopicResourceSchema).default([]),
  estimatedMinutes: z.number().int().min(5).default(30),
  difficulty: DifficultyLevelSchema.optional(),
  // Nested roadmap (recursive structure) - references another roadmap by slug
  subRoadmapSlug: z.string().optional(),
  // Metadata
  skillCluster: SkillClusterSchema.optional(),
  tags: z.array(z.string()).default([]),
});

// Edge/Connection between nodes
export const RoadmapEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1), // Source node ID
  target: z.string().min(1), // Target node ID
  type: ConnectionTypeSchema,
  label: z.string().optional(),
});

// Complete Roadmap document
export const RoadmapSchema = z.object({
  _id: z.string(),
  slug: z.string().min(1), // URL-friendly identifier (e.g., 'frontend', 'html-basics')
  title: z.string().min(1),
  description: z.string().min(1),
  category: RoadmapCategorySchema,
  version: z.string().default('1.0.0'),
  // Parent roadmap (for nested roadmaps)
  parentRoadmapSlug: z.string().optional(),
  parentNodeId: z.string().optional(),
  // Visual data
  nodes: z.array(RoadmapNodeSchema).min(1),
  edges: z.array(RoadmapEdgeSchema).default([]),
  // Metadata
  estimatedHours: z.number().min(0),
  difficulty: DifficultyLevelSchema,
  prerequisites: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create input (without generated fields)
export const CreateRoadmapSchema = RoadmapSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types
export type RoadmapCategory = z.infer<typeof RoadmapCategorySchema>;
export type RoadmapNodeType = z.infer<typeof RoadmapNodeTypeSchema>;
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;
export type NodePosition = z.infer<typeof NodePositionSchema>;
export type RoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type RoadmapEdge = z.infer<typeof RoadmapEdgeSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;
export type CreateRoadmap = z.infer<typeof CreateRoadmapSchema>;
