"use client";

import dynamic from "next/dynamic";

const MarkdownRenderer = dynamic(
  () => import("@/components/streaming/markdown-renderer"),
  { ssr: false }
);

interface PlanMarkdownProps {
  content: string;
}

export function PlanMarkdown({ content }: PlanMarkdownProps) {
  return <MarkdownRenderer content={content} isStreaming={false} />;
}
