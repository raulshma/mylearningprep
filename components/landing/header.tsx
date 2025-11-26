'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ViewTransitionLink } from '@/components/transitions';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useTransition, useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';

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
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    startTransition(() => {
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          router.push('/');
        });
      } else {
        router.push('/');
      }
    });
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    if (pathname !== '/') {
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
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
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return (firstName[0] || user.emailAddresses[0]?.emailAddress[0] || 'U').toUpperCase();
  };

  const navLinks = [
    { href: '#how-it-works', label: 'How it Works' },
    { href: '#features', label: 'Features' },
    { href: '#community', label: 'Community' },
  ];

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <ViewTransitionLink href="/" viewTransitionName="logo">
          <Logo />
        </ViewTransitionLink>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          <ViewTransitionLink
            href="/pricing"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Pricing
          </ViewTransitionLink>
        </nav>

        <div className="flex items-center gap-3">
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
                <div className="hidden sm:block w-16 h-8 bg-muted animate-pulse" />
                <div className="w-24 h-8 bg-muted animate-pulse" />
              </motion.div>
            ) : isSignedIn ? (
              <motion.div
                key="signed-in"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'User'} />
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.fullName || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
                          (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
                            startTransition(() => {
                              router.push('/dashboard');
                            });
                          });
                        } else {
                          router.push('/dashboard');
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
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
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-3"
              >
                <ViewTransitionLink href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </ViewTransitionLink>
                <ViewTransitionLink href="/onboarding">
                  <Button size="sm">Get Started</Button>
                </ViewTransitionLink>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <ViewTransitionLink
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2"
            >
              Pricing
            </ViewTransitionLink>
            {!isSignedIn && (
              <ViewTransitionLink
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2"
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
