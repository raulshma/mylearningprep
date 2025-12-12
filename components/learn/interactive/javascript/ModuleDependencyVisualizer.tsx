'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Package,
  ArrowRight,
  FileCode,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';

// Types
export interface ModuleNode {
  id: string;
  name: string;
  path: string;
  exports: ModuleExport[];
  imports: ModuleImport[];
}

export interface ModuleExport {
  name: string;
  type: 'named' | 'default';
  isReExport?: boolean;
}

export interface ModuleImport {
  from: string;
  items: ImportItem[];
}

export interface ImportItem {
  name: string;
  alias?: string;
  type: 'named' | 'default' | 'namespace';
}

export interface DependencyEdge {
  from: string;
  to: string;
  imports: ImportItem[];
}

export interface ModuleDependencyVisualizerProps {
  /** Code to parse for dependencies */
  code?: string;
  /** Pre-defined modules to display */
  modules?: ModuleNode[];
  /** Show export details */
  showExports?: boolean;
  /** Interactive node selection */
  interactive?: boolean;
  /** Callback when node is selected */
  onNodeSelect?: (node: ModuleNode) => void;
}

// Default example modules
const defaultModules: ModuleNode[] = [
  {
    id: 'main',
    name: 'main.js',
    path: './main.js',
    exports: [],
    imports: [
      { from: './utils', items: [{ name: 'formatDate', type: 'named' }, { name: 'capitalize', type: 'named' }] },
      { from: './api', items: [{ name: 'fetchUsers', type: 'named' }, { name: 'fetchPosts', type: 'named' }] },
      { from: './components', items: [{ name: 'App', type: 'default' }] },
    ],
  },
  {
    id: 'utils',
    name: 'utils.js',
    path: './utils.js',
    exports: [
      { name: 'formatDate', type: 'named' },
      { name: 'capitalize', type: 'named' },
      { name: 'debounce', type: 'named' },
    ],
    imports: [
      { from: './constants', items: [{ name: 'DATE_FORMAT', type: 'named' }] },
    ],
  },
  {
    id: 'api',
    name: 'api.js',
    path: './api.js',
    exports: [
      { name: 'fetchUsers', type: 'named' },
      { name: 'fetchPosts', type: 'named' },
      { name: 'apiClient', type: 'default' },
    ],
    imports: [
      { from: './constants', items: [{ name: 'API_URL', type: 'named' }] },
      { from: './utils', items: [{ name: 'debounce', type: 'named' }] },
    ],
  },
  {
    id: 'components',
    name: 'components.js',
    path: './components.js',
    exports: [
      { name: 'App', type: 'default' },
      { name: 'Header', type: 'named' },
      { name: 'Footer', type: 'named' },
    ],
    imports: [
      { from: './utils', items: [{ name: 'capitalize', type: 'named' }] },
      { from: './api', items: [{ name: 'fetchUsers', type: 'named' }] },
    ],
  },
  {
    id: 'constants',
    name: 'constants.js',
    path: './constants.js',
    exports: [
      { name: 'API_URL', type: 'named' },
      { name: 'DATE_FORMAT', type: 'named' },
      { name: 'APP_NAME', type: 'named' },
    ],
    imports: [],
  },
];

/**
 * Parse import/export statements from code
 * Requirements: 4.6
 */
export function parseModuleCode(code: string): { imports: ModuleImport[]; exports: ModuleExport[] } {
  const imports: ModuleImport[] = [];
  const exports: ModuleExport[] = [];

  // Parse imports
  const importRegex = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]+)\})?\s*(?:\*\s+as\s+(\w+))?\s*from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const [, defaultImport, namedImports, namespaceImport, from] = match;
    const items: ImportItem[] = [];

    if (defaultImport) {
      items.push({ name: defaultImport, type: 'default' });
    }

    if (namedImports) {
      namedImports.split(',').forEach(item => {
        const trimmed = item.trim();
        if (trimmed) {
          const [name, alias] = trimmed.split(/\s+as\s+/).map(s => s.trim());
          items.push({ name, alias, type: 'named' });
        }
      });
    }

    if (namespaceImport) {
      items.push({ name: namespaceImport, type: 'namespace' });
    }

    if (items.length > 0) {
      imports.push({ from, items });
    }
  }

  // Parse exports
  const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  while ((match = namedExportRegex.exec(code)) !== null) {
    exports.push({ name: match[1], type: 'named' });
  }

  const defaultExportRegex = /export\s+default\s+(?:(?:function|class)\s+)?(\w+)?/g;
  while ((match = defaultExportRegex.exec(code)) !== null) {
    exports.push({ name: match[1] || 'default', type: 'default' });
  }

  const exportListRegex = /export\s+\{([^}]+)\}/g;
  while ((match = exportListRegex.exec(code)) !== null) {
    match[1].split(',').forEach(item => {
      const trimmed = item.trim();
      if (trimmed) {
        const [name] = trimmed.split(/\s+as\s+/).map(s => s.trim());
        exports.push({ name, type: 'named' });
      }
    });
  }

  return { imports, exports };
}

