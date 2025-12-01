import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAuthUserId } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";
import { AIChatPageContent } from "@/components/ai-chat";
import { aiConversationRepository } from "@/lib/db/repositories/ai-conversation-repository";
import { userRepository } from "@/lib/db/repositories/user-repository";

export const metadata = {
  title: "AI Chat | SyntaxState",
  description: "Chat with your AI interview assistant",
};

async function AIChatLoader() {
  const clerkId = await getAuthUserId();

  if (!clerkId) {
    redirect("/login");
  }

  const [user, conversations] = await Promise.all([
    userRepository.findByClerkId(clerkId),
    aiConversationRepository.findByUser(clerkId, {
      limit: 50,
      includeArchived: false,
    }),
  ]);

  if (!user) {
    redirect("/onboarding");
  }

  return (
    <AIChatPageContent
      initialConversations={conversations}
      userPlan={user.plan}
    />
  );
}

export default function AIChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AIChatLoader />
    </Suspense>
  );
}
