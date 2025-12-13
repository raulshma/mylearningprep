'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  Box,
  RotateCcw,
  Play,
  Pause,
  Zap,
  ArrowUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ErrorPropagationVisualizerProps {
  /** Whether to auto-play the animation */
  autoPlay?: boolean;
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast';
  /** Whether to show where boundaries catch errors */
  showBoundaries?: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  hasBoundary: boolean;
  children: TreeNode[];
  isErrorSource?: boolean;
  isCatching?: boolean;
  isHighlighted?: boolean;
  errorPassed?: boolean;
}

type AnimationPhase = 'idle' | 'error-thrown' | 'bubbling' | 'caught' | 'fallback';

const speedMs: Record<string, number> = {
  slow: 1500,
  normal: 1000,
  fast: 500,
};

/**
 * ErrorPropagationVisualizer Component
 * Animates error bubbling through the component tree and shows where boundaries catch errors
 * Requirements: 18.6
 */
export function ErrorPropagationVisualizer({
  autoPlay = false,
  speed = 'normal',
  showBoundaries = true,
}: ErrorPropagationVisualizerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const [errorSourceId, setErrorSourceId] = useState<string>('grandchild-1');
  const [bubbleStep, setBubbleStep] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Component tree structure
  const [tree, setTree] = useState<TreeNode>({
    id: 'app',
    name: 'App',
    hasBoundary: false,
    children: [
      {
        id: 'header',
        name: 'Header',
        hasBoundary: false,
        children: [],
      },
      {
        id: 'main',
        name: 'Main',
        hasBoundary: true, // Error boundary here
        children: [
          {
            id: 'sidebar',
            name: 'Sidebar',
            hasBoundary: false,
            children: [],
          },
          {
            id: 'content',
            name: 'Content',
            hasBoundary: false,
            children: [
              {
                id: 'grandchild-1',
                name: 'UserProfile',
                hasBoundary: false,
                children: [],
              },
              {
                id: 'grandchild-2',
                name: 'UserPosts',
                hasBoundary: false,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'footer',
        name: 'Footer',
        hasBoundary: false,
        children: [],
      },
    ],
  });

  // Get the path from error source to root
  const getPathToRoot = useCallback((nodeId: string, node: TreeNode = tree, path: string[] = []): string[] => {
    if (node.id === nodeId) {
      return [...path, node.id];
    }
    for (const child of node.children) {
      const result = getPathToRoot(nodeId, child, [...path, node.id]);
      if (result.length > 0) {
        return result;
      }
    }
    return [];
  }, [tree]);

  // Find a node by ID - defined before findNearestBoundary since it's used there
  const findNode = useCallback((node: TreeNode, id: string): TreeNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  // Find the nearest boundary in the path
  const findNearestBoundary = useCallback((path: string[]): string | null => {
    const reversedPath = [...path].reverse();
    for (let i = 1; i < reversedPath.length; i++) {
      const nodeId = reversedPath[i];
      const node = findNode(tree, nodeId);
      if (node?.hasBoundary) {
        return nodeId;
      }
    }
    return null;
  }, [tree, findNode]);

  // Update node state
  const updateNode = useCallback((
    nodeId: string,
    updates: Partial<TreeNode>,
    node: TreeNode = tree
  ): TreeNode => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    return {
      ...node,
      children: node.children.map(child => updateNode(nodeId, updates, child)),
    };
  }, [tree]);

  // Reset all node states
  const resetTree = useCallback(() => {
    const reset = (node: TreeNode): TreeNode => ({
      ...node,
      isErrorSource: false,
      isCatching: false,
      isHighlighted: false,
      errorPassed: false,
      children: node.children.map(reset),
    });
    setTree(reset(tree));
    setPhase('idle');
    setBubbleStep(0);
  }, [tree]);

  // Run the animation
  const runAnimation = useCallback(() => {
    const path = getPathToRoot(errorSourceId);
    const boundaryId = findNearestBoundary(path);
    const reversedPath = [...path].reverse();
    const boundaryIndex = boundaryId ? reversedPath.indexOf(boundaryId) : -1;

    let step = 0;
    const animate = () => {
      if (step === 0) {
        // Phase 1: Error thrown
        setPhase('error-thrown');
        setTree(prev => updateNode(errorSourceId, { isErrorSource: true, isHighlighted: true }, prev));
      } else if (step <= boundaryIndex && boundaryIndex > 0) {
        // Phase 2: Bubbling up
        setPhase('bubbling');
        setBubbleStep(step);
        const currentNodeId = reversedPath[step - 1];
        const nextNodeId = reversedPath[step];
        setTree(prev => {
          let updated = updateNode(currentNodeId, { isHighlighted: false, errorPassed: true }, prev);
          updated = updateNode(nextNodeId, { isHighlighted: true }, updated);
          return updated;
        });
      } else if (step === boundaryIndex + 1 && boundaryId) {
        // Phase 3: Caught by boundary
        setPhase('caught');
        setTree(prev => updateNode(boundaryId, { isCatching: true, isHighlighted: true }, prev));
      } else if (step === boundaryIndex + 2) {
        // Phase 4: Fallback rendered
        setPhase('fallback');
        setIsPlaying(false);
        return; // Stop animation
      } else if (!boundaryId && step > 0) {
        // No boundary - error crashes app
        setPhase('fallback');
        setIsPlaying(false);
        return;
      }

      step++;
      animationRef.current = setTimeout(animate, speedMs[currentSpeed]);
    };

    animate();
  }, [errorSourceId, currentSpeed, getPathToRoot, findNearestBoundary, updateNode]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    } else {
      resetTree();
      setIsPlaying(true);
    }
  }, [isPlaying, resetTree]);

  // Start animation when playing
  useEffect(() => {
    if (isPlaying) {
      runAnimation();
    }
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, runAnimation]);

  // Handle reset
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    resetTree();
  }, [resetTree]);

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ArrowUp className="w-5 h-5 text-primary" />
          Error Propagation Visualizer
        </h3>
        <div className="flex items-center gap-2">
          <Select value={currentSpeed} onValueChange={(v) => setCurrentSpeed(v as 'slow' | 'normal' | 'fast')}>
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">Slow</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="fast">Fast</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handlePlayPause} className="h-8 w-8 p-0">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 w-8 p-0">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Source Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Error Source:</span>
          <Select value={errorSourceId} onValueChange={setErrorSourceId} disabled={isPlaying}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grandchild-1">UserProfile</SelectItem>
              <SelectItem value="grandchild-2">UserPosts</SelectItem>
              <SelectItem value="sidebar">Sidebar</SelectItem>
              <SelectItem value="header">Header</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            Select which component throws the error
          </span>
        </div>
      </Card>

      {/* Phase Indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {['idle', 'error-thrown', 'bubbling', 'caught', 'fallback'].map((p, i) => (
          <div
            key={p}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-all',
              phase === p
                ? p === 'caught'
                  ? 'bg-green-500 text-white'
                  : p === 'error-thrown' || p === 'bubbling'
                  ? 'bg-red-500 text-white'
                  : 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {i + 1}. {p.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        ))}
      </div>


      {/* Component Tree Visualization */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="px-4 py-2 bg-secondary/30 border-b border-border">
          <span className="text-sm font-medium">Component Tree</span>
        </div>
        <div className="p-6">
          <TreeNodeComponent node={tree} depth={0} showBoundaries={showBoundaries} />
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500" />
            <span>Error Source</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500" />
            <span>Error Bubbling</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-green-500" />
            </div>
            <span>Error Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500" />
            <span>Error Caught</span>
          </div>
        </div>
      </Card>

      {/* Explanation */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <h4 className="font-medium mb-2">How Error Propagation Works</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>An error is thrown in a component during rendering</li>
          <li>The error &quot;bubbles up&quot; through the component tree (like DOM events)</li>
          <li>The nearest error boundary catches the error</li>
          <li>The boundary renders its fallback UI instead of the crashed subtree</li>
          <li>Components outside the boundary continue working normally</li>
        </ol>
      </Card>
    </div>
  );
}

/**
 * TreeNodeComponent - Renders a node in the component tree
 */
interface TreeNodeComponentProps {
  node: TreeNode;
  depth: number;
  showBoundaries: boolean;
}

function TreeNodeComponent({ node, depth, showBoundaries }: TreeNodeComponentProps) {
  const getBorderColor = () => {
    if (node.isErrorSource) return 'border-red-500 bg-red-500/20';
    if (node.isCatching) return 'border-green-500 bg-green-500/20';
    if (node.isHighlighted) return 'border-orange-500 bg-orange-500/20';
    if (node.errorPassed) return 'border-orange-500/50 bg-orange-500/10';
    return 'border-border bg-card';
  };

  return (
    <div style={{ marginLeft: depth * 24 }} className="mb-2">
      <motion.div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          getBorderColor()
        )}
        animate={
          node.isHighlighted || node.isErrorSource || node.isCatching
            ? { scale: [1, 1.05, 1] }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        {/* Boundary indicator */}
        {showBoundaries && node.hasBoundary && (
          <Shield className={cn(
            'w-4 h-4',
            node.isCatching ? 'text-green-500' : 'text-blue-500'
          )} />
        )}

        {/* Component icon */}
        <Box className={cn(
          'w-4 h-4',
          node.isErrorSource
            ? 'text-red-500'
            : node.isCatching
            ? 'text-green-500'
            : node.isHighlighted || node.errorPassed
            ? 'text-orange-500'
            : 'text-muted-foreground'
        )} />

        {/* Component name */}
        <span className="font-mono text-sm">
          &lt;{node.name}
          {node.hasBoundary && showBoundaries && (
            <span className="text-blue-500 text-xs ml-1">[boundary]</span>
          )}
          /&gt;
        </span>

        {/* Status indicators */}
        <AnimatePresence>
          {node.isErrorSource && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              Error!
            </motion.span>
          )}
          {node.isCatching && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-xs px-1.5 py-0.5 rounded bg-green-500 text-white flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              Caught!
            </motion.span>
          )}
          {node.errorPassed && !node.isCatching && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-orange-500"
            >
              ↑
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="mt-1 border-l-2 border-dashed border-muted-foreground/20 ml-2 pl-2">
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              depth={0}
              showBoundaries={showBoundaries}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ErrorPropagationVisualizer;
