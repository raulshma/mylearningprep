'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Box,
  Zap,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RerenderTrackerProps {
  /** Component names to track */
  components?: string[];
  /** Whether to show render counts */
  showRenderCount?: boolean;
  /** Whether to highlight on render */
  highlightOnRender?: boolean;
}

interface ComponentRenderInfo {
  id: string;
  name: string;
  renderCount: number;
  lastRenderTime: number;
  isHighlighted: boolean;
  reason?: string;
}

/**
 * RerenderTracker Component
 * Highlights components that re-render and shows render counts
 * Requirements: 14.7
 */
export function RerenderTracker({
  showRenderCount = true,
  highlightOnRender = true,
}: RerenderTrackerProps) {
  // Simulated component tree with render tracking
  const [parentState, setParentState] = useState(0);
  const [childAState, setChildAState] = useState(0);
  const [contextValue, setContextValue] = useState('initial');
  
  // Render counts for each component
  const [renderInfo, setRenderInfo] = useState<Record<string, ComponentRenderInfo>>(() => {
    const now = Date.now();
    return {
      app: { id: 'app', name: 'App', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      parent: { id: 'parent', name: 'Parent', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      childA: { id: 'childA', name: 'ChildA', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      childB: { id: 'childB', name: 'ChildB', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      grandchild: { id: 'grandchild', name: 'Grandchild', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      contextConsumer: { id: 'contextConsumer', name: 'ContextConsumer', renderCount: 1, lastRenderTime: now, isHighlighted: false },
    };
  });

  // Track which components should re-render
  const triggerRender = useCallback((componentIds: string[], reason: string) => {
    setRenderInfo(prev => {
      const updated = { ...prev };
      componentIds.forEach(id => {
        if (updated[id]) {
          updated[id] = {
            ...updated[id],
            renderCount: updated[id].renderCount + 1,
            lastRenderTime: Date.now(),
            isHighlighted: highlightOnRender,
            reason,
          };
        }
      });
      return updated;
    });

    // Clear highlights after animation
    if (highlightOnRender) {
      setTimeout(() => {
        setRenderInfo(prev => {
          const updated = { ...prev };
          componentIds.forEach(id => {
            if (updated[id]) {
              updated[id] = { ...updated[id], isHighlighted: false };
            }
          });
          return updated;
        });
      }, 1000);
    }
  }, [highlightOnRender]);

  // Action handlers
  const handleParentStateChange = useCallback(() => {
    setParentState(p => p + 1);
    // Parent state change causes Parent and all children to re-render
    triggerRender(['parent', 'childA', 'childB', 'grandchild'], 'Parent state changed');
  }, [triggerRender]);

  const handleChildAStateChange = useCallback(() => {
    setChildAState(c => c + 1);
    // ChildA state change only causes ChildA and its children to re-render
    triggerRender(['childA', 'grandchild'], 'ChildA state changed');
  }, [triggerRender]);

  const handleContextChange = useCallback(() => {
    setContextValue(v => v === 'initial' ? 'updated' : 'initial');
    // Context change causes all context consumers to re-render
    triggerRender(['contextConsumer'], 'Context value changed');
  }, [triggerRender]);

  const handleReset = useCallback(() => {
    setParentState(0);
    setChildAState(0);
    setContextValue('initial');
    const now = Date.now();
    setRenderInfo({
      app: { id: 'app', name: 'App', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      parent: { id: 'parent', name: 'Parent', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      childA: { id: 'childA', name: 'ChildA', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      childB: { id: 'childB', name: 'ChildB', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      grandchild: { id: 'grandchild', name: 'Grandchild', renderCount: 1, lastRenderTime: now, isHighlighted: false },
      contextConsumer: { id: 'contextConsumer', name: 'ContextConsumer', renderCount: 1, lastRenderTime: now, isHighlighted: false },
    });
  }, []);

  // Calculate total renders
  const totalRenders = Object.values(renderInfo).reduce((sum, info) => sum + info.renderCount, 0);

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Re-render Tracker
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Total renders: <strong>{totalRenders}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Explanation */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Re-render Tracking:</strong> When state changes, React re-renders the component and all its children. Watch which components re-render when you trigger different state changes.
        </p>
      </Card>


      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Action Controls */}
        <Card className="overflow-hidden border shadow-sm">
          <div className="px-4 py-2 bg-secondary/30 border-b border-border">
            <span className="text-sm font-medium">Trigger State Changes</span>
          </div>
          <div className="p-4 space-y-4">
            {/* Parent State */}
            <div className="p-3 rounded-lg bg-secondary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Parent State</span>
                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary font-mono">
                  {parentState}
                </span>
              </div>
              <Button 
                onClick={handleParentStateChange}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Zap className="w-3 h-3" />
                Update Parent State
              </Button>
              <p className="text-xs text-muted-foreground">
                Will re-render: Parent, ChildA, ChildB, Grandchild
              </p>
            </div>

            {/* ChildA State */}
            <div className="p-3 rounded-lg bg-secondary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ChildA State</span>
                <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 font-mono">
                  {childAState}
                </span>
              </div>
              <Button 
                onClick={handleChildAStateChange}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Zap className="w-3 h-3" />
                Update ChildA State
              </Button>
              <p className="text-xs text-muted-foreground">
                Will re-render: ChildA, Grandchild only
              </p>
            </div>

            {/* Context Value */}
            <div className="p-3 rounded-lg bg-secondary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Context Value</span>
                <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-500 font-mono">
                  {contextValue}
                </span>
              </div>
              <Button 
                onClick={handleContextChange}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Zap className="w-3 h-3" />
                Update Context
              </Button>
              <p className="text-xs text-muted-foreground">
                Will re-render: ContextConsumer only
              </p>
            </div>
          </div>
        </Card>

        {/* Component Tree Visualization */}
        <Card className="overflow-hidden border shadow-sm">
          <div className="px-4 py-2 bg-secondary/30 border-b border-border">
            <span className="text-sm font-medium">Component Tree</span>
          </div>
          <div className="p-4 min-h-[350px]">
            {/* App */}
            <TrackedComponent 
              info={renderInfo.app} 
              showRenderCount={showRenderCount}
              depth={0}
            >
              {/* Parent */}
              <TrackedComponent 
                info={renderInfo.parent} 
                showRenderCount={showRenderCount}
                depth={1}
                stateValue={parentState}
              >
                {/* ChildA */}
                <TrackedComponent 
                  info={renderInfo.childA} 
                  showRenderCount={showRenderCount}
                  depth={2}
                  stateValue={childAState}
                >
                  {/* Grandchild */}
                  <TrackedComponent 
                    info={renderInfo.grandchild} 
                    showRenderCount={showRenderCount}
                    depth={3}
                  />
                </TrackedComponent>
                
                {/* ChildB */}
                <TrackedComponent 
                  info={renderInfo.childB} 
                  showRenderCount={showRenderCount}
                  depth={2}
                />
              </TrackedComponent>
              
              {/* Context Consumer */}
              <TrackedComponent 
                info={renderInfo.contextConsumer} 
                showRenderCount={showRenderCount}
                depth={1}
                contextValue={contextValue}
              />
            </TrackedComponent>
          </div>
        </Card>
      </div>

      {/* Render Stats */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Render Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.values(renderInfo).map(info => (
            <div 
              key={info.id}
              className={cn(
                'p-2 rounded-lg text-center transition-colors',
                info.renderCount > 5 ? 'bg-red-500/10 border border-red-500/30' :
                info.renderCount > 2 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                'bg-green-500/10 border border-green-500/30'
              )}
            >
              <div className="text-xs font-mono text-muted-foreground">{info.name}</div>
              <div className={cn(
                'text-lg font-bold',
                info.renderCount > 5 ? 'text-red-500' :
                info.renderCount > 2 ? 'text-yellow-500' :
                'text-green-500'
              )}>
                {info.renderCount}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-600 dark:text-yellow-400">Performance Tip</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Notice how updating Parent state causes all children to re-render, but updating ChildA only affects its subtree. 
              Use <code className="px-1 py-0.5 rounded bg-secondary text-xs">React.memo()</code> to prevent unnecessary re-renders of child components.
            </p>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
          <span>1-2 renders (good)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500" />
          <span>3-5 renders (watch)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500" />
          <span>6+ renders (optimize)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * TrackedComponent - Renders a component node with render tracking
 */
interface TrackedComponentProps {
  info: ComponentRenderInfo;
  showRenderCount: boolean;
  depth: number;
  stateValue?: number;
  contextValue?: string;
  children?: React.ReactNode;
}

function TrackedComponent({
  info,
  showRenderCount,
  depth,
  stateValue,
  contextValue,
  children,
}: TrackedComponentProps) {
  return (
    <div style={{ marginLeft: depth * 20 }} className="mb-2">
      <motion.div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          info.isHighlighted 
            ? 'border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/20' 
            : 'border-border bg-card'
        )}
        animate={info.isHighlighted ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Box className={cn(
          'w-4 h-4',
          info.isHighlighted ? 'text-orange-500' : 'text-muted-foreground'
        )} />
        <span className="font-mono text-sm">&lt;{info.name}&gt;</span>
        
        {/* State indicator */}
        {stateValue !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">
            state: {stateValue}
          </span>
        )}
        
        {/* Context indicator */}
        {contextValue !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-500">
            ctx: {contextValue}
          </span>
        )}
        
        {/* Render count */}
        {showRenderCount && (
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded font-mono',
            info.renderCount > 5 ? 'bg-red-500/20 text-red-500' :
            info.renderCount > 2 ? 'bg-yellow-500/20 text-yellow-500' :
            'bg-green-500/20 text-green-500'
          )}>
            ×{info.renderCount}
          </span>
        )}
        
        {/* Highlight indicator */}
        <AnimatePresence>
          {info.isHighlighted && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-xs px-1.5 py-0.5 rounded bg-orange-500 text-white"
            >
              Re-rendered!
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

export default RerenderTracker;
