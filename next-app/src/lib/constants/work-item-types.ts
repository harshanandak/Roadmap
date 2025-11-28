/**
 * Work Item Types - Consolidated 4-Type System
 *
 * Simplified from 13 types to 4 core types with phase-aware field visibility.
 * Use tags for sub-categorization instead of proliferating types.
 */

// 4 Core Work Item Types
export const WORK_ITEM_TYPES = {
  CONCEPT: 'concept',
  FEATURE: 'feature',
  BUG: 'bug',
  ENHANCEMENT: 'enhancement',
} as const

export type WorkItemType = typeof WORK_ITEM_TYPES[keyof typeof WORK_ITEM_TYPES]

// Workspace phases (5-phase system)
export type WorkspacePhase = 'research' | 'planning' | 'execution' | 'review' | 'complete'

// Item type metadata
export const ITEM_TYPE_METADATA: Record<WorkItemType, {
  singular: string
  plural: string
  icon: string
  description: string
  color: string
}> = {
  concept: {
    singular: 'Concept',
    plural: 'Concepts',
    icon: '💡',
    description: 'Unvalidated idea or hypothesis in research phase',
    color: 'blue',
  },
  feature: {
    singular: 'Feature',
    plural: 'Features',
    icon: '⭐',
    description: 'New functionality to be built',
    color: 'purple',
  },
  bug: {
    singular: 'Bug',
    plural: 'Bugs',
    icon: '🐛',
    description: 'Something broken that needs fixing',
    color: 'red',
  },
  enhancement: {
    singular: 'Enhancement',
    plural: 'Enhancements',
    icon: '✨',
    description: 'Make existing functionality better',
    color: 'green',
  },
}

// ============================================================================
// PROGRESS TRACKING (8 states) - Execution Progress
// Formerly called "status" - renamed to "Progress" for clarity
// Used for: tracking execution state (not_started → in_progress → completed)
// ============================================================================
export const PROGRESS_STATES = {
  NOT_STARTED: 'not_started',
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  REVIEW: 'review',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
} as const

export type TimelineProgress = typeof PROGRESS_STATES[keyof typeof PROGRESS_STATES]

// Legacy alias for backwards compatibility
export const TIMELINE_ITEM_STATUSES = PROGRESS_STATES
export type TimelineItemStatus = TimelineProgress

// ============================================================================
// LIFECYCLE STATUS (5 states) - Development Lifecycle Phase
// Formerly called "phase" - renamed to "Status" in UI
// Used for: tracking where in the development lifecycle (research → complete)
// This is the NEW "Status" that appears on each MVP/SHORT/LONG timeline item
// ============================================================================
export const LIFECYCLE_STATUSES = {
  RESEARCH: 'research',
  PLANNING: 'planning',
  EXECUTION: 'execution',
  REVIEW: 'review',
  COMPLETE: 'complete',
} as const

export type LifecycleStatus = typeof LIFECYCLE_STATUSES[keyof typeof LIFECYCLE_STATUSES]

// Legacy aliases for backwards compatibility
export const TIMELINE_ITEM_PHASES = LIFECYCLE_STATUSES
export type TimelineItemPhase = LifecycleStatus

// Lifecycle Status metadata (shown as "Status" in UI)
export const LIFECYCLE_STATUS_METADATA: Record<LifecycleStatus, {
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  research: {
    label: 'Research',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100 border-indigo-300',
    description: 'Investigating requirements and approach',
  },
  planning: {
    label: 'Planning',
    color: 'text-violet-700',
    bgColor: 'bg-violet-100 border-violet-300',
    description: 'Defining scope and timeline',
  },
  execution: {
    label: 'Execution',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100 border-emerald-300',
    description: 'Active development',
  },
  review: {
    label: 'Review',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-300',
    description: 'Testing and validation',
  },
  complete: {
    label: 'Complete',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    description: 'Finished',
  },
}

// Legacy alias for backwards compatibility
export const PHASE_METADATA = LIFECYCLE_STATUS_METADATA

/**
 * Get lifecycle status label (shown as "Status" in UI)
 */
