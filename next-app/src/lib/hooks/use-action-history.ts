/**
 * useActionHistory Hook
 *
 * React hook for fetching and managing AI action history.
 * Supports filtering, pagination, and real-time updates.
 *
 * Features:
 * - Fetch action history with filters
 * - Paginate through large result sets
 * - Real-time updates via polling
 * - Track pending action counts
 * - Group actions by session or category
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

// Action history types
export interface ActionHistoryItem {
  id: string
  session_id: string
  tool_name: string
  tool_category: string
  tool_params: Record<string, unknown>
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'rolled_back'
  is_reversible: boolean
  requires_approval: boolean
  result_data: unknown
  error_message: string | null
  rollback_data: unknown
  workspace_id: string
  team_id: string
  created_by: string
  approved_by: string | null
  executed_at: string | null
  created_at: string
  updated_at: string
}

export interface HistoryFilters {
  status?: string
  toolName?: string
  category?: string
  sessionId?: string
}

export interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface HistoryResponse {
  actions: ActionHistoryItem[]
  pagination: PaginationInfo
}

export interface ActionStats {
  total: number
  pending: number
  completed: number
  failed: number
  cancelled: number
  rolledBack: number
}

export interface UseActionHistoryOptions {
  workspaceId: string
  filters?: HistoryFilters
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

export interface UseActionHistoryReturn {
  // Data
  actions: ActionHistoryItem[]
  pagination: PaginationInfo | null
  stats: ActionStats
  pendingActions: ActionHistoryItem[]

  // State
  isLoading: boolean
  isRefreshing: boolean
  error: string | null

  // Operations
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setFilters: (filters: HistoryFilters) => void
  clearFilters: () => void

  // Grouped views
  getBySession: () => Map<string, ActionHistoryItem[]>
  getByCategory: () => Map<string, ActionHistoryItem[]>
  getByStatus: () => Map<string, ActionHistoryItem[]>
}

const DEFAULT_LIMIT = 50
const DEFAULT_REFRESH_INTERVAL = 5000 // 5 seconds

/**
 * Hook for fetching and managing AI action history
 *
 * @param options - Configuration options including workspace ID and filters
 * @returns Action history data, state, and operations
 *
 * @example
 * ```tsx
 * const history = useActionHistory({
 *   workspaceId: '123',
 *   filters: { status: 'pending' },
 *   autoRefresh: true,
 * })
 *
 * // Get pending actions
 * const pending = history.pendingActions
 *
 * // Load more items
 * if (history.pagination?.hasMore) {
 *   await history.loadMore()
 * }
 *
 * // Group by session
 * const bySession = history.getBySession()
 * ```
 */
