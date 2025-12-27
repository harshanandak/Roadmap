/**
 * Gantt Chart Utilities - Date Calculations
 *
 * Pure utility functions for Gantt chart date calculations.
 * Extracted from timeline-view.tsx for reusability.
 *
 * @module gantt/gantt-utils
 */

import {
  startOfQuarter,
  endOfQuarter,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
  addMonths,
  format,
  differenceInDays,
} from 'date-fns';
import type {
  ZoomLevel,
  DateRange,
  TimeInterval,
  BarStyle,
  GanttItem,
} from './types';

// ============================================================================
// DATE RANGE CALCULATIONS
// ============================================================================

/**
 * Calculate the date range from a list of Gantt items.
 * Adds 7-day padding on both ends for visual breathing room.
 * Falls back to current quarter if no items have dates.
 *
 * @param items - Array of items with optional start_date and end_date
 * @param paddingDays - Days of padding to add on each end (default: 7)
 * @returns DateRange with start and end dates
 */
export function calculateDateRange(
  items: GanttItem[],
  paddingDays: number = 7
): DateRange {
  const itemsWithDates = items.filter(
    (item) => item.start_date && item.end_date
  );

  if (itemsWithDates.length === 0) {
    // Default to current quarter
    const now = new Date();
    return {
      start: startOfQuarter(now),
      end: endOfQuarter(now),
    };
  }

  const startDates = itemsWithDates.map((item) => new Date(item.start_date!));
  const endDates = itemsWithDates.map((item) => new Date(item.end_date!));

  const minDate = new Date(Math.min(...startDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...endDates.map((d) => d.getTime())));

  return {
    start: addDays(minDate, -paddingDays),
    end: addDays(maxDate, paddingDays),
  };
}

// ============================================================================
// TIME INTERVAL GENERATION
// ============================================================================

/**
 * Generate time intervals for the Gantt header based on zoom level.
 * Each interval has a date, label, and width in pixels.
 *
 * @param dateRange - The date range to generate intervals for
 * @param zoomLevel - The zoom level (day/week/month/quarter)
 * @param config - Optional custom widths per zoom level
 * @returns Array of TimeInterval objects
 */
export function generateTimeIntervals(
  dateRange: DateRange,
  zoomLevel: ZoomLevel,
  config?: Partial<Record<ZoomLevel, { intervalWidth: number }>>
): TimeInterval[] {
  // Default widths (can be overridden)
  const widths = {
    day: config?.day?.intervalWidth ?? 80,
    week: config?.week?.intervalWidth ?? 100,
    month: config?.month?.intervalWidth ?? 120,
    quarter: config?.quarter?.intervalWidth ?? 200,
  };

  switch (zoomLevel) {
    case 'day':
      return eachDayOfInterval(dateRange).map((date) => ({
        date,
        label: format(date, 'MMM d'),
        width: widths.day,
      }));

    case 'week':
      return eachWeekOfInterval(dateRange).map((date) => ({
        date,
        label: format(date, 'MMM d'),
        width: widths.week,
      }));

    case 'month':
      return eachMonthOfInterval(dateRange).map((date) => ({
        date,
        label: format(date, 'MMM yyyy'),
        width: widths.month,
      }));

    case 'quarter':
      const quarters: TimeInterval[] = [];
      let current = startOfQuarter(dateRange.start);

      while (current <= dateRange.end) {
        quarters.push({
          date: current,
          label: `Q${Math.floor(current.getMonth() / 3) + 1} ${format(current, 'yyyy')}`,
          width: widths.quarter,
        });
        current = addMonths(current, 3);
      }
      return quarters;

    default:
      return [];
  }
}

/**
 * Calculate the total width of all time intervals.
 *
 * @param intervals - Array of TimeInterval objects
 * @returns Total width in pixels
 */
export function calculateTotalWidth(intervals: TimeInterval[]): number {
  return intervals.reduce((sum, interval) => sum + interval.width, 0);
}

// ============================================================================
// BAR POSITION CALCULATIONS
// ============================================================================

/**
 * Get pixels per day for a given zoom level.
 * This is used to calculate bar widths from duration.
 *
 * @param zoomLevel - The zoom level
 * @returns Pixels per day
 */
export function getPixelsPerDay(zoomLevel: ZoomLevel): number {
  switch (zoomLevel) {
    case 'day':
      return 80;
    case 'week':
      return 14; // 100px per week / 7 days
    case 'month':
      return 4; // 120px per month / ~30 days
    case 'quarter':
      return 1.5; // 200px per quarter / ~90 days
    default:
      return 4;
  }
}

/**
 * Calculate the left position of a bar based on its start date.
 * Finds where in the intervals the date falls.
 *
 * @param startDate - The start date of the item
 * @param intervals - Array of time intervals
 * @param zoomLevel - Current zoom level
 * @returns Left position in pixels
 */
export function calculateBarLeft(
  startDate: Date,
  intervals: TimeInterval[],
  zoomLevel: ZoomLevel
): number {
  if (intervals.length === 0) return 0;

  const firstInterval = intervals[0];
  const daysSinceStart = differenceInDays(startDate, firstInterval.date);
  const pixelsPerDay = getPixelsPerDay(zoomLevel);

  return Math.max(0, daysSinceStart * pixelsPerDay);
}

