"use client";

import { useRouter, usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewTransitionLink } from "@/components/transitions";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useTransition, useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    startTransition(() => {
      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document
      ) {
        (
          document as Document & {
            startViewTransition: (cb: () => void) => void;
          }
        ).startViewTransition(() => {
          router.push("/");
        });
      } else {
        router.push("/");
      }
    });
  };

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    hash: string
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (pathname !== "/") {
      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document
      ) {
        (
          document as Document & {
            startViewTransition: (cb: () => void) => void;
          }
        ).startViewTransition(() => {
          startTransition(() => {
            router.push(`/${hash}`);
          });
        });
      } else {
        startTransition(() => {
          router.push(`/${hash}`);
        });
      }
    } else {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return (
      firstName[0] ||
      user.emailAddresses[0]?.emailAddress[0] ||
      "U"
    ).toUpperCase();
  };

  const navLinks = [
    { href: "#how-it-works", label: "How it Works" },
    { href: "#features", label: "Features" },
    { href: "#community", label: "Community" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
        <ViewTransitionLink href="/" viewTransitionName="logo">
          <Logo />
        </ViewTransitionLink>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          <ViewTransitionLink
            href="/pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </ViewTransitionLink>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AnimatePresence mode="wait">
            {!isLoaded ? (
              // Skeleton placeholder while loading
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <div className="hidden sm:block w-16 h-8 bg-muted animate-pulse rounded-full" />
                <div className="w-24 h-8 bg-muted animate-pulse rounded-full" />
              </motion.div>
            ) : isSignedIn ? (
              <motion.div
                key="signed-in"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-10 w-10 border border-border/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user?.imageUrl}
                          alt={user?.fullName || "User"}
                        />
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 p-2 rounded-2xl bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-2xl"
                    sideOffset={8}
                  >
                    <div className="px-3 py-3 mb-1">
                      <p className="text-sm font-semibold text-foreground">
                        {user?.fullName || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium opacity-80">
                        {user?.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-1" />

                    <DropdownMenuItem
                      onClick={() => {
                        if (
                          typeof document !== "undefined" &&
                          "startViewTransition" in document
                        ) {
                          (
                            document as Document & {
                              startViewTransition: (cb: () => void) => void;
                            }
                          ).startViewTransition(() => {
                            startTransition(() => {
                              router.push("/dashboard");
                            });
                          });
                        } else {
                          router.push("/dashboard");
                        }
                      }}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <LayoutDashboard className="h-4 w-4" />
                        </div>
                        Dashboard
                      </div>
                    </DropdownMenuItem>

                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-1" />

                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-red-500/10">
                          <LogOut className="h-4 w-4" />
                        </div>
                        Sign Out
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ) : (
              <motion.div
                key="signed-out"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                <ViewTransitionLink href="/login" className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-4"
                  >
                    Sign In
                  </Button>
                </ViewTransitionLink>
                <ViewTransitionLink href="/onboarding">
                  <Button
                    size="sm"
                    className="rounded-full px-5 bg-foreground text-background hover:bg-foreground/90"
                  >
                    Get Started
                  </Button>
                </ViewTransitionLink>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col p-6 gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <ViewTransitionLink
              href="/pricing"
              className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Pricing
            </ViewTransitionLink>
            {!isSignedIn && (
              <ViewTransitionLink
                href="/login"
                className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Sign In
              </ViewTransitionLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
