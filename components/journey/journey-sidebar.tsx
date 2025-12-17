'use client';

import { useState, useCallback, useEffect, useMemo, useTransition, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Map, 
  Clock,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Star,
  ArrowLeft,
  Target,
  BookOpen,
  CircleDashed,
  Sparkles,
  Loader2,
  Home,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getObjectivesWithLessons, type ObjectiveLessonInfo } from '@/lib/actions/lessons';
import { getObjectiveTitle } from '@/lib/utils/lesson-utils';
import type { Journey, JourneyNode, LearningObjective } from '@/lib/db/schemas/journey';
import type { UserJourneyProgress, NodeProgressStatus } from '@/lib/db/schemas/user-journey-progress';
import { getObjectiveProgress } from '@/lib/hooks/use-objective-progress';
import { useRecentLessons } from '@/lib/hooks/use-recent-lessons';

interface JourneySidebarProps {
  journey: Journey;
  progress: UserJourneyProgress | null;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  initialLessonAvailability: Record<string, ObjectiveLessonInfo[]>;
  parentJourney?: Journey | null;
  onClearSelection?: () => void;
}

// Storage key for persisting expanded nodes
const getExpandedNodesStorageKey = (JourneySlug: string) => `journey-expanded-nodes-${JourneySlug}`;

// Breadcrumb component for Journey hierarchy navigation
interface JourneyBreadcrumbProps {
  journey: Journey;
  parentJourney?: Journey | null;
}

export function JourneyBreadcrumb({ journey, parentJourney }: JourneyBreadcrumbProps) {
  return (
    <nav 
      aria-label="Journey breadcrumb" 
      className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap"
    >
      <Link
        href="/journeys"
        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>All Journeys</span>
      </Link>
      
      {parentJourney && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          <Link
            href={`/journeys/${parentJourney.slug}`}
            className="hover:text-foreground transition-colors truncate max-w-[150px]"
            title={parentJourney.title}
          >
            {parentJourney.title}
          </Link>
        </>
      )}
      
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
      <span className="text-foreground font-medium truncate max-w-[150px]" title={journey.title}>
        {journey.title}
      </span>
    </nav>
  );
}

const statusIcons: Record<NodeProgressStatus, typeof Circle> = {
  locked: Circle,
  available: Circle,
  'in-progress': CircleDashed,
  completed: CheckCircle2,
  skipped: Circle,
};

const statusColors: Record<NodeProgressStatus, string> = {
  locked: 'text-muted-foreground/40',
  available: 'text-blue-500',
  'in-progress': 'text-yellow-500',
  completed: 'text-green-500',
  skipped: 'text-muted-foreground',
};

// Lesson availability status
type LessonAvailability = 'full' | 'partial' | 'none' | 'loading';

interface NodeItemProps {
  node: JourneyNode;
  status: NodeProgressStatus;
  isSelected: boolean;
  onSelect: () => void;
  showSubJourney?: boolean;
  isMilestone?: boolean;
  journeySlug: string;
  lessonAvailability?: LessonAvailability;
  objectivesInfo?: ObjectiveLessonInfo[];
  objectiveCompletion?: { completed: number; total: number };
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onLessonNavigate?: (lessonId: string, lessonTitle: string) => void;
}

