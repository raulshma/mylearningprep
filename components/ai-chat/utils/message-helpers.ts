"use client";

import type { UIMessage } from "ai";

/**
 * Type for tool parts extracted from UIMessage
 */
export type ToolPart = {
  type: `tool-${string}`;
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

/**
 * Type for file parts (images) from UIMessage
 */
export type FilePart = {
  type: "file";
  mediaType: string;
  url: string;
  filename?: string;
};

/**
 * Extract text content from UIMessage parts
 */
export function getMessageTextContent(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Extract reasoning content from UIMessage parts
 */
export function getMessageReasoning(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => {
      const reasoningPart = part as { type: "reasoning"; text: string };
      return reasoningPart.text || "";
    })
    .join("");
}

/**
 * Get tool parts from a message
 */
export function getToolParts(message: UIMessage): ToolPart[] {
  return message.parts
    .filter((part) => part.type.startsWith("tool-"))
    .map((part) => part as unknown as ToolPart);
}

/**
 * Get file parts (images) from a message
 */
export function getFileParts(message: UIMessage): FilePart[] {
  return message.parts
    .filter((part) => part.type === "file")
    .map((part) => part as unknown as FilePart);
}

/**
 * Check if a message is a persisted error message
 */
export function isErrorMessage(message: UIMessage): boolean {
  return message.parts.some((part) => part.type === "data-error");
}

/**
 * QoL: Format all messages as plain text for copying
 */
export function formatMessagesForCopy(messages: UIMessage[]): string {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const role = m.role === "user" ? "You" : "Assistant";
      const content = getMessageTextContent(m);
      return `${role}:\n${content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Get error content from a persisted error message
 */
export function getErrorContent(
  message: UIMessage
): { error: string; errorDetails?: { code?: string; isRetryable?: boolean } } | null {
  for (const part of message.parts) {
    if (part.type === "data-error") {
      const data = part.data as {
        error?: string;
        errorDetails?: { code?: string; isRetryable?: boolean };
      };
      return {
        error: data.error || "An error occurred",
        errorDetails: data.errorDetails,
      };
    }
  }
  return null;
}
