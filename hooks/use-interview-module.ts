"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDataStreamReader } from "@/hooks/use-data-stream-reader";
import type {
  ModuleType,
  RevisionTopic,
  MCQ,
  RapidFire,
  OpeningBrief,
} from "@/lib/db/schemas/interview";

export type ModuleStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "complete"
  | "error";

// Type mapping for module data
type ModuleDataMap = {
  openingBrief: OpeningBrief;
  revisionTopics: RevisionTopic[];
  mcqs: MCQ[];
  rapidFire: RapidFire[];
};

interface UseInterviewModuleOptions<T extends ModuleType> {
  interviewId: string;
  module: T;
  initialData?: ModuleDataMap[T];
  onComplete?: (data: ModuleDataMap[T]) => void;
  onError?: (error: string) => void;
  resumeOnMount?: boolean;
}

interface UseInterviewModuleReturn<T extends ModuleType> {
  data: ModuleDataMap[T] | undefined;
  status: ModuleStatus;
  error: string | null;
  generate: (instructions?: string) => Promise<void>;
  stop: () => void;
}

/**
 * Custom hook for streaming interview module generation
 * Uses AI SDK's data stream protocol for proper integration
 */
export function useInterviewModule<T extends ModuleType>({
  interviewId,
  module,
  initialData,
  onComplete,
  onError,
  resumeOnMount = true,
}: UseInterviewModuleOptions<T>): UseInterviewModuleReturn<T> {
  const [data, setData] = useState<ModuleDataMap[T] | undefined>(initialData);
  const [status, setStatus] = useState<ModuleStatus>(
    initialData ? "complete" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resumeAttemptedRef = useRef(false);

  // Process incoming data stream
  const processDataPart = useCallback(
    (dataPart: unknown) => {
      const part = dataPart as {
        type: string;
        module: string;
        data?: unknown;
        error?: string;
      };

      if (part.module !== module) return;

      if (part.type === "partial" && part.data !== undefined) {
        setData(part.data as ModuleDataMap[T]);
        if (status !== "streaming") {
          setStatus("streaming");
        }
      } else if (part.type === "complete" && part.data !== undefined) {
        setData(part.data as ModuleDataMap[T]);
        setStatus("complete");
        onComplete?.(part.data as ModuleDataMap[T]);
      } else if (part.type === "error") {
        setStatus("error");
        setError(part.error || "Unknown error");
        onError?.(part.error || "Unknown error");
      }
    },
    [module, status, onComplete, onError]
  );

  // Process a ReadableStream
  const processStream = useCallback(
    async (body: ReadableStream<Uint8Array>) => {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete data lines from the AI SDK data stream protocol
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            // AI SDK data stream format uses different prefixes
            if (line.startsWith("2:")) {
              // Data part - parse JSON array
              try {
                const jsonStr = line.slice(2);
                const dataArray = JSON.parse(jsonStr);
                if (Array.isArray(dataArray)) {
                  for (const dataPart of dataArray) {
                    processDataPart(dataPart);
                  }
                } else {
                  processDataPart(dataArray);
                }
              } catch {
                // Ignore parse errors
              }
            } else if (line.startsWith("d:")) {
              // Finish event
              const finishData = JSON.parse(line.slice(2));
              if (finishData.finishReason === "stop") {
                setStatus("complete");
              }
            } else if (line.startsWith("3:")) {
              // Error part
              try {
                const errorData = JSON.parse(line.slice(2));
                setStatus("error");
                setError(errorData.message || "Stream error");
                onError?.(errorData.message || "Stream error");
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    [processDataPart, onError]
  );
  // Try to resume an active stream on mount
  useEffect(() => {
    if (!resumeOnMount || resumeAttemptedRef.current || initialData) return;
    resumeAttemptedRef.current = true;

    const tryResume = async () => {
      try {
        const response = await fetch(
          `/api/interview/${interviewId}/stream/${module}`,
          { credentials: "include" }
        );

        if (response.status === 204) {
          // No active stream to resume
          return;
        }

        if (!response.ok || !response.body) {
          return;
        }

        // Check if this is a resumed stream
        const isResumed = response.headers.get("X-Stream-Resumed") === "true";
        if (!isResumed) {
          return;
        }

        setStatus("streaming");

        // Process the resumed stream
        await processStream(response.body);
      } catch {
        // Silently ignore resume errors
      }
    };

    tryResume();
  }, [interviewId, module, resumeOnMount, initialData, processStream]);

  // Generate module content
  const generate = useCallback(
    async (instructions?: string) => {
      // Abort any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`/api/interview/${interviewId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module, instructions }),
          credentials: "include",
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate module");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        setStatus("streaming");
        await processStream(response.body);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setStatus("error");
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [interviewId, module, processStream, onError]
  );

  // Stop the current generation
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus("idle");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    data,
    status,
    error,
    generate,
    stop,
  };
}

/**
 * Hook for adding more content to an existing module
 */
interface UseAddMoreOptions<T extends "mcqs" | "rapidFire" | "revisionTopics"> {
  interviewId: string;
  module: T;
  existingData: ModuleDataMap[T];
  onComplete?: (data: ModuleDataMap[T]) => void;
  onError?: (error: string) => void;
}

interface UseAddMoreReturn<T extends "mcqs" | "rapidFire" | "revisionTopics"> {
  data: ModuleDataMap[T];
  status: ModuleStatus;
  error: string | null;
  addMore: (count?: number, instructions?: string) => Promise<void>;
  stop: () => void;
}

export function useAddMore<T extends "mcqs" | "rapidFire" | "revisionTopics">({
  interviewId,
  module,
  existingData,
  onComplete,
  onError,
}: UseAddMoreOptions<T>): UseAddMoreReturn<T> {
  const [data, setData] = useState<ModuleDataMap[T]>(existingData);
  const [status, setStatus] = useState<ModuleStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update existing data when it changes
  useEffect(() => {
    setData(existingData);
  }, [existingData]);

  // Process a ReadableStream
  const processStream = useCallback(
    async (body: ReadableStream<Uint8Array>) => {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("2:")) {
              try {
                const jsonStr = line.slice(2);
                const dataArray = JSON.parse(jsonStr);
                const processPart = (part: {
                  type: string;
                  module: string;
                  data?: unknown;
                }) => {
                  if (part.module !== module) return;

                  if (
                    (part.type === "partial" || part.type === "complete") &&
                    part.data !== undefined
                  ) {
                    // Merge with existing data
                    setData(
                      (prev) =>
                        [
                          ...(prev as unknown[]),
                          ...(part.data as unknown[]),
                        ] as ModuleDataMap[T]
                    );
                    if (part.type === "complete") {
                      setStatus("complete");
                      onComplete?.(data);
                    }
                  }
                };

                if (Array.isArray(dataArray)) {
                  for (const part of dataArray) {
                    processPart(part);
                  }
                } else {
                  processPart(dataArray);
                }
              } catch {
                // Ignore parse errors
              }
            } else if (line.startsWith("3:")) {
              try {
                const errorData = JSON.parse(line.slice(2));
                setStatus("error");
                setError(errorData.message || "Stream error");
                onError?.(errorData.message || "Stream error");
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    [module, data, onComplete, onError]
  );

  const addMore = useCallback(
    async (count: number = 5, instructions?: string) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`/api/interview/${interviewId}/add-more`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module, count, instructions }),
          credentials: "include",
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add more content");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        setStatus("streaming");
        await processStream(response.body);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setStatus("error");
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [interviewId, module, processStream, onError]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    data,
    status,
    error,
    addMore,
    stop,
  };
}
