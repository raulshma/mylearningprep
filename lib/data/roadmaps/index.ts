/**
 * Roadmap Data Index
 * Export all predefined roadmaps for seeding
 */

export { frontendRoadmap } from './frontend-roadmap';
export { javascriptRoadmap } from './javascript-roadmap';
export { dotnetRoadmap } from './dotnet-roadmap';

// Add more roadmaps here as they are created:
// export { backendRoadmap } from './backend-roadmap';
// export { devopsRoadmap } from './devops-roadmap';

import { frontendRoadmap } from './frontend-roadmap';
import { javascriptRoadmap } from './javascript-roadmap';
import { dotnetRoadmap } from './dotnet-roadmap';
import type { CreateRoadmap } from '@/lib/db/schemas/roadmap';

// All roadmaps for bulk seeding
export const allRoadmaps: CreateRoadmap[] = [
  frontendRoadmap,
  javascriptRoadmap,
  dotnetRoadmap,
  // Add more here
];
