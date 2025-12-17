'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Map,
  Milestone,
  BookOpen,
  CircleDashed,
  Search,
  ArrowRight,
  Loader2,
  Command as CommandIcon,
  Sparkles,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getJourneySearchIndex,
  type JourneySearchResult,
  type SearchResultType,
} from '@/lib/actions/journey-search';

// Fuse.js types for dynamic import
import type Fuse from 'fuse.js';
type FuseInstance = Fuse<JourneySearchResult>;

interface JourneyCommandMenuProps {
  currentJourneySlug?: string;
  onNodeSelect?: (nodeId: string) => void;
}

const typeIcons: Record<SearchResultType, typeof Map> = {
  journey: Map,
  milestone: Milestone,
  topic: BookOpen,
  optional: CircleDashed,
  objective: BookOpen,
};

const typeLabels: Record<SearchResultType, string> = {
  journey: 'Journey',
  milestone: 'Milestone',
  topic: 'Topic',
  optional: 'Optional',
  objective: 'Lesson',
};

const typeColors: Record<SearchResultType, string> = {
  journey: 'bg-primary/15 text-primary border-primary/30',
  milestone: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  topic: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  optional: 'bg-muted/80 text-muted-foreground border-border',
  objective: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
};

const typeIconColors: Record<SearchResultType, string> = {
  journey: 'text-primary',
  milestone: 'text-blue-500',
  topic: 'text-yellow-600 dark:text-yellow-400',
  optional: 'text-muted-foreground',
  objective: 'text-green-600 dark:text-green-400',
};

const typeIconBg: Record<SearchResultType, string> = {
  journey: 'bg-primary/10',
  milestone: 'bg-blue-500/10',
  topic: 'bg-yellow-500/10',
  optional: 'bg-muted/50',
  objective: 'bg-green-500/10',
};

// Fuse.js configuration for optimal fuzzy search
const FUSE_OPTIONS = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'description', weight: 0.2 },
    { name: 'keywords', weight: 0.2 },
    { name: 'nodeTitle', weight: 0.1 },
  ],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  findAllMatches: true,
};

