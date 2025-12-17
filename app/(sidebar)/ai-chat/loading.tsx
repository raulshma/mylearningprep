import { AIChatPageSkeleton } from "@/components/ai-chat/chat-skeleton";

/**
 * AI Chat page loading skeleton
 * Next.js automatically wraps the page in Suspense with this as fallback
 * This enables instant navigation feedback and streaming
 */
export default function AIChatLoading() {
  return <AIChatPageSkeleton />;
}
