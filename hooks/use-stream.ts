"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ModuleType,
  RevisionTopic,
  MCQ,
  RapidFire,
} from "@/lib/db/schemas/interview";

export type StreamStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "complete"
  | "error";

// Legacy SSE format
interface LegacyStreamEventData<T = unknown> {
  type: "content" | "done" | "error";
  data?: T;
  module?: string;
  topicId?: string;
  error?: string;
}

// AI SDK data stream protocol types
interface DataStreamObjectPart<T = unknown> {
  data?: T;
  module?: string;
  topicId?: string;
}

interface DataStreamFinishMessage {
  finishReason?: string;
  module?: string;
  topicId?: string;
  style?: string;
}

/**
 * Parse AI SDK data stream protocol line
 * Format: TYPE_CODE:PAYLOAD
 * - 2:["object-part", {...}] - data message
 * - d:{...} - finish message
 * - 3:"error message" - error message
 */
function parseDataStreamLine<T>(line: string): {
  type: "object-part" | "finish" | "error" | "unknown";
  data?: T;
  error?: string;
  finishData?: DataStreamFinishMessage;
} | null {
  // Check for AI SDK format (TYPE_CODE:PAYLOAD)
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;

  const typeCode = line.slice(0, colonIndex);
  const payload = line.slice(colonIndex + 1);

  try {
    switch (typeCode) {
      case "2": {
        // Data message: 2:["object-part", {...}]
        const parsed = JSON.parse(payload);
        if (Array.isArray(parsed) && parsed[0] === "object-part") {
          return { type: "object-part", data: parsed[1]?.data as T };
        }
        return null;
      }
      case "d": {
        // Finish message: d:{finishReason: "complete", ...}
        const parsed = JSON.parse(payload);
        return { type: "finish", finishData: parsed };
      }
      case "3": {
        // Error message: 3:"error string"
        const errorMessage = JSON.parse(payload);
        return {
          type: "error",
          error:
            typeof errorMessage === "string" ? errorMessage : "Unknown error",
        };
      }
      default:
        return { type: "unknown" };
    }
  } catch {
    return null;
  }
}

// UI Message Stream types (from createUIMessageStream)
interface UIMessageStreamEvent<T = unknown> {
  type: string;
  data?: {
    type: "partial" | "complete" | "error";
    module?: string;
    data?: T;
    error?: string;
  };
}

/**
 * Parse UI Message Stream JSON line
 * AI SDK v5 uses SSE format: "data: {...}"
 * Format: data: {"type": "data-partial", "data": {...}}
 */
function parseUIMessageStreamLine<T>(line: string): {
  type: "partial" | "complete" | "error" | "unknown";
  data?: T;
  error?: string;
} | null {
  // Strip SSE "data: " prefix if present
  let jsonContent = line;
  if (line.startsWith("data: ")) {
    jsonContent = line.slice(6);
  }
  
  // Must start with { to be valid JSON
  if (!jsonContent.startsWith("{")) {
    return null;
  }
  
  try {
    const parsed: UIMessageStreamEvent<T> = JSON.parse(jsonContent);
    
    if (parsed.type === "data-partial" && parsed.data?.data !== undefined) {
      return { type: "partial", data: parsed.data.data };
    }
    if (parsed.type === "data-complete" && parsed.data?.data !== undefined) {
      return { type: "complete", data: parsed.data.data };
    }
    if (parsed.type === "data-error") {
      return { type: "error", error: parsed.data?.error || "Unknown error" };
    }
    
    return { type: "unknown" };
  } catch {
    return null;
  }
}

interface UseModuleStreamOptions {
  interviewId: string;
  module: ModuleType;
  onContent?: (data: unknown) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  resumeOnMount?: boolean;
}

interface UseModuleStreamReturn {
  status: StreamStatus;
  error: string | null;
  startGeneration: (instructions?: string) => Promise<void>;
  abort: () => void;
}

/**
 * Hook for streaming module generation with resumable support
 */
