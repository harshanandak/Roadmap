/**
 * Analytics Module Type Definitions
 * Phase 3 Session 2: Analytics Dashboards with 4 pre-built dashboards
 */

import type { ComponentType } from 'react'

// ========== CORE TYPES ==========

/**
 * Date range for analytics filtering
 */
export interface DateRange {
  from: string // ISO date string
  to: string // ISO date string
}

/**
 * Scope of analytics data
 * - workspace: Data for current workspace only
 * - team: Data across all workspaces in team
 */
export type AnalyticsScope = 'workspace' | 'team'

/**
 * Pre-built dashboard types
 */
export type DashboardType =
  | 'feature-overview'
  | 'dependency-health'
  | 'team-performance'
  | 'strategy-alignment'

/**
 * Dashboard configuration metadata
 */
export interface DashboardConfig {
  type: DashboardType
  label: string
  description: string
  icon: string // Lucide icon name
}

export const DASHBOARD_CONFIGS: Record<DashboardType, DashboardConfig> = {
  'feature-overview': {
    type: 'feature-overview',
    label: 'Feature Overview',
    description: 'Work items by status, type, and priority',
    icon: 'LayoutGrid',
  },
  'dependency-health': {
    type: 'dependency-health',
    label: 'Dependency Health',
    description: 'Dependency graph health and risk analysis',
    icon: 'GitBranch',
  },
  'team-performance': {
    type: 'team-performance',
    label: 'Team Performance',
    description: 'Task completion and team velocity',
    icon: 'Users',
  },
  'strategy-alignment': {
    type: 'strategy-alignment',
    label: 'Strategy Alignment',
    description: 'OKR progress and work item alignment',
    icon: 'Target',
  },
}

// ========== CHART DATA TYPES ==========

/**
 * Data point for pie/donut charts
 * Note: Index signature required for Recharts compatibility
 */
export interface PieChartData {
  name: string
  value: number
  color?: string
  [key: string]: string | number | undefined
}

/**
 * Data point for bar charts
 */
export interface BarChartData {
  name: string
  value: number
  [key: string]: string | number // For multi-series support
}

/**
 * Data point for line charts
 */
export interface LineChartData {
  date: string
  value: number
  [key: string]: string | number // For multi-series support
}

/**
 * Activity item for timeline displays
 */
export interface ActivityItem {
  id: string
  type: 'created' | 'updated' | 'completed' | 'blocked' | 'unblocked'
  workItemId: string
  workItemName: string
  timestamp: string
  userId?: string
  userName?: string
}

// ========== DASHBOARD RESPONSE TYPES ==========

/**
 * Feature Overview Dashboard Data
 */
export interface FeatureOverviewData {
  totalWorkItems: number
  byStatus: PieChartData[]
  byType: PieChartData[]
  byPhase: PieChartData[]
  byPriority: PieChartData[]
  completionTrend: LineChartData[]
  completionRate: number
  recentActivity: ActivityItem[]
}

/**
 * Dependency Health Dashboard Data
 */
export interface DependencyHealthData {
  totalDependencies: number
  blockedCount: number
  byType: PieChartData[]
  healthScore: number // 0-100
  criticalPath: {
    length: number
    items: Array<{ id: string; name: string }>
  }
  blockedItems: Array<{
    id: string
    name: string
    blockedBy: string[]
    blockedByCount: number
  }>
  riskItems: Array<{
    id: string
    name: string
    dependencyCount: number
    riskScore: number
  }>
}

/**
 * Team Performance Dashboard Data
 */
export interface TeamPerformanceData {
  totalTasks: number
  tasksByStatus: PieChartData[]
  tasksByType: BarChartData[]
  tasksByAssignee: BarChartData[]
  overdueCount: number
  completionRate: number
  velocityTrend: LineChartData[]
  avgCycleTimeDays: number
}

/**
 * Strategy Alignment Dashboard Data
 */
