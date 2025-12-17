"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Loader2,
  Map as MapIcon,
  Target,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  toggleVisibility,
  toggleVisibilityBatch,
  getJourneyVisibilityDetails,
  toggleObjectiveContentVisibility,
} from "@/lib/actions/visibility-admin";
import type {
  VisibilityOverview,
  JourneyVisibilityInfo,
  JourneyVisibilityDetails,
  MilestoneVisibilityInfo,
  ObjectiveVisibilityInfo,
} from "@/lib/db/schemas/visibility";

interface VisibilityManagementProps {
  initialData: VisibilityOverview;
}

/**
 * Renders the Visibility Management UI for journeys, milestones, and objectives.
 *
 * Provides controls for selecting items, performing individual and bulk visibility changes, and viewing nested journey details. The component applies optimistic UI updates for visibility changes and reverts them on server failure, and it lazily loads journey details when a journey is expanded.
 *
 * @param initialData - Initial visibility overview including journeys, milestones, objectives, and stats used to populate the UI.
 * @returns The Visibility Management user interface as a JSX element.
 */
export function VisibilityManagement({ initialData }: VisibilityManagementProps) {
  const [data, setData] = useState(initialData);
  const [expandedjourneys, setExpandedjourneys] = useState<Set<string>>(() => new Set<string>());
  const [journeyDetails, setjourneyDetails] = useState<Map<string, JourneyVisibilityDetails>>(() => new Map<string, JourneyVisibilityDetails>());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(() => new Set<string>());
  const [selectedJourneys, setSelectedJourneys] = useState<Set<string>>(() => new Set<string>());

  const allJourneySlugs = data.journeys.map(j => j.slug);
  const allJourneysSelected = allJourneySlugs.length > 0 && selectedJourneys.size === allJourneySlugs.length;
  const someJourneysSelected = selectedJourneys.size > 0 && !allJourneysSelected;

  const toggleJourneySelected = (slug: string, selected: boolean) => {
    setSelectedJourneys(prev => {
      const next = new Set(prev);
      if (selected) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const setAllJourneysSelected = (selected: boolean) => {
    setSelectedJourneys(selected ? new Set(allJourneySlugs) : new Set());
  };

  const applyJourneyBulkVisibility = async (isPublic: boolean) => {
    const slugs = Array.from(selectedJourneys);
    if (slugs.length === 0) return;

    // Optimistic update
    setData(prev => {
      const journeys = prev.journeys.map(j => (selectedJourneys.has(j.slug) ? { ...j, isPublic } : j));
      const publicJourneys = journeys.filter(j => j.isPublic).length;
      return {
        ...prev,
        journeys,
        stats: {
          ...prev.stats,
          publicJourneys,
        },
      };
    });

    const result = await toggleVisibilityBatch(
      'journey',
      slugs.map(slug => ({ entityId: slug, isPublic }))
    );

    if ('success' in result && !result.success) {
      // Re-fetch would be ideal; for now revert by flipping back.
      setData(prev => {
        const journeys = prev.journeys.map(j => (selectedJourneys.has(j.slug) ? { ...j, isPublic: !isPublic } : j));
        const publicJourneys = journeys.filter(j => j.isPublic).length;
        return {
          ...prev,
          journeys,
          stats: {
            ...prev.stats,
            publicJourneys,
          },
        };
      });
    } else {
      setSelectedJourneys(new Set());
    }
  };

  const togglejourneyExpanded = async (slug: string) => {
    const newExpanded = new Set<string>(expandedjourneys);
    
    if (newExpanded.has(slug)) {
      newExpanded.delete(slug);
    } else {
      newExpanded.add(slug);
      // Load details if not already loaded
      if (!journeyDetails.has(slug)) {
        setLoadingDetails(prev => new Set<string>(prev).add(slug));
        const result = await getJourneyVisibilityDetails(slug);
        if (result && !("success" in result && result.success === false) && !("error" in result)) {
          setjourneyDetails(prev => new Map<string, JourneyVisibilityDetails>(prev).set(slug, result));
        }
        setLoadingDetails(prev => {
          const next = new Set<string>(prev);
          next.delete(slug);
          return next;
        });
      }
    }
    
    setExpandedjourneys(newExpanded);
  };

  const handlejourneyVisibilityChange = async (journey: JourneyVisibilityInfo, isPublic: boolean) => {
    // Optimistic update
    setData(prev => ({
      ...prev,
      journeys: prev.journeys.map(r =>
        r.slug === journey.slug ? { ...r, isPublic } : r
      ),
      stats: {
        ...prev.stats,
        publicJourneys: prev.stats.publicJourneys + (isPublic ? 1 : -1),
      },
    }));

    const result = await toggleVisibility("journey", journey.slug, isPublic);
    
    if ("success" in result && !result.success) {
      // Revert on error
      setData(prev => ({
        ...prev,
        journeys: prev.journeys.map(r =>
          r.slug === journey.slug ? { ...r, isPublic: !isPublic } : r
        ),
        stats: {
          ...prev.stats,
          publicJourneys: prev.stats.publicJourneys + (isPublic ? -1 : 1),
        },
      }));
    }
  };

  return (
    <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-border/50 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Visibility Management</CardTitle>
        </div>
        <CardDescription>
          Control which journeys, milestones, and objectives are publicly visible
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allJourneysSelected ? true : someJourneysSelected ? 'indeterminate' : false}
                onCheckedChange={(checked) => setAllJourneysSelected(Boolean(checked))}
                aria-label="Select all journeys"
              />
              <span className="text-sm text-muted-foreground">
                {selectedJourneys.size > 0 ? `${selectedJourneys.size} selected` : 'Select journeys for bulk actions'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedJourneys.size === 0}
                onClick={() => applyJourneyBulkVisibility(true)}
              >
                Make public
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedJourneys.size === 0}
                onClick={() => applyJourneyBulkVisibility(false)}
              >
                Make private
              </Button>
              {selectedJourneys.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedJourneys(new Set())}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {data.journeys.length === 0 ? (
            <div className="text-center py-12">
              <MapIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No journeys found</p>
            </div>
          ) : (
            data.journeys.map((journey) => (
              <JourneyVisibilityItem
                key={journey.slug}
                journey={journey}
                selected={selectedJourneys.has(journey.slug)}
                onSelectedChange={(selected) => toggleJourneySelected(journey.slug, selected)}
                isExpanded={expandedjourneys.has(journey.slug)}
                details={journeyDetails.get(journey.slug)}
                isLoadingDetails={loadingDetails.has(journey.slug)}
                onToggleExpand={() => togglejourneyExpanded(journey.slug)}
                onVisibilityChange={(isPublic) => handlejourneyVisibilityChange(journey, isPublic)}
                onDetailsUpdate={(details) => {
                  setjourneyDetails(prev => new Map<string, JourneyVisibilityDetails>(prev).set(journey.slug, details));
                }}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}


interface JourneyVisibilityItemProps {
  journey: JourneyVisibilityInfo;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  isExpanded: boolean;
  details?: JourneyVisibilityDetails;
  isLoadingDetails: boolean;
  onToggleExpand: () => void;
  onVisibilityChange: (isPublic: boolean) => void;
  onDetailsUpdate: (details: JourneyVisibilityDetails) => void;
}

/**
 * Renders a collapsible UI row for a journey containing selection, visibility controls, and its milestone list.
 *
 * @param journey - The journey's visibility metadata and display info.
 * @param selected - Whether the journey is currently selected for bulk actions.
 * @param onSelectedChange - Callback invoked with the new selection state when the item's checkbox changes.
 * @param isExpanded - Whether the journey's details panel is open.
 * @param details - Optional loaded details for the journey, including milestones.
 * @param isLoadingDetails - Whether journey details are currently being fetched.
 * @param onToggleExpand - Callback invoked when the collapsible open state is toggled.
 * @param onVisibilityChange - Callback invoked with the new public state when the journey visibility switch is changed.
 * @param onDetailsUpdate - Callback invoked with updated JourneyVisibilityDetails when milestone data within the details changes.
 *
 * @returns The rendered journey item element with collapsible milestones and visibility controls.
 */
function JourneyVisibilityItem({
  journey,
  selected,
  onSelectedChange,
  isExpanded,
  details,
  isLoadingDetails,
  onToggleExpand,
  onVisibilityChange,
  onDetailsUpdate,
}: JourneyVisibilityItemProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    startTransition(() => {
      onVisibilityChange(checked);
    });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="rounded-2xl border border-border/50 bg-secondary/20 overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
            aria-label={`Select journey ${journey.title}`}
            onClick={(e) => e.stopPropagation()}
          />
          <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left hover:bg-secondary/30 -m-2 p-2 rounded-xl transition-colors">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.div>
            <div className="p-2 rounded-lg bg-primary/10">
              <MapIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{journey.title}</p>
              <p className="text-sm text-muted-foreground">
                {journey.publicMilestoneCount}/{journey.milestoneCount} milestones public
              </p>
            </div>
          </CollapsibleTrigger>
          
          <div className="flex items-center gap-3">
            <VisibilityBadge isPublic={journey.isPublic} />
            <Switch
              checked={journey.isPublic}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </div>

        <CollapsibleContent>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border/50"
              >
                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : details ? (
                  <MilestonesList
                    milestones={details.milestones}
                    journeySlug={journey.slug}
                    journeyIsPublic={journey.isPublic}
                    onUpdate={(milestones) => {
                      onDetailsUpdate({ ...details, milestones });
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Failed to load details
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface MilestonesListProps {
  milestones: MilestoneVisibilityInfo[];
  journeySlug: string;
  journeyIsPublic: boolean;
  onUpdate: (milestones: MilestoneVisibilityInfo[]) => void;
}

/**
 * Renders a list of milestones with per-milestone selection, expansion, and visibility controls, plus bulk actions for selected milestones and their objectives.
 *
 * The component updates milestone state via the provided `onUpdate` callback and performs optimistic visibility changes (reverted if server calls fail).
 *
 * @param milestones - Array of milestone visibility info to render.
 * @param journeySlug - Slug of the parent journey used for visibility API requests.
 * @param journeyIsPublic - Whether the parent journey is public; used to compute effective visibility.
 * @param onUpdate - Callback invoked with an updated milestones array when the component applies optimistic changes or reverts after failures.
 * @returns A React element containing milestone rows, bulk action controls, and nested objective controls.
 */
function MilestonesList({ milestones, journeySlug, journeyIsPublic, onUpdate }: MilestonesListProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(() => new Set<string>());
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(() => new Set<string>());

  const allMilestoneIds = milestones.map(m => m.nodeId);
  const allMilestonesSelected = allMilestoneIds.length > 0 && selectedMilestones.size === allMilestoneIds.length;
  const someMilestonesSelected = selectedMilestones.size > 0 && !allMilestonesSelected;

  const toggleMilestoneSelected = (nodeId: string, selected: boolean) => {
    setSelectedMilestones(prev => {
      const next = new Set(prev);
      if (selected) next.add(nodeId);
      else next.delete(nodeId);
      return next;
    });
  };

  const setAllMilestonesSelected = (selected: boolean) => {
    setSelectedMilestones(selected ? new Set(allMilestoneIds) : new Set());
  };

  const applyMilestoneBulkVisibility = async (isPublic: boolean) => {
    const nodeIds = Array.from(selectedMilestones);
    if (nodeIds.length === 0) return;

    // Optimistic update
    onUpdate(
      milestones.map(m => {
        if (!selectedMilestones.has(m.nodeId)) return m;
        const nextIsPublic = isPublic;
        const nextEffectivelyPublic = journeyIsPublic && nextIsPublic;
        return {
          ...m,
          isPublic: nextIsPublic,
          effectivelyPublic: nextEffectivelyPublic,
          objectives: m.objectives.map(o => ({
            ...o,
            effectivelyPublic: journeyIsPublic && nextIsPublic && o.isPublic,
            effectivelyContentPublic: journeyIsPublic && nextIsPublic && o.isPublic && o.contentPublic,
          })),
        };
      })
    );

    const result = await toggleVisibilityBatch(
      'milestone',
      nodeIds.map(id => ({ entityId: id, isPublic, parentJourneySlug: journeySlug }))
    );

    if ('success' in result && !result.success) {
      // revert
      onUpdate(
        milestones.map(m => {
          if (!selectedMilestones.has(m.nodeId)) return m;
          const nextIsPublic = !isPublic;
          const nextEffectivelyPublic = journeyIsPublic && nextIsPublic;
          return {
            ...m,
            isPublic: nextIsPublic,
            effectivelyPublic: nextEffectivelyPublic,
            objectives: m.objectives.map(o => ({
              ...o,
              effectivelyPublic: journeyIsPublic && nextIsPublic && o.isPublic,
              effectivelyContentPublic: journeyIsPublic && nextIsPublic && o.isPublic && o.contentPublic,
            })),
          };
        })
      );
    } else {
      setSelectedMilestones(new Set());
    }
  };

  const toggleMilestoneExpanded = (nodeId: string) => {
    setExpandedMilestones(prev => {
      const next = new Set<string>(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleMilestoneVisibilityChange = async (milestone: MilestoneVisibilityInfo, isPublic: boolean) => {
    // Optimistic update
    onUpdate(
      milestones.map(m =>
        m.nodeId === milestone.nodeId
          ? { ...m, isPublic, effectivelyPublic: journeyIsPublic && isPublic }
          : m
      )
    );

    const result = await toggleVisibility(
      "milestone",
      milestone.nodeId,
      isPublic,
      journeySlug
    );

    if ("success" in result && !result.success) {
      // Revert on error
      onUpdate(
        milestones.map(m =>
          m.nodeId === milestone.nodeId
            ? { ...m, isPublic: !isPublic, effectivelyPublic: journeyIsPublic && !isPublic }
            : m
        )
      );
    }
  };

  const handleObjectiveVisibilityChange = async (
    milestone: MilestoneVisibilityInfo,
    objective: ObjectiveVisibilityInfo,
    isPublic: boolean
  ) => {
    // Optimistic update
    onUpdate(
      milestones.map(m =>
        m.nodeId === milestone.nodeId
          ? {
              ...m,
              objectives: m.objectives.map(o =>
                o.index === objective.index
                  ? { ...o, isPublic, effectivelyPublic: journeyIsPublic && m.isPublic && isPublic }
                  : o
              ),
            }
          : m
      )
    );

    const result = await toggleVisibility(
      "objective",
      `${milestone.nodeId}-${objective.index}`,
      isPublic,
      journeySlug,
      milestone.nodeId
    );

    if ("success" in result && !result.success) {
      // Revert on error
      onUpdate(
        milestones.map(m =>
          m.nodeId === milestone.nodeId
            ? {
                ...m,
                objectives: m.objectives.map(o =>
                  o.index === objective.index
                    ? { ...o, isPublic: !isPublic, effectivelyPublic: journeyIsPublic && m.isPublic && !isPublic }
                    : o
                ),
              }
            : m
        )
      );
    }
  };

  const handleAllObjectivesVisibilityChange = async (
    milestone: MilestoneVisibilityInfo,
    isPublic: boolean
  ) => {
    // Optimistic update
    onUpdate(
      milestones.map(m =>
        m.nodeId === milestone.nodeId
          ? {
              ...m,
              objectives: m.objectives.map(o => ({
                ...o,
                isPublic,
                effectivelyPublic: journeyIsPublic && m.isPublic && isPublic,
                effectivelyContentPublic: journeyIsPublic && m.isPublic && isPublic && o.contentPublic,
              })),
            }
          : m
      )
    );

    const result = await toggleVisibilityBatch(
      'objective',
      milestone.objectives.map(o => ({
        entityId: `${milestone.nodeId}-${o.index}`,
        isPublic,
        parentJourneySlug: journeySlug,
        parentMilestoneId: milestone.nodeId,
      }))
    );

    if ('success' in result && !result.success) {
      // Revert
      onUpdate(
        milestones.map(m =>
          m.nodeId === milestone.nodeId
            ? {
                ...m,
                objectives: m.objectives.map(o => ({
                  ...o,
                  isPublic: !isPublic,
                  effectivelyPublic: journeyIsPublic && m.isPublic && !isPublic,
                  effectivelyContentPublic: journeyIsPublic && m.isPublic && !isPublic && o.contentPublic,
                })),
              }
            : m
        )
      );
    }
  };

  if (milestones.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No milestones in this journey
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allMilestonesSelected ? true : someMilestonesSelected ? 'indeterminate' : false}
            onCheckedChange={(checked) => setAllMilestonesSelected(Boolean(checked))}
            aria-label="Select all milestones"
          />
          <span className="text-xs text-muted-foreground">
            {selectedMilestones.size > 0 ? `${selectedMilestones.size} selected` : 'Select milestones'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={selectedMilestones.size === 0}
            onClick={() => applyMilestoneBulkVisibility(true)}
          >
            Make public
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedMilestones.size === 0}
            onClick={() => applyMilestoneBulkVisibility(false)}
          >
            Make private
          </Button>
          {selectedMilestones.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedMilestones(new Set())}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {milestones.map((milestone) => (
        <MilestoneVisibilityItem
          key={milestone.nodeId}
          milestone={milestone}
          journeyIsPublic={journeyIsPublic}
          isExpanded={expandedMilestones.has(milestone.nodeId)}
          selected={selectedMilestones.has(milestone.nodeId)}
          onSelectedChange={(selected) => toggleMilestoneSelected(milestone.nodeId, selected)}
          onToggleExpand={() => toggleMilestoneExpanded(milestone.nodeId)}
          onVisibilityChange={(isPublic) => handleMilestoneVisibilityChange(milestone, isPublic)}
          onObjectiveVisibilityChange={(objective, isPublic) =>
            handleObjectiveVisibilityChange(milestone, objective, isPublic)
          }
          onAllObjectivesVisibilityChange={(isPublic) => handleAllObjectivesVisibilityChange(milestone, isPublic)}
          onObjectiveContentVisibilityChange={async (objective, contentPublic) => {
            // Optimistic update
            onUpdate(
              milestones.map(m =>
                m.nodeId === milestone.nodeId
                  ? {
                      ...m,
                      objectives: m.objectives.map(o =>
                        o.index === objective.index
                          ? {
                              ...o,
                              contentPublic,
                              effectivelyContentPublic: journeyIsPublic && m.isPublic && o.isPublic && contentPublic,
                            }
                          : o
                      ),
                    }
                  : m
              )
            );

            const objectiveEntityId = `${milestone.nodeId}-${objective.index}`;
            const result = await toggleObjectiveContentVisibility(
              objectiveEntityId,
              contentPublic,
              journeySlug,
              milestone.nodeId
            );

            if ('success' in result && !result.success) {
              // Revert
              onUpdate(
                milestones.map(m =>
                  m.nodeId === milestone.nodeId
                    ? {
                        ...m,
                        objectives: m.objectives.map(o =>
                          o.index === objective.index
                            ? {
                                ...o,
                                contentPublic: !contentPublic,
                                effectivelyContentPublic: journeyIsPublic && m.isPublic && o.isPublic && !contentPublic,
                              }
                            : o
                        ),
                      }
                    : m
                )
              );
            }
          }}
        />
      ))}
    </div>
  );
}


interface MilestoneVisibilityItemProps {
  milestone: MilestoneVisibilityInfo;
  journeyIsPublic: boolean;
  isExpanded: boolean;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onToggleExpand: () => void;
  onVisibilityChange: (isPublic: boolean) => void;
  onObjectiveVisibilityChange: (objective: ObjectiveVisibilityInfo, isPublic: boolean) => void;
  onAllObjectivesVisibilityChange: (isPublic: boolean) => void;
  onObjectiveContentVisibilityChange: (objective: ObjectiveVisibilityInfo, contentPublic: boolean) => void;
}

/**
 * Render a collapsible UI block for a milestone with selection, visibility, and objective bulk controls.
 *
 * Renders the milestone title, selection checkbox, effective visibility indicator, a public/private switch for the milestone, and an expandable list of objectives with per-objective visibility and content-visibility controls plus "All public"/"All private" bulk actions.
 *
 * @param milestone - Milestone data including title and its objectives
 * @param journeyIsPublic - Whether the parent journey is public (affects effective visibility)
 * @param isExpanded - Whether the milestone's collapsible content is open
 * @param selected - Whether the milestone is selected for bulk actions
 * @param onSelectedChange - Called when the milestone selection checkbox changes
 * @param onToggleExpand - Called when the milestone's expanded state is toggled
 * @param onVisibilityChange - Called when the milestone's isPublic switch changes
 * @param onObjectiveVisibilityChange - Called when an individual objective's isPublic changes; receives the objective and the new boolean state
 * @param onAllObjectivesVisibilityChange - Called to set all objectives under this milestone to public or private
 * @param onObjectiveContentVisibilityChange - Called when an objective's contentPublic value changes; receives the objective and the new boolean state
 */
function MilestoneVisibilityItem({
  milestone,
  journeyIsPublic,
  isExpanded,
  selected,
  onSelectedChange,
  onToggleExpand,
  onVisibilityChange,
  onObjectiveVisibilityChange,
  onAllObjectivesVisibilityChange,
  onObjectiveContentVisibilityChange,
}: MilestoneVisibilityItemProps) {
  const [isPending, startTransition] = useTransition();
  const effectivelyPublic = journeyIsPublic && milestone.isPublic;

  const handleToggle = (checked: boolean) => {
    startTransition(() => {
      onVisibilityChange(checked);
    });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="rounded-xl border border-border/30 bg-background/50 overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
            aria-label={`Select milestone ${milestone.title}`}
            onClick={(e) => e.stopPropagation()}
          />
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left hover:bg-secondary/30 -m-1.5 p-1.5 rounded-lg transition-colors">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Target className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{milestone.title}</p>
              <p className="text-xs text-muted-foreground">
                {milestone.objectives.filter(o => o.effectivelyPublic).length}/{milestone.objectives.length} objectives public
              </p>
            </div>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            <EffectiveVisibilityIndicator
              isPublic={milestone.isPublic}
              effectivelyPublic={effectivelyPublic}
              parentIsPrivate={!journeyIsPublic}
            />
            <Switch
              checked={milestone.isPublic}
              onCheckedChange={handleToggle}
              disabled={isPending}
              className="scale-90"
            />
          </div>
        </div>

        <CollapsibleContent>
          <AnimatePresence>
            {isExpanded && milestone.objectives.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border/30 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <span className="text-[11px] text-muted-foreground">
                    Objective bulk actions
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onAllObjectivesVisibilityChange(true)}
                    >
                      All public
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onAllObjectivesVisibilityChange(false)}
                    >
                      All private
                    </Button>
                  </div>
                </div>

                {milestone.objectives.map((objective) => (
                  <ObjectiveVisibilityItem
                    key={objective.index}
                    objective={objective}
                    milestoneIsPublic={milestone.isPublic}
                    journeyIsPublic={journeyIsPublic}
                    onVisibilityChange={(isPublic) => onObjectiveVisibilityChange(objective, isPublic)}
                    onContentVisibilityChange={(contentPublic) => onObjectiveContentVisibilityChange(objective, contentPublic)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface ObjectiveVisibilityItemProps {
  objective: ObjectiveVisibilityInfo;
  milestoneIsPublic: boolean;
  journeyIsPublic: boolean;
  onVisibilityChange: (isPublic: boolean) => void;
  onContentVisibilityChange: (contentPublic: boolean) => void;
}

/**
 * Renders a single objective row with controls to toggle its visibility and its lesson content visibility, and displays its effective visibility state.
 *
 * @param objective - Objective data (title, isPublic, contentPublic, effectivelyContentPublic) used to render labels and control states
 * @param milestoneIsPublic - Whether the parent milestone is public; used to compute the objective's effective visibility
 * @param journeyIsPublic - Whether the parent journey is public; used to compute the objective's effective visibility
 * @param onVisibilityChange - Called with the new `isPublic` value when the objective's visibility switch is toggled
 * @param onContentVisibilityChange - Called with the new `contentPublic` value when the objective's content visibility switch is toggled
 */
function ObjectiveVisibilityItem({
  objective,
  milestoneIsPublic,
  journeyIsPublic,
  onVisibilityChange,
  onContentVisibilityChange,
}: ObjectiveVisibilityItemProps) {
  const [isPending, startTransition] = useTransition();
  const effectivelyPublic = journeyIsPublic && milestoneIsPublic && objective.isPublic;
  const parentIsPrivate = !journeyIsPublic || !milestoneIsPublic;

  const handleToggle = (checked: boolean) => {
    startTransition(() => {
      onVisibilityChange(checked);
    });
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
      <div className="p-1 rounded bg-emerald-500/10">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
      </div>
      <p className="flex-1 text-xs text-foreground/80 truncate">{objective.title}</p>

      {/* Content visibility toggle (objective-specific) */}
      <div
        className={cn(
          'flex items-center gap-1',
          objective.effectivelyContentPublic
            ? 'text-emerald-600 dark:text-emerald-400'
            : objective.contentPublic
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground'
        )}
        title={
          objective.effectivelyContentPublic
            ? 'Lesson content will be visible on public explore'
            : objective.contentPublic
              ? 'Content is enabled but not effectively public (check parent/objective visibility)'
              : 'Lesson content is hidden on public explore'
        }
      >
        <BookOpen className="w-3 h-3" />
        <Switch
          checked={objective.contentPublic}
          onCheckedChange={(checked) => {
            startTransition(() => onContentVisibilityChange(checked));
          }}
          disabled={isPending}
          className="scale-75"
        />
      </div>

      <EffectiveVisibilityIndicator
        isPublic={objective.isPublic}
        effectivelyPublic={effectivelyPublic}
        parentIsPrivate={parentIsPrivate}
        size="sm"
      />
      <Switch
        checked={objective.isPublic}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="scale-75"
      />
    </div>
  );
}

interface VisibilityBadgeProps {
  isPublic: boolean;
}

function VisibilityBadge({ isPublic }: VisibilityBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        isPublic
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/20"
          : "bg-secondary text-muted-foreground"
      )}
    >
      {isPublic ? (
        <>
          <Eye className="w-3 h-3 mr-1" />
          Public
        </>
      ) : (
        <>
          <EyeOff className="w-3 h-3 mr-1" />
          Private
        </>
      )}
    </Badge>
  );
}

interface EffectiveVisibilityIndicatorProps {
  isPublic: boolean;
  effectivelyPublic: boolean;
  parentIsPrivate: boolean;
  size?: "sm" | "md";
}

function EffectiveVisibilityIndicator({
  isPublic,
  effectivelyPublic,
  parentIsPrivate,
  size = "md",
}: EffectiveVisibilityIndicatorProps) {
  // Show warning when item is set to public but parent is private
  if (isPublic && parentIsPrivate) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-amber-600 dark:text-amber-400",
          size === "sm" ? "text-[10px]" : "text-xs"
        )}
        title="This item is set to public, but a parent is private"
      >
        <Lock className={cn(size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
        <span className="hidden sm:inline">Inherited private</span>
      </div>
    );
  }

  if (effectivelyPublic) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-emerald-600 dark:text-emerald-400",
          size === "sm" ? "text-[10px]" : "text-xs"
        )}
      >
        <Globe className={cn(size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
        <span className="hidden sm:inline">Visible</span>
      </div>
    );
  }

  return null;
}