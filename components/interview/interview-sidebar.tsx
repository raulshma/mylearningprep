"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Circle, Loader2, BookOpen, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RevisionTopic } from "@/lib/db/schemas/interview";
import type { StreamingCardStatus } from "@/components/streaming/streaming-card";
import Link from "next/link";

interface TimelineItem {
  id: string;
  title: string;
  status: "completed" | "current" | "upcoming" | "loading";
}

interface InterviewSidebarProps {
  interviewId: string;
  topics: RevisionTopic[];
  moduleStatus: StreamingCardStatus;
  activeTopicIndex?: number;
}

function generateTimelineFromTopics(
  topics: RevisionTopic[],
  activeTopicIndex?: number
): TimelineItem[] {
  return topics.map((topic, index) => {
    let status: TimelineItem["status"] = "upcoming";

    if (activeTopicIndex !== undefined) {
      if (index < activeTopicIndex) {
        status = "completed";
      } else if (index === activeTopicIndex) {
        status = "current";
      }
    } else {
      if (topic.confidence === "high") {
        status = "completed";
      } else if (topic.confidence === "medium") {
        status = "current";
      }
    }

    return {
      id: topic.id,
      title: topic.title,
      status,
    };
  });
}

export function InterviewSidebar({
  interviewId,
  topics,
  moduleStatus,
  activeTopicIndex,
}: InterviewSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isLoading = moduleStatus === "loading" || moduleStatus === "streaming";
  
  const timelineItems = useMemo(() => {
    const items = generateTimelineFromTopics(topics, activeTopicIndex);
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(query));
  }, [topics, activeTopicIndex, searchQuery]);

  return (
    <aside className="w-72 border-r border-border bg-sidebar/50 backdrop-blur-sm p-6 hidden lg:block sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-mono text-sm text-foreground">Study Timeline</h2>
        {topics.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {timelineItems.length}/{topics.length}
          </span>
        )}
      </div>

      {/* Search/Filter */}
      {topics.length > 3 && (
        <div className="relative mb-4">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating topics...</span>
          </div>
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="h-12 bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : timelineItems.length === 0 && searchQuery ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-secondary mx-auto mb-3 flex items-center justify-center">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No topics match &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-2"
          >
            Clear filter
          </Button>
        </div>
      ) : timelineItems.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-secondary mx-auto mb-3 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Topics will appear here once generated
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

          <ul className="space-y-1">
            {timelineItems.map((item, index) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/interview/${interviewId}/topic/${item.id}`}
                  className={`flex items-start gap-3 p-2 -ml-2 hover:bg-secondary/50 transition-colors group ${
                    item.status === "current" ? "bg-secondary/30" : ""
                  }`}
                >
                  <div
                    className={`w-4 h-4 mt-0.5 flex items-center justify-center z-10 flex-shrink-0 ${
                      item.status === "completed"
                        ? "bg-foreground"
                        : item.status === "current"
                        ? "bg-background border-2 border-foreground"
                        : item.status === "loading"
                        ? "bg-background border border-muted-foreground"
                        : "bg-background border border-muted-foreground"
                    }`}
                  >
                    {item.status === "completed" && (
                      <CheckCircle className="w-3 h-3 text-background" />
                    )}
                    {item.status === "loading" && (
                      <Loader2 className="w-2.5 h-2.5 text-muted-foreground animate-spin" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate group-hover:text-foreground transition-colors ${
                        item.status === "current"
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 capitalize">
                      {item.status === "completed"
                        ? "Reviewed"
                        : item.status === "current"
                        ? "In Progress"
                        : "Upcoming"}
                    </p>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
