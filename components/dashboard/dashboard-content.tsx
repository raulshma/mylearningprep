"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Filter, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InterviewCardNew } from "./interview-card";
import { deleteInterview } from "@/lib/actions/interview";
import type { DashboardInterviewData } from "@/lib/actions/dashboard";

type FilterStatus = "all" | "active" | "completed";
type ViewMode = "grid" | "list";

interface DashboardContentProps {
  interviews: DashboardInterviewData[];
}

export function DashboardContent({
  interviews: initialInterviews,
}: DashboardContentProps) {
  const [interviews, setInterviews] = useState(initialInterviews);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isPending, startTransition] = useTransition();

  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        interview.jobDetails.title.toLowerCase().includes(searchLower) ||
        interview.jobDetails.company.toLowerCase().includes(searchLower);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" &&
          (interview.status === "active" || interview.status === "upcoming")) ||
        (filterStatus === "completed" && interview.status === "completed");

      return matchesSearch && matchesStatus;
    });
  }, [interviews, searchQuery, filterStatus]);

  const handleDelete = async (interviewId: string) => {
    startTransition(async () => {
      const result = await deleteInterview(interviewId);
      if (result.success) {
        setInterviews((prev) => prev.filter((i) => i._id !== interviewId));
      }
    });
  };

  return (
    <div className="overflow-hidden">
      {/* Search & Filters */}
      <motion.div
        className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search interviews..."
            className="pl-10 h-10 rounded-lg bg-background border-border focus:border-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
            {(["all", "active", "completed"] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-md px-3 h-8 text-xs capitalize transition-all ${
                  filterStatus === status
                    ? "bg-background shadow-sm text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className={`w-8 h-8 rounded-md transition-all ${
                viewMode === "grid" ? "bg-background shadow-sm" : ""
              }`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className={`w-8 h-8 rounded-md transition-all ${
                viewMode === "list" ? "bg-background shadow-sm" : ""
              }`}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Interview Cards */}
      <AnimatePresence mode="popLayout">
        <motion.div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6"
              : "flex flex-col gap-4 min-w-0"
          }
          layout
        >
          {/* Add New Card */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Link href="/dashboard/new">
              <div
                className={`group relative overflow-hidden rounded-xl border border-dashed border-border hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer bg-card hover:bg-secondary/50 ${
                  viewMode === "grid"
                    ? "h-full min-h-[200px]"
                    : "h-20 flex-row gap-4"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div
                  className={
                    viewMode === "grid" ? "mt-4 text-center" : "text-left"
                  }
                >
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    New Interview
                  </p>
                  {viewMode === "grid" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Start new preparation
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>

          {filteredInterviews.map((interview, index) => (
            <motion.div
              key={interview._id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <InterviewCardNew
                interview={interview}
                viewMode={viewMode}
                onDelete={() => handleDelete(interview._id)}
                isDeleting={isPending}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Empty state */}
      {filteredInterviews.length === 0 && interviews.length > 0 && (
        <motion.div
          className="text-center py-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No interviews found</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            We couldn&apos;t find any interviews matching your search criteria.
          </p>
          <Button
            variant="outline"
            className="rounded-full px-6"
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
            }}
          >
            Clear filters
          </Button>
        </motion.div>
      )}
    </div>
  );
}
