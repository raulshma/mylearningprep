import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 md:py-24 px-6 bg-background border-t border-border/50">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-12 mb-16">
          <div className="col-span-2 md:col-span-4">
            <Logo className="mb-6 scale-90 origin-left" />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
              Master technical interviews with AI-driven insights and
              personalized learning paths.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/raulshma/mylearningprep"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 md:col-start-7">
            <h4 className="font-medium text-sm text-foreground mb-6">
              Product
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="#features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h4 className="font-medium text-sm text-foreground mb-6">
              Resources
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/community"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Community
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h4 className="font-medium text-sm text-foreground mb-6">Legal</h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 MyLearningPrep. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted-foreground">
              Designed with precision.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