function LessonAvailabilityBadge({ availability }: { availability: LessonAvailability }) {
  if (availability === 'loading' || availability === 'none') return null;
  
  if (availability === 'full') {
    return (
      <div className="flex items-center gap-0.5" title="All lessons available">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
      </div>
    );
  }
  
  if (availability === 'partial') {
    return (
      <div className="flex items-center gap-0.5" title="Some lessons available">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }
  
  return null;
}

// Objective link with loading state
interface ObjectiveLinkProps {
  href: string;
  objectiveTitle: string;
  xpRewards?: ObjectiveLessonInfo['xpRewards'];
  isSingleLevel?: boolean;
  isComplete?: boolean;
  onNavigate?: () => void;
}

function ObjectiveLink({ href, objectiveTitle, xpRewards, isSingleLevel, isComplete, onNavigate }: ObjectiveLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate();
    }
    startTransition(() => {
      router.push(href);
    });
  };
  
  // For single-level lessons, show just the XP value
  // For three-level lessons, show the beginner XP (lowest tier)
  const displayXp = xpRewards?.beginner;
  
  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors group",
        isPending && "bg-primary/10 text-primary"
      )}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
      ) : isComplete ? (
        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
      ) : (
        <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
      )}
      <span className="flex-1 line-clamp-2">{objectiveTitle}</span>
      {displayXp && !isPending && (
        <span className="text-[10px] text-yellow-500 flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          {displayXp}
        </span>
      )}
      {isPending ? (
        <span className="text-[10px] text-primary">Loading...</span>
      ) : (
        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      )}
    </Link>
  );
}

