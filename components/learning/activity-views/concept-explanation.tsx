"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Lightbulb,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ConceptExplanation } from "@/lib/db/schemas/learning-path";

interface ConceptExplanationViewProps {
  content: ConceptExplanation;
  onComplete: (answer: string, isCorrect?: boolean) => void;
}

export function ConceptExplanationView({
  content,
  onComplete,
}: ConceptExplanationViewProps) {
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set());

  const handleCheckPoint = (index: number) => {
    const newChecked = new Set(checkedPoints);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedPoints(newChecked);
  };

  const allPointsChecked = checkedPoints.size === content.keyPoints.length;
  const progress = (checkedPoints.size / content.keyPoints.length) * 100;

  const handleComplete = () => {
    onComplete("read", true);
  };

  return (
    <div className="space-y-8">
      {/* Main Content Card */}
      <div className="rounded-2xl border border-border/40 bg-secondary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Concept Overview
          </span>
        </div>
        <div className="p-6">
          <p className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">
            {content.content}
          </p>
        </div>
      </div>

      {/* Key Points Card */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">
              Key Points
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {checkedPoints.size}/{content.keyPoints.length}
            </span>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {content.keyPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                checkedPoints.has(index)
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-secondary/20 border border-transparent hover:bg-secondary/40"
              }`}
            >
              <Checkbox
                id={`point-${index}`}
                checked={checkedPoints.has(index)}
                onCheckedChange={() => handleCheckPoint(index)}
                className="mt-0.5 rounded-md"
              />
              <label
                htmlFor={`point-${index}`}
                className={`flex-1 text-sm cursor-pointer transition-all duration-300 leading-relaxed ${
                  checkedPoints.has(index)
                    ? "text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {point}
              </label>
              {checkedPoints.has(index) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
        {allPointsChecked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 pb-6"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                Great job! You&apos;ve reviewed all key points.
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Examples */}
      {content.examples && content.examples.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 rounded-xl bg-secondary/50">
              <Code className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">
              Examples
            </span>
          </div>
          <div className="space-y-3">
            {content.examples.map((example, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="rounded-2xl border border-border/40 bg-secondary/20 overflow-hidden"
              >
                <pre className="p-6 text-sm font-mono text-foreground whitespace-pre-wrap overflow-x-auto">
                  {example}
                </pre>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleComplete}
          size="lg"
          className="rounded-xl px-8 h-12 text-base font-medium gap-2 shadow-lg shadow-primary/20"
        >
          I Understand This
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
