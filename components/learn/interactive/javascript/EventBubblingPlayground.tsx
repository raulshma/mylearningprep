'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, RotateCcw, Hand, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Types for event bubbling playground
export interface EventLogEntry {
  id: string;
  elementId: string;
  elementName: string;
  phase: 'capture' | 'target' | 'bubble';
  stopped: boolean;
  timestamp: number;
}

export interface PlaygroundElement {
  id: string;
  name: string;
  color: string;
  stopPropagation?: boolean;
}

export interface EventBubblingPlaygroundProps {
  /** Whether to show event propagation path */
  showPath?: boolean;
  /** Whether to allow toggling stopPropagation */
  allowStopPropagation?: boolean;
}

// Default nested elements
const defaultElements: PlaygroundElement[] = [
  { id: 'outer', name: 'Outer <div>', color: 'purple' },
  { id: 'middle', name: 'Middle <div>', color: 'blue' },
  { id: 'inner', name: 'Inner <button>', color: 'green' },
];

// Element colors
const elementColors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    hover: 'hover:bg-purple-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    hover: 'hover:bg-blue-500/20',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/50',
    text: 'text-green-400',
    hover: 'hover:bg-green-500/20',
  },
};

// Phase colors
const phaseColors: Record<EventLogEntry['phase'], { bg: string; text: string }> = {
  capture: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  target: { bg: 'bg-red-500/20', text: 'text-red-400' },
  bubble: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
};


/**
 * EventBubblingPlayground Component
 * Interactive demonstration of event bubbling with stopPropagation toggle
 * Requirements: 5.8
 */