/**
 * Build dependency edges from modules
 */
function buildDependencyEdges(modules: ModuleNode[]): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const moduleMap = new Map(modules.map(m => [m.path, m]));

  modules.forEach(module => {
    module.imports.forEach(imp => {
      const targetPath = imp.from.startsWith('.') ? imp.from + '.js' : imp.from;
      const normalizedPath = imp.from.replace(/\.js$/, '');
      
      // Find matching module
      const target = modules.find(m => 
        m.path === imp.from || 
        m.path === targetPath ||
        m.path === `./${normalizedPath}.js` ||
        m.path.includes(normalizedPath)
      );

      if (target) {
        edges.push({
          from: module.id,
          to: target.id,
          imports: imp.items,
        });
      }
    });
  });

  return edges;
}

// Node positions for visualization (simple layout)
function calculateNodePositions(modules: ModuleNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const levels = new Map<string, number>();
  
  // Calculate dependency levels
  const calculateLevel = (moduleId: string, visited: Set<string> = new Set()): number => {
    if (visited.has(moduleId)) return 0;
    visited.add(moduleId);
    
    const mod = modules.find(m => m.id === moduleId);
    if (!mod || mod.imports.length === 0) return 0;
    
    let maxLevel = 0;
    mod.imports.forEach(imp => {
      const target = modules.find(m => m.path.includes(imp.from.replace('./', '')));
      if (target) {
        maxLevel = Math.max(maxLevel, calculateLevel(target.id, visited) + 1);
      }
    });
    
    return maxLevel;
  };

  modules.forEach(m => {
    levels.set(m.id, calculateLevel(m.id));
  });

  // Group by level
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });

  // Position nodes
  const maxLevel = Math.max(...levels.values());
  levelGroups.forEach((ids, level) => {
    const y = ((maxLevel - level) / Math.max(maxLevel, 1)) * 300 + 50;
    ids.forEach((id, index) => {
      const x = ((index + 1) / (ids.length + 1)) * 400;
      positions.set(id, { x, y });
    });
  });

  return positions;
}


/**
 * ModuleDependencyVisualizer Component
 * Displays module dependencies as an interactive graph
 * Requirements: 4.6
 */
