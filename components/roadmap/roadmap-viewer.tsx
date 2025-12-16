'use client';

import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  MarkerType,
  type Edge,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LayoutGrid, TreeDeciduous, GitBranch, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { RoadmapFlowNodeMemo, type RoadmapFlowNodeData, type RoadmapFlowNode } from './roadmap-flow-node';
import { computeElkLayout, type ElkLayoutType, type LayoutResult } from './elk-layout';
import type { Roadmap } from '@/lib/db/schemas/roadmap';
import type { UserRoadmapProgress, NodeProgressStatus } from '@/lib/db/schemas/user-roadmap-progress';
import type { SubRoadmapProgressInfo } from '@/lib/actions/roadmap';

interface RoadmapViewerProps {
  roadmap: Roadmap;
  progress: UserRoadmapProgress | null;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  subRoadmapProgressMap?: Record<string, SubRoadmapProgressInfo>;
}

// Storage keys for persisting viewer state
const LAYOUT_STORAGE_KEY = 'roadmap-elk-layout-preference';
const getViewportStorageKey = (roadmapSlug: string) => `roadmap-viewport-${roadmapSlug}`;
const getSelectedNodeStorageKey = (roadmapSlug: string) => `roadmap-selected-node-${roadmapSlug}`;

interface SavedViewportState {
  viewport: Viewport;
  savedAt: number;
}

// Custom node types
const nodeTypes = {
  roadmapNode: RoadmapFlowNodeMemo,
};

// Edge colors
const EDGE_COLORS = {
  sequential: '#f59e0b',
  recommended: '#6b7280',
  optional: '#9ca3af',
};

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
};

const layoutOptions: { type: ElkLayoutType; label: string; icon: React.ReactNode }[] = [
  { type: 'layered', label: 'Layered', icon: <TreeDeciduous className="w-4 h-4" /> },
  { type: 'mrtree', label: 'Tree', icon: <GitBranch className="w-4 h-4" /> },
  { type: 'force', label: 'Force', icon: <Zap className="w-4 h-4" /> },
  { type: 'stress', label: 'Stress', icon: <LayoutGrid className="w-4 h-4" /> },
];

interface RoadmapViewerInnerProps extends RoadmapViewerProps {
  layoutType: ElkLayoutType;
  layoutResult: LayoutResult | null;
  savedViewport: SavedViewportState | null;
  onViewportChange: (viewport: Viewport) => void;
  subRoadmapProgressMap: Record<string, SubRoadmapProgressInfo>;
}

