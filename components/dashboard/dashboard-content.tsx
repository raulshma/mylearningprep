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
    <div>
      {/* Search & Filters */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by role or company..."
            className="pl-10 font-mono bg-card border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 border border-border bg-card p-1 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground ml-2" />
            {(["all", "active", "completed"] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "secondary" : "ghost"}
                size="sm"
                className="text-xs capitalize flex-1 sm:flex-none"
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="flex items-center border border-border bg-card p-1 w-full sm:w-auto justify-center sm:justify-start">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="px-2 flex-1 sm:flex-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="px-2 flex-1 sm:flex-none"
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
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "flex flex-col gap-3"
          }
          layout
        >
          {filteredInterviews.map((interview, index) => (
            <motion.div
              key={interview._id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <InterviewCardNew
                interview={interview}
                viewMode={viewMode}
                onDelete={() => handleDelete(interview._id)}
                isDeleting={isPending}
              />
            </motion.div>
          ))}

          {/* Add New Card */}
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: filteredInterviews.length * 0.03,
            }}
          >
            <Link href="/dashboard/new">
              <div
                className={`group border border-dashed border-border hover:border-primary/50 transition-all duration-300 flex items-center justify-center cursor-pointer bg-card/50 hover:bg-card ${
                  viewMode === "grid" ? "h-full min-h-[240px]" : "h-20"
                }`}
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Plus className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Create new interview prep
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Empty state */}
      {filteredInterviews.length === 0 && interviews.length > 0 && (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-secondary flex items-center justify-center">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">
            No interviews match your search
          </p>
          <Button
            variant="outline"
            size="sm"
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
