/**
 * Gantt Chart Types - Reusable Primitives
 *
 * Low-level types for Gantt chart functionality.
 * These are consumed by higher-level timeline components.
 *
 * @module gantt/types
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Zoom level options for the Gantt chart
 * Controls the time scale granularity
 */
export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

/**
 * A single time interval on the Gantt header
 */
export interface TimeInterval {
  /** The date representing the start of this interval */
  date: Date;
  /** Display label for the interval (e.g., "Jan 2025", "Week 1") */
  label: string;
  /** Width of the interval in pixels */
  width: number;
}

/**
 * Date range for the Gantt chart viewport
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Calculated position for a Gantt bar
 */
export interface BarPosition {
  /** Pixels from the left edge of the timeline */
  left: number;
  /** Width of the bar in pixels */
  width: number;
}

/**
 * CSS style object for positioning a Gantt bar
 */
export interface BarStyle {
  left: string;
  width: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Zoom level configuration
 * Maps each zoom level to its pixels-per-day and default interval width
 */
export const ZOOM_CONFIG: Record<ZoomLevel, {
  pixelsPerDay: number;
  intervalWidth: number;
  intervalLabel: string;
}> = {
  day: {
    pixelsPerDay: 80,
    intervalWidth: 80,
    intervalLabel: 'day',
  },
  week: {
    pixelsPerDay: 14, // 100px per week / 7 days
    intervalWidth: 100,
    intervalLabel: 'week',
  },
  month: {
    pixelsPerDay: 4, // 120px per month / ~30 days
    intervalWidth: 120,
    intervalLabel: 'month',
  },
  quarter: {
    pixelsPerDay: 1.5, // 200px per quarter / ~90 days
    intervalWidth: 200,
    intervalLabel: 'quarter',
  },
};

// ============================================================================
// GANTT ITEM TYPES
// ============================================================================

/**
 * Minimal item interface required for Gantt positioning
 * Timeline-specific data is optional for maximum reusability
 */
export interface GanttItem {
  id: string;
  name: string;
  /** Start date in ISO format (YYYY-MM-DD) */
  start_date?: string;
  /** End date in ISO format (YYYY-MM-DD) */
  end_date?: string;
  /** Calculated duration in days */
  duration_days?: number;
}

/**
 * Extended Gantt item with timeline phase and status
 * Used by the timeline-view component
 */
export interface TimelineGanttItem extends GanttItem {
  timeline_phase: 'MVP' | 'SHORT' | 'LONG';
  status: string;
  priority?: string;
  /** Dependencies on other items */
  dependencies: Array<{ targetId: string; type: string }>;
  assignee?: string;
  team?: string;
  /** Department ID (Phase 1 integration) */
  department_id?: string;
  /** Department object with color/icon for swimlanes */
  department?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

// ============================================================================
// SWIMLANE TYPES
// ============================================================================

/**
 * Grouping options for swimlane view
 * 'department' added for Phase 1 integration
 */
export type GroupByOption = 'status' | 'priority' | 'phase' | 'assignee' | 'department';

/**
 * A swimlane group containing items
 */
export interface SwimlaneGroup {
  id: string;
  title: string;
  color?: string;
  icon?: string;
  items: TimelineGanttItem[];
  isCollapsed?: boolean;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Phase colors for timeline items
 */
export const PHASE_COLORS: Record<string, string> = {
  MVP: 'bg-green-500',
  SHORT: 'bg-blue-500',
  LONG: 'bg-purple-500',
  default: 'bg-gray-400',
};

/**
 * Status colors for item borders
 */
export const STATUS_COLORS: Record<string, string> = {
  completed: 'border-green-600',
  in_progress: 'border-blue-600',
  planned: 'border-gray-400',
  on_hold: 'border-orange-600',
  default: 'border-gray-300',
};

/**
 * Get phase color class
 */
export function getPhaseColor(phase: string): string {
  return PHASE_COLORS[phase] || PHASE_COLORS.default;
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS.default;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if an item has valid dates for Gantt display
 */
export function hasValidDates(item: GanttItem): boolean {
  return !!(item.start_date && item.end_date);
}

/**
 * Type guard for TimelineGanttItem
 */
export function isTimelineGanttItem(item: GanttItem): item is TimelineGanttItem {
  return 'timeline_phase' in item && 'dependencies' in item;
}
