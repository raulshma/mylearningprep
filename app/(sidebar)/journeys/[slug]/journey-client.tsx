"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  JourneySidebar,
  JourneyTopicDetail,
  JourneyCommandMenu,
} from "@/components/journey";
import dynamic from "next/dynamic";

const JourneyViewer = dynamic(
  () => import("@/components/journey").then((mod) => mod.JourneyViewer),
  {
    loading: () => <div className="w-full h-[500px] bg-card/30 rounded-2xl animate-pulse" />,
    ssr: false,
  }
);
import {
  startNode,
  completeNode,
  startJourney,
  getSubJourneyInfo,
} from "@/lib/actions/journey";
import type { SubJourneyProgressInfo } from "@/lib/actions/journey";
import { toast } from "sonner";
import type { Journey } from "@/lib/db/schemas/journey";
import type {
  UserJourneyProgress,
  NodeProgress,
} from "@/lib/db/schemas/user-journey-progress";
import type { ObjectiveLessonInfo } from "@/lib/actions/lessons";
import type { UserGamification } from "@/lib/db/schemas/user";
import { syncGamificationToLocalStorage } from "@/lib/hooks/use-objective-progress";

interface JourneyClientProps {
  initialJourney: Journey;
  initialProgress: UserJourneyProgress | null;
  initialLessonAvailability: Record<string, ObjectiveLessonInfo[]>;
  initialGamification: UserGamification | null;
  parentJourney?: Journey | null;
  subJourneyProgressMap?: Record<string, SubJourneyProgressInfo>;
}

