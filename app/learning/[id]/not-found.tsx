import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LearningPathNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-secondary flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-mono text-foreground mb-2">
          Learning Path Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          The learning path you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access to it.
        </p>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
