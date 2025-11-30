"use client";

import { useCallback, useRef, useState } from "react";

export type DataStreamStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "complete"
  | "error";

interface DataPart {
  type: string;
  [key: string]: unknown;
}

interface UseDataStreamReaderOptions {
  onData?: (data: DataPart) => void;
  onFinish?: (reason: string) => void;
  onError?: (error: string) => void;
}

interface UseDataStreamReaderReturn {
  status: DataStreamStatus;
  error: string | null;
  read: (response: Response) => Promise<void>;
  abort: () => void;
}

/**
 * Hook for reading AI SDK data stream responses
 * Handles the AI SDK's data stream protocol prefixes:
 * - 0: text delta
 * - 2: data part (custom data)
 * - 3: error
 * - d: finish
 * - e: annotations
 */
export function useDataStreamReader({
  onData,
  onFinish,
  onError,
}: UseDataStreamReaderOptions = {}): UseDataStreamReaderReturn {
  const [status, setStatus] = useState<DataStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const read = useCallback(
    async (response: Response) => {
      if (!response.body) {
        throw new Error("No response body");
      }

      setStatus("streaming");
      setError(null);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            // Parse based on AI SDK data stream protocol prefix
            const prefix = line[0];
            const colonIndex = line.indexOf(":");

            if (colonIndex === -1) continue;

            const content = line.slice(colonIndex + 1);

            switch (prefix) {
              case "0": {
                // Text delta - typically for streamText
                try {
                  const text = JSON.parse(content);
                  onData?.({ type: "text-delta", text });
                } catch {
                  // Raw text without JSON wrapper
                  onData?.({ type: "text-delta", text: content });
                }
                break;
              }
              case "2": {
                // Data part - custom structured data
                try {
                  const data = JSON.parse(content);
                  if (Array.isArray(data)) {
                    for (const part of data) {
                      onData?.(part as DataPart);
                    }
                  } else {
                    onData?.(data as DataPart);
                  }
                } catch {
                  // Ignore parse errors
                }
                break;
              }
              case "3": {
                // Error
                try {
                  const errorData = JSON.parse(content);
                  const errorMessage =
                    errorData.message || errorData.error || "Stream error";
                  setStatus("error");
                  setError(errorMessage);
                  onError?.(errorMessage);
                } catch {
                  setStatus("error");
                  setError("Stream error");
                  onError?.("Stream error");
                }
                break;
              }
              case "d": {
                // Finish event
                try {
                  const finishData = JSON.parse(content);
                  setStatus("complete");
                  onFinish?.(finishData.finishReason || "stop");
                } catch {
                  setStatus("complete");
                  onFinish?.("stop");
                }
                break;
              }
              case "e": {
                // Annotations - can be used for metadata
                try {
                  const annotations = JSON.parse(content);
                  onData?.({ type: "annotations", annotations });
                } catch {
                  // Ignore parse errors
                }
                break;
              }
            }
          }
        }

        // If we get here without a finish event, mark as complete
        if (status === "streaming") {
          setStatus("complete");
          onFinish?.("stop");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Stream read error";
        setStatus("error");
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        reader.releaseLock();
      }
    },
    [onData, onFinish, onError, status]
  );

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus("idle");
  }, []);

  return {
    status,
    error,
    read,
    abort,
  };
}