export function getLifecycleStatusLabel(status: LifecycleStatus | string): string {
  return LIFECYCLE_STATUS_METADATA[status as LifecycleStatus]?.label || status
}

/**
 * Get lifecycle status color class
 */
export function getLifecycleStatusColor(status: LifecycleStatus | string): string {
  return LIFECYCLE_STATUS_METADATA[status as LifecycleStatus]?.color || 'text-gray-700'
}

/**
 * Get lifecycle status background color class
 */
export function getLifecycleStatusBgColor(status: LifecycleStatus | string): string {
  return LIFECYCLE_STATUS_METADATA[status as LifecycleStatus]?.bgColor || 'bg-gray-100 border-gray-300'
}

// Legacy function aliases for backwards compatibility
export const getPhaseLabel = getLifecycleStatusLabel
export const getPhaseColor = getLifecycleStatusColor
export const getPhaseBgColor = getLifecycleStatusBgColor

// ============================================================================
// PROGRESS METADATA (8-state execution tracking)
// Formerly called "STATUS_METADATA" - renamed to PROGRESS_METADATA
// Used in UI as "Progress" indicator
// ============================================================================
export const PROGRESS_METADATA: Record<TimelineProgress, {
  label: string
  color: string
  description: string
}> = {
  not_started: {
    label: 'Not Started',
    color: 'gray',
    description: 'Work hasn\'t begun yet',
  },
  planning: {
    label: 'Planning',
    color: 'blue',
    description: 'Defining requirements and approach',
  },
  in_progress: {
    label: 'In Progress',
    color: 'yellow',
    description: 'Actively being worked on',
  },
  blocked: {
    label: 'Blocked',
    color: 'red',
    description: 'Waiting on external dependency',
  },
  review: {
    label: 'In Review',
    color: 'purple',
    description: 'Under review before completion',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    description: 'Work is done',
  },
  on_hold: {
    label: 'On Hold',
    color: 'orange',
    description: 'Paused temporarily',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'gray',
    description: 'Work was stopped and won\'t continue',
  },
}

// Legacy alias for backwards compatibility
export const STATUS_METADATA = PROGRESS_METADATA

// Feedback source types (3 types)
export const FEEDBACK_SOURCES = {
  INTERNAL: 'internal',
  CUSTOMER: 'customer',
  USER: 'user',
} as const

export type FeedbackSource = typeof FEEDBACK_SOURCES[keyof typeof FEEDBACK_SOURCES]

// Feedback priorities (2 levels - forces clear decisions)
export const FEEDBACK_PRIORITIES = {
  HIGH: 'high',
  LOW: 'low',
} as const

export type FeedbackPriority = typeof FEEDBACK_PRIORITIES[keyof typeof FEEDBACK_PRIORITIES]

// Feedback statuses
export const FEEDBACK_STATUSES = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  IMPLEMENTED: 'implemented',
  DEFERRED: 'deferred',
  REJECTED: 'rejected',
} as const

export type FeedbackStatus = typeof FEEDBACK_STATUSES[keyof typeof FEEDBACK_STATUSES]

/**
 * Get the appropriate item types for a given workspace phase
 * All 4 types are available in all phases - phase affects field visibility, not types
 */
export function getPhaseItemTypes(phase: WorkspacePhase): WorkItemType[] {
  return Object.values(WORK_ITEM_TYPES)
}

/**
 * Get dynamic label for an item type
 */
export function getItemLabel(type: WorkItemType | string, plural = false): string {
  const typeInfo = ITEM_TYPE_METADATA[type as WorkItemType]
  if (!typeInfo) {
    return plural ? 'Work Items' : 'Work Item'
  }
  return plural ? typeInfo.plural : typeInfo.singular
}

/**
 * Get icon for an item type
 */
export function getItemIcon(type: WorkItemType | string): string {
  return ITEM_TYPE_METADATA[type as WorkItemType]?.icon || '📋'
}

/**
 * Get description for an item type
 */
export function getItemDescription(type: WorkItemType | string): string {
  return ITEM_TYPE_METADATA[type as WorkItemType]?.description || 'A work item in your product roadmap'
}

/**
 * Get color for an item type
 */
