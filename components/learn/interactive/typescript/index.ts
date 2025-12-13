/**
 * TypeScript Interactive Components
 * Components for teaching TypeScript concepts with interactive examples
 */

import { withErrorBoundary } from '@/components/learn/shared';
import { TypePlayground as TypePlaygroundBase } from './TypePlayground';

// Export with error boundary wrapper
export const TypePlayground = withErrorBoundary(TypePlaygroundBase, 'TypePlayground');

// Re-export types
export type { TypePlaygroundProps } from './TypePlayground';
