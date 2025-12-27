'use client'

/**
 * Widget Registry
 * Defines all available widgets for the custom dashboard builder (Pro feature)
 * Extensible architecture for future Option C (Free-Form Builder)
 */

import { TrendingUp, PieChart, Activity, Gauge } from 'lucide-react'
import type { WidgetDefinition, WidgetCategory } from '@/lib/types/analytics'

// Widget IDs for type safety
export const WIDGET_IDS = {
  // Metrics widgets
  TOTAL_WORK_ITEMS: 'total-work-items',
  COMPLETION_RATE: 'completion-rate',
  BLOCKED_COUNT: 'blocked-count',
  HEALTH_SCORE: 'health-score',
  ALIGNMENT_RATE: 'alignment-rate',
  OVERDUE_COUNT: 'overdue-count',
  CYCLE_TIME: 'cycle-time',

  // Chart widgets
  STATUS_PIE: 'status-pie',
  TYPE_PIE: 'type-pie',
  PHASE_PIE: 'phase-pie',
  PRIORITY_PIE: 'priority-pie',
  DEPENDENCY_TYPE_PIE: 'dependency-type-pie',
  STRATEGY_TYPE_PIE: 'strategy-type-pie',

  // Bar chart widgets
  TEAM_WORKLOAD: 'team-workload',
  TASKS_BY_TYPE: 'tasks-by-type',

  // Line chart widgets
  COMPLETION_TREND: 'completion-trend',
  VELOCITY_TREND: 'velocity-trend',

  // List widgets
  RECENT_ACTIVITY: 'recent-activity',
  BLOCKED_ITEMS: 'blocked-items',
  UNALIGNED_ITEMS: 'unaligned-items',
  CRITICAL_PATH: 'critical-path',

  // Progress widgets
  PILLAR_PROGRESS: 'pillar-progress',
} as const

export type WidgetId = (typeof WIDGET_IDS)[keyof typeof WIDGET_IDS]

// Widget category icons
export const CATEGORY_ICONS: Record<WidgetCategory, React.ReactNode> = {
  metrics: <Gauge className="h-4 w-4" />,
  charts: <PieChart className="h-4 w-4" />,
  lists: <Activity className="h-4 w-4" />,
  progress: <TrendingUp className="h-4 w-4" />,
}