export function getItemColor(type: WorkItemType | string): string {
  return ITEM_TYPE_METADATA[type as WorkItemType]?.color || 'gray'
}

/**
 * Get progress label (8-state execution progress)
 */
export function getProgressLabel(progress: TimelineProgress | string): string {
  return PROGRESS_METADATA[progress as TimelineProgress]?.label || progress
}

/**
 * Get progress color (8-state execution progress)
 */
export function getProgressColor(progress: TimelineProgress | string): string {
  return PROGRESS_METADATA[progress as TimelineProgress]?.color || 'gray'
}

// Legacy aliases for backwards compatibility
export const getStatusLabel = getProgressLabel
export const getStatusColor = getProgressColor

/**
 * Check if field should be visible/editable based on phase
 * Research: Basic fields only (name, purpose, tags)
 * Planning+: All fields (target_release, acceptance_criteria, etc.)
 * Execution+: Planning fields locked, execution fields unlocked
 */
export function isFieldVisibleInPhase(field: string, phase: WorkspacePhase): boolean {
  // Fields always visible in all phases
  const basicFields = ['name', 'purpose', 'tags', 'type']
  if (basicFields.includes(field)) return true

  // Fields visible from Planning phase onwards
  const planningFields = [
    'target_release',
    'acceptance_criteria',
    'business_value',
    'customer_impact',
    'strategic_alignment',
    'estimated_hours',
    'priority',
    'stakeholders',
  ]
  if (planningFields.includes(field)) {
    return ['planning', 'execution', 'review', 'complete'].includes(phase)
  }

  // Fields visible from Execution phase onwards
  const executionFields = [
    'actual_start_date',
    'actual_end_date',
    'actual_hours',
    'progress_percent',
    'blockers',
  ]
  if (executionFields.includes(field)) {
    return ['execution', 'review', 'complete'].includes(phase)
  }

  return false
}

/**
 * Check if field should be locked (read-only) based on phase
 * Example: Planning fields locked once in Execution phase
 */
export function isFieldLockedInPhase(field: string, phase: WorkspacePhase): boolean {
  // Planning fields lock once in Execution
  const planningFields = [
    'target_release',
    'acceptance_criteria',
    'business_value',
    'estimated_hours',
  ]
  if (planningFields.includes(field)) {
    return ['execution', 'review', 'complete'].includes(phase)
  }

  return false
}

/**
 * Get suggested priority for feedback based on source
 */
export function getSuggestedPriority(source: FeedbackSource): FeedbackPriority {
  // Customers are paying users - default to high priority
  if (source === FEEDBACK_SOURCES.CUSTOMER) {
    return FEEDBACK_PRIORITIES.HIGH
  }
  // Internal and non-paying users - default to low
  return FEEDBACK_PRIORITIES.LOW
}

/**
 * Get conversion-appropriate types (what an item can be converted to)
 * Simplified: concept → feature/bug, feature ↔ enhancement ↔ bug
 */
export function getConversionTargets(currentType: WorkItemType): WorkItemType[] {
  const conversionMap: Record<WorkItemType, WorkItemType[]> = {
    concept: [WORK_ITEM_TYPES.FEATURE, WORK_ITEM_TYPES.BUG, WORK_ITEM_TYPES.ENHANCEMENT],
    feature: [WORK_ITEM_TYPES.ENHANCEMENT, WORK_ITEM_TYPES.BUG],
    bug: [WORK_ITEM_TYPES.FEATURE, WORK_ITEM_TYPES.ENHANCEMENT],
    enhancement: [WORK_ITEM_TYPES.FEATURE, WORK_ITEM_TYPES.BUG],
  }

  return conversionMap[currentType] || []
}

/**
 * Get phase-appropriate helper text
 */
export function getPhaseHelperText(phase: WorkspacePhase): string {
  const phaseHelpers: Record<WorkspacePhase, string> = {
    research: 'Research phase - All types available, basic fields only',
    planning: 'Planning phase - All fields unlocked for planning',
    execution: 'Execution phase - Planning locked, execution tracking enabled',
    review: 'Review phase - Gather feedback, track completion',
    complete: 'Complete - All types and fields available',
  }
  return phaseHelpers[phase] || ''
}