export function useModuleStream({
  interviewId,
  module,
  onContent,
  onComplete,
  onError,
  resumeOnMount = true,
}: UseModuleStreamOptions): UseModuleStreamReturn {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resumeAttemptedRef = useRef(false);

  // Process SSE stream data (handles UI message stream, data stream protocol, and legacy formats)
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
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Try UI message stream format first (from createUIMessageStream)
            const uiStreamResult = parseUIMessageStreamLine<unknown>(trimmedLine);
            if (uiStreamResult && uiStreamResult.type !== "unknown") {
              if (uiStreamResult.type === "partial" && uiStreamResult.data !== undefined) {
                onContent?.(uiStreamResult.data);
              } else if (uiStreamResult.type === "complete") {
                if (uiStreamResult.data !== undefined) {
                  onContent?.(uiStreamResult.data);
                }
                setStatus("complete");
                onComplete?.();
              } else if (uiStreamResult.type === "error") {
                setStatus("error");
                setError(uiStreamResult.error || "Unknown error");
                onError?.(uiStreamResult.error || "Unknown error");
              }
              continue;
            }

            // Try AI SDK data stream protocol
            const dataStreamResult = parseDataStreamLine<unknown>(trimmedLine);
            if (dataStreamResult) {
              if (
                dataStreamResult.type === "object-part" &&
                dataStreamResult.data !== undefined
              ) {
                onContent?.(dataStreamResult.data);
              } else if (dataStreamResult.type === "finish") {
                setStatus("complete");
                onComplete?.();
              } else if (dataStreamResult.type === "error") {
                setStatus("error");
                setError(dataStreamResult.error || "Unknown error");
                onError?.(dataStreamResult.error || "Unknown error");
              }
              continue;
            }

            // Fall back to legacy SSE format
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const event: LegacyStreamEventData = JSON.parse(jsonStr);

                if (event.type === "content" && event.data !== undefined) {
                  onContent?.(event.data);
                } else if (event.type === "done") {
                  setStatus("complete");
                  onComplete?.();
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
    [onContent, onComplete, onError]
  );

  // Try to resume an active stream
  const tryResume = useCallback(async () => {
    if (resumeAttemptedRef.current) return false;
    resumeAttemptedRef.current = true;

    try {
      const response = await fetch(
        `/api/interview/${interviewId}/stream/${module}`,
        {
          credentials: "include",
        }
      );

      if (response.status === 204) {
        // No active stream to resume
        return false;
      }

      if (!response.ok) {
        return false;
      }

      // Check if this is a resumed stream
      const isResumed = response.headers.get("X-Stream-Resumed") === "true";
      if (isResumed) {
        setStatus("streaming");
      }

      // There's an active stream - process it
      await processStream(response);
      return true;
    } catch {
      return false;
    }
  }, [interviewId, module, processStream]);

  // Resume on mount if enabled
  useEffect(() => {
    if (resumeOnMount) {
      tryResume();
    }
  }, [resumeOnMount, tryResume]);

  // Start a new generation
  const startGeneration = useCallback(
    async (instructions?: string) => {
      // Abort any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`/api/interview/${interviewId}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            module,
            instructions,
          }),
          signal: abortControllerRef.current.signal,
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start generation");
        }

        await processStream(response);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Aborted intentionally
          setStatus("idle");
        } else {
          setStatus("error");
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }
    },
    [interviewId, module, processStream, onError]
  );

  // Abort the current stream
  const abort = useCallback(() => {
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
    status,
    error,
    startGeneration,
    abort,
  };
}

interface UseAddMoreStreamOptions {
  interviewId: string;
  module: "mcqs" | "rapidFire" | "revisionTopics";
  onContent?: (data: MCQ[] | RevisionTopic[] | RapidFire[]) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface UseAddMoreStreamReturn {
  status: StreamStatus;
  error: string | null;
  addMore: (count?: number, instructions?: string) => Promise<void>;
  abort: () => void;
}

/**
 * Hook for adding more content with streaming
 */
export function useAddMoreStream({
  interviewId,
  module,
  onContent,
  onComplete,
  onError,
}: UseAddMoreStreamOptions): UseAddMoreStreamReturn {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Process SSE stream data (handles UI message stream, data stream protocol, and legacy formats)
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
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Try UI message stream format first (from createUIMessageStream)
            const uiStreamResult = parseUIMessageStreamLine<MCQ[] | RevisionTopic[] | RapidFire[]>(trimmedLine);
            if (uiStreamResult && uiStreamResult.type !== "unknown") {
              if (uiStreamResult.type === "partial" && uiStreamResult.data !== undefined) {
                onContent?.(uiStreamResult.data);
              } else if (uiStreamResult.type === "complete") {
                if (uiStreamResult.data !== undefined) {
                  onContent?.(uiStreamResult.data);
                }
                setStatus("complete");
                onComplete?.();
              } else if (uiStreamResult.type === "error") {
                setStatus("error");
                setError(uiStreamResult.error || "Unknown error");
                onError?.(uiStreamResult.error || "Unknown error");
              }
              continue;
            }

            // Try AI SDK data stream protocol
            const dataStreamResult = parseDataStreamLine<
              MCQ[] | RevisionTopic[] | RapidFire[]
            >(trimmedLine);
            if (dataStreamResult) {
              if (
                dataStreamResult.type === "object-part" &&
                dataStreamResult.data !== undefined
              ) {
                onContent?.(dataStreamResult.data);
              } else if (dataStreamResult.type === "finish") {
                setStatus("complete");
                onComplete?.();
              } else if (dataStreamResult.type === "error") {
                setStatus("error");
                setError(dataStreamResult.error || "Unknown error");
                onError?.(dataStreamResult.error || "Unknown error");
              }
              continue;
            }

            // Fall back to legacy SSE format
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const event: LegacyStreamEventData = JSON.parse(jsonStr);

                if (event.type === "content" && event.data !== undefined) {
                  onContent?.(
                    event.data as MCQ[] | RevisionTopic[] | RapidFire[]
                  );
                } else if (event.type === "done") {
                  setStatus("complete");
                  onComplete?.();
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
    [onContent, onComplete, onError]
  );

  // Add more content
  const addMore = useCallback(
    async (count: number = 5, instructions?: string) => {
      // Abort any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`/api/interview/${interviewId}/add-more`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            module,
            count,
            instructions,
          }),
          signal: abortControllerRef.current.signal,
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add more content");
        }