function NodeItem({ 
  node, 
  status, 
  isSelected, 
  onSelect, 
  showSubJourney, 
  isMilestone,
  journeySlug,
  lessonAvailability = 'loading',
  objectivesInfo = [],
  objectiveCompletion,
  isExpanded: controlledExpanded,
  onToggleExpand: controlledToggle,
  onLessonNavigate,
}: NodeItemProps) {
  // Use controlled state if provided, otherwise use local state
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;
  
  const effectiveStatus: NodeProgressStatus = (() => {
    if (status === 'completed') return 'completed';
    if (objectiveCompletion && objectiveCompletion.total > 0) {
      if (objectiveCompletion.completed >= objectiveCompletion.total) return 'completed';
      if (objectiveCompletion.completed > 0) return 'in-progress';
    }
    return status;
  })();

  const Icon = statusIcons[effectiveStatus];
  const hasObjectives = node.learningObjectives && node.learningObjectives.length > 0;
  
  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasObjectives) {
      if (controlledToggle) {
        controlledToggle();
      } else {
        setLocalExpanded(prev => !prev);
      }
    }
  }, [hasObjectives, controlledToggle]);
  
  // Count available lessons
  const availableLessonsCount = objectivesInfo.filter(o => o.hasLesson).length;
  const totalObjectives = node.learningObjectives?.length || 0;
  
  return (
    <li id={`sidebar-node-${node.id}`}>
      <div
        className={cn(
          'w-full flex items-center gap-3 px-3 rounded-xl transition-colors text-left',
          isMilestone ? 'py-2.5' : 'py-2',
          isSelected 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-secondary/50 text-foreground',
          status === 'locked' && 'opacity-50'
        )}
      >
        {/* Expand/Collapse button */}
        {hasObjectives ? (
          <button
            onClick={handleToggleExpand}
            className="p-0.5 -ml-1 hover:bg-secondary/50 rounded transition-colors cursor-pointer"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className={cn('w-3.5 h-3.5', statusColors[effectiveStatus])} />
            </motion.div>
          </button>
        ) : (
          <Icon className={cn(isMilestone ? 'w-4 h-4' : 'w-3.5 h-3.5', statusColors[effectiveStatus])} />
        )}

        {/* Status icon (always visible, even for expandable nodes) */}
        {hasObjectives && (
          <Icon
            className={cn(
              isMilestone ? 'w-4 h-4' : 'w-3.5 h-3.5',
              statusColors[effectiveStatus]
            )}
          />
        )}
        
        {/* Node title button */}
        <button
          onClick={onSelect}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span className={cn('text-sm truncate', isMilestone && 'font-medium')}>
            {node.title}
          </span>
          {showSubJourney && node.subJourneySlug && (
            <Star className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" />
          )}
        </button>
        
        {/* Lesson availability indicator */}
        {hasObjectives && lessonAvailability !== 'loading' && (
          <LessonAvailabilityBadge availability={lessonAvailability} />
        )}
        
        {/* Available lessons badge */}
        {hasObjectives && availableLessonsCount > 0 && !isExpanded && (
          <Badge 
            variant="secondary" 
            className={cn(
              "text-[10px] px-1.5 py-0 h-4",
              availableLessonsCount === totalObjectives 
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            )}
          >
            {availableLessonsCount}/{totalObjectives}
          </Badge>
        )}

        {/* Objective completion badge */}
        {objectiveCompletion && objectiveCompletion.total > 0 && objectiveCompletion.completed > 0 && !isExpanded && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4",
              objectiveCompletion.completed >= objectiveCompletion.total
                ? "text-green-500 border-green-500/30"
                : "text-yellow-500 border-yellow-500/30"
            )}
            title="Objectives completed"
          >
            {objectiveCompletion.completed}/{objectiveCompletion.total}
          </Badge>
        )}
        
        {isSelected && (
          <ChevronRight className="w-4 h-4 shrink-0" />
        )}
      </div>
      
      {/* Learning Objectives Dropdown */}
      <AnimatePresence>
        {isExpanded && hasObjectives && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="ml-6 pl-3 border-l border-border/50 mt-1 mb-2 space-y-1">
              {objectivesInfo.map((info, index) => {
                const objectiveTitle = info.objective;
                const objectiveSlug = info.lessonId;
                const hasLesson = info.hasLesson;
                // Use lessonPath (full path like "dotnet/csharp-basics/variables-data-types") for key consistency
                const fullLessonId = info.lessonPath || info.lessonId;
                const nodeIdForKey = fullLessonId.split('/')[0];
                
                return (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {hasLesson ? (
                      <ObjectiveLink
                        href={`/journeys/${journeySlug}/learn/${node.id}/${objectiveSlug}`}
                        objectiveTitle={objectiveTitle}
                        xpRewards={info.xpRewards}
                        isSingleLevel={info.isSingleLevel}
                        isComplete={!!getObjectiveProgress(nodeIdForKey, fullLessonId)?.completedAt}
                        onNavigate={() => {
                          onSelect();
                          onLessonNavigate?.(objectiveSlug, objectiveTitle);
                        }}
                      />
                    ) : (
                      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs text-muted-foreground/60">
                        <CircleDashed className="w-3 h-3 shrink-0" />
                        <span className="flex-1 line-clamp-2">{objectiveTitle}</span>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

// Removed ScrollToSelectedNode component

export function JourneySidebar({
  journey,
  progress,
  selectedNodeId,
  onNodeSelect,
  initialLessonAvailability = {},
  parentJourney,
  onClearSelection,
}: JourneySidebarProps) {
  const nodesCompleted = progress?.nodesCompleted || 0;
  const totalNodes = journey.nodes.length;
  const progressPercent = Math.round((nodesCompleted / totalNodes) * 100);
  
  // Use passed initial data
  const [nodeObjectivesInfo, setNodeObjectivesInfo] = useState<Record<string, ObjectiveLessonInfo[]>>(initialLessonAvailability);
  
  const { recentLessons, addRecentLesson, isLoaded: isRecentLoaded } = useRecentLessons();
  
  const getNodeStatus = (nodeId: string): NodeProgressStatus => {
    if (!progress) return 'available';
    const nodeProgress = progress.nodeProgress.find(np => np.nodeId === nodeId);
    return nodeProgress?.status || 'locked';
  };
  
  // Auto-scroll to selected node
  useEffect(() => {
    if (selectedNodeId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`sidebar-node-${selectedNodeId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedNodeId]);
  
  // Calculate lesson availability for each node
  const getLessonAvailability = useCallback((nodeId: string): LessonAvailability => {
    const info = nodeObjectivesInfo[nodeId];
    if (!info || info.length === 0) return 'none';
    
    const availableCount = info.filter(o => o.hasLesson).length;
    if (availableCount === 0) return 'none';
    if (availableCount === info.length) return 'full';
    return 'partial';
  }, [nodeObjectivesInfo]);

  const computeObjectiveCompletionForNode = useCallback((nodeId: string) => {
    const objectives = nodeObjectivesInfo[nodeId] || [];
    if (typeof window === 'undefined' || objectives.length === 0) {
      return { completed: 0, total: objectives.length };
    }

    let completed = 0;
    for (const obj of objectives) {
      // Use lessonPath (full path like "dotnet/csharp-basics/variables-data-types") for key consistency
      // The first segment of lessonPath is the JourneySlug used as nodeId in the storage key
      const fullLessonId = obj.lessonPath || obj.lessonId;
      const nodeIdForKey = fullLessonId.split('/')[0];
      const stored = getObjectiveProgress(nodeIdForKey, fullLessonId);
      if (stored?.completedAt) completed += 1;
    }
    return { completed, total: objectives.length };
  }, [nodeObjectivesInfo]);

  // Initial computation
  const [objectiveCompletionByNode, setObjectiveCompletionByNode] = useState<Record<string, { completed: number; total: number }>>(() => {
    const initial: Record<string, { completed: number; total: number }> = {};
    if (typeof window !== 'undefined') {
        for (const node of journey.nodes) {
            if ((initialLessonAvailability[node.id] || []).length > 0) {
                // We need to call this logic, but computeObjectiveCompletionForNode is not available in initializer
                const objectives = initialLessonAvailability[node.id] || [];
                let completed = 0;
                for (const obj of objectives) {
                   // Use lessonPath (full path like "dotnet/csharp-basics/variables-data-types") for key consistency
                   const fullLessonId = obj.lessonPath || obj.lessonId;
                   const nodeIdForKey = fullLessonId.split('/')[0];
                   const stored = getObjectiveProgress(nodeIdForKey, fullLessonId);
                   if (stored?.completedAt) completed += 1;
                }
                initial[node.id] = { completed, total: objectives.length };
            }
        }
    }
    return initial;
  });

  // Listener for updates
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ JourneySlug?: string; lessonId?: string }>;
      const { JourneySlug: eventJourneySlug } = custom.detail || {};
      
      // Only handle events for this Journey
      if (eventJourneySlug && eventJourneySlug !== journey.slug) return;

      // Recompute all nodes since we don't know which node the lesson belongs to
      setObjectiveCompletionByNode(() => {
        const updated: Record<string, { completed: number; total: number }> = {};
        for (const nodeId of Object.keys(nodeObjectivesInfo)) {
          updated[nodeId] = computeObjectiveCompletionForNode(nodeId);
        }
        return updated;
      });
    };

    window.addEventListener('objective-progress-updated', handler);
    return () => window.removeEventListener('objective-progress-updated', handler);
  }, [nodeObjectivesInfo, computeObjectiveCompletionForNode, journey.slug]);

  
  // Group nodes by type for organized display
  const milestones = journey.nodes.filter(n => n.type === 'milestone');
  const topics = journey.nodes.filter(n => n.type === 'topic');
  const optional = journey.nodes.filter(n => n.type === 'optional');
  
  // Track which nodes are expanded (for expand/collapse all)
  // Use a lazy initializer to load from localStorage on first render
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    
    const storageKey = getExpandedNodesStorageKey(journey.slug);
    const saved = localStorage.getItem(storageKey);
    let initialSet = new Set<string>();
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        initialSet = new Set(parsed);
      } catch {
        // Ignore parse errors
      }
    }
    
    // Also expand the initially selected node if it has objectives
    if (selectedNodeId) {
      const selectedNode = journey.nodes.find(n => n.id === selectedNodeId);
      if (selectedNode?.learningObjectives && selectedNode.learningObjectives.length > 0) {
        initialSet.add(selectedNodeId);
      }
    }
    
    return initialSet;
  });
  
  // Check if any milestones have objectives (expandable)
  const expandableMilestones = milestones.filter(m => m.learningObjectives && m.learningObjectives.length > 0);
  const hasExpandableItems = expandableMilestones.length > 0;
  const allExpanded = hasExpandableItems && expandableMilestones.every(m => expandedNodes.has(m.id));
  const someExpanded = expandableMilestones.some(m => expandedNodes.has(m.id));
  
  // Persist expanded nodes to localStorage
  useEffect(() => {
    const storageKey = getExpandedNodesStorageKey(journey.slug);
    localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedNodes)));
  }, [expandedNodes, journey.slug]);
  
  const handleExpandAll = useCallback(() => {
    const allExpandableIds = journey.nodes
      .filter(m => m.type === 'milestone' && m.learningObjectives && m.learningObjectives.length > 0)
      .map(m => m.id);
    setExpandedNodes(new Set(allExpandableIds));
  }, [journey.nodes]);
  
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);
  
  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);
  
  // Wrapper for onNodeSelect that also expands the node if it has objectives
  const handleNodeSelectWithExpand = useCallback((nodeId: string) => {
    const node = journey.nodes.find(n => n.id === nodeId);
    if (node?.learningObjectives && node.learningObjectives.length > 0) {
      setExpandedNodes(prev => {
        if (prev.has(nodeId)) return prev;
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });
    }
    onNodeSelect(nodeId);
  }, [journey.nodes, onNodeSelect]);
  
  // Calculate overall lesson statistics
  const lessonStats = useMemo(() => {
    let totalObjectives = 0;
    let availableLessons = 0;
    
    Object.values(nodeObjectivesInfo).forEach(info => {
      totalObjectives += info.length;
      availableLessons += info.filter(o => o.hasLesson).length;
    });
    
    return { totalObjectives, availableLessons };
  }, [nodeObjectivesInfo]);
  
  return (
    <aside className="w-full flex flex-col bg-sidebar border border-border rounded-2xl">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="mb-4">
          <JourneyBreadcrumb journey={journey} parentJourney={parentJourney} />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Map className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">{journey.title}</h2>
            <p className="text-xs text-muted-foreground">{totalNodes} topics</p>
          </div>
          
          {/* Selection Actions */}
          {selectedNodeId && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                   const el = document.getElementById(`sidebar-node-${selectedNodeId}`);
                   if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Locate selected"
              >
                <Target className="w-4 h-4" />
              </button>
              {onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  title="Clear selection"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      


      {/* Recently Visited */}
      {isRecentLoaded && recentLessons.length > 0 && (
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recently Visited
          </h3>
          <ul className="space-y-1">
            {recentLessons.filter(l => l.journeySlug === journey.slug).map((lesson, i) => {
               // Find the full lessonPath from nodeObjectivesInfo for proper key lookup
               const nodeInfo = nodeObjectivesInfo[lesson.nodeId] || [];
               const objInfo = nodeInfo.find(o => o.lessonId === lesson.lessonId);
               const fullLessonId = objInfo?.lessonPath || lesson.lessonId;
               const nodeIdForKey = fullLessonId.split('/')[0];
               const isCompleted = getObjectiveProgress(nodeIdForKey, fullLessonId)?.completedAt;
               
               return (
                <li key={`${lesson.nodeId}-${lesson.lessonId}-${i}`}>
                  <Link
                    href={`/journeys/${lesson.journeySlug}/learn/${lesson.nodeId}/${lesson.lessonId}`}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs hover:bg-secondary/50 transition-colors group"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 text-foreground truncate">{lesson.title}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
               );
            })}
          </ul>
        </div>
      )}
      
      {/* Scroll to selected node Effect & Actions */}
      {/* We run this effect to auto-scroll on mount/change, and expose controls */}
      {(() => {
        // We can't use hooks inside this IIFE, so we put the logic in the main body
        return null;
      })()}
      
      {/* Progress Overview */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Your Progress</span>
          <span className="text-sm font-bold text-primary">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2 mb-3" />
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-lg font-bold text-foreground">{nodesCompleted}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Est. Time</span>
            </div>
            <p className="text-lg font-bold text-foreground">{journey.estimatedHours}h</p>
          </div>
        </div>
        
        {/* Lesson availability stats */}
        {lessonStats && lessonStats.totalObjectives > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Interactive Lessons</span>
              </div>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  lessonStats.availableLessons === lessonStats.totalObjectives
                    ? "bg-green-500/10 text-green-500"
                    : "bg-yellow-500/10 text-yellow-500"
                )}
              >
                {lessonStats.availableLessons}/{lessonStats.totalObjectives}
              </Badge>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Lesson availability:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span>Full</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
              <span>Partial</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Node List */}
      <div className="p-4 overflow-y-auto">
        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Milestones
              </h3>
              {hasExpandableItems && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-secondary/50"
                    title={allExpanded ? 'Collapse all' : 'Expand all'}
                  >
                    {allExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        <span className="hidden sm:inline">Collapse</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        <span className="hidden sm:inline">Expand</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            <ul className="space-y-1">
              {milestones.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  status={getNodeStatus(node.id)}
                  isSelected={selectedNodeId === node.id}
                  onSelect={() => handleNodeSelectWithExpand(node.id)}
                  showSubJourney
                  isMilestone
                  journeySlug={journey.slug}
                  lessonAvailability={getLessonAvailability(node.id)}
                  objectivesInfo={nodeObjectivesInfo[node.id] || []}
                  objectiveCompletion={objectiveCompletionByNode[node.id]}
                  isExpanded={expandedNodes.has(node.id)}
                  onToggleExpand={() => handleToggleNode(node.id)}
                  onLessonNavigate={(lessonId, title) => {
                    // Save last active node
                    localStorage.setItem(`journey-last-active-node-${journey.slug}`, node.id);
                    // Add to recent
                    addRecentLesson({
                      journeySlug: journey.slug,
                      nodeId: node.id,
                      lessonId,
                      title
                    });
                  }}
                />
              ))}
            </ul>
          </div>
        )}
        
        {/* Regular Topics */}
        {topics.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Topics
            </h3>
            <ul className="space-y-1">
              {topics.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  status={getNodeStatus(node.id)}
                  isSelected={selectedNodeId === node.id}
                  onSelect={() => handleNodeSelectWithExpand(node.id)}
                  journeySlug={journey.slug}
                  lessonAvailability={getLessonAvailability(node.id)}
                  objectivesInfo={nodeObjectivesInfo[node.id] || []}
                  objectiveCompletion={objectiveCompletionByNode[node.id]}
                  onLessonNavigate={(lessonId, title) => {
                    // Save last active node
                    localStorage.setItem(`journey-last-active-node-${journey.slug}`, node.id);
                    // Add to recent
                    addRecentLesson({
                      journeySlug: journey.slug,
                      nodeId: node.id,
                      lessonId,
                      title
                    });
                  }}
                />
              ))}
            </ul>
          </div>
        )}
        
        {/* Optional Topics */}
        {optional.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Optional
            </h3>
            <ul className="space-y-1">
              {optional.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  status={getNodeStatus(node.id)}
                  isSelected={selectedNodeId === node.id}
                  onSelect={() => handleNodeSelectWithExpand(node.id)}
                  journeySlug={journey.slug}
                  lessonAvailability={getLessonAvailability(node.id)}
                  objectivesInfo={nodeObjectivesInfo[node.id] || []}
                  objectiveCompletion={objectiveCompletionByNode[node.id]}
                  onLessonNavigate={(lessonId, title) => {
                    // Save last active node
                    localStorage.setItem(`journey-last-active-node-${journey.slug}`, node.id);
                    // Add to recent
                    addRecentLesson({
                      journeySlug: journey.slug,
                      nodeId: node.id,
                      lessonId,
                      title
                    });
                  }}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

