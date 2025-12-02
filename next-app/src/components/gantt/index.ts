/**
 * Gantt Chart Primitives
 *
 * Reusable components, hooks, and utilities for Gantt chart functionality.
 * Used by timeline-view and other timeline components.
 *
 * @module gantt
 *
 * @example
 * ```tsx
 * import {
 *   // Types
 *   ZoomLevel,
 *   TimeInterval,
 *   GanttItem,
 *
 *   // Hooks
 *   useGanttLayout,
 *   useGanttDrag,
 *
 *   // Components
 *   GanttHeader,
 *   ZoomSelector,
 *   TodayButton,
 *
 *   // Utilities
 *   calculateDateRange,
 *   calculateBarStyle,
 * } from '@/components/gantt';
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  ZoomLevel,
  TimeInterval,
  DateRange,
  BarPosition,
  BarStyle,
  GanttItem,
  TimelineGanttItem,
  GroupByOption,
  SwimlaneGroup,
} from './types';

export {
  ZOOM_CONFIG,
  PHASE_COLORS,
  STATUS_COLORS,
  getPhaseColor,
  getStatusColor,
  hasValidDates,
  isTimelineGanttItem,
} from './types';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  // Date range
  calculateDateRange,

  // Time intervals
  generateTimeIntervals,
  calculateTotalWidth,

  // Bar positioning
  getPixelsPerDay,
  calculateBarLeft,
  calculateBarWidth,
  calculateBarStyle,

  // Drag calculations
  pixelsToDays,
  calculateNewDates,
  formatDateForAPI,

  // Today utilities
  calculateTodayScrollPosition,
  isTodayInRange,
  getTodayLinePosition,
} from './gantt-utils';

// ============================================================================
// HOOKS
// ============================================================================

export {
  useGanttLayout,
  usePersistedZoomLevel,
} from './use-gantt-layout';

export type {
  UseGanttLayoutOptions,
  UseGanttLayoutResult,
} from './use-gantt-layout';

export {
  useGanttDrag,
  useSwimlaneItemMove,
} from './use-gantt-drag';

export type {
  UseGanttDragOptions,
  UseGanttDragResult,
  UseSwimlaneDropOptions,
} from './use-gantt-drag';

// ============================================================================
// COMPONENTS
// ============================================================================

export {
  GanttHeader,
  GanttGrid,
  ZoomSelector,
  TodayButton,
} from './gantt-header';

export type {
  GanttHeaderProps,
  GanttGridProps,
  ZoomSelectorProps,
  TodayButtonProps,
} from './gantt-header';
