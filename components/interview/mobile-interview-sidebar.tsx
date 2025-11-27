"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Loader2,
  BookOpen,
  Search,
  X,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { RevisionTopic } from "@/lib/db/schemas/interview";
import type { StreamingCardStatus } from "@/components/streaming/streaming-card";
import Link from "next/link";

interface TimelineItem {
  id: string;
  title: string;
  status: "completed" | "current" | "upcoming" | "loading";
}

interface MobileInterviewSidebarProps {
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


export function MobileInterviewSidebar({
  interviewId,
  topics,
  moduleStatus,
  activeTopicIndex,
}: MobileInterviewSidebarProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const isLoading = moduleStatus === "loading" || moduleStatus === "streaming";

  // Close sheet when pathname changes (navigation occurred)
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const timelineItems = useMemo(() => {
    const items = generateTimelineFromTopics(topics);
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(query));
  }, [topics, searchQuery]);

  return (
    <>
      {/* Floating trigger button - only visible on mobile (< lg breakpoint) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-6 z-50 lg:hidden min-h-[44px] min-w-[44px] h-12 w-12 rounded-full shadow-lg bg-background border-primary/20 hover:bg-primary/10"
            aria-label="Open topics sidebar"
          >
            <List className="h-5 w-5" />
            {topics.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {topics.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0 bg-sidebar">
          <div className="p-6">
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
                  className="pl-8 pr-8 h-10 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
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
                          onClick={() => setOpen(false)}
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
                                ? "Completed"
                                : item.status === "current"
                                ? "In Progress"
                                : "Not Started"}
                            </p>
                          </div>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
