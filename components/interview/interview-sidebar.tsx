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
  topics: RevisionTopic[]
): TimelineItem[] {
  return topics.map((topic) => {
    // Map topic.status to timeline status
    let timelineStatus: TimelineItem["status"] = "upcoming";
    
    const topicStatus = topic.status ?? "not_started";
    if (topicStatus === "completed") {
      timelineStatus = "completed";
    } else if (topicStatus === "in_progress") {
      timelineStatus = "current";
    }

    return {
      id: topic.id,
      title: topic.title,
      status: timelineStatus,
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
    const items = generateTimelineFromTopics(topics);
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(query));
  }, [topics, searchQuery]);

  return (
    <aside className="w-80 border-r border-border/50 bg-sidebar/30 backdrop-blur-xl p-6 hidden lg:block sticky top-[81px] h-[calc(100vh-81px)] overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="p-2 bg-primary/10 rounded-xl">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-bold text-sm text-foreground tracking-tight">Study Timeline</h2>
        {topics.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground ml-auto bg-secondary/50 px-2 py-0.5 rounded-full">
            {timelineItems.length}/{topics.length}
          </span>
        )}
      </div>

      {/* Search/Filter */}
      {topics.length > 3 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 text-sm rounded-xl bg-background/50 border-border/50 focus:bg-background transition-all"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-background/80"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 px-2">
          <div className="flex items-center gap-3 text-muted-foreground bg-secondary/20 p-3 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Generating topics...</span>
          </div>
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="h-14 bg-muted/30 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : timelineItems.length === 0 && searchQuery ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 bg-secondary/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No matches found</p>
          <p className="text-xs text-muted-foreground mb-4">
            No topics match &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="rounded-full text-xs h-8"
          >
            Clear filter
          </Button>
        </div>
      ) : timelineItems.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 bg-secondary/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No topics yet</p>
          <p className="text-xs text-muted-foreground">
            Topics will appear here once generated
          </p>
        </div>
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border/50" />

          <ul className="space-y-2">
            {timelineItems.map((item, index) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/interview/${interviewId}/topic/${item.id}`}
                  className={`flex items-start gap-4 p-3 rounded-2xl transition-all group relative z-10 ${item.status === "current"
                      ? "bg-background shadow-sm border border-border/50"
                      : "hover:bg-secondary/40"
                    }`}
                >
                  <div
                    className={`w-3 h-3 mt-1.5 rounded-full ring-4 ring-background flex-shrink-0 transition-colors ${item.status === "completed"
                        ? "bg-primary"
                        : item.status === "current"
                          ? "bg-primary animate-pulse"
                          : "bg-border"
                      }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate transition-colors ${item.status === "current"
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mt-0.5">
                      {item.status === "completed"
                        ? "Completed"
                        : item.status === "current"
                          ? "In Progress"
                          : "Not Started"}
                    </p>
                  </div>
                  {item.status === "completed" && (
                    <CheckCircle className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