export function useActionHistory(options: UseActionHistoryOptions): UseActionHistoryReturn {
  const {
    workspaceId,
    filters: initialFilters = {},
    limit = DEFAULT_LIMIT,
    autoRefresh = false,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
  } = options

  const [actions, setActions] = useState<ActionHistoryItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [filters, setFiltersState] = useState<HistoryFilters>(initialFilters)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  /**
   * Build query string from filters and pagination
   */
  const buildQueryString = useCallback(
    (offset: number = 0): string => {
      const params = new URLSearchParams()
      params.set('workspaceId', workspaceId)
      params.set('limit', limit.toString())
      params.set('offset', offset.toString())

      if (filters.status) params.set('status', filters.status)
      if (filters.toolName) params.set('toolName', filters.toolName)
      if (filters.category) params.set('category', filters.category)
      if (filters.sessionId) params.set('sessionId', filters.sessionId)

      return params.toString()
    },
    [workspaceId, limit, filters]
  )

  /**
   * Fetch action history from the API
   */
  const fetchHistory = useCallback(
    async (offset: number = 0, isRefresh: boolean = false): Promise<void> => {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        const queryString = buildQueryString(offset)
        const response = await fetch(`/api/ai/agent/history?${queryString}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch history')
        }

        const data: HistoryResponse = await response.json()

        if (!mountedRef.current) return

        if (offset === 0) {
          // Fresh load or refresh - replace all actions
          setActions(data.actions)
        } else {
          // Loading more - append to existing
          setActions(prev => [...prev, ...data.actions])
        }

        setPagination(data.pagination)
      } catch (err) {
        if (!mountedRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to fetch history')
      } finally {
        if (mountedRef.current) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [buildQueryString]
  )

  /**
   * Refresh the action history (reload from beginning)
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchHistory(0, true)
  }, [fetchHistory])

  /**
   * Load more actions (pagination)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!pagination?.hasMore || isLoading) return
    await fetchHistory(pagination.offset + pagination.limit)
  }, [pagination, isLoading, fetchHistory])

  /**
   * Update filters and refresh
   */
  const setFilters = useCallback(
    (newFilters: HistoryFilters): void => {
      setFiltersState(newFilters)
    },
    []
  )

  /**
   * Clear all filters
   */
  const clearFilters = useCallback((): void => {
    setFiltersState({})
  }, [])

  /**
   * Calculate action statistics
   */
  const stats: ActionStats = {
    total: pagination?.total ?? actions.length,
    pending: actions.filter(a => a.status === 'pending').length,
    completed: actions.filter(a => a.status === 'completed').length,
    failed: actions.filter(a => a.status === 'failed').length,
    cancelled: actions.filter(a => a.status === 'cancelled').length,
    rolledBack: actions.filter(a => a.status === 'rolled_back').length,
  }

  /**
   * Get pending actions
   */
  const pendingActions = actions.filter(a => a.status === 'pending')

  /**
   * Group actions by session
   */
  const getBySession = useCallback((): Map<string, ActionHistoryItem[]> => {
    const grouped = new Map<string, ActionHistoryItem[]>()
    for (const action of actions) {
      const existing = grouped.get(action.session_id) || []
      existing.push(action)
      grouped.set(action.session_id, existing)
    }
    return grouped
  }, [actions])

  /**
   * Group actions by category
   */
  const getByCategory = useCallback((): Map<string, ActionHistoryItem[]> => {
    const grouped = new Map<string, ActionHistoryItem[]>()
    for (const action of actions) {
      const category = action.tool_category || 'unknown'
      const existing = grouped.get(category) || []
      existing.push(action)
      grouped.set(category, existing)
    }
    return grouped
  }, [actions])

  /**
   * Group actions by status
   */
  const getByStatus = useCallback((): Map<string, ActionHistoryItem[]> => {
    const grouped = new Map<string, ActionHistoryItem[]>()
    for (const action of actions) {
      const existing = grouped.get(action.status) || []
      existing.push(action)
      grouped.set(action.status, existing)
    }
    return grouped
  }, [actions])

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true
    fetchHistory(0)

    return () => {
      mountedRef.current = false
    }
    // Only run on mount and when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, JSON.stringify(filters)])

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refresh()
      }, refreshInterval)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, refresh])

  return {
    // Data
    actions,
    pagination,
    stats,
    pendingActions,

    // State
    isLoading,
    isRefreshing,
    error,

    // Operations
    refresh,
    loadMore,
    setFilters,
    clearFilters,

    // Grouped views
    getBySession,
    getByCategory,
    getByStatus,
  }
}

/**
 * Hook specifically for tracking pending actions
 * Optimized for checking if there are pending approvals
 *
 * @param workspaceId - Workspace to check
 * @returns Pending actions with quick access methods
 */
export function usePendingActions(workspaceId: string) {
  const history = useActionHistory({
    workspaceId,
    filters: { status: 'pending' },
    autoRefresh: true,
    refreshInterval: 3000, // Faster refresh for pending items
  })

  return {
    pending: history.pendingActions,
    count: history.stats.pending,
    isLoading: history.isLoading,
    refresh: history.refresh,
    hasPending: history.stats.pending > 0,
  }
}

export default useActionHistory