export function JourneyCommandMenu({ currentJourneySlug, onNodeSelect }: JourneyCommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState<JourneySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fuseInstance, setFuseInstance] = useState<FuseInstance | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const indexLoadedRef = useRef(false);

  // Toggle menu with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Load search index and initialize Fuse.js when dialog opens
  useEffect(() => {
    if (!open || indexLoadedRef.current) return;

    const loadSearchIndex = async () => {
      setIsLoading(true);
      try {
        // Fetch all searchable items
        const index = await getJourneySearchIndex(currentJourneySlug || '');
        setSearchIndex(index);

        // Dynamically import Fuse.js for code splitting
        const FuseModule = await import('fuse.js');
        const Fuse = FuseModule.default;

        // Initialize Fuse instance
        const fuse = new Fuse(index, FUSE_OPTIONS);
        setFuseInstance(fuse);
        indexLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load search index:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSearchIndex();
  }, [open, currentJourneySlug]);

  // Perform fuzzy search
  const searchResults = useMemo((): JourneySearchResult[] => {
    if (!query || query.length < 2 || !fuseInstance) {
      return [];
    }

    const results = fuseInstance.search(query, { limit: 20 });
    return results.map((result) => result.item);
  }, [query, fuseInstance]);

  // Handle query change with debounce for smooth typing
  const handleQueryChange = useCallback((value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setQuery(value);
    }, 100);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Clear state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setQuery('');
    }
  }, []);

  // Handle item selection
  const handleSelect = useCallback(
    (result: JourneySearchResult) => {
      setOpen(false);
      setQuery('');

      if (result.type === 'journey') {
        router.push(`/journeys/${result.journeySlug}`);
      } else if (result.type === 'objective' && result.lessonId && result.nodeId) {
        router.push(`/journeys/${result.journeySlug}/learn/${result.nodeId}/${result.lessonId}`);
      } else if (result.nodeId) {
        // Navigate to Journey and select node
        if (currentJourneySlug === result.journeySlug && onNodeSelect) {
          onNodeSelect(result.nodeId);
        } else {
          router.push(`/journeys/${result.journeySlug}?node=${result.nodeId}`);
        }
      }
    },
    [router, currentJourneySlug, onNodeSelect]
  );

  // Group results by Journey
  const groupedResults = useMemo(() => {
    const groups: Record<string, JourneySearchResult[]> = {
      currentJourney: [],
      otherJourneys: [],
    };

    for (const result of searchResults) {
      if (result.journeySlug === currentJourneySlug) {
        groups.currentJourney.push(result);
      } else {
        groups.otherJourneys.push(result);
      }
    }

    return groups;
  }, [searchResults, currentJourneySlug]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex items-center gap-2.5 px-4 py-2.5',
          'bg-background/90 backdrop-blur-xl',
          'border border-border/80 rounded-full',
          'shadow-lg shadow-black/5 dark:shadow-black/20',
          'text-sm text-muted-foreground',
          'hover:bg-accent hover:text-accent-foreground hover:border-border',
          'hover:shadow-xl hover:scale-[1.02]',
          'active:scale-[0.98]',
          'transition-all duration-200 ease-out',
          'group'
        )}
      >
        <Search className="w-4 h-4 transition-transform group-hover:scale-110" />
        <span className="hidden sm:inline font-medium">Search</span>
        <div className="hidden sm:flex items-center gap-0.5 ml-1 pl-2 border-l border-border/60">
          <Kbd className="text-[10px] px-1.5 py-0.5">⌘</Kbd>
          <Kbd className="text-[10px] px-1.5 py-0.5">K</Kbd>
        </div>
      </button>

      {/* Command dialog */}
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search Journeys"
        description="Search across Journeys, milestones, topics, and lessons"
      >
        <CommandInput
          placeholder="Search Journeys, topics, lessons..."
          onValueChange={handleQueryChange}
        />

        {/* Results container with inset styling */}
        <div className="relative">
          {/* Inset shadow overlay */}
          <div className="absolute inset-x-0 top-0 h-3 bg-linear-to-b from-black/3 dark:from-black/10 to-transparent pointer-events-none z-10" />

          <CommandList
            className={cn(
              'max-h-[400px] overflow-y-auto',
              'bg-muted/30 dark:bg-black/20',
              'border-t border-border/50',
              'shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
            )}
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="relative">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <Sparkles className="w-3 h-3 text-primary/60 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">Loading search index...</p>
              </div>
            )}

            {!isLoading && query.length >= 2 && searchResults.length === 0 && (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="p-3 rounded-full bg-muted/50">
                    <Search className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">No results found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try different keywords or check spelling
                    </p>
                  </div>
                </div>
              </CommandEmpty>
            )}

            {!isLoading && query.length < 2 && (
              <div className="py-10 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/5 mb-3">
                  <CommandIcon className="w-6 h-6 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-foreground">Quick Search</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto">
                  Type to search across all Journeys, milestones, topics, and lessons
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                  <span>Press</span>
                  <Kbd className="text-[10px]">↑</Kbd>
                  <Kbd className="text-[10px]">↓</Kbd>
                  <span>to navigate</span>
                  <Kbd className="text-[10px]">↵</Kbd>
                  <span>to select</span>
                </div>
              </div>
            )}

            {/* Current Journey results */}
            {groupedResults.currentJourney.length > 0 && (
              <CommandGroup
                heading={
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Current Journey
                  </span>
                }
                className="px-2 py-2"
              >
                {groupedResults.currentJourney.map((result) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    onSelect={() => handleSelect(result)}
                    showJourney={false}
                  />
                ))}
              </CommandGroup>
            )}

            {groupedResults.currentJourney.length > 0 &&
              groupedResults.otherJourneys.length > 0 && (
                <CommandSeparator className="my-2 bg-border/50" />
              )}

            {/* Other Journeys results */}
            {groupedResults.otherJourneys.length > 0 && (
              <CommandGroup
                heading={
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                    Other Journeys
                  </span>
                }
                className="px-2 py-2"
              >
                {groupedResults.otherJourneys.map((result) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    onSelect={() => handleSelect(result)}
                    showJourney={true}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Bottom inset shadow */}
          <div className="absolute inset-x-0 bottom-0 h-3 bg-linear-to-t from-black/2 dark:from-black/5 to-transparent pointer-events-none" />
        </div>
      </CommandDialog>
    </>
  );
}

interface SearchResultItemProps {
  result: JourneySearchResult;
  onSelect: () => void;
  showJourney: boolean;
}

function SearchResultItem({ result, onSelect, showJourney }: SearchResultItemProps) {
  const Icon = typeIcons[result.type];

  return (
    <CommandItem
      value={result.id}
      onSelect={onSelect}
      className={cn(
        'flex items-center gap-3 py-3 px-3 mx-1 my-0.5',
        'rounded-lg cursor-pointer',
        'transition-all duration-150',
        'data-[selected=true]:bg-accent/80 data-[selected=true]:shadow-sm',
        'hover:bg-accent/50'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'p-2 rounded-lg shrink-0',
          'transition-transform duration-150',
          'group-data-[selected=true]:scale-105',
          typeIconBg[result.type]
        )}
      >
        <Icon className={cn('w-4 h-4', typeIconColors[result.type])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate text-foreground">{result.title}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-[18px] shrink-0 font-medium',
              'border',
              typeColors[result.type]
            )}
          >
            {typeLabels[result.type]}
          </Badge>
        </div>

        {(showJourney || result.nodeTitle) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            {showJourney && (
              <>
                <Map className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[120px]">{result.journeyTitle}</span>
              </>
            )}
            {showJourney && result.nodeTitle && (
              <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
            )}
            {result.nodeTitle && (
              <span className="truncate max-w-[150px]">{result.nodeTitle}</span>
            )}
          </div>
        )}
      </div>

      {/* Arrow indicator */}
      <ArrowRight
        className={cn(
          'w-4 h-4 shrink-0',
          'text-muted-foreground/40',
          'transition-all duration-150',
          'group-data-[selected=true]:text-foreground group-data-[selected=true]:translate-x-0.5'
        )}
      />
    </CommandItem>
  );
}

