"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  X,
  HelpCircle,
  Code,
  Bug,
  FileText,
  Target,
  Brain,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { addTimelineNotes } from "@/lib/actions/learning-path";
import type { TimelineEntry } from "@/lib/db/schemas/learning-path";

interface TimelineViewProps {
  timeline: TimelineEntry[];
  pathId: string;
}

const activityTypeIcons: Record<string, typeof HelpCircle> = {
  mcq: HelpCircle,
  "coding-challenge": Code,
  "debugging-task": Bug,
  "concept-explanation": FileText,
  "real-world-assignment": Target,
  "mini-case-study": Brain,
};

const activityTypeLabels: Record<string, string> = {
  mcq: "MCQ",
  "coding-challenge": "Coding",
  "debugging-task": "Debug",
  "concept-explanation": "Concept",
  "real-world-assignment": "Assignment",
  "mini-case-study": "Case Study",
};

export function TimelineView({ timeline, pathId }: TimelineViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [localTimeline, setLocalTimeline] = useState(timeline);

  const handleEditStart = (entry: TimelineEntry) => {
    setEditingId(entry.id);
    setEditNotes(entry.userNotes || "");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditNotes("");
  };

  const handleEditSave = async (entryId: string) => {
    setIsSaving(true);
    try {
      const result = await addTimelineNotes(pathId, entryId, editNotes);
      if (result.success) {
        setLocalTimeline((prev) =>
          prev.map((entry) =>
            entry.id === entryId ? { ...entry, userNotes: editNotes } : entry
          )
        );
        setEditingId(null);
        setEditNotes("");
      }
    } catch {
      // Handle error silently
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (localTimeline.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-24 h-24 rounded-3xl bg-secondary/30 flex items-center justify-center mx-auto mb-8">
          <History className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground mb-3">
          No Activity Yet
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Complete activities to see your learning timeline here.
        </p>
      </div>
    );
  }

  const sortedTimeline = [...localTimeline].reverse();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10">
            <History className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-foreground">
              Learning Timeline
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your journey through {localTimeline.length} activities
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <AnimatePresence>
          {sortedTimeline.map((entry, index) => {
            const Icon = activityTypeIcons[entry.activityType] || HelpCircle;
            const isEditing = editingId === entry.id;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div
                  className={`rounded-3xl bg-background/80 backdrop-blur-xl border border-border/40 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-border/60 ${
                    entry.success
                      ? "hover:border-green-500/20"
                      : "hover:border-destructive/20"
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          entry.success
                            ? "bg-green-500/10 text-green-600"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {entry.success ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <XCircle className="w-6 h-6" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-semibold text-foreground line-clamp-1">
                              {entry.topicTitle}
                            </h4>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="rounded-xl px-3 py-1 text-xs font-medium gap-1.5"
                              >
                                <Icon className="w-3 h-3" />
                                {activityTypeLabels[entry.activityType] ||
                                  entry.activityType}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {formatTime(entry.timeTakenSeconds)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(entry.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* ELO Change & Edit */}
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${
                                entry.eloChange >= 0
                                  ? "text-green-600 bg-green-500/10"
                                  : "text-destructive bg-destructive/10"
                              }`}
                            >
                              {entry.eloChange >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {entry.eloChange >= 0 ? "+" : ""}
                              {Math.round(entry.eloChange)}
                            </div>
                            {!isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditStart(entry)}
                                className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit3 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* ELO Details */}
                        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                          <span>
                            ELO: {Math.round(entry.eloBefore)} →{" "}
                            {Math.round(entry.eloAfter)}
                          </span>
                          {entry.reflection && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>
                                Difficulty: {entry.reflection.difficultyRating}
                                /5
                              </span>
                            </>
                          )}
                        </div>

                        {/* Notes Section */}
                        {isEditing ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4 space-y-3"
                          >
                            <Textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Add your notes about this activity..."
                              className="min-h-[100px] rounded-2xl bg-secondary/20 border-border/40 resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleEditCancel}
                                disabled={isSaving}
                                className="rounded-xl"
                              >
                                <X className="w-4 h-4 mr-1.5" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditSave(entry.id)}
                                disabled={isSaving}
                                className="rounded-xl"
                              >
                                <Save className="w-4 h-4 mr-1.5" />
                                {isSaving ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </motion.div>
                        ) : entry.userNotes ? (
                          <div className="mt-4 p-4 rounded-2xl bg-secondary/20 border border-border/30">
                            <p className="text-sm text-foreground/80 italic leading-relaxed">
                              &ldquo;{entry.userNotes}&rdquo;
                            </p>
                          </div>
                        ) : null}

                        {/* Struggle Points */}
                        {entry.reflection?.strugglePoints && (
                          <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-xs font-medium text-amber-600 mb-1">
                              Struggled with
                            </p>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {entry.reflection.strugglePoints}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
