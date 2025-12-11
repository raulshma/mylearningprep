'use client';

import { useState, useCallback, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RoadmapViewer, RoadmapSidebar, RoadmapTopicDetail } from '@/components/roadmap';
import { startNode, completeNode, startRoadmap } from '@/lib/actions/roadmap';
import { toast } from 'sonner';
import type { Roadmap } from '@/lib/db/schemas/roadmap';
import type { UserRoadmapProgress, NodeProgress } from '@/lib/db/schemas/user-roadmap-progress';
import type { ObjectiveLessonInfo } from '@/lib/actions/lessons';

interface RoadmapClientProps {
  initialRoadmap: Roadmap;
  initialProgress: UserRoadmapProgress | null;
  initialLessonAvailability: Record<string, ObjectiveLessonInfo[]>;
}

export function RoadmapClient({ 
  initialRoadmap, 
  initialProgress,
  initialLessonAvailability = {}
}: RoadmapClientProps) {
  const [roadmap] = useState(initialRoadmap);
  const [progress, setProgress] = useState(initialProgress);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const selectedNode = selectedNodeId 
    ? roadmap.nodes.find(n => n.id === selectedNodeId) 
    : null;
  
  const selectedNodeProgress = selectedNodeId && progress
    ? progress.nodeProgress.find(np => np.nodeId === selectedNodeId) || null
    : null;
  
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);
  
  const handleCloseDetail = useCallback(() => {
    setSelectedNodeId(null);
  }, []);
  
  const handleStartLearning = useCallback(async () => {
    if (!selectedNodeId) return;
    
    startTransition(async () => {
      try {
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
        setProgress(prev => {
          if (!prev) return prev;
          const nodeIndex = prev.nodeProgress.findIndex(np => np.nodeId === selectedNodeId);
          const updatedProgress = [...prev.nodeProgress];
          
          if (nodeIndex >= 0) {
            updatedProgress[nodeIndex] = {
              ...updatedProgress[nodeIndex],
              status: 'in-progress',
              startedAt: new Date(),
            };
          } else {
            updatedProgress.push({
              nodeId: selectedNodeId,
              status: 'in-progress',
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
        
        toast.success('Started learning!', {
          description: `You're now learning: ${selectedNode?.title}`,
        });
      } catch (error) {
        toast.error('Failed to start learning', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }, [selectedNodeId, roadmap.slug, progress, selectedNode?.title]);
  
  const handleMarkComplete = useCallback(async () => {
    if (!selectedNodeId) return;
    
    startTransition(async () => {
      try {
        await completeNode(roadmap.slug, selectedNodeId);
        
        // Update local state
        setProgress(prev => {
          if (!prev) return prev;
          const nodeIndex = prev.nodeProgress.findIndex(np => np.nodeId === selectedNodeId);
          const updatedProgress = [...prev.nodeProgress];
          
          if (nodeIndex >= 0) {
            updatedProgress[nodeIndex] = {
              ...updatedProgress[nodeIndex],
              status: 'completed',
              completedAt: new Date(),
            };
          }
          
          const completedCount = updatedProgress.filter(np => np.status === 'completed').length;
          
          return {
            ...prev,
            nodeProgress: updatedProgress,
            nodesCompleted: completedCount,
            overallProgress: Math.round((completedCount / roadmap.nodes.length) * 100),
          };
        });
        
        toast.success('Topic completed!', {
          description: `Great job completing: ${selectedNode?.title}`,
        });
        
        setSelectedNodeId(null);
      } catch (error) {
        toast.error('Failed to mark as complete', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }, [selectedNodeId, roadmap.slug, roadmap.nodes.length, selectedNode?.title]);
  
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
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-w-0">
        {/* Roadmap Viewer */}
        <div className={`flex-1 min-w-0 ${selectedNode ? 'hidden md:block' : ''}`}>
          <RoadmapViewer
            roadmap={roadmap}
            progress={progress}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

