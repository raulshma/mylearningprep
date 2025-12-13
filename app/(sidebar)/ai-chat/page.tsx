import { Suspense } from "react";
import { getAuthUserId } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";
import { AIChatPageContent } from "@/components/ai-chat";
import { AIChatPageSkeleton } from "@/components/ai-chat/chat-skeleton";
import { aiConversationRepository } from "@/lib/db/repositories/ai-conversation-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";

export const metadata = {
  title: "AI Chat | MyLearningPrep",
  description: "Chat with your AI interview assistant",
};

async function AIChatLoader() {
  const clerkId = await getAuthUserId();

  if (!clerkId) {
    redirect("/login");
  }

  const user = await userRepository.findByClerkId(clerkId);

  if (!user) {
    redirect("/onboarding");
  }

  // Use user._id (MongoDB ObjectId) to query conversations, not clerkId
  const conversations = await aiConversationRepository.findByUser(user._id, {
    limit: 50,
    includeArchived: false,
  });

  return (
    <AIChatPageContent
      initialConversations={conversations}
      userPlan={user.plan}
    />
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<AIChatPageSkeleton />}>
      <AIChatLoader />
    </Suspense>
  );
}
