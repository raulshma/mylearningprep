import { AIToolsPageContent } from "@/components/ai-tools/ai-tools-page-content";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAuthUserId, hasByokApiKey } from "@/lib/auth/get-user";
import { userRepository } from "@/lib/db/repositories/user-repository";
import { redirect } from "next/navigation";

export const metadata = {
  title: "AI Tools | Interview Prep",
  description: "Advanced AI-powered tools for interview preparation",
};

async function AIToolsLoader() {
  const clerkId = await getAuthUserId();
  const [user, isByok] = await Promise.all([
    userRepository.findByClerkId(clerkId),
    hasByokApiKey(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const userPlan =
    (user.plan?.toLowerCase() as "free" | "pro" | "max") || "free";

  const usageData = {
    iterations: user.iterations,
    isByok,
  };

  return <AIToolsPageContent userPlan={userPlan} usageData={usageData} />;
}

export default function AIToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AIToolsLoader />
    </Suspense>
  );
}