// Widget definitions registry
// Note: Components are loaded dynamically to support code splitting
export const WIDGET_REGISTRY: Record<WidgetId, Omit<WidgetDefinition, 'component'>> = {
  // ========== METRICS WIDGETS ==========
  [WIDGET_IDS.TOTAL_WORK_ITEMS]: {
    id: WIDGET_IDS.TOTAL_WORK_ITEMS,
    name: 'Total Work Items',
    description: 'Count of all work items',
    category: 'metrics',
    icon: 'LayoutGrid',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 1 },
  },
  [WIDGET_IDS.COMPLETION_RATE]: {
    id: WIDGET_IDS.COMPLETION_RATE,
    name: 'Completion Rate',
    description: 'Percentage of completed items',
    category: 'metrics',
    icon: 'CheckCircle',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 1 },
  },
  [WIDGET_IDS.BLOCKED_COUNT]: {
    id: WIDGET_IDS.BLOCKED_COUNT,
    name: 'Blocked Items',
    description: 'Count of blocked items',
    category: 'metrics',
    icon: 'AlertTriangle',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 1 },
  },
  [WIDGET_IDS.HEALTH_SCORE]: {
    id: WIDGET_IDS.HEALTH_SCORE,
    name: 'Health Score',
    description: 'Dependency health gauge',
    category: 'metrics',
    icon: 'Heart',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
  },
  [WIDGET_IDS.ALIGNMENT_RATE]: {
    id: WIDGET_IDS.ALIGNMENT_RATE,
    name: 'Strategy Alignment',
    description: 'Percentage aligned to strategy',
    category: 'metrics',
    icon: 'Target',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 1 },
  },
  [WIDGET_IDS.OVERDUE_COUNT]: {
    id: WIDGET_IDS.OVERDUE_COUNT,
    name: 'Overdue Tasks',
    description: 'Count of overdue tasks',
    category: 'metrics',
    icon: 'Clock',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 1 },
  },
  [WIDGET_IDS.CYCLE_TIME]: {
    id: WIDGET_IDS.CYCLE_TIME,
    name: 'Average Cycle Time',
    description: 'Average days to completion',
    category: 'metrics',
    icon: 'Timer',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 1 },
  },

  // ========== PIE CHART WIDGETS ==========
  [WIDGET_IDS.STATUS_PIE]: {
    id: WIDGET_IDS.STATUS_PIE,
    name: 'Items by Status',
    description: 'Work items by current status',
    category: 'charts',
    icon: 'PieChart',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
  },
  [WIDGET_IDS.TYPE_PIE]: {
    id: WIDGET_IDS.TYPE_PIE,
    name: 'Items by Type',
    description: 'Work items by type (feature, bug, etc)',
    category: 'charts',
    icon: 'PieChart',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
  },
  [WIDGET_IDS.PHASE_PIE]: {
    id: WIDGET_IDS.PHASE_PIE,
    name: 'Items by Phase',
    description: 'Work items by lifecycle phase',
    category: 'charts',
    icon: 'PieChart',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
  },
  [WIDGET_IDS.PRIORITY_PIE]: {
    id: WIDGET_IDS.PRIORITY_PIE,
    name: 'Items by Priority',
    description: 'Work items by priority level',
    category: 'charts',
    icon: 'PieChart',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
  },
  [WIDGET_IDS.DEPENDENCY_TYPE_PIE]: {
    id: WIDGET_IDS.DEPENDENCY_TYPE_PIE,
    name: 'Dependencies by Type',
    description: 'Dependency connections by type',
    category: 'charts',
    icon: 'PieChart',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
  },
  [WIDGET_IDS.STRATEGY_TYPE_PIE]: {
    id: WIDGET_IDS.STRATEGY_TYPE_PIE,
    name: 'Strategies by Type',
    description: 'Pillars, objectives, key results',
    category: 'charts',
    icon: 'PieChart',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
  },

  // ========== BAR CHART WIDGETS ==========
  [WIDGET_IDS.TEAM_WORKLOAD]: {
    id: WIDGET_IDS.TEAM_WORKLOAD,
    name: 'Team Workload',
    description: 'Tasks per team member',
    category: 'charts',
    icon: 'BarChart3',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
  },
  [WIDGET_IDS.TASKS_BY_TYPE]: {
    id: WIDGET_IDS.TASKS_BY_TYPE,
    name: 'Tasks by Type',
    description: 'Task distribution by type',
    category: 'charts',
    icon: 'BarChart3',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
  },

  // ========== LINE CHART WIDGETS ==========
  [WIDGET_IDS.COMPLETION_TREND]: {
    id: WIDGET_IDS.COMPLETION_TREND,
    name: 'Completion Trend',
    description: 'Items completed over time',
    category: 'charts',
    icon: 'TrendingUp',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
  },
  [WIDGET_IDS.VELOCITY_TREND]: {
    id: WIDGET_IDS.VELOCITY_TREND,
    name: 'Velocity Trend',
    description: 'Tasks completed per week',
    category: 'charts',
    icon: 'TrendingUp',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 3 },
  },

  // ========== LIST WIDGETS ==========
  [WIDGET_IDS.RECENT_ACTIVITY]: {
    id: WIDGET_IDS.RECENT_ACTIVITY,
    name: 'Recent Activity',
    description: 'Latest updates and changes',
    category: 'lists',
    icon: 'Activity',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
  },
  [WIDGET_IDS.BLOCKED_ITEMS]: {
    id: WIDGET_IDS.BLOCKED_ITEMS,
    name: 'Blocked Items List',
    description: 'Items currently blocked',
    category: 'lists',
    icon: 'AlertTriangle',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
  },
  [WIDGET_IDS.UNALIGNED_ITEMS]: {
    id: WIDGET_IDS.UNALIGNED_ITEMS,
    name: 'Unaligned Items',
    description: 'Work items not linked to strategy',
    category: 'lists',
    icon: 'Link2Off',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
  },
  [WIDGET_IDS.CRITICAL_PATH]: {
    id: WIDGET_IDS.CRITICAL_PATH,
    name: 'Critical Path',
    description: 'Longest dependency chain',
    category: 'lists',
    icon: 'GitBranch',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
  },

  // ========== PROGRESS WIDGETS ==========
  [WIDGET_IDS.PILLAR_PROGRESS]: {
    id: WIDGET_IDS.PILLAR_PROGRESS,
    name: 'Pillar Progress',
    description: 'Progress by strategic pillar',
    category: 'progress',
    icon: 'Target',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
  },
}

// Get widgets by category
export function getWidgetsByCategory(category: WidgetCategory): Array<Omit<WidgetDefinition, 'component'>> {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.category === category)
}

// Get all widget categories with their widgets
export function getWidgetCategories(): Array<{ category: WidgetCategory; label: string; widgets: Array<Omit<WidgetDefinition, 'component'>> }> {
  const categories: WidgetCategory[] = ['metrics', 'charts', 'lists', 'progress']
  const labels: Record<WidgetCategory, string> = {
    metrics: 'Metrics',
    charts: 'Charts',
    lists: 'Lists',
    progress: 'Progress',
  }

  return categories.map((category) => ({
    category,
    label: labels[category],
    widgets: getWidgetsByCategory(category),
  }))
}