export function ModuleDependencyVisualizer({
  code,
  modules = defaultModules,
  showExports = true,
  interactive = true,
  onNodeSelect,
}: ModuleDependencyVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<ModuleNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showImportDetails, setShowImportDetails] = useState(true);

  // Parse code if provided
  const parsedModules = useMemo(() => {
    if (code) {
      const parsed = parseModuleCode(code);
      return [{
        id: 'current',
        name: 'current.js',
        path: './current.js',
        exports: parsed.exports,
        imports: parsed.imports,
      }];
    }
    return modules;
  }, [code, modules]);

  // Build edges
  const edges = useMemo(() => buildDependencyEdges(parsedModules), [parsedModules]);

  // Calculate positions
  const positions = useMemo(() => calculateNodePositions(parsedModules), [parsedModules]);

  // Handle node click
  const handleNodeClick = useCallback((node: ModuleNode) => {
    if (!interactive) return;
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    onNodeSelect?.(node);
  }, [interactive, onNodeSelect]);

  // Reset view
  const handleReset = useCallback(() => {
    setSelectedNode(null);
    setHoveredNode(null);
    setZoom(1);
  }, []);

  // Get edges connected to a node
  const getConnectedEdges = (nodeId: string) => {
    return edges.filter(e => e.from === nodeId || e.to === nodeId);
  };

  // Check if edge should be highlighted
  const isEdgeHighlighted = (edge: DependencyEdge) => {
    if (!selectedNode && !hoveredNode) return false;
    const activeId = selectedNode?.id || hoveredNode;
    return edge.from === activeId || edge.to === activeId;
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Module Dependency Graph
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDetails(!showImportDetails)}
            className="gap-1"
          >
            {showImportDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showImportDetails ? 'Hide' : 'Show'} Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="px-2"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
            className="px-2"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Graph Container */}
      <Card className="overflow-hidden border shadow-sm">
        <div 
          className="relative bg-zinc-950 overflow-auto"
          style={{ height: 400 }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 450 400"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* Edges */}
            <g>
              {edges.map((edge, index) => {
                const fromPos = positions.get(edge.from);
                const toPos = positions.get(edge.to);
                if (!fromPos || !toPos) return null;

                const highlighted = isEdgeHighlighted(edge);
                const midX = (fromPos.x + toPos.x) / 2;
                const midY = (fromPos.y + toPos.y) / 2;

                return (
                  <g key={`${edge.from}-${edge.to}-${index}`}>
                    {/* Edge line */}
                    <motion.line
                      x1={fromPos.x}
                      y1={fromPos.y}
                      x2={toPos.x}
                      y2={toPos.y}
                      stroke={highlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                      strokeWidth={highlighted ? 2 : 1}
                      strokeOpacity={highlighted ? 1 : 0.3}
                      markerEnd="url(#arrowhead)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                    {/* Import label */}
                    {showImportDetails && highlighted && (
                      <text
                        x={midX}
                        y={midY - 8}
                        textAnchor="middle"
                        className="text-[10px] fill-primary"
                      >
                        {edge.imports.map(i => i.name).join(', ')}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="hsl(var(--muted-foreground))"
                />
              </marker>
            </defs>

            {/* Nodes */}
            {parsedModules.map((mod, index) => {
              const pos = positions.get(mod.id);
              if (!pos) return null;

              const isSelected = selectedNode?.id === mod.id;
              const isHovered = hoveredNode === mod.id;
              const isHighlighted = isSelected || isHovered;

              return (
                <motion.g
                  key={mod.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                  onClick={() => handleNodeClick(mod)}
                  onMouseEnter={() => setHoveredNode(mod.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Node background */}
                  <rect
                    x={pos.x - 50}
                    y={pos.y - 20}
                    width={100}
                    height={40}
                    rx={8}
                    fill={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'}
                    stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={isHighlighted ? 2 : 1}
                  />
                  {/* File icon */}
                  <FileCode
                    x={pos.x - 42}
                    y={pos.y - 8}
                    width={16}
                    height={16}
                    className={isHighlighted ? 'text-primary-foreground' : 'text-muted-foreground'}
                  />
                  {/* Module name */}
                  <text
                    x={pos.x + 5}
                    y={pos.y + 4}
                    textAnchor="middle"
                    className={cn(
                      'text-xs font-medium',
                      isHighlighted ? 'fill-primary-foreground' : 'fill-foreground'
                    )}
                  >
                    {mod.name}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 bg-secondary/30 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-secondary border border-border" />
            <span>Module</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            <span>Imports from</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>Selected</span>
          </div>
        </div>
      </Card>

      {/* Selected Module Details */}
      <AnimatePresence>
        {selectedNode && showExports && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <FileCode className="w-4 h-4 text-primary" />
                {selectedNode.name}
              </h4>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Exports */}
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">Exports</h5>
                  {selectedNode.exports.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedNode.exports.map((exp, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-green-500" />
                          <code className="text-xs bg-secondary px-1 rounded">
                            {exp.type === 'default' ? 'default' : exp.name}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            ({exp.type})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No exports</p>
                  )}
                </div>

                {/* Imports */}
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">Imports</h5>
                  {selectedNode.imports.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedNode.imports.map((imp, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>from</span>
                            <code className="text-xs bg-secondary px-1 rounded text-foreground">
                              {imp.from}
                            </code>
                          </div>
                          <div className="ml-4 mt-1 flex flex-wrap gap-1">
                            {imp.items.map((item, j) => (
                              <code key={j} className="text-xs bg-primary/10 text-primary px-1 rounded">
                                {item.type === 'default' ? 'default' : item.name}
                                {item.alias && ` as ${item.alias}`}
                              </code>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No imports (root module)</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <div className="text-xs text-muted-foreground">
        💡 Click on modules to see their imports and exports. Arrows show dependency direction.
      </div>
    </div>
  );
}

// Export for testing
export { defaultModules, buildDependencyEdges, calculateNodePositions };
export default ModuleDependencyVisualizer;
