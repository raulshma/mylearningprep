import { Suspense } from "react";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getAuthUserId } from "@/lib/auth/get-user";
import { preloadAIChatData, getAIChatPageData } from "@/lib/data/ai-chat";
import { AIChatPageSkeleton } from "@/components/ai-chat/chat-skeleton";

export const metadata = {
  title: "AI Chat | MyLearningPrep",
  description: "Chat with your AI interview assistant",
};

// Dynamic import with loading state for the heavy client component
// This reduces initial JS bundle and enables code splitting
const AIChatPageContent = dynamic(
  () =>
    import("@/components/ai-chat/ai-chat-page-content").then(
      (mod) => mod.AIChatPageContent
    ),
  {
    loading: () => <AIChatPageSkeleton />,
    ssr: true, // Keep SSR for initial HTML
  }
);

/**
 * Server Component that fetches data and streams to client
 * Uses React cache for request deduplication
 */
async function AIChatLoader() {
  // Parallel data fetch - all queries run concurrently
  const data = await getAIChatPageData();

  if (!data) {
    // User not found - redirect to onboarding
    redirect("/onboarding");
  }

  return (
    <AIChatPageContent
      initialConversations={data.conversations}
      userPlan={data.userPlan}
    />
  );
}

/**
 * AI Chat Page - Optimized with Next.js best practices
 *
 * Performance optimizations:
 * 1. Preloading: Eagerly starts auth check before component renders
 * 2. Parallel fetching: User and conversations fetched concurrently
 * 3. React cache: Deduplicates requests across components
 * 4. Dynamic import: Code-splits heavy client component
 * 5. Suspense streaming: Shows skeleton while data loads
 * 6. Server Components: Data fetching on server, minimal client JS
 */
export default async function AIChatPage() {
  // Eagerly start data fetching (preload pattern)
  preloadAIChatData();

  // Quick auth check - redirect early if not authenticated
  const clerkId = await getAuthUserId().catch(() => null);
  if (!clerkId) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<AIChatPageSkeleton />}>
      <AIChatLoader />
    </Suspense>
  );
}
