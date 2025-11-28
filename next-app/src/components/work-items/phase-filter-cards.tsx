'use client';

import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { PHASE_CONFIG, PHASE_ORDER, type WorkspacePhase } from '@/lib/constants/workspace-phases';

interface PhaseFilterCardsProps {
  selectedPhase: WorkspacePhase | null; // null = all phases
  onPhaseChange: (phase: WorkspacePhase | null) => void;
  phaseCounts: Record<WorkspacePhase, number>;
  totalCount: number;
}

export function PhaseFilterCards({
  selectedPhase,
  onPhaseChange,
  phaseCounts,
  totalCount,
}: PhaseFilterCardsProps) {
  const handleValueChange = (value: string) => {
    // Empty string means nothing selected (shouldn't happen with single select)
    // 'all' means show all phases
    if (!value || value === 'all') {
      onPhaseChange(null);
    } else {
      onPhaseChange(value as WorkspacePhase);
    }
  };

  // Current value for ToggleGroup ('' = all)
  const currentValue = selectedPhase || 'all';

  return (
    <div className="relative inline-flex">
      <ToggleGroup
        type="single"
        value={currentValue}
        onValueChange={handleValueChange}
        className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
      >
        {/* All Phases Tab */}
        <ToggleGroupItem
          value="all"
          aria-label="All phases"
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
          )}
        >
          <span>All Phases</span>
          <Badge
            variant="secondary"
            className="ml-1.5 h-5 min-w-[24px] justify-center text-xs font-semibold"
          >
            {totalCount}
          </Badge>
        </ToggleGroupItem>

        {/* Individual Phase Tabs */}
        {PHASE_ORDER.map((phaseId) => {
          const phaseConfig = PHASE_CONFIG[phaseId];
          const count = phaseCounts[phaseId] || 0;
          const isSelected = selectedPhase === phaseId;

          return (
            <ToggleGroupItem
              key={phaseId}
              value={phaseId}
              aria-label={phaseConfig.name}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm relative'
              )}
            >
              <span>{phaseConfig.name}</span>
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 min-w-[24px] justify-center text-xs font-semibold"
              >
                {count}
              </Badge>

              {/* Colored bottom border indicator for active phase */}
              {isSelected && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-200"
                  style={{ backgroundColor: phaseConfig.color }}
                />
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