        await processStream(response);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
        } else {
          setStatus("error");
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }
    },
    [interviewId, module, processStream, onError]
  );

  // Abort the current stream
  const abort = useCallback(() => {
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
    status,
    error,
    addMore,
    abort,
  };
}

interface UseTopicRegenerateOptions {
  interviewId: string;
  topicId: string;
  onContent?: (content: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  resumeOnMount?: boolean;
}

interface UseTopicRegenerateReturn {
  status: StreamStatus;
  error: string | null;
  regenerate: (
    style: "professional" | "construction" | "simple",
    instructions?: string
  ) => Promise<void>;
  abort: () => void;
}

/**
 * Hook for regenerating topic with different analogy style
 */
export function useTopicRegenerate({
  interviewId,
  topicId,
  onContent,
  onComplete,
  onError,
  resumeOnMount = true,
}: UseTopicRegenerateOptions): UseTopicRegenerateReturn {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resumeAttemptedRef = useRef(false);

  // Process SSE stream data (handles UI message stream, data stream protocol, and legacy formats)
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
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Try UI message stream format first (from createUIMessageStream)
            const uiStreamResult = parseUIMessageStreamLine<string>(trimmedLine);
            if (uiStreamResult && uiStreamResult.type !== "unknown") {
              if (uiStreamResult.type === "partial" && uiStreamResult.data !== undefined) {
                onContent?.(uiStreamResult.data);
              } else if (uiStreamResult.type === "complete") {
                if (uiStreamResult.data !== undefined) {
                  onContent?.(uiStreamResult.data);
                }
                setStatus("complete");
                onComplete?.();
              } else if (uiStreamResult.type === "error") {
                setStatus("error");
                setError(uiStreamResult.error || "Unknown error");
                onError?.(uiStreamResult.error || "Unknown error");
              }
              continue;
            }

            // Try AI SDK data stream protocol
            const dataStreamResult = parseDataStreamLine<string>(trimmedLine);
            if (dataStreamResult) {
              if (
                dataStreamResult.type === "object-part" &&
                dataStreamResult.data !== undefined
              ) {
                onContent?.(dataStreamResult.data);
              } else if (dataStreamResult.type === "finish") {
                setStatus("complete");
                onComplete?.();
              } else if (dataStreamResult.type === "error") {
                setStatus("error");
                setError(dataStreamResult.error || "Unknown error");
                onError?.(dataStreamResult.error || "Unknown error");
              }
              continue;
            }

            // Fall back to legacy SSE format
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const event: LegacyStreamEventData<string> =
                  JSON.parse(jsonStr);

                if (event.type === "content" && event.data !== undefined) {
                  onContent?.(event.data);
                } else if (event.type === "done") {
                  setStatus("complete");
                  onComplete?.();
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
    [onContent, onComplete, onError]
  );

  // Try to resume an active stream
  const tryResume = useCallback(async () => {
    if (resumeAttemptedRef.current) return false;
    resumeAttemptedRef.current = true;

    try {
      const moduleKey = `topic_${topicId}`;
      const response = await fetch(
        `/api/interview/${interviewId}/stream/${moduleKey}`,
        {
          credentials: "include",
        }
      );

      if (response.status === 204) {
        return false;
      }

      if (!response.ok) {
        return false;
      }

      // Check if this is a resumed stream
      const isResumed = response.headers.get("X-Stream-Resumed") === "true";
      if (isResumed) {
        setStatus("streaming");
      }

      await processStream(response);
      return true;
    } catch {
      return false;
    }
  }, [interviewId, topicId, processStream]);

  // Resume on mount if enabled
  useEffect(() => {
    if (resumeOnMount) {
      tryResume();
    }
  }, [resumeOnMount, tryResume]);

  // Regenerate topic with new style
  const regenerate = useCallback(
    async (
      style: "professional" | "construction" | "simple",
      instructions?: string
    ) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(
          `/api/interview/${interviewId}/topic/${topicId}/regenerate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              style,
              instructions,
            }),
            signal: abortControllerRef.current.signal,
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to regenerate topic");
        }

        await processStream(response);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
        } else {
          setStatus("error");
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }
    },
    [interviewId, topicId, processStream, onError]
  );

  // Abort the current stream
  const abort = useCallback(() => {
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
    status,
    error,
    regenerate,
    abort,
  };
}
