"use client";

import { memo } from "react";
import { ToolInvocation } from "./tool-invocation";
import type { ToolPart } from "../utils/message-helpers";
import { cn } from "@/lib/utils";

interface ToolDisplayProps {
  /**
   * Array of tool parts to display
   */
  toolParts: ToolPart[];
  /**
   * Visual variant
   */
  variant?: "default" | "compact";
  /**
   * Optional class name
   */
  className?: string;
}

/**
 * Displays a list of tool invocations
 * 
 * Requirements: 8.2, 8.3 - Display tool invocations with status
 */
export const ToolDisplay = memo(function ToolDisplay({
  toolParts,
  variant = "default",
  className,
}: ToolDisplayProps) {
  if (toolParts.length === 0) return null;

  return (
    <div className={cn("space-y-2 text-left", className)}>
      {toolParts.map((part) => (
        <ToolInvocation
          key={part.toolCallId}
          part={part}
          variant={variant}
        />
      ))}
    </div>
  );
});