export interface StrategyAlignmentData {
  totalStrategies: number
  byType: PieChartData[]
  byStatus: PieChartData[]
  alignedWorkItemCount: number
  unalignedWorkItemCount: number
  alignmentRate: number // percentage
  progressByPillar: Array<{
    id: string
    name: string
    progress: number
    workItemCount: number
  }>
  unalignedItems: Array<{
    id: string
    name: string
    type: string
  }>
}

// ========== WIDGET SYSTEM TYPES ==========

/**
 * Widget categories for organization
 */
export type WidgetCategory = 'metrics' | 'charts' | 'lists' | 'progress'

/**
 * Widget props passed to all widget components
 */
export interface WidgetProps<TData = unknown> {
  data: TData
  isLoading: boolean
  error?: Error | null
  className?: string
}

/**
 * Widget definition for registry (extensible for future Option C)
 */
export interface WidgetDefinition<TData = unknown> {
  id: string
  name: string
  description: string
  category: WidgetCategory
  icon: string
  component: ComponentType<WidgetProps<TData>>
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  maxSize?: { w: number; h: number }
  requiresPro?: boolean
}

/**
 * Widget instance (placed on a dashboard)
 */
export interface WidgetInstance {
  id: string
  widgetId: string
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, unknown>
}

// ========== CUSTOM DASHBOARD TYPES ==========

/**
 * Custom dashboard configuration (stored in database)
 */
export interface CustomDashboard {
  id: string
  team_id: string
  workspace_id: string | null // null for team-wide dashboards
  name: string
  description?: string
  widgets: WidgetInstance[]
  scope: AnalyticsScope
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Create custom dashboard request
 */
export interface CreateCustomDashboardRequest {
  name: string
  description?: string
  workspace_id?: string
  widgets: WidgetInstance[]
  scope: AnalyticsScope
}

/**
 * Update custom dashboard request
 */
export interface UpdateCustomDashboardRequest {
  name?: string
  description?: string
  widgets?: WidgetInstance[]
}

// ========== API RESPONSE TYPES ==========

/**
 * Generic analytics API response
 */
export interface AnalyticsApiResponse<T> {
  data: T
  generatedAt: string
  scope: AnalyticsScope
}

/**
 * Analytics API error response
 */
export interface AnalyticsApiError {
  error: string
  code?: string
  details?: Record<string, unknown>
}

// ========== EXPORT TYPES ==========

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'pdf'

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeCharts?: boolean // For PDF export
  dateRange?: DateRange
}

// ========== CHART COLOR PALETTE ==========

/**
 * Default color palette for charts
 */
export const CHART_COLORS = {
  primary: '#6366f1', // indigo-500
  secondary: '#8b5cf6', // violet-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
  muted: '#6b7280', // gray-500
} as const

/**
 * Color palette array for pie/bar charts
 */
export const CHART_COLOR_PALETTE = [
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
] as const

/**
 * Status colors for consistency
 */
export const STATUS_COLORS: Record<string, string> = {
  not_started: '#6b7280', // gray-500
  planned: '#3b82f6', // blue-500
  in_progress: '#f59e0b', // amber-500
  in_review: '#8b5cf6', // violet-500
  completed: '#10b981', // emerald-500
  on_hold: '#6b7280', // gray-500
  cancelled: '#ef4444', // red-500
  blocked: '#ef4444', // red-500
}

/**
 * Priority colors
 */
export const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444', // red-500
  high: '#f59e0b', // amber-500
  medium: '#3b82f6', // blue-500
  low: '#6b7280', // gray-500
}

/**
 * Phase colors
 */
export const PHASE_COLORS: Record<string, string> = {
  research: '#8b5cf6', // violet-500
  planning: '#3b82f6', // blue-500
  execution: '#f59e0b', // amber-500
  review: '#06b6d4', // cyan-500
  complete: '#10b981', // emerald-500
}
