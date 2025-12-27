/**
 * Analytics Hooks
 * React Query hooks for fetching analytics dashboard data
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AnalyticsScope,
  DashboardType,
  DateRange,
  FeatureOverviewData,
  DependencyHealthData,
  TeamPerformanceData,
  StrategyAlignmentData,
} from '@/lib/types/analytics'

// ========== QUERY KEYS ==========

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboards: () => [...analyticsKeys.all, 'dashboard'] as const,
  dashboard: (
    type: DashboardType,
    workspaceId: string,
    teamId: string,
    scope: AnalyticsScope,
    dateRange?: DateRange
  ) => [...analyticsKeys.dashboards(), type, workspaceId, teamId, scope, dateRange] as const,
}

// ========== FETCH HELPERS ==========

async function fetchAnalytics<T>(
  endpoint: string,
  workspaceId: string,
  teamId: string,
  scope: AnalyticsScope,
  dateRange?: DateRange
): Promise<T> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    team_id: teamId,
    scope,
  })

  if (dateRange?.from) params.set('from', dateRange.from)
  if (dateRange?.to) params.set('to', dateRange.to)

  const response = await fetch(`/api/analytics/${endpoint}?${params}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch analytics' }))
    throw new Error(error.error || 'Failed to fetch analytics data')
  }

  const result = await response.json()
  return result.data as T
}

// ========== DASHBOARD HOOKS ==========

/**
 * Fetch Feature Overview dashboard data
 */
export function useFeatureOverview(
  workspaceId: string,
  teamId: string,
  scope: AnalyticsScope = 'workspace',
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: analyticsKeys.dashboard('feature-overview', workspaceId, teamId, scope, dateRange),
    queryFn: () =>
      fetchAnalytics<FeatureOverviewData>('overview', workspaceId, teamId, scope, dateRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!workspaceId && !!teamId,
  })
}

/**
 * Fetch Dependency Health dashboard data
 */
export function useDependencyHealth(
  workspaceId: string,
  teamId: string,
  scope: AnalyticsScope = 'workspace'
) {
  return useQuery({
    queryKey: analyticsKeys.dashboard('dependency-health', workspaceId, teamId, scope),
    queryFn: () =>
      fetchAnalytics<DependencyHealthData>('dependencies', workspaceId, teamId, scope),
    staleTime: 5 * 60 * 1000, // 5 minutes - dependencies change less often
    enabled: !!workspaceId && !!teamId,
  })
}

/**
 * Fetch Team Performance dashboard data
 */
export function useTeamPerformance(
  workspaceId: string,
  teamId: string,
  scope: AnalyticsScope = 'workspace',
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: analyticsKeys.dashboard('team-performance', workspaceId, teamId, scope, dateRange),
    queryFn: () =>
      fetchAnalytics<TeamPerformanceData>('performance', workspaceId, teamId, scope, dateRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!workspaceId && !!teamId,
  })
}

/**
 * Fetch Strategy Alignment dashboard data
 */
export function useStrategyAlignment(
  workspaceId: string,
  teamId: string,
  scope: AnalyticsScope = 'workspace'
) {
  return useQuery({
    queryKey: analyticsKeys.dashboard('strategy-alignment', workspaceId, teamId, scope),
    queryFn: () =>
      fetchAnalytics<StrategyAlignmentData>('alignment', workspaceId, teamId, scope),
    staleTime: 5 * 60 * 1000, // 5 minutes - strategies change less often
    enabled: !!workspaceId && !!teamId,
  })
}

// ========== PREFETCH HELPERS ==========

/**
 * Prefetch dashboard data for smoother tab switching
 * Call this when user hovers over a tab
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient()

  return (
    type: DashboardType,
    workspaceId: string,
    teamId: string,
    scope: AnalyticsScope
  ) => {
    const endpointMap: Record<DashboardType, string> = {
      'feature-overview': 'overview',
      'dependency-health': 'dependencies',
      'team-performance': 'performance',
      'strategy-alignment': 'alignment',
    }

    queryClient.prefetchQuery({
      queryKey: analyticsKeys.dashboard(type, workspaceId, teamId, scope),
      queryFn: () => fetchAnalytics(endpointMap[type], workspaceId, teamId, scope),
      staleTime: 2 * 60 * 1000,
    })
  }
}
