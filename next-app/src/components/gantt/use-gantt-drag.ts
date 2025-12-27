/**
 * useGanttDrag Hook - Drag-to-Reschedule Functionality
 *
 * React hook that provides drag-and-drop date rescheduling for Gantt items.
 * Uses @dnd-kit for drag handling with optimistic updates.
 *
 * @module gantt/use-gantt-drag
 */

import { useCallback } from 'react';
import { addDays, format } from 'date-fns';
import { DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { ZoomLevel, GanttItem } from './types';
import { pixelsToDays } from './gantt-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface UseGanttDragOptions<T extends GanttItem> {
  /** Current zoom level for pixel-to-day conversion */
  zoomLevel: ZoomLevel;
  /** Callback to update items (for optimistic updates) */
  onItemsChange: (updater: (items: T[]) => T[]) => void;
  /** API endpoint for persisting date changes */
  apiEndpoint?: (itemId: string) => string;
  /** Callback when drag completes successfully */
  onDragSuccess?: (item: T, oldDates: { start: string; end: string }, newDates: { start: string; end: string }) => void;
  /** Callback when drag fails */
  onDragError?: (item: T, error: Error) => void;
  /** Minimum pixel movement before drag activates */
  activationDistance?: number;
}

export interface UseGanttDragResult {
  /** DnD-kit sensors to pass to DndContext */
  sensors: ReturnType<typeof useSensors>;
  /** Handler for DndContext onDragEnd */
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  /** Calculate new dates from drag delta (utility) */
  calculateNewDatesFromDelta: (
    item: GanttItem,
    deltaPixels: number
  ) => { startDate: string; endDate: string } | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for handling drag-to-reschedule in Gantt charts.
 * Provides @dnd-kit sensors and handlers with optimistic updates.
 *
 * @param items - Current array of Gantt items
 * @param options - Drag options including callbacks
 * @returns Sensors and handlers for DndContext
 *
 * @example
 * ```tsx
 * const [items, setItems] = useState(initialItems);
 *
 * const { sensors, handleDragEnd } = useGanttDrag(items, {
 *   zoomLevel: 'month',
 *   onItemsChange: setItems,
 *   apiEndpoint: (id) => `/api/work-items/${id}/dates`,
 *   onDragSuccess: (item, old, new) => {
 *     toast({ title: `Rescheduled ${item.name}` });
 *   },
 * });
 *
 * return (
 *   <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
 *     {items.map(item => (
 *       <DraggableTimelineBar key={item.id} item={item} />
 *     ))}
 *   </DndContext>
 * );
 * ```
 */
export function useGanttDrag<T extends GanttItem>(
  items: T[],
  options: UseGanttDragOptions<T>
): UseGanttDragResult {
  const {
    zoomLevel,
    onItemsChange,
    apiEndpoint = (id) => `/api/work-items/${id}/dates`,
    onDragSuccess,
    onDragError,
    activationDistance = 8,
  } = options;

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: activationDistance,
      },
    })
  );

  // Utility to calculate new dates from pixel delta
  const calculateNewDatesFromDelta = useCallback(
    (item: GanttItem, deltaPixels: number): { startDate: string; endDate: string } | null => {
      if (!item.start_date || !item.end_date) return null;

      const daysDelta = pixelsToDays(deltaPixels, zoomLevel);
      if (daysDelta === 0) return null;

      const oldStartDate = new Date(item.start_date);
      const oldEndDate = new Date(item.end_date);

      return {
        startDate: format(addDays(oldStartDate, daysDelta), 'yyyy-MM-dd'),
        endDate: format(addDays(oldEndDate, daysDelta), 'yyyy-MM-dd'),
      };
    },
    [zoomLevel]
  );

  // Handle drag end with optimistic updates
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, delta } = event;

      // No movement
      if (!delta || delta.x === 0) return;

      const itemId = active.id as string;
      const item = items.find((i) => i.id === itemId);

      // Item not found or no dates
      if (!item || !item.start_date || !item.end_date) return;

      const newDates = calculateNewDatesFromDelta(item, delta.x);
      if (!newDates) return;

      const oldDates = {
        start: item.start_date,
        end: item.end_date,
      };

      // Optimistic update
      onItemsChange((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                start_date: newDates.startDate,
                end_date: newDates.endDate,
              }
            : i
        )
      );

      // API call
      try {
        const response = await fetch(apiEndpoint(itemId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planned_start_date: newDates.startDate,
            planned_end_date: newDates.endDate,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update dates');
        }

        const updatedItem = await response.json();

        // Update with server response
        onItemsChange((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, ...updatedItem } : i))
        );

        // Success callback
        onDragSuccess?.(
          item,
          oldDates,
          { start: newDates.startDate, end: newDates.endDate }
        );
      } catch (error) {
        // Rollback on error
        onItemsChange((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  start_date: oldDates.start,
                  end_date: oldDates.end,
                }
              : i
          )
        );

        // Error callback
        onDragError?.(item, error instanceof Error ? error : new Error('Unknown error'));
      }
    },
    [items, onItemsChange, apiEndpoint, onDragSuccess, onDragError, calculateNewDatesFromDelta]
  );

  return {
    sensors,
    handleDragEnd,
    calculateNewDatesFromDelta,
  };
}