export function JourneyClient({
  initialJourney,
  initialProgress,
  initialLessonAvailability = {},
  initialGamification,
  parentJourney,
  subJourneyProgressMap = {},
}: JourneyClientProps) {
  const router = useRouter();
  const [journey] = useState(initialJourney);
  const [progress, setProgress] = useState(initialProgress);
  
  // Get initial node from URL or localStorage
  const getInitialNodeId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Check URL for node param first (from command menu navigation)
    const urlParams = new URLSearchParams(window.location.search);
    const nodeParam = urlParams.get('node');
    if (nodeParam && initialJourney.nodes.some(n => n.id === nodeParam)) {
      // Clear the URL param
      const url = new URL(window.location.href);
      url.searchParams.delete('node');
      window.history.replaceState({}, '', url.toString());
      return nodeParam;
    }
    
    // Try to restore from localStorage if available
    try {
      const saved = localStorage.getItem(`Journey-last-active-node-${initialJourney.slug}`);
      if (saved && initialJourney.nodes.some(n => n.id === saved)) {
        return saved;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }, [initialJourney.nodes, initialJourney.slug]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(getInitialNodeId);
  
  // Persist selected node changes
  useEffect(() => {
    if (selectedNodeId) {
      localStorage.setItem(`Journey-last-active-node-${initialJourney.slug}`, selectedNodeId);
    }
  }, [selectedNodeId, initialJourney.slug]);

  const [isPending, startTransition] = useTransition();
  const [gamification] = useState(initialGamification);
  
  // Sync gamification data to localStorage on mount for sidebar completion indicators
  useEffect(() => {
    if (gamification) {
      syncGamificationToLocalStorage(gamification);
    }
  }, [gamification]);

  const selectedNode = selectedNodeId
    ? journey.nodes.find((n) => n.id === selectedNodeId)
    : null;

  const selectedNodeProgress =
    selectedNodeId && progress
      ? progress.nodeProgress.find((np) => np.nodeId === selectedNodeId) || null
      : null;

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Navigate to next/previous node
  const handleNavigateNode = useCallback(
    (direction: "next" | "prev") => {
      if (!selectedNodeId) return;

      const currentIndex = journey.nodes.findIndex(
        (n) => n.id === selectedNodeId
      );
      if (currentIndex === -1) return;

      const newIndex =
        direction === "next"
          ? Math.min(currentIndex + 1, journey.nodes.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (newIndex !== currentIndex) {
        setSelectedNodeId(journey.nodes[newIndex].id);
      }
    },
    [selectedNodeId, journey.nodes]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          if (selectedNodeId) {
            e.preventDefault();
            handleCloseDetail();
          }
          break;
        case "ArrowDown":
        case "j":
          if (selectedNodeId) {
            e.preventDefault();
            handleNavigateNode("next");
          }
          break;
        case "ArrowUp":
        case "k":
          if (selectedNodeId) {
            e.preventDefault();
            handleNavigateNode("prev");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, handleCloseDetail, handleNavigateNode]);

  const handleStartLearning = useCallback(async () => {
    if (!selectedNodeId || !selectedNode) return;

    startTransition(async () => {
      try {
        // Check if node has a sub-Journey (Requirements: 1.1, 1.2, 1.3)
        if (selectedNode.subJourneySlug) {
          const subJourneyInfo = await getSubJourneyInfo(
            selectedNode.subJourneySlug
          );

          if (subJourneyInfo.exists) {
            // Navigate to sub-Journey page (Requirements: 1.1)
            router.push(`/Journeys/${selectedNode.subJourneySlug}`);
            return;
          } else {
            // Show "Coming Soon" message if sub-Journey doesn't exist (Requirements: 1.3)
            toast.info("Coming Soon", {
              description: "This detailed Journey is not yet available.",
            });
            return;
          }
        }

        // Existing behavior for nodes without sub-Journeys (Requirements: 1.2)
        // Ensure Journey is started
        if (!progress) {
          const newProgress = await startJourney(journey.slug);
          if (newProgress) {
            setProgress(newProgress);
          }
        }

        // Start the node
        await startNode(journey.slug, selectedNodeId);

        // Update local state
        setProgress((prev) => {
          if (!prev) return prev;
          const nodeIndex = prev.nodeProgress.findIndex(
            (np) => np.nodeId === selectedNodeId
          );
          const updatedProgress = [...prev.nodeProgress];

          if (nodeIndex >= 0) {
            updatedProgress[nodeIndex] = {
              ...updatedProgress[nodeIndex],
              status: "in-progress",
              startedAt: new Date(),
            };
          } else {
            updatedProgress.push({
              nodeId: selectedNodeId,
              status: "in-progress",
              startedAt: new Date(),
              activitiesCompleted: 0,
              timeSpentMinutes: 0,
              correctAnswers: 0,
              totalQuestions: 0,
            });
          }

          return {
            ...prev,
            nodeProgress: updatedProgress,
            currentNodeId: selectedNodeId,
          };
        });

        toast.success("Started learning!", {
          description: `You're now learning: ${selectedNode?.title}`,
        });
      } catch (error) {
        toast.error("Failed to start learning", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }, [selectedNodeId, selectedNode, journey.slug, progress, router]);

  const handleMarkComplete = useCallback(async () => {
    if (!selectedNodeId) return;

    startTransition(async () => {
      try {
        await completeNode(journey.slug, selectedNodeId);

        // Update local state
        setProgress((prev) => {
          if (!prev) return prev;
          const now = new Date();
          const updatedNodeProgress: NodeProgress[] = [...prev.nodeProgress];

          // Ensure this node exists and is marked completed.
          const nodeIndex = updatedNodeProgress.findIndex(
            (np) => np.nodeId === selectedNodeId
          );
          if (nodeIndex >= 0) {
            updatedNodeProgress[nodeIndex] = {
              ...updatedNodeProgress[nodeIndex],
              status: "completed",
              completedAt: now,
            };
          } else {
            updatedNodeProgress.push({
              nodeId: selectedNodeId,
              status: "completed",
              completedAt: now,
              activitiesCompleted: 0,
              timeSpentMinutes: 0,
              correctAnswers: 0,
              totalQuestions: 0,
            });
          }

          // Locally unlock dependent nodes whose prerequisites are satisfied.
          const completedSet = new Set(
            updatedNodeProgress
              .filter((np) => np.status === "completed")
              .map((np) => np.nodeId)
          );

          const dependentTargets = journey.edges
            .filter((e) => e.source === selectedNodeId)
            .map((e) => e.target);

          for (const targetNodeId of dependentTargets) {
            const prereqNodeIds = journey.edges
              .filter(
                (e) => e.target === targetNodeId && e.type === "sequential"
              )
              .map((e) => e.source);

            const allPrereqsCompleted = prereqNodeIds.every((prereqId) =>
              completedSet.has(prereqId)
            );
            if (!allPrereqsCompleted) continue;

            const targetIndex = updatedNodeProgress.findIndex(
              (np) => np.nodeId === targetNodeId
            );

            // Only unlock nodes that are currently locked.
            if (targetIndex >= 0) {
              if (updatedNodeProgress[targetIndex].status === "locked") {
                updatedNodeProgress[targetIndex] = {
                  ...updatedNodeProgress[targetIndex],
                  status: "available",
                };
              }
            } else {
              updatedNodeProgress.push({
                nodeId: targetNodeId,
                status: "available",
                activitiesCompleted: 0,
                timeSpentMinutes: 0,
                correctAnswers: 0,
                totalQuestions: 0,
              });
            }
          }

          const completedCount = updatedNodeProgress.filter(
            (np) => np.status === "completed"
          ).length;

          return {
            ...prev,
            nodeProgress: updatedNodeProgress,
            nodesCompleted: completedCount,
            overallProgress: Math.round(
              (completedCount / journey.nodes.length) * 100
            ),
          };
        });

        toast.success("Topic completed!", {
          description: `Great job completing: ${selectedNode?.title}`,
        });

        setSelectedNodeId(null);
      } catch (error) {
        toast.error("Failed to mark as complete", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }, [selectedNodeId, journey.slug, journey.nodes.length, journey.edges, selectedNode]);


  return (
    <>
      <div className="flex flex-col md:flex-row gap-2 min-h-full">
        {/* Left Sidebar */}
        <div className="md:w-80 shrink-0">
          <JourneySidebar
            journey={journey}
            progress={progress}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeClick}
            initialLessonAvailability={initialLessonAvailability}
            parentJourney={parentJourney}
            onClearSelection={handleCloseDetail}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-2 min-w-0">
          {/* Journey Viewer */}
          <div
            className={`flex-1 min-w-0 ${selectedNode ? "hidden md:block" : ""}`}
          >
            <JourneyViewer
              journey={journey}
              progress={progress}
              selectedNodeId={selectedNodeId}
              onNodeClick={handleNodeClick}
              subJourneyProgressMap={subJourneyProgressMap}
            />
          </div>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full lg:w-96 shrink-0"
              >
                <JourneyTopicDetail
                  node={selectedNode}
                  nodeProgress={selectedNodeProgress}
                  journeySlug={journey.slug}
                  onStartLearning={handleStartLearning}
                  onMarkComplete={handleMarkComplete}
                  onClose={handleCloseDetail}
                  gamification={gamification}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Command Menu */}
      <JourneyCommandMenu
        currentJourneySlug={journey.slug}
        onNodeSelect={handleNodeClick}
      />
    </>
  );
}

