"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  RoadmapViewer,
  RoadmapSidebar,
  RoadmapTopicDetail,
} from "@/components/roadmap";
import {
  startNode,
  completeNode,
  startRoadmap,
  getSubRoadmapInfo,
} from "@/lib/actions/roadmap";
import type { SubRoadmapProgressInfo } from "@/lib/actions/roadmap";
import { toast } from "sonner";
import type { Roadmap } from "@/lib/db/schemas/roadmap";
import type {
  UserRoadmapProgress,
  NodeProgress,
} from "@/lib/db/schemas/user-roadmap-progress";
import type { ObjectiveLessonInfo } from "@/lib/actions/lessons";
import type { UserGamification } from "@/lib/db/schemas/user";

interface RoadmapClientProps {
  initialRoadmap: Roadmap;
  initialProgress: UserRoadmapProgress | null;
  initialLessonAvailability: Record<string, ObjectiveLessonInfo[]>;
  initialGamification: UserGamification | null;
  parentRoadmap?: Roadmap | null;
  subRoadmapProgressMap?: Record<string, SubRoadmapProgressInfo>;
}

export function RoadmapClient({
  initialRoadmap,
  initialProgress,
  initialLessonAvailability = {},
  initialGamification,
  parentRoadmap,
  subRoadmapProgressMap = {},
}: RoadmapClientProps) {
  const router = useRouter();
  const [roadmap] = useState(initialRoadmap);
  const [progress, setProgress] = useState(initialProgress);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [gamification] = useState(initialGamification);

  const selectedNode = selectedNodeId
    ? roadmap.nodes.find((n) => n.id === selectedNodeId)
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

      const currentIndex = roadmap.nodes.findIndex(
        (n) => n.id === selectedNodeId
      );
      if (currentIndex === -1) return;

      const newIndex =
        direction === "next"
          ? Math.min(currentIndex + 1, roadmap.nodes.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (newIndex !== currentIndex) {
        setSelectedNodeId(roadmap.nodes[newIndex].id);
      }
    },
    [selectedNodeId, roadmap.nodes]
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
        // Check if node has a sub-roadmap (Requirements: 1.1, 1.2, 1.3)
        if (selectedNode.subRoadmapSlug) {
          const subRoadmapInfo = await getSubRoadmapInfo(
            selectedNode.subRoadmapSlug
          );

          if (subRoadmapInfo.exists) {
            // Navigate to sub-roadmap page (Requirements: 1.1)
            router.push(`/roadmaps/${selectedNode.subRoadmapSlug}`);
            return;
          } else {
            // Show "Coming Soon" message if sub-roadmap doesn't exist (Requirements: 1.3)
            toast.info("Coming Soon", {
              description: "This detailed roadmap is not yet available.",
            });
            return;
          }
        }

        // Existing behavior for nodes without sub-roadmaps (Requirements: 1.2)
        // Ensure roadmap is started
        if (!progress) {
          const newProgress = await startRoadmap(roadmap.slug);
          if (newProgress) {
            setProgress(newProgress);
          }
        }

        // Start the node
        await startNode(roadmap.slug, selectedNodeId);

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
  }, [selectedNodeId, selectedNode, roadmap.slug, progress, router]);

  const handleMarkComplete = useCallback(async () => {
    if (!selectedNodeId) return;

    startTransition(async () => {
      try {
        await completeNode(roadmap.slug, selectedNodeId);

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

          const dependentTargets = roadmap.edges
            .filter((e) => e.source === selectedNodeId)
            .map((e) => e.target);

          for (const targetNodeId of dependentTargets) {
            const prereqNodeIds = roadmap.edges
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
              (completedCount / roadmap.nodes.length) * 100
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
  }, [selectedNodeId, roadmap.slug, roadmap.nodes.length, roadmap.edges, selectedNode]);


  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-full">
      {/* Left Sidebar */}
      <div className="md:w-80 shrink-0">
        <RoadmapSidebar
          roadmap={roadmap}
          progress={progress}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeClick}
          initialLessonAvailability={initialLessonAvailability}
          parentRoadmap={parentRoadmap}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-w-0">
        {/* Roadmap Viewer */}
        <div
          className={`flex-1 min-w-0 ${selectedNode ? "hidden md:block" : ""}`}
        >
          <RoadmapViewer
            roadmap={roadmap}
            progress={progress}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
            subRoadmapProgressMap={subRoadmapProgressMap}
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
              <RoadmapTopicDetail
                node={selectedNode}
                nodeProgress={selectedNodeProgress}
                roadmapSlug={roadmap.slug}
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
  );
}
