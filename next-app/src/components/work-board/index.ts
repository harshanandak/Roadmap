// Work Board 3.0 Components
// Main shell and context
export { WorkBoardShell } from './work-board-shell'
export type { WorkItem, TimelineItem, Task, TeamMember, WorkBoardShellProps } from './work-board-shell'

// Context and types
export {
  WorkBoardProvider,
  useWorkBoardContext,
  // Types
  type PrimaryTab,
  type ViewMode,
  type WorkItemStatus,
  type TaskStatus,
  type WorkItemType,
  type TaskType,
  type Priority,
  type TimelineType,
  type FilterState,
  type WorkBoardPreferences,
  // Constants
  WORK_ITEM_STATUSES,
  TASK_STATUSES,
  WORK_ITEM_TYPES,
  TASK_TYPES,
  PRIORITIES,
  TIMELINE_TYPES,
  // Display helpers
  statusDisplayMap,
  typeDisplayMap,
  priorityDisplayMap,
  timelineDisplayMap,
} from './shared/filter-context'

// Sub-components
export { WorkBoardTabs, WorkBoardTabsStandalone } from './work-board-tabs'
export { WorkBoardToolbar } from './work-board-toolbar'
export { ViewModeToggle, ViewModeToggleStandalone } from './view-mode-toggle'

// View components
export { WorkItemsBoardView } from './work-items-view/work-items-board-view'
