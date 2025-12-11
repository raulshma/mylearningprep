/**
 * Responsive Layout Hook
 *
 * Provides viewport detection and layout state management for responsive design.
 * Detects mobile/tablet/desktop breakpoints and provides layout state to components.
 *
 * Requirements: 12.1 - Collapse sidebars into overlay panels on mobile
 * Requirements: 12.2 - Adapt layout to available screen width on tablet
 *
 * @module hooks/use-responsive-layout
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BREAKPOINTS } from '@/lib/test-utils/responsive';

// =============================================================================
// Types
// =============================================================================

/**
 * Viewport type based on screen width
 */
export type ViewportType = 'mobile' | 'tablet' | 'desktop';

/**
 * Sidebar mode based on viewport
 */
export type SidebarMode = 'inline' | 'overlay';

/**
 * Layout state returned by the hook
 */
export interface ResponsiveLayoutState {
  /** Current viewport type */
  viewportType: ViewportType;
  /** Whether the viewport is mobile (< 768px) */
  isMobile: boolean;
  /** Whether the viewport is tablet (768px - 1023px) */
  isTablet: boolean;
  /** Whether the viewport is desktop (>= 1024px) */
  isDesktop: boolean;
  /** Current viewport width in pixels */
  viewportWidth: number;
  /** Current viewport height in pixels */
  viewportHeight: number;
  /** Sidebar display mode based on viewport */
  sidebarMode: SidebarMode;
  /** Whether sidebars should show as overlays with backdrop */
  shouldShowBackdrop: boolean;
}

/**
 * Layout actions returned by the hook
 */
export interface ResponsiveLayoutActions {
  /** Force a layout recalculation */
  recalculate: () => void;
}

/**
 * Combined return type for the hook
 */
export interface UseResponsiveLayoutReturn extends ResponsiveLayoutState {
  actions: ResponsiveLayoutActions;
}

/**
 * Options for the hook
 */