function RoadmapViewerInner({
  roadmap,
  progress,
  selectedNodeId,
  onNodeClick,
  layoutType,
  layoutResult,
  savedViewport,
  onViewportChange,
  subRoadmapProgressMap,
}: RoadmapViewerInnerProps) {
  const { fitView, setViewport, getViewport } = useReactFlow();
  const hasRestoredViewport = useRef(false);
  const isFirstLayout = useRef(true);

  // Get node status from progress
  const getNodeStatus = useCallback((nodeId: string): NodeProgressStatus => {
    if (!progress) return 'available';
    const nodeProgress = progress.nodeProgress.find(np => np.nodeId === nodeId);
    return nodeProgress?.status || 'locked';
  }, [progress]);

  // Convert to React Flow nodes using layout result
  const initialNodes = useMemo((): RoadmapFlowNode[] => {
    if (!layoutResult) return [];
    
    return roadmap.nodes.map((node) => {
      const layoutNode = layoutResult.nodes.find(n => n.id === node.id);
      // Get sub-roadmap progress if this node has a sub-roadmap (Requirements: 4.2, 4.3)
      const subRoadmapProgress = node.subRoadmapSlug 
        ? subRoadmapProgressMap[node.subRoadmapSlug] 
        : undefined;
      
      return {
        id: node.id,
        type: 'roadmapNode',
        position: { 
          x: layoutNode?.x || node.position.x, 
          y: layoutNode?.y || node.position.y 
        },
        data: {
          node,
          status: getNodeStatus(node.id),
          isActive: selectedNodeId === node.id,
          onNodeClick,
          subRoadmapProgress,
        } satisfies RoadmapFlowNodeData,
      };
    });
  }, [roadmap.nodes, getNodeStatus, selectedNodeId, onNodeClick, layoutResult, subRoadmapProgressMap]);

  // Convert roadmap edges to React Flow format
  const initialEdges = useMemo((): Edge[] => {
    return roadmap.edges.map((edge) => {
      const isSequential = edge.type === 'sequential';
      const isOptional = edge.type === 'optional';
      const color = EDGE_COLORS[edge.type] || EDGE_COLORS.sequential;
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        animated: isSequential,
        style: {
          stroke: color,
          strokeWidth: isSequential ? 3 : 2,
          strokeDasharray: isOptional ? '8 4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color,
          width: 18,
          height: 18,
        },
        label: edge.label,
        labelStyle: { fill: '#6b7280', fontSize: 11 },
        labelBgStyle: { fill: '#1f2937', stroke: '#374151' },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
  }, [roadmap.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when layout changes
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
      
      // Only auto-fit on first layout if no saved viewport
      if (isFirstLayout.current) {
        isFirstLayout.current = false;
        
        if (savedViewport && !hasRestoredViewport.current) {
          // Restore saved viewport
          hasRestoredViewport.current = true;
          setTimeout(() => {
            setViewport(savedViewport.viewport, { duration: 0 });
          }, 100);
        } else if (!savedViewport) {
          // No saved state, do auto-fit
          setTimeout(() => {
            fitView({ padding: 0.1, duration: 400 });
          }, 50);
        }
      }
    }
  }, [initialNodes, setNodes, fitView, setViewport, savedViewport]);

  // Update edges when props change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Save viewport on move end (debounced)
  const handleMoveEnd = useCallback(() => {
    const viewport = getViewport();
    onViewportChange(viewport);
  }, [getViewport, onViewportChange]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      // Don't use fitView prop if we have saved viewport
      fitView={!savedViewport}
      fitViewOptions={{ padding: 0.1 }}
      // Apply saved viewport as default
      defaultViewport={savedViewport?.viewport}
      minZoom={0.2}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      panOnScroll
      zoomOnScroll
      onMoveEnd={handleMoveEnd}
      proOptions={{ hideAttribution: true }}
    >
      <Controls 
        showInteractive={false}
        position="top-right"
        className="!bg-background/95 !backdrop-blur-md !border-border !rounded-xl !shadow-lg [&>button]:!bg-background [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted"
      />
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={24} 
        size={1.5} 
        color="#374151"
      />
    </ReactFlow>
  );
}

export function RoadmapViewer({ subRoadmapProgressMap = {}, ...props }: RoadmapViewerProps) {
  const [layoutType, setLayoutType] = useState<ElkLayoutType>('layered');
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
  const [isLayouting, setIsLayouting] = useState(false);
  const [savedViewport, setSavedViewport] = useState<SavedViewportState | null>(null);
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const viewportSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const onNodeClickRef = useRef(props.onNodeClick);
  
  // Keep ref updated
  useEffect(() => {
    onNodeClickRef.current = props.onNodeClick;
  }, [props.onNodeClick]);

  // Load saved state from localStorage on mount
  useEffect(() => {
    // Load layout preference
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (savedLayout && ['layered', 'mrtree', 'force', 'stress'].includes(savedLayout)) {
      setLayoutType(savedLayout as ElkLayoutType);
    }

    // Load saved viewport
    const viewportKey = getViewportStorageKey(props.roadmap.slug);
    const savedViewportData = localStorage.getItem(viewportKey);
    if (savedViewportData) {
      try {
        const parsed = JSON.parse(savedViewportData) as SavedViewportState;
        // Only use if saved within the last 24 hours
        if (Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
          setSavedViewport(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved viewport:', e);
      }
    }

    // Load and notify parent of selected node (if needed)
    const selectedNodeKey = getSelectedNodeStorageKey(props.roadmap.slug);
    const savedSelectedNode = localStorage.getItem(selectedNodeKey);
    if (savedSelectedNode && props.roadmap.nodes.some(n => n.id === savedSelectedNode)) {
      // Call onNodeClick to restore selection using ref to avoid stale closure
      onNodeClickRef.current(savedSelectedNode);
    }

    setHasLoadedState(true);
  }, [props.roadmap.slug, props.roadmap.nodes]);

  // Save selected node when it changes
  useEffect(() => {
    if (!hasLoadedState) return;
    
    const selectedNodeKey = getSelectedNodeStorageKey(props.roadmap.slug);
    if (props.selectedNodeId) {
      localStorage.setItem(selectedNodeKey, props.selectedNodeId);
    } else {
      localStorage.removeItem(selectedNodeKey);
    }
  }, [props.selectedNodeId, props.roadmap.slug, hasLoadedState]);

  // Handle viewport change with debounce
  const handleViewportChange = useCallback((viewport: Viewport) => {
    // Clear existing timeout
    if (viewportSaveTimeout.current) {
      clearTimeout(viewportSaveTimeout.current);
    }

    // Debounce save to avoid too many writes
    viewportSaveTimeout.current = setTimeout(() => {
      const viewportKey = getViewportStorageKey(props.roadmap.slug);
      const stateToSave: SavedViewportState = {
        viewport,
        savedAt: Date.now(),
      };
      localStorage.setItem(viewportKey, JSON.stringify(stateToSave));
      setSavedViewport(stateToSave);
    }, 300);
  }, [props.roadmap.slug]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (viewportSaveTimeout.current) {
        clearTimeout(viewportSaveTimeout.current);
      }
    };
  }, []);

  // Compute layout when type or roadmap changes
  useEffect(() => {
    let cancelled = false;
    
    async function runLayout() {
      // 1. Check cache first (before setting loading state)
      const cacheKey = `roadmap-layout-${props.roadmap.slug}-${layoutType}`;
      const versionHash = `${props.roadmap.nodes.length}-${props.roadmap.edges.length}`; // Simple versioning
      
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache matches current roadmap version
          if (parsed.version === versionHash) {
            if (!cancelled) {
              setLayoutResult(parsed.result);
            }
            return;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }

      // Only show loading state when actually computing
      if (!cancelled) {
        setIsLayouting(true);
      }
      
      try {
        const result = await computeElkLayout(
          props.roadmap.nodes,
          props.roadmap.edges,
          layoutType
        );
        
        if (!cancelled) {
          setLayoutResult(result);
          
          // Cache the result
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              version: versionHash,
              result,
              timestamp: Date.now()
            }));
          } catch (e) {
            // Storage quota exceeded or other error
            console.warn('Failed to cache layout:', e);
          }
        }
      } catch (error) {
        console.error('Layout failed:', error);
      } finally {
        if (!cancelled) {
          setIsLayouting(false);
        }
      }
    }
    
    runLayout();
    return () => { cancelled = true; };
  }, [props.roadmap.nodes, props.roadmap.edges, layoutType, props.roadmap.slug]);

  // Save layout preference to localStorage
  const handleLayoutChange = (newLayout: ElkLayoutType) => {
    setLayoutType(newLayout);
    localStorage.setItem(LAYOUT_STORAGE_KEY, newLayout);
    // Clear saved viewport when layout changes (new positions)
    const viewportKey = getViewportStorageKey(props.roadmap.slug);
    localStorage.removeItem(viewportKey);
    setSavedViewport(null);
  };

  // Calculate container height based on layout
  const containerHeight = useMemo(() => {
    if (!layoutResult) return 500;
    return Math.min(Math.max(layoutResult.height * 0.9 + 100, 400), 800);
  }, [layoutResult]);

  return (
    <div 
      className="relative w-full bg-card/30 rounded-2xl border border-border overflow-hidden"
      style={{ height: containerHeight }}
    >
      <ReactFlowProvider>
        <RoadmapViewerInner 
          {...props} 
          layoutType={layoutType} 
          layoutResult={layoutResult}
          savedViewport={savedViewport}
          onViewportChange={handleViewportChange}
          subRoadmapProgressMap={subRoadmapProgressMap}
        />
        
        {/* Layout selector panel */}
        <Panel position="top-left" className="!m-3">
          <div className="flex gap-1 p-1 bg-background/95 backdrop-blur-md rounded-lg border border-border shadow-lg">
            {layoutOptions.map((option) => (
              <Button
                key={option.type}
                variant="ghost"
                size="sm"
                onClick={() => handleLayoutChange(option.type)}
                disabled={isLayouting}
                className={cn(
                  'h-8 px-2 gap-1.5 text-xs',
                  layoutType === option.type && 'bg-primary/10 text-primary'
                )}
                title={option.label}
              >
                {option.icon}
                <span className="hidden sm:inline">{option.label}</span>
              </Button>
            ))}
          </div>
        </Panel>
        
        {/* Loading indicator */}
        {isLayouting && (
          <Panel position="top-center" className="!m-3">
            <div className="px-3 py-1.5 bg-background/95 backdrop-blur-md rounded-lg border border-border text-xs text-muted-foreground">
              Computing layout...
            </div>
          </Panel>
        )}
      </ReactFlowProvider>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-3 p-3 bg-background/95 backdrop-blur-md rounded-xl border border-border text-xs shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted border-2 border-muted-foreground/30" />
          <span className="text-muted-foreground font-medium">Locked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500/30 border-2 border-blue-500/50" />
          <span className="text-muted-foreground font-medium">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500/30 border-2 border-yellow-500/50" />
          <span className="text-muted-foreground font-medium">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500/30 border-2 border-green-500/50" />
          <span className="text-muted-foreground font-medium">Completed</span>
        </div>
      </div>
    </div>
  );
}
