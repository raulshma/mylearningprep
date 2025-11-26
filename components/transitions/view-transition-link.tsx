'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, type ComponentProps, type ReactNode } from 'react';
import { Briefcase, Sparkles, Settings, CreditCard, Shield } from 'lucide-react';

interface ViewTransitionLinkProps extends Omit<ComponentProps<typeof Link>, 'onClick'> {
  children: ReactNode;
  viewTransitionName?: string;
  onBeforeTransition?: () => void;
}

// Route-based header configs for instant updates during transition
const ROUTE_HEADERS: Record<string, { badge: string; badgeIcon: typeof Briefcase; title: string; description: string }> = {
  '/dashboard': {
    badge: 'Dashboard',
    badgeIcon: Briefcase,
    title: 'Your Interview Preps',
    description: 'Manage your interview preparations',
  },
  '/dashboard/new': {
    badge: 'New Interview',
    badgeIcon: Sparkles,
    title: 'Create Interview Prep',
    description: 'Create your personalized preparation plan',
  },
  '/settings': {
    badge: 'Settings',
    badgeIcon: Settings,
    title: 'Account Settings',
    description: 'Manage your account',
  },
  '/settings/upgrade': {
    badge: 'Upgrade',
    badgeIcon: CreditCard,
    title: 'Upgrade Your Plan',
    description: 'Get more interviews, iterations, and features',
  },
  '/admin': {
    badge: 'Admin',
    badgeIcon: Shield,
    title: 'System Dashboard',
    description: 'Monitor platform health and manage users',
  },
};

export function ViewTransitionLink({
  href,
  children,
  viewTransitionName,
  style,
  onBeforeTransition,
  ...props
}: ViewTransitionLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = typeof href === 'string' ? href : href.pathname || '/';

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // Get the target header config
      const targetHeader = ROUTE_HEADERS[url];
      
      (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        // Update header content immediately during transition
        if (targetHeader) {
          // Dispatch custom event to update header synchronously
          window.dispatchEvent(new CustomEvent('header-update', { detail: targetHeader }));
        }
        
        startTransition(() => {
          router.push(url);
        });
      });
    } else {
      startTransition(() => {
        router.push(url);
      });
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      style={{
        ...style,
        viewTransitionName,
      } as React.CSSProperties}
      data-pending={isPending ? '' : undefined}
      {...props}
    >
      {children}
    </Link>
  );
}
