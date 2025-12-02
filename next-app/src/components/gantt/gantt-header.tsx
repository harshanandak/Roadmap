'use client';

/**
 * GanttHeader Component - Time Axis Header
 *
 * Renders the time axis header for Gantt charts.
 * Shows interval labels (day/week/month/quarter) with proper widths.
 *
 * @module gantt/gantt-header
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { TimeInterval, ZoomLevel } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface GanttHeaderProps {
  /** Array of time intervals to render */
  intervals: TimeInterval[];
  /** Current zoom level (for styling) */
  zoomLevel: ZoomLevel;
  /** Total width of the header */
  totalWidth: number;
  /** Position of the "today" indicator line (null if out of range) */
  todayLinePosition?: number | null;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the today indicator line */
  showTodayLine?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Time axis header component for Gantt charts.
 * Renders intervals with labels and optional "today" indicator.
 *
 * @example
 * ```tsx
 * const { timeIntervals, totalWidth, todayLinePosition } = useGanttLayout(items, { zoomLevel });
 *
 * <GanttHeader
 *   intervals={timeIntervals}
 *   zoomLevel={zoomLevel}
 *   totalWidth={totalWidth}
 *   todayLinePosition={todayLinePosition}
 *   showTodayLine
 * />
 * ```
 */
export const GanttHeader = memo(function GanttHeader({
  intervals,
  zoomLevel,
  totalWidth,
  todayLinePosition,
  className,
  showTodayLine = true,
}: GanttHeaderProps) {
  // Determine text size based on zoom level
  const textSizeClass = zoomLevel === 'day' ? 'text-xs' : 'text-sm';

  return (
    <div
      className={cn(
        'relative flex border-b border-border bg-muted/30',
        className
      )}
      style={{ width: `${totalWidth}px` }}
    >
      {intervals.map((interval, index) => (
        <div
          key={`${interval.date.toISOString()}-${index}`}
          className={cn(
            'flex-shrink-0 border-r border-border px-2 py-2',
            'flex items-center justify-center',
            textSizeClass,
            'text-muted-foreground font-medium'
          )}
          style={{ width: `${interval.width}px` }}
        >
          {interval.label}
        </div>
      ))}

      {/* Today indicator line */}
      {showTodayLine && todayLinePosition !== null && todayLinePosition !== undefined && (
        <TodayIndicator position={todayLinePosition} />
      )}
    </div>
  );
});

// ============================================================================
// TODAY INDICATOR
// ============================================================================

interface TodayIndicatorProps {
  position: number;
}

const TodayIndicator = memo(function TodayIndicator({ position }: TodayIndicatorProps) {
  return (
    <>
      {/* Triangle marker at top */}
      <div
        className="absolute top-0 -translate-x-1/2 z-10"
        style={{ left: `${position}px` }}
      >
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
      </div>

      {/* Vertical line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-10 pointer-events-none"
        style={{ left: `${position}px` }}
      />
    </>
  );
});

// ============================================================================
// GRID BACKGROUND
// ============================================================================

export interface GanttGridProps {
  /** Array of time intervals */
  intervals: TimeInterval[];
  /** Total width */
  totalWidth: number;
  /** Height of the grid area */
  height: number;
  /** Position of today line */
  todayLinePosition?: number | null;
  /** Show today line extending through grid */
  showTodayLine?: boolean;
}

/**
 * Grid background component for Gantt chart body.
 * Renders vertical lines aligned with header intervals.
 */
export const GanttGrid = memo(function GanttGrid({
  intervals,
  totalWidth,
  height,
  todayLinePosition,
  showTodayLine = true,
}: GanttGridProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: `${totalWidth}px`, height: `${height}px` }}
    >
      {/* Interval grid lines */}
      {intervals.map((interval, index) => {
        // Calculate cumulative position
        const left = intervals
          .slice(0, index)
          .reduce((sum, i) => sum + i.width, 0);

        return (
          <div
            key={`grid-${interval.date.toISOString()}-${index}`}
            className="absolute top-0 bottom-0 border-r border-border/40"
            style={{ left: `${left + interval.width}px` }}
          />
        );
      })}

      {/* Today line through grid */}
      {showTodayLine && todayLinePosition !== null && todayLinePosition !== undefined && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500/30 z-10"
          style={{ left: `${todayLinePosition}px` }}
        />
      )}
    </div>
  );
});

// ============================================================================
// ZOOM SELECTOR
// ============================================================================

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ZoomSelectorProps {
  /** Current zoom level */
  value: ZoomLevel;
  /** Callback when zoom changes */
  onChange: (level: ZoomLevel) => void;
  /** Use buttons instead of dropdown */
  variant?: 'dropdown' | 'buttons';
  /** Additional CSS classes */
  className?: string;
}

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

/**
 * Zoom level selector component.
 * Can render as dropdown or button group.
 */
export function ZoomSelector({
  value,
  onChange,
  variant = 'dropdown',
  className,
}: ZoomSelectorProps) {
  if (variant === 'buttons') {
    return (
      <div className={cn('flex gap-1', className)}>
        {ZOOM_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ZoomLevel)}>
      <SelectTrigger className={cn('w-[120px]', className)}>
        <SelectValue placeholder="Zoom" />
      </SelectTrigger>
      <SelectContent>
        {ZOOM_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// TODAY BUTTON
// ============================================================================

import { CalendarDays } from 'lucide-react';

export interface TodayButtonProps {
  /** Callback to scroll to today */
  onClick: () => void;
  /** Whether today is in the current date range */
  isInRange?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button to scroll the timeline to today's date.
 */
export function TodayButton({ onClick, isInRange = true, className }: TodayButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={!isInRange}
      className={cn('gap-2', className)}
      title={isInRange ? 'Scroll to today' : 'Today is outside the current date range'}
    >
      <CalendarDays className="h-4 w-4" />
      Today
    </Button>
  );
}
