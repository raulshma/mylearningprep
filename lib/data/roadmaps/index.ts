/**
 * Roadmap Data Index
 * Export all predefined roadmaps for seeding
 */

export { frontendRoadmap } from './frontend-roadmap';

// Add more roadmaps here as they are created:
// export { backendRoadmap } from './backend-roadmap';
// export { devopsRoadmap } from './devops-roadmap';

import { frontendRoadmap } from './frontend-roadmap';
import type { CreateRoadmap } from '@/lib/db/schemas/roadmap';

// All roadmaps for bulk seeding
export const allRoadmaps: CreateRoadmap[] = [
  frontendRoadmap,
  // Add more here
];
