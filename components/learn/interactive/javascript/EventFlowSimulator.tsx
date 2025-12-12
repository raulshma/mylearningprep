'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for event flow simulation
export interface NestedElement {
  id: string;
  tag: string;
  label: string;
  children: NestedElement[];
  handlers?: {
    capture?: boolean;
    bubble?: boolean;
  };
}

export type EventPhase = 'idle' | 'capturing' | 'target' | 'bubbling';

export interface EventFlowStep {
  elementId: string;
  phase: EventPhase;
  description: string;
}

export interface EventFlowSimulatorProps {
  /** Nested element structure to visualize */
  elements?: NestedElement[];
  /** Event type to simulate */
  eventType?: 'click' | 'focus' | 'keydown';
  /** Whether to show phase labels */
  showPhases?: boolean;
  /** Whether elements are interactive */
  interactive?: boolean;
}

// Default nested element structure
const defaultElements: NestedElement[] = [
  {
    id: 'window',
    tag: 'window',
    label: 'Window',
    handlers: { capture: true, bubble: true },
    children: [
      {
        id: 'document',
        tag: 'document',
        label: 'Document',
        handlers: { capture: true, bubble: true },
        children: [
          {
            id: 'html',
            tag: 'html',
            label: '<html>',
            handlers: { capture: true, bubble: true },
            children: [
              {
                id: 'body',
                tag: 'body',
                label: '<body>',
                handlers: { capture: true, bubble: true },
                children: [
                  {
                    id: 'div',
                    tag: 'div',
                    label: '<div>',
                    handlers: { capture: true, bubble: true },
                    children: [
                      {
                        id: 'button',
                        tag: 'button',
                        label: '<button>',
                        handlers: { capture: false, bubble: true },
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// Phase colors
const phaseColors: Record<EventPhase, { bg: string; border: string; text: string }> = {
  idle: { bg: 'bg-zinc-800/50', border: 'border-zinc-700', text: 'text-zinc-400' },
  capturing: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  target: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  bubbling: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
};


/**
 * Generate event flow steps for animation
 * Requirements: 2.7
 */
function generateEventFlowSteps(
  elements: NestedElement[],
  targetId: string
): EventFlowStep[] {
  const steps: EventFlowStep[] = [];
  const path: NestedElement[] = [];

  // Find path to target
  const findPath = (nodes: NestedElement[], target: string): boolean => {
    for (const node of nodes) {
      path.push(node);
      if (node.id === target) return true;
      if (findPath(node.children, target)) return true;
      path.pop();
    }
    return false;
  };

  findPath(elements, targetId);

  // Capturing phase (root to target, excluding target)
  for (let i = 0; i < path.length - 1; i++) {
    const element = path[i];
    if (element.handlers?.capture) {
      steps.push({
        elementId: element.id,
        phase: 'capturing',
        description: `Capturing: Event reaches ${element.label}`,
      });
    }
  }

  // Target phase
  const target = path[path.length - 1];
  if (target) {
    steps.push({
      elementId: target.id,
      phase: 'target',
      description: `Target: Event fires on ${target.label}`,
    });
  }

  // Bubbling phase (target to root, excluding target)
  for (let i = path.length - 2; i >= 0; i--) {
    const element = path[i];
    if (element.handlers?.bubble) {
      steps.push({
        elementId: element.id,
        phase: 'bubbling',
        description: `Bubbling: Event bubbles to ${element.label}`,
      });
    }
  }

  return steps;
}

/**
 * Find the deepest clickable element
 */
function findDeepestElement(elements: NestedElement[]): string {
  let deepest = elements[0]?.id || '';
  const traverse = (nodes: NestedElement[]) => {
    for (const node of nodes) {
      deepest = node.id;
      traverse(node.children);
    }
  };
  traverse(elements);
  return deepest;
}

/**
 * EventFlowSimulator Component
 * Animated visualization of event capturing, target, and bubbling phases
 * Requirements: 2.7
 */
export function EventFlowSimulator({
  elements = defaultElements,
  eventType = 'click',
  showPhases = true,
  interactive = true,
}: EventFlowSimulatorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [targetElement, setTargetElement] = useState<string>(() => findDeepestElement(elements));
  const [eventLog, setEventLog] = useState<EventFlowStep[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const steps = generateEventFlowSteps(elements, targetElement);
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const baseDuration = 1000;
  const duration = baseDuration * speedMultipliers[speed];

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    if (currentStepIndex >= steps.length - 1) {
      queueMicrotask(() => setIsPlaying(false));
      return;
    }

    intervalRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next < steps.length) {
          setEventLog((log) => [...log, steps[next]]);
        }
        return next;
      });
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps, duration]);

  const handlePlayPause = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      // Reset and play from beginning
      setCurrentStepIndex(-1);
      setEventLog([]);
      setTimeout(() => {
        setCurrentStepIndex(0);
        setEventLog([steps[0]]);
        setIsPlaying(true);
      }, 100);
    } else if (currentStepIndex === -1) {
      // Start from beginning
      setCurrentStepIndex(0);
      setEventLog([steps[0]]);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentStepIndex, steps]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setEventLog([]);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleElementClick = useCallback(
    (elementId: string) => {
      if (!interactive) return;
      setTargetElement(elementId);
      handleReset();
    },
    [interactive, handleReset]
  );

  const getElementPhase = (elementId: string): EventPhase => {
    if (!currentStep) return 'idle';
    if (currentStep.elementId === elementId) return currentStep.phase;
    return 'idle';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Event Flow Simulator</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Watch how events flow through the DOM: Capturing → Target → Bubbling
        </p>
      </div>

      {/* Phase Legend */}
      {showPhases && (
        <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">Capturing Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground">Target Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Bubbling Phase</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-0">
        {/* Nested Elements Visualization */}
        <div className="p-6 border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              DOM Hierarchy
            </span>
            <span className="text-xs text-muted-foreground">
              Click an element to set as target
            </span>
          </div>
          <div className="flex justify-center">
            <NestedElementBox
              element={elements[0]}
              depth={0}
              targetElement={targetElement}
              getPhase={getElementPhase}
              interactive={interactive}
              onElementClick={handleElementClick}
            />
          </div>
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
          <div
            className="space-y-2 overflow-auto font-mono text-sm"
            style={{ maxHeight: 300 }}
          >
            <AnimatePresence mode="popLayout">
              {eventLog.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Click &quot;Play&quot; to simulate a {eventType} event</p>
                </motion.div>
              ) : (
                eventLog.map((step, index) => (
                  <EventLogEntry
                    key={`${step.elementId}-${step.phase}-${index}`}
                    step={step}
                    isActive={index === currentStepIndex}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Current Step Description */}
      <AnimatePresence>
        {currentStep && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'px-6 py-3 border-t border-border text-sm font-medium',
              phaseColors[currentStep.phase].bg,
              phaseColors[currentStep.phase].text
            )}
          >
            {currentStep.description}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatedControls
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        onReset={handleReset}
        label="Animation Controls"
      />
    </Card>
  );
}


/**
 * Nested element box component
 */
interface NestedElementBoxProps {
  element: NestedElement;
  depth: number;
  targetElement: string;
  getPhase: (elementId: string) => EventPhase;
  interactive: boolean;
  onElementClick: (elementId: string) => void;
}

function NestedElementBox({
  element,
  depth,
  targetElement,
  getPhase,
  interactive,
  onElementClick,
}: NestedElementBoxProps) {
  const phase = getPhase(element.id);
  const isTarget = element.id === targetElement;
  const colors = phaseColors[phase];

  return (
    <motion.div
      layout
      className={cn(
        'relative rounded-lg border-2 p-3 transition-all duration-300',
        colors.bg,
        colors.border,
        interactive && 'cursor-pointer',
        isTarget && phase === 'idle' && 'ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-background'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onElementClick(element.id);
      }}
      animate={{
        scale: phase !== 'idle' ? 1.02 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Element Label */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-mono font-medium', colors.text)}>
          {element.label}
        </span>
        {isTarget && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">
            TARGET
          </span>
        )}
      </div>

      {/* Handler Indicators */}
      <div className="flex gap-1 mb-2">
        {element.handlers?.capture && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">
            capture
          </span>
        )}
        {element.handlers?.bubble && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/20 text-green-400">
            bubble
          </span>
        )}
      </div>

      {/* Children */}
      {element.children.length > 0 && (
        <div className="flex flex-col items-center gap-2 mt-2">
          {element.children.map((child) => (
            <NestedElementBox
              key={child.id}
              element={child}
              depth={depth + 1}
              targetElement={targetElement}
              getPhase={getPhase}
              interactive={interactive}
              onElementClick={onElementClick}
            />
          ))}
        </div>
      )}

      {/* Phase Indicator Animation */}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className={cn(
              'absolute -top-2 -right-2 w-4 h-4 rounded-full',
              phase === 'capturing' && 'bg-blue-500',
              phase === 'target' && 'bg-yellow-500',
              phase === 'bubbling' && 'bg-green-500'
            )}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
              }}
              style={{
                backgroundColor:
                  phase === 'capturing'
                    ? 'rgb(59, 130, 246)'
                    : phase === 'target'
                      ? 'rgb(234, 179, 8)'
                      : 'rgb(34, 197, 94)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Event log entry component
 */
function EventLogEntry({
  step,
  isActive,
}: {
  step: EventFlowStep;
  isActive: boolean;
}) {
  const colors = phaseColors[step.phase];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        colors.bg,
        colors.border,
        isActive && 'ring-2 ring-offset-1 ring-offset-background',
        isActive && step.phase === 'capturing' && 'ring-blue-500',
        isActive && step.phase === 'target' && 'ring-yellow-500',
        isActive && step.phase === 'bubbling' && 'ring-green-500'
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full shrink-0',
          step.phase === 'capturing' && 'bg-blue-500',
          step.phase === 'target' && 'bg-yellow-500',
          step.phase === 'bubbling' && 'bg-green-500'
        )}
      />
      <span className={cn('text-xs', colors.text)}>{step.description}</span>
    </motion.div>
  );
}

// Export for testing
export { generateEventFlowSteps, findDeepestElement, defaultElements };
export default EventFlowSimulator;