export function EventBubblingPlayground({
  showPath = true,
  allowStopPropagation = true,
}: EventBubblingPlaygroundProps) {
  const [elements] = useState<PlaygroundElement[]>(defaultElements);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [stopPropagationAt, setStopPropagationAt] = useState<string | null>(null);
  const [showCapturing, setShowCapturing] = useState(false);
  const logIdRef = useRef(0);

  const handleElementClick = useCallback((
    clickedId: string,
    e: React.MouseEvent
  ) => {
    // Prevent actual event bubbling in React
    e.stopPropagation();
    
    setActiveElement(clickedId);
    const newLog: EventLogEntry[] = [];
    const timestamp = Date.now();
    
    // Find clicked element index
    const clickedIndex = elements.findIndex(el => el.id === clickedId);
    
    // Capturing phase (if enabled) - from outer to target
    if (showCapturing) {
      for (let i = 0; i <= clickedIndex; i++) {
        const el = elements[i];
        const isTarget = i === clickedIndex;
        const stopped = stopPropagationAt === el.id && !isTarget;
        
        newLog.push({
          id: `${++logIdRef.current}`,
          elementId: el.id,
          elementName: el.name,
          phase: isTarget ? 'target' : 'capture',
          stopped,
          timestamp: timestamp + i * 100,
        });
        
        if (stopped) break;
      }
    } else {
      // Just target phase
      newLog.push({
        id: `${++logIdRef.current}`,
        elementId: clickedId,
        elementName: elements[clickedIndex].name,
        phase: 'target',
        stopped: false,
        timestamp,
      });
    }
    
    // Bubbling phase - from target to outer (skip target)
    const lastEntry = newLog[newLog.length - 1];
    if (!lastEntry.stopped) {
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const el = elements[i];
        const stopped = stopPropagationAt === el.id;
        
        newLog.push({
          id: `${++logIdRef.current}`,
          elementId: el.id,
          elementName: el.name,
          phase: 'bubble',
          stopped,
          timestamp: timestamp + (clickedIndex - i + (showCapturing ? clickedIndex + 1 : 1)) * 100,
        });
        
        if (stopped) break;
      }
    }
    
    setEventLog(prev => [...newLog, ...prev].slice(0, 20));
    
    // Clear active element after animation
    setTimeout(() => setActiveElement(null), 1500);
  }, [elements, stopPropagationAt, showCapturing]);

  const handleReset = useCallback(() => {
    setEventLog([]);
    setActiveElement(null);
    setStopPropagationAt(null);
  }, []);

  const handleToggleStopPropagation = useCallback((elementId: string) => {
    setStopPropagationAt(prev => prev === elementId ? null : elementId);
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <MousePointer2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Event Bubbling Playground</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Click on nested elements to see how events bubble up through the DOM
        </p>
      </div>

      {/* Controls */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="show-capturing"
            checked={showCapturing}
            onCheckedChange={setShowCapturing}
          />
          <Label htmlFor="show-capturing" className="text-sm">
            Show Capturing Phase
          </Label>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="ml-auto"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* Interactive Elements */}
        <div className="p-6 border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Click to Trigger Event
            </span>
            <span className="text-xs text-muted-foreground">
              <Hand className="w-3 h-3 inline mr-1" />
              Click any element
            </span>
          </div>
          
          <div className="flex justify-center">
            <NestedElements
              elements={elements}
              activeElement={activeElement}
              stopPropagationAt={stopPropagationAt}
              allowStopPropagation={allowStopPropagation}
              onElementClick={handleElementClick}
              onToggleStopPropagation={handleToggleStopPropagation}
            />
          </div>

          {/* Legend */}
          {showPath && (
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {showCapturing && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-xs text-muted-foreground">Capturing</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Target</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-xs text-muted-foreground">Bubbling</span>
              </div>
            </div>
          )}
        </div>

        {/* Event Log */}
        <div className="p-6 bg-secondary/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Event Log
            </span>
            {eventLog.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {eventLog.length} events
              </span>
            )}
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-auto">
            <AnimatePresence mode="popLayout">
              {eventLog.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Click an element to see event propagation</p>
                </motion.div>
              ) : (
                eventLog.map((entry) => (
                  <EventLogItem key={entry.id} entry={entry} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="px-6 py-4 border-t border-border bg-secondary/5">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Event Bubbling:</strong> When an event occurs on an element, 
            it first runs handlers on that element, then on its parent, then all the way up.
          </p>
          {allowStopPropagation && (
            <p>
              <strong className="text-foreground">stopPropagation():</strong> Click the 
              <XCircle className="w-3 h-3 inline mx-1 text-red-400" />
              icon on an element to stop the event from bubbling further.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}


/**
 * Nested elements component
 */
interface NestedElementsProps {
  elements: PlaygroundElement[];
  activeElement: string | null;
  stopPropagationAt: string | null;
  allowStopPropagation: boolean;
  onElementClick: (id: string, e: React.MouseEvent) => void;
  onToggleStopPropagation: (id: string) => void;
}

function NestedElements({
  elements,
  activeElement,
  stopPropagationAt,
  allowStopPropagation,
  onElementClick,
  onToggleStopPropagation,
}: NestedElementsProps) {
  const renderElement = (index: number): React.ReactNode => {
    if (index >= elements.length) return null;
    
    const el = elements[index];
    const colors = elementColors[el.color];
    const isActive = activeElement === el.id;
    const hasStopPropagation = stopPropagationAt === el.id;
    
    return (
      <motion.div
        className={cn(
          'relative rounded-lg border-2 p-4 transition-all cursor-pointer',
          colors.bg,
          colors.border,
          colors.hover,
          isActive && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
        )}
        onClick={(e) => onElementClick(el.id, e)}
        animate={{
          scale: isActive ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Element Label */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-mono font-medium', colors.text)}>
            {el.name}
          </span>
          {allowStopPropagation && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStopPropagation(el.id);
              }}
              className={cn(
                'p-1 rounded transition-colors',
                hasStopPropagation
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              )}
              title={hasStopPropagation ? 'stopPropagation enabled' : 'Enable stopPropagation'}
            >
              <XCircle className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {hasStopPropagation && (
          <div className="text-[10px] text-red-400 mb-2">
            stopPropagation() enabled
          </div>
        )}
        
        {/* Nested child */}
        {index < elements.length - 1 && (
          <div className="flex justify-center mt-2">
            {renderElement(index + 1)}
          </div>
        )}
        
        {/* Active indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary"
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0, 1],
                }}
                transition={{
                  duration: 0.8,
                  repeat: 2,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return <>{renderElement(0)}</>;
}

/**
 * Event log item component
 */
function EventLogItem({ entry }: { entry: EventLogEntry }) {
  const colors = phaseColors[entry.phase];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        colors.bg,
        'border-border'
      )}
    >
      <span className={cn(
        'w-2 h-2 rounded-full shrink-0',
        entry.phase === 'capture' && 'bg-yellow-500',
        entry.phase === 'target' && 'bg-red-500',
        entry.phase === 'bubble' && 'bg-cyan-500'
      )} />
      <span className={cn('text-xs font-mono', colors.text)}>
        {entry.phase.toUpperCase()}
      </span>
      <span className="text-xs text-foreground">
        {entry.elementName}
      </span>
      {entry.stopped && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 ml-auto">
          STOPPED
        </span>
      )}
    </motion.div>
  );
}

// Export for testing
export { defaultElements, elementColors, phaseColors };
export default EventBubblingPlayground;
