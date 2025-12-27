/**
 * useGanttLayout Hook - Gantt Chart Layout Calculations
 *
 * React hook that provides layout calculations for Gantt chart positioning.
 * Consumes gantt-utils for pure calculations.
 *
 * @module gantt/use-gantt-layout
 */

import { useMemo, useCallback, useState } from 'react';
import type { ZoomLevel, DateRange, TimeInterval, BarStyle, GanttItem } from './types';
import {
  calculateDateRange,
  generateTimeIntervals,
  calculateTotalWidth,
  calculateBarStyle,
  getPixelsPerDay,
  getTodayLinePosition,
  calculateTodayScrollPosition,
} from './gantt-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface UseGanttLayoutOptions {
  /** The current zoom level */
  zoomLevel: ZoomLevel;
  /** Days of padding to add on each end of the date range */
  paddingDays?: number;
  /** Minimum bar width in pixels */
  minBarWidth?: number;
}

export interface UseGanttLayoutResult {
  /** Calculated date range from items */
  dateRange: DateRange;
  /** Array of time intervals for the header */
  timeIntervals: TimeInterval[];
  /** Total width of the timeline in pixels */
  totalWidth: number;
  /** Pixels per day at current zoom level */
  pixelsPerDay: number;
  /** Get CSS styles for positioning an item bar */
  getBarStyle: (item: GanttItem) => BarStyle | null;
  /** Get the "today" line position (null if out of range) */
  todayLinePosition: number | null;
  /** Calculate scroll position to center today */
  getTodayScrollPosition: (containerWidth: number) => number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for calculating Gantt chart layout from items and zoom level.
 *
 * @param items - Array of Gantt items to layout
 * @param options - Layout options including zoom level
 * @returns Layout calculations and utilities
 *
 * @example
 * ```tsx
 * const {
 *   dateRange,
 *   timeIntervals,
 *   totalWidth,
 *   getBarStyle,
 *   todayLinePosition,
 * } = useGanttLayout(workItems, { zoomLevel: 'month' });
 *
 * // Render header
 * {timeIntervals.map(interval => (
 *   <div style={{ width: interval.width }}>{interval.label}</div>
 * ))}
 *
 * // Render bars
 * {workItems.map(item => {
 *   const style = getBarStyle(item);
 *   if (!style) return null;
 *   return <div style={style}>{item.name}</div>;
 * })}
 * ```
 */
export function useGanttLayout(
  items: GanttItem[],
  options: UseGanttLayoutOptions
): UseGanttLayoutResult {
  const { zoomLevel, paddingDays = 7, minBarWidth: _minBarWidth = 40 } = options;

  // Calculate date range from items
  const dateRange = useMemo(
    () => calculateDateRange(items, paddingDays),
    [items, paddingDays]
  );

  // Generate time intervals based on zoom level
  const timeIntervals = useMemo(
    () => generateTimeIntervals(dateRange, zoomLevel),
    [dateRange, zoomLevel]
  );

  // Calculate total width
  const totalWidth = useMemo(
    () => calculateTotalWidth(timeIntervals),
    [timeIntervals]
  );

  // Get pixels per day for current zoom
  const pixelsPerDay = useMemo(
    () => getPixelsPerDay(zoomLevel),
    [zoomLevel]
  );

  // Memoized bar style calculator
  // Returns a stable function reference that calculates on demand
  const getBarStyleFn = useCallback(
    (item: GanttItem): BarStyle | null => {
      return calculateBarStyle(item, timeIntervals, zoomLevel);
    },
    [timeIntervals, zoomLevel]
  );

  // Today line position
  const todayLinePosition = useMemo(
    () => getTodayLinePosition(timeIntervals, zoomLevel),
    [timeIntervals, zoomLevel]
  );

  // Scroll to today calculator
  const getTodayScrollPositionFn = useCallback(
    (containerWidth: number) => {
      return calculateTodayScrollPosition(timeIntervals, zoomLevel, containerWidth);
    },
    [timeIntervals, zoomLevel]
  );

  return {
    dateRange,
    timeIntervals,
    totalWidth,
    pixelsPerDay,
    getBarStyle: getBarStyleFn,
    todayLinePosition,
    getTodayScrollPosition: getTodayScrollPositionFn,
  };
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook for persisting zoom level in localStorage.
 * Falls back to 'month' if localStorage is unavailable.
 *
 * @param initialLevel - Initial zoom level if not in localStorage
 * @param storageKey - LocalStorage key (default: 'gantt-zoom-level')
 * @returns Tuple of [zoomLevel, setZoomLevel]
 *
 * @example
 * ```tsx
 * const [zoomLevel, setZoomLevel] = usePersistedZoomLevel('month');
 * ```
 */
export function usePersistedZoomLevel(
  initialLevel: ZoomLevel = 'month',
  storageKey: string = 'gantt-zoom-level'
): [ZoomLevel, (level: ZoomLevel) => void] {
  // Note: This is a simplified version - in production you'd want
  // proper SSR handling with useEffect for hydration
  const getInitialLevel = (): ZoomLevel => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['day', 'week', 'month', 'quarter'].includes(stored)) {
        return stored as ZoomLevel;
      }
    }
    return initialLevel;
  };

  // Using useState with initializer function
  const [zoomLevel, setZoomLevelState] = useState<ZoomLevel>(getInitialLevel);

  const setZoomLevel = useCallback((level: ZoomLevel) => {
    setZoomLevelState(level);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, level);
    }
  }, [storageKey]);

  return [zoomLevel, setZoomLevel];
}
