"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Clock, Target, BookOpen, AlertCircle } from "lucide-react";
import type { LearningTopic } from "@/lib/db/schemas/learning-path";

interface TopicCardProps {
  topic: LearningTopic;
  isActive: boolean;
  isExpanded?: boolean;
  onClick?: () => void;
}

export function TopicCard({ topic, isActive, isExpanded: controlledExpanded, onClick }: TopicCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  
  const hasDetails = (topic.learningObjectives && topic.learningObjectives.length > 0) ||
    (topic.keyConceptsToMaster && topic.keyConceptsToMaster.length > 0) ||
    (topic.subtopics && topic.subtopics.length > 0);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (controlledExpanded === undefined) {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`group relative rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
        isActive
          ? "bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10"
          : "bg-secondary/30 hover:bg-secondary/50 border border-transparent hover:border-border/50"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-sm font-semibold line-clamp-1 transition-colors ${
              isActive ? "text-primary" : "text-foreground"
            }`}
          >
            {topic.title}
          </span>
          <div className="flex items-center gap-1">
            {hasDetails && (
              <motion.button
                onClick={handleExpandClick}
                className="w-6 h-6 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.div>
              </motion.button>
            )}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Basic info row */}
        <div
          className={`flex items-center gap-2 text-xs transition-colors ${
            isActive ? "text-primary/70" : "text-muted-foreground"
          }`}
        >
          <span className="capitalize font-medium">
            {topic.skillCluster.replace("-", " ")}
          </span>
          <span className="w-1 h-1 rounded-full bg-current opacity-50" />
          <span>Lvl {topic.difficulty}</span>
          {topic.estimatedMinutes && (
            <>
              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {topic.estimatedMinutes}m
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {topic.description && (
          <p className={`mt-2 text-xs line-clamp-2 ${
            isActive ? "text-primary/60" : "text-muted-foreground/80"
          }`}>
            {topic.description}
          </p>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 pt-2 border-t space-y-3 ${
              isActive ? "border-primary/20" : "border-border/50"
            }`}>
              {/* Learning Objectives */}
              {topic.learningObjectives && topic.learningObjectives.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-foreground">Learning Objectives</span>
                  </div>
                  <ul className="space-y-1">
                    {topic.learningObjectives.slice(0, 4).map((obj) => (
                      <li key={obj.id} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${
                          obj.isCore ? "bg-primary" : "bg-muted-foreground/50"
                        }`} />
                        <span className={obj.isCore ? "" : "opacity-70"}>{obj.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Concepts */}
              {topic.keyConceptsToMaster && topic.keyConceptsToMaster.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-foreground">Key Concepts</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {topic.keyConceptsToMaster.slice(0, 6).map((concept, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded-full bg-secondary/80 text-muted-foreground"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Mistakes */}
              {topic.commonMistakes && topic.commonMistakes.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-medium text-foreground">Watch Out For</span>
                  </div>
                  <ul className="space-y-1">
                    {topic.commonMistakes.slice(0, 3).map((mistake, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500/50 flex-shrink-0" />
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interview Relevance */}
              {topic.interviewRelevance && (
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground italic">
                    💡 {topic.interviewRelevance}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Active indicator line */}
      {isActive && (
        <motion.div
          layoutId="activeTopicIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-primary"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </motion.div>
  );
}
