'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { addTimelineNotes } from '@/lib/actions/learning-path';
import type { TimelineEntry } from '@/lib/db/schemas/learning-path';

interface TimelineViewProps {
  timeline: TimelineEntry[];
  pathId: string;
}

const activityTypeIcons: Record<string, typeof HelpCircle> = {
  mcq: HelpCircle,
  'coding-challenge': Code,
  'debugging-task': Bug,
  'concept-explanation': FileText,
  'real-world-assignment': Target,
  'mini-case-study': Brain,
};

const activityTypeLabels: Record<string, string> = {
  mcq: 'MCQ',
  'coding-challenge': 'Coding',
  'debugging-task': 'Debug',
  'concept-explanation': 'Concept',
  'real-world-assignment': 'Assignment',
  'mini-case-study': 'Case Study',
};

export function TimelineView({ timeline, pathId }: TimelineViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localTimeline, setLocalTimeline] = useState(timeline);

  const handleEditStart = (entry: TimelineEntry) => {
    setEditingId(entry.id);
    setEditNotes(entry.userNotes || '');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditNotes('');
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
        setEditNotes('');
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
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (localTimeline.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-secondary flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-lg text-foreground mb-2">No Activity Yet</h3>
        <p className="text-muted-foreground">
          Complete activities to see your learning timeline here.
        </p>
      </div>
    );
  }

  // Reverse to show most recent first
  const sortedTimeline = [...localTimeline].reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-mono text-lg text-foreground">Learning Timeline</h3>
        </div>
        <Badge variant="secondary">{localTimeline.length} activities</Badge>
      </div>

      <div className="space-y-3">
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
                className={`border bg-card/80 backdrop-blur-sm ${
                  entry.success ? 'border-border' : 'border-destructive/30'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 flex items-center justify-center ${
                          entry.success ? 'bg-green-500/10' : 'bg-destructive/10'
                        }`}
                      >
                        {entry.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-foreground">
                            {entry.topicTitle}
                          </span>
                          <Badge variant="outline" className="text-xs gap-1">
                            <Icon className="w-3 h-3" />
                            {activityTypeLabels[entry.activityType] || entry.activityType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(entry.timeTakenSeconds)}
                          </span>
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* ELO Change */}
                      <div
                        className={`flex items-center gap-1 px-2 py-1 text-sm font-mono ${
                          entry.eloChange >= 0
                            ? 'text-green-500 bg-green-500/10'
                            : 'text-destructive bg-destructive/10'
                        }`}
                      >
                        {entry.eloChange >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {entry.eloChange >= 0 ? '+' : ''}
                        {Math.round(entry.eloChange)}
                      </div>

                      {/* Edit Button */}
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStart(entry)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ELO Details */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Before: {Math.round(entry.eloBefore)}</span>
                    <span>→</span>
                    <span>After: {Math.round(entry.eloAfter)}</span>
                    {entry.reflection && (
                      <>
                        <span>•</span>
                        <span>Difficulty felt: {entry.reflection.difficultyRating}/5</span>
                      </>
                    )}
                  </div>

                  {/* Notes Section */}
                  {isEditing ? (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add your notes about this activity..."
                        className="min-h-[80px] bg-secondary/30 resize-none text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditCancel}
                          disabled={isSaving}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(entry.id)}
                          disabled={isSaving}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : entry.userNotes ? (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground italic">
                        "{entry.userNotes}"
                      </p>
                    </div>
                  ) : null}

                  {/* Struggle Points */}
                  {entry.reflection?.strugglePoints && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Struggled with:</p>
                      <p className="text-sm text-foreground">{entry.reflection.strugglePoints}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