// ============================================================================
// SWIMLANE DRAG HOOK
// ============================================================================

export interface UseSwimlaneDropOptions<T extends GanttItem> {
  /** Current zoom level */
  zoomLevel: ZoomLevel;
  /** The field used for grouping (status, priority, phase, assignee, department) */
  groupByField: string;
  /** Callback to update items */
  onItemsChange: (updater: (items: T[]) => T[]) => void;
  /** API endpoint for updates */
  apiEndpoint?: (itemId: string) => string;
  /** Success callback */
  onMoveSuccess?: (item: T, fromGroup: string, toGroup: string) => void;
  /** Error callback */
  onMoveError?: (item: T, error: Error) => void;
}

/**
 * Hook for handling cross-swimlane drops (changing status/priority/etc).
 * Handles both horizontal reschedule and vertical lane changes.
 *
 * @param items - Current items
 * @param options - Drop options
 * @returns Handler for swimlane item moves
 */
export function useSwimlaneItemMove<T extends GanttItem & Record<string, unknown>>(
  items: T[],
  options: UseSwimlaneDropOptions<T>
) {
  const {
    zoomLevel,
    groupByField,
    onItemsChange,
    apiEndpoint = (id) => `/api/work-items/${id}`,
    onMoveSuccess,
    onMoveError,
  } = options;

  const handleSwimlaneItemMove = useCallback(
    async (
      itemId: string,
      fromGroup: string,
      toGroup: string,
      deltaPixels?: number
    ) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Horizontal drag (date reschedule)
      if (deltaPixels && deltaPixels !== 0 && item.start_date && item.end_date) {
        const daysDelta = pixelsToDays(deltaPixels, zoomLevel);
        if (daysDelta === 0) return;

        const oldStartDate = new Date(item.start_date);
        const oldEndDate = new Date(item.end_date);
        const newStartDate = format(addDays(oldStartDate, daysDelta), 'yyyy-MM-dd');
        const newEndDate = format(addDays(oldEndDate, daysDelta), 'yyyy-MM-dd');

        const oldDates = { start: item.start_date, end: item.end_date };

        // Optimistic update
        onItemsChange((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, start_date: newStartDate, end_date: newEndDate }
              : i
          )
        );

        try {
          const response = await fetch(apiEndpoint(itemId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planned_start_date: newStartDate,
              planned_end_date: newEndDate,
            }),
          });

          if (!response.ok) throw new Error('Failed to update dates');
        } catch (error) {
          // Rollback
          onItemsChange((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? { ...i, start_date: oldDates.start, end_date: oldDates.end }
                : i
            )
          );
          onMoveError?.(item, error instanceof Error ? error : new Error('Unknown error'));
        }

        return;
      }

      // Vertical drag (lane change)
      if (fromGroup === toGroup) return;

      const oldValue = item[groupByField];

      // Optimistic update
      onItemsChange((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, [groupByField]: toGroup } : i
        )
      );

      try {
        const response = await fetch(apiEndpoint(itemId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [groupByField]: toGroup }),
        });

        if (!response.ok) throw new Error(`Failed to update ${groupByField}`);

        onMoveSuccess?.(item, fromGroup, toGroup);
      } catch (error) {
        // Rollback
        onItemsChange((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, [groupByField]: oldValue } : i
          )
        );
        onMoveError?.(item, error instanceof Error ? error : new Error('Unknown error'));
      }
    },
    [items, zoomLevel, groupByField, onItemsChange, apiEndpoint, onMoveSuccess, onMoveError]
  );

  return { handleSwimlaneItemMove };
}