/**
 * Calculate the width of a bar based on its duration.
 * Minimum width is 40px for visibility.
 *
 * @param startDate - The start date of the item
 * @param endDate - The end date of the item
 * @param zoomLevel - Current zoom level
 * @param minWidth - Minimum bar width (default: 40px)
 * @returns Width in pixels
 */
export function calculateBarWidth(
  startDate: Date,
  endDate: Date,
  zoomLevel: ZoomLevel,
  minWidth: number = 40
): number {
  const durationDays = differenceInDays(endDate, startDate) + 1; // +1 to include end date
  const pixelsPerDay = getPixelsPerDay(zoomLevel);
  const calculatedWidth = durationDays * pixelsPerDay;

  return Math.max(calculatedWidth, minWidth);
}

/**
 * Calculate bar style (left and width as CSS strings) for a Gantt item.
 * Returns null if the item has no valid dates.
 *
 * @param item - The Gantt item with start_date and end_date
 * @param intervals - Array of time intervals
 * @param zoomLevel - Current zoom level
 * @returns BarStyle object or null if dates are invalid
 */
export function calculateBarStyle(
  item: GanttItem,
  intervals: TimeInterval[],
  zoomLevel: ZoomLevel
): BarStyle | null {
  if (!item.start_date || !item.end_date) return null;

  const startDate = new Date(item.start_date);
  const endDate = new Date(item.end_date);

  const left = calculateBarLeft(startDate, intervals, zoomLevel);
  const width = calculateBarWidth(startDate, endDate, zoomLevel);

  return {
    left: `${left}px`,
    width: `${width}px`,
  };
}

// ============================================================================
// DATE SHIFT CALCULATIONS (for drag-and-drop)
// ============================================================================

/**
 * Calculate how many days a pixel delta represents at a given zoom level.
 * Used when dragging items to calculate new dates.
 *
 * @param deltaPixels - The number of pixels moved
 * @param zoomLevel - Current zoom level
 * @returns Number of days to shift (can be negative)
 */
export function pixelsToDays(deltaPixels: number, zoomLevel: ZoomLevel): number {
  const pixelsPerDay = getPixelsPerDay(zoomLevel);
  return Math.round(deltaPixels / pixelsPerDay);
}

/**
 * Calculate new dates after a drag operation.
 * Shifts both start and end dates by the same number of days.
 *
 * @param item - The item being dragged
 * @param deltaPixels - Pixels moved horizontally
 * @param zoomLevel - Current zoom level
 * @returns New start and end dates, or null if item has no dates
 */
export function calculateNewDates(
  item: GanttItem,
  deltaPixels: number,
  zoomLevel: ZoomLevel
): { startDate: Date; endDate: Date } | null {
  if (!item.start_date || !item.end_date) return null;

  const daysDelta = pixelsToDays(deltaPixels, zoomLevel);
  if (daysDelta === 0) return null;

  const oldStartDate = new Date(item.start_date);
  const oldEndDate = new Date(item.end_date);

  return {
    startDate: addDays(oldStartDate, daysDelta),
    endDate: addDays(oldEndDate, daysDelta),
  };
}

/**
 * Format a date as ISO date string (YYYY-MM-DD).
 * Useful for API calls.
 *
 * @param date - The date to format
 * @returns ISO date string
 */
export function formatDateForAPI(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ============================================================================
// TODAY CALCULATIONS
// ============================================================================

/**
 * Calculate the scroll position needed to center today on screen.
 *
 * @param intervals - Array of time intervals
 * @param zoomLevel - Current zoom level
 * @param containerWidth - Width of the visible container
 * @returns Scroll position in pixels (clamped to valid range)
 */
export function calculateTodayScrollPosition(
  intervals: TimeInterval[],
  zoomLevel: ZoomLevel,
  containerWidth: number
): number {
  if (intervals.length === 0) return 0;

  const today = new Date();
  const totalWidth = calculateTotalWidth(intervals);
  const todayPosition = calculateBarLeft(today, intervals, zoomLevel);

  // Center today in the viewport
  const scrollPosition = todayPosition - containerWidth / 2;

  // Clamp to valid range
  return Math.max(0, Math.min(scrollPosition, totalWidth - containerWidth));
}

/**
 * Check if today falls within the current date range.
 *
 * @param dateRange - The current date range
 * @returns True if today is within the range
 */
export function isTodayInRange(dateRange: DateRange): boolean {
  const today = new Date();
  return today >= dateRange.start && today <= dateRange.end;
}

/**
 * Get the position of the "today" indicator line.
 *
 * @param intervals - Array of time intervals
 * @param zoomLevel - Current zoom level
 * @returns Left position in pixels, or null if today is out of range
 */
export function getTodayLinePosition(
  intervals: TimeInterval[],
  zoomLevel: ZoomLevel
): number | null {
  if (intervals.length === 0) return null;

  const today = new Date();
  const firstDate = intervals[0].date;
  const lastDate = intervals[intervals.length - 1].date;

  // Check if today is in range
  if (today < firstDate || today > lastDate) return null;

  return calculateBarLeft(today, intervals, zoomLevel);
}
