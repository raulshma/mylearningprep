"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Activity, ActivityType } from "@/lib/db/schemas/learning-path";

export type ActivityStreamStatus = "idle" | "loading" | "streaming" | "complete" | "error";

interface StreamEventData {
  type: "content" | "complete" | "done" | "error";
  data?: unknown;
  activity?: Activity;
  activityType?: ActivityType;
  cached?: boolean;
  error?: string;
}

interface UseActivityStreamOptions {
  learningPathId: string;
  onContent?: (data: unknown, activityType: ActivityType) => void;
  onComplete?: (activity: Activity) => void;
  onError?: (error: string) => void;
}

interface UseActivityStreamReturn {
  status: ActivityStreamStatus;
  error: string | null;
  activity: Activity | null;
  streamingContent: unknown | null;
  activityType: ActivityType | null;
  startStream: (options?: { activityType?: ActivityType; topicId?: string; regenerate?: boolean }) => Promise<void>;
  cancelStream: () => void;
}

/**
 * Hook for streaming learning path activity generation
 * Simplified to match the interview streaming pattern
 */
export function useActivityStream({
  learningPathId,
  onContent,
  onComplete,
  onError,
}: UseActivityStreamOptions): UseActivityStreamReturn {
  const [status, setStatus] = useState<ActivityStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [streamingContent, setStreamingContent] = useState<unknown | null>(null);
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Process SSE stream data
  const processStream = useCallback(
    async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      setStatus("streaming");

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const event: StreamEventData = JSON.parse(jsonStr);

                if (event.type === "content" && event.data !== undefined) {
                  setStreamingContent(event.data);
                  if (event.activityType) {
                    setActivityType(event.activityType);
                  }
                  onContent?.(event.data, event.activityType as ActivityType);
                } else if (event.type === "complete" && event.activity) {
                  setActivity(event.activity);
                  setStreamingContent(null);
                  if (event.activity.type) {
                    setActivityType(event.activity.type);
                  }
                } else if (event.type === "done") {
                  setStatus("complete");
                  if (activity) {
                    onComplete?.(activity);
                  }
                } else if (event.type === "error") {
                  setStatus("error");
                  setError(event.error || "Unknown error");
                  onError?.(event.error || "Unknown error");
                }
              } catch {
                // Ignore invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    [onContent, onComplete, onError, activity]
  );

  // Start a new stream
  const startStream = useCallback(
    async (options?: { activityType?: ActivityType; topicId?: string; regenerate?: boolean }) => {
      // Abort any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStatus("loading");
      setError(null);
      setActivity(null);
      setStreamingContent(null);

      try {
        const response = await fetch(
          `/api/learning-path/${learningPathId}/activity/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              activityType: options?.activityType,
              topicId: options?.topicId,
              regenerate: options?.regenerate,
            }),
            signal: abortControllerRef.current.signal,
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start activity generation");
        }

        await processStream(response);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Aborted intentionally - reset to idle
          setStatus("idle");
        } else {
          setStatus("error");
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }
    },
    [learningPathId, processStream, onError]
  );

  // Cancel the current stream
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus("idle");
    setStreamingContent(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    status,
    error,
    activity,
    streamingContent,
    activityType,
    startStream,
    cancelStream,
  };
}
