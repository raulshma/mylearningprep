'use client';

import { useState, useEffect, useCallback, useMemo, useTransition, useRef } from 'react';
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
import { searchRoadmaps, type RoadmapSearchResult, type SearchResultType } from '@/lib/actions/roadmap-search';

interface RoadmapCommandMenuProps {
  currentRoadmapSlug?: string;
  onNodeSelect?: (nodeId: string) => void;
}

const typeIcons: Record<SearchResultType, typeof Map> = {
  roadmap: Map,
  milestone: Milestone,
  topic: BookOpen,
  optional: CircleDashed,
  objective: BookOpen,
};

const typeLabels: Record<SearchResultType, string> = {
  roadmap: 'Roadmap',
  milestone: 'Milestone',
  topic: 'Topic',
  optional: 'Optional',
  objective: 'Lesson',
};

const typeColors: Record<SearchResultType, string> = {
  roadmap: 'bg-primary/10 text-primary border-primary/20',
  milestone: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  topic: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  optional: 'bg-muted text-muted-foreground border-border',
  objective: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function RoadmapCommandMenu({ currentRoadmapSlug, onNodeSelect }: RoadmapCommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RoadmapSearchResult[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle query change with debounce
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear results immediately if query is too short
    if (!value || value.length < 2) {
      setResults([]);
      return;
    }

    // Debounce the search
    debounceTimerRef.current = setTimeout(() => {
      startSearchTransition(async () => {
        const searchResults = await searchRoadmaps({
          query: value,
          currentRoadmapSlug,
          limit: 15,
        });
        setResults(searchResults);
      });
    }, 200);
  }, [currentRoadmapSlug]);

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
      setResults([]);
    }
  }, []);

  // Handle item selection
  const handleSelect = useCallback((result: RoadmapSearchResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);

    if (result.type === 'roadmap') {
      router.push(`/roadmaps/${result.roadmapSlug}`);
    } else if (result.type === 'objective' && result.lessonId && result.nodeId) {
      router.push(`/roadmaps/${result.roadmapSlug}/learn/${result.nodeId}/${result.lessonId}`);
    } else if (result.nodeId) {
      // Navigate to roadmap and select node
      if (currentRoadmapSlug === result.roadmapSlug && onNodeSelect) {
        onNodeSelect(result.nodeId);
      } else {
        router.push(`/roadmaps/${result.roadmapSlug}?node=${result.nodeId}`);
      }
    }
  }, [router, currentRoadmapSlug, onNodeSelect]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, RoadmapSearchResult[]> = {
      currentRoadmap: [],
      otherRoadmaps: [],
    };

    for (const result of results) {
      if (result.roadmapSlug === currentRoadmapSlug) {
        groups.currentRoadmap.push(result);
      } else {
        groups.otherRoadmaps.push(result);
      }
    }

    return groups;
  }, [results, currentRoadmapSlug]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex items-center gap-2 px-4 py-2.5',
          'bg-background/95 backdrop-blur-md',
          'border border-border rounded-full shadow-lg',
          'text-sm text-muted-foreground',
          'hover:bg-secondary hover:text-foreground',
          'transition-all duration-200',
          'group'
        )}
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search roadmaps</span>
        <div className="hidden sm:flex items-center gap-1 ml-2 pl-2 border-l border-border">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
      </button>

      {/* Command dialog */}
      <CommandDialog 
        open={open} 
        onOpenChange={handleOpenChange}
        title="Search Roadmaps"
        description="Search across roadmaps, milestones, topics, and lessons"
      >
        <CommandInput
          placeholder="Search roadmaps, topics, lessons..."
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList className="max-h-[400px]">
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
                <p>No results found for &quot;{query}&quot;</p>
                <p className="text-xs text-muted-foreground">
                  Try searching for roadmap names, topics, or lessons
                </p>
              </div>
            </CommandEmpty>
          )}

          {!isSearching && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <CommandIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Type at least 2 characters to search</p>
              <p className="text-xs mt-1">
                Search across roadmaps, milestones, topics, and lessons
              </p>
            </div>
          )}

          {/* Current roadmap results */}
          {groupedResults.currentRoadmap.length > 0 && (
            <CommandGroup heading="Current Roadmap">
              {groupedResults.currentRoadmap.map((result) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  onSelect={() => handleSelect(result)}
                  showRoadmap={false}
                />
              ))}
            </CommandGroup>
          )}

          {groupedResults.currentRoadmap.length > 0 && groupedResults.otherRoadmaps.length > 0 && (
            <CommandSeparator />
          )}

          {/* Other roadmaps results */}
          {groupedResults.otherRoadmaps.length > 0 && (
            <CommandGroup heading="Other Roadmaps">
              {groupedResults.otherRoadmaps.map((result) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  onSelect={() => handleSelect(result)}
                  showRoadmap={true}
                />
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

interface SearchResultItemProps {
  result: RoadmapSearchResult;
  onSelect: () => void;
  showRoadmap: boolean;
}

function SearchResultItem({ result, onSelect, showRoadmap }: SearchResultItemProps) {
  const Icon = typeIcons[result.type];

  return (
    <CommandItem
      value={result.id}
      onSelect={onSelect}
      className="flex items-center gap-3 py-3"
    >
      <div className={cn(
        'p-1.5 rounded-lg',
        result.type === 'roadmap' ? 'bg-primary/10' :
        result.type === 'milestone' ? 'bg-blue-500/10' :
        result.type === 'topic' ? 'bg-yellow-500/10' :
        result.type === 'optional' ? 'bg-muted' :
        'bg-green-500/10'
      )}>
        <Icon className={cn(
          'w-4 h-4',
          result.type === 'roadmap' ? 'text-primary' :
          result.type === 'milestone' ? 'text-blue-500' :
          result.type === 'topic' ? 'text-yellow-500' :
          result.type === 'optional' ? 'text-muted-foreground' :
          'text-green-500'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          <Badge 
            variant="outline" 
            className={cn('text-[10px] px-1.5 py-0 h-4 shrink-0', typeColors[result.type])}
          >
            {typeLabels[result.type]}
          </Badge>
        </div>
        
        {(showRoadmap || result.nodeTitle) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            {showRoadmap && (
              <>
                <Map className="w-3 h-3" />
                <span className="truncate">{result.roadmapTitle}</span>
              </>
            )}
            {showRoadmap && result.nodeTitle && (
              <ArrowRight className="w-3 h-3 mx-1" />
            )}
            {result.nodeTitle && (
              <span className="truncate">{result.nodeTitle}</span>
            )}
          </div>
        )}
      </div>

      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </CommandItem>
  );
}
