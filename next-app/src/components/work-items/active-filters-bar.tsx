'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PHASE_CONFIG, type WorkspacePhase } from '@/lib/constants/workspace-phases';

interface ActiveFiltersBarProps {
  selectedPhases: WorkspacePhase[];
  selectedStatus?: string;
  selectedPriority?: string;
  onRemovePhase: (phase: WorkspacePhase) => void;
  onClearStatus?: () => void;
  onClearPriority?: () => void;
  onClearAll: () => void;
}

export function ActiveFiltersBar({
  selectedPhases,
  selectedStatus,
  selectedPriority,
  onRemovePhase,
  onClearStatus,
  onClearPriority,
  onClearAll,
}: ActiveFiltersBarProps) {
  const hasAnyFilters =
    selectedPhases.length > 0 ||
    (selectedStatus && selectedStatus !== 'all') ||
    (selectedPriority && selectedPriority !== 'all');

  if (!hasAnyFilters) {
    return null;
  }

  const filterCount =
    selectedPhases.length +
    (selectedStatus && selectedStatus !== 'all' ? 1 : 0) +
    (selectedPriority && selectedPriority !== 'all' ? 1 : 0);

  return (
    <div className="flex items-center gap-3 flex-wrap py-2">
      <span className="text-sm text-muted-foreground font-medium">
        Active filters ({filterCount}):
      </span>

      {/* Phase filters */}
      {selectedPhases.map((phase) => (
        <Badge
          key={phase}
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 bg-secondary/50 hover:bg-secondary/70 transition-colors"
        >
          <span className="text-xs font-medium">
            Phase: {PHASE_CONFIG[phase].name}
          </span>
          <button
            onClick={() => onRemovePhase(phase)}
            className="ml-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Status filter */}
      {selectedStatus && selectedStatus !== 'all' && (
        <Badge
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 bg-secondary/50 hover:bg-secondary/70 transition-colors"
        >
          <span className="text-xs font-medium">
            Status: {selectedStatus.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
          <button
            onClick={onClearStatus}
            className="ml-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Priority filter */}
      {selectedPriority && selectedPriority !== 'all' && (
        <Badge
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 bg-secondary/50 hover:bg-secondary/70 transition-colors"
        >
          <span className="text-xs font-medium">
            Priority: {selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)}
          </span>
          <button
            onClick={onClearPriority}
            className="ml-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Clear all button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}