export interface UseResponsiveLayoutOptions {
  /** Custom mobile breakpoint (default: 768) */
  mobileBreakpoint?: number;
  /** Custom tablet breakpoint (default: 1024) */
  tabletBreakpoint?: number;
  /** Debounce delay for resize events in ms (default: 100) */
  debounceDelay?: number;
  /** Initial viewport width for SSR (default: 1024) */
  ssrWidth?: number;
  /** Initial viewport height for SSR (default: 768) */
  ssrHeight?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MOBILE_BREAKPOINT = BREAKPOINTS.md; // 768
const DEFAULT_TABLET_BREAKPOINT = BREAKPOINTS.lg; // 1024
const DEFAULT_DEBOUNCE_DELAY = 100;
const DEFAULT_SSR_WIDTH = 1024;
const DEFAULT_SSR_HEIGHT = 768;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine viewport type from width
 */
export function getViewportType(
  width: number,
  mobileBreakpoint: number,
  tabletBreakpoint: number
): ViewportType {
  if (width < mobileBreakpoint) return 'mobile';
  if (width < tabletBreakpoint) return 'tablet';
  return 'desktop';
}

/**
 * Determine sidebar mode from viewport type
 */
export function getSidebarMode(viewportType: ViewportType): SidebarMode {
  return viewportType === 'mobile' ? 'overlay' : 'inline';
}

/**
 * Check if backdrop should be shown (mobile only)
 */
export function shouldShowBackdrop(viewportType: ViewportType): boolean {
  return viewportType === 'mobile';
}

/**
 * Get current viewport dimensions
 */
function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: DEFAULT_SSR_WIDTH, height: DEFAULT_SSR_HEIGHT };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for responsive layout detection and state management
 *
 * @param options - Configuration options
 * @returns Layout state and actions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isTablet, sidebarMode, shouldShowBackdrop } = useResponsiveLayout();
 *
 *   return (
 *     <div>
 *       {shouldShowBackdrop && sidebarOpen && <Backdrop />}
 *       <Sidebar mode={sidebarMode} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useResponsiveLayout(
  options: UseResponsiveLayoutOptions = {}
): UseResponsiveLayoutReturn {
  const {
    mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
    tabletBreakpoint = DEFAULT_TABLET_BREAKPOINT,
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    ssrWidth = DEFAULT_SSR_WIDTH,
    ssrHeight = DEFAULT_SSR_HEIGHT,
  } = options;

  // Track if we're on the client - use ref to avoid re-render
  const isClientRef = useRef(typeof window !== 'undefined');

  // Viewport dimensions state - initialize with actual values if on client
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: ssrWidth, height: ssrHeight };
    }
    return getViewportDimensions();
  });

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update dimensions on mount (only runs once, no setState in effect body)
  useEffect(() => {
    isClientRef.current = true;
    // Use requestAnimationFrame to batch with browser paint
    const rafId = requestAnimationFrame(() => {
      const newDimensions = getViewportDimensions();
      setDimensions((prev) => {
        // Only update if dimensions actually changed
        if (prev.width !== newDimensions.width || prev.height !== newDimensions.height) {
          return newDimensions;
        }
        return prev;
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Calculate layout state from dimensions
  const layoutState = useMemo((): ResponsiveLayoutState => {
    const viewportType = getViewportType(dimensions.width, mobileBreakpoint, tabletBreakpoint);
    const sidebarMode = getSidebarMode(viewportType);
    const showBackdrop = shouldShowBackdrop(viewportType);

    return {
      viewportType,
      isMobile: viewportType === 'mobile',
      isTablet: viewportType === 'tablet',
      isDesktop: viewportType === 'desktop',
      viewportWidth: dimensions.width,
      viewportHeight: dimensions.height,
      sidebarMode,
      shouldShowBackdrop: showBackdrop,
    };
  }, [dimensions, mobileBreakpoint, tabletBreakpoint]);

  // Recalculate handler
  const recalculate = useCallback(() => {
    setDimensions(getViewportDimensions());
  }, []);

  // Handle resize events with debouncing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced update
      debounceTimerRef.current = setTimeout(() => {
        const newDimensions = getViewportDimensions();
        setDimensions((prev) => {
          // Only update if dimensions actually changed
          if (prev.width !== newDimensions.width || prev.height !== newDimensions.height) {
            return newDimensions;
          }
          return prev;
        });
      }, debounceDelay);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debounceDelay]);

  // Memoize actions
  const actions = useMemo((): ResponsiveLayoutActions => ({
    recalculate,
  }), [recalculate]);

  return {
    ...layoutState,
    actions,
  };
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Simple hook to check if viewport is mobile
 */
export function useIsMobileLayout(): boolean {
  const { isMobile } = useResponsiveLayout();
  return isMobile;
}

/**
 * Simple hook to check if viewport is tablet
 */
export function useIsTabletLayout(): boolean {
  const { isTablet } = useResponsiveLayout();
  return isTablet;
}

/**
 * Simple hook to check if viewport is desktop
 */
export function useIsDesktopLayout(): boolean {
  const { isDesktop } = useResponsiveLayout();
  return isDesktop;
}

/**
 * Hook to get sidebar mode based on viewport
 */
export function useSidebarMode(): SidebarMode {
  const { sidebarMode } = useResponsiveLayout();
  return sidebarMode;
}

// =============================================================================
// Store Integration Hook
// =============================================================================

/**
 * Hook that syncs responsive layout state with the chat store
 * Use this in the root chat component to keep store in sync with viewport
 */
export function useResponsiveLayoutSync(): ResponsiveLayoutState {
  const layout = useResponsiveLayout();

  // Import store actions dynamically to avoid circular dependencies
  useEffect(() => {
    const syncToStore = async () => {
      try {
        const { useChatStore } = await import('@/lib/store/chat/store');
        const store = useChatStore.getState();
        store.setViewport({
          isMobile: layout.isMobile,
          isTablet: layout.isTablet,
        });
      } catch {
        // Store may not be available in all contexts
      }
    };

    syncToStore();
  }, [layout.isMobile, layout.isTablet]);

  return layout;
}

export default useResponsiveLayout;
