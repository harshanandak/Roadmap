/**
 * Strategy React Query Hooks
 *
 * Provides data fetching and mutations for the Strategy Alignment system:
 * - useStrategyTree: Hierarchical tree with alignment counts
 * - useStrategy: Single strategy with children and aligned work items
 * - useStrategyStats: Dashboard aggregations
 * - useCreateStrategy, useUpdateStrategy, useDeleteStrategy: CRUD mutations
 * - useAlignWorkItem, useRemoveAlignment: Work item alignment mutations
 * - useReorderStrategy: Drag-drop reordering mutation
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  StrategyTreeResponse,
  StrategyDetailResponse,
  CreateStrategyRequest,
  UpdateStrategyRequest,
  AlignmentStrength,
} from '@/lib/types/strategy'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const strategyKeys = {
  all: ['strategies'] as const,
  // Tree queries
  trees: () => [...strategyKeys.all, 'tree'] as const,
  tree: (params: { teamId: string; workspaceId?: string; includeCompleted?: boolean }) =>
    [...strategyKeys.trees(), params] as const,
  // Detail queries
  details: () => [...strategyKeys.all, 'detail'] as const,
  detail: (id: string) => [...strategyKeys.details(), id] as const,
  // Stats queries
  stats: () => [...strategyKeys.all, 'stats'] as const,
  dashboardStats: (params: { teamId: string; workspaceId?: string }) =>
    [...strategyKeys.stats(), params] as const,
  // Alignment queries
  alignments: () => [...strategyKeys.all, 'alignments'] as const,
  strategyAlignments: (strategyId: string) =>
    [...strategyKeys.alignments(), 'strategy', strategyId] as const,
  workItemAlignments: (workItemId: string) =>
    [...strategyKeys.alignments(), 'workItem', workItemId] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get full strategy tree for a workspace
 * Returns hierarchical data with alignment counts
 */
export function useStrategyTree(params: {
  teamId: string
  workspaceId?: string
  includeCompleted?: boolean
}) {
  return useQuery({
    queryKey: strategyKeys.tree(params),
    queryFn: async (): Promise<StrategyTreeResponse> => {
      const searchParams = new URLSearchParams({
        team_id: params.teamId,
      })
      if (params.workspaceId) {
        searchParams.set('workspace_id', params.workspaceId)
      }
      if (params.includeCompleted) {
        searchParams.set('include_completed', 'true')
      }

      const response = await fetch(`/api/strategies/tree?${searchParams}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch strategy tree')
      }
      return response.json()
    },
    enabled: !!params.teamId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get single strategy with children and aligned work items
 */
export function useStrategy(id: string) {
  return useQuery({
    queryKey: strategyKeys.detail(id),
    queryFn: async (): Promise<StrategyDetailResponse> => {
      const response = await fetch(`/api/strategies/${id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch strategy')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

/**
 * Strategy stats response type
 */
export interface StrategyStatsResponse {
  data: {
    byType: Record<string, number>
    byStatus: Record<string, number>
    alignmentCoverage: {
      workItemsTotal: number
      workItemsWithPrimary: number
      workItemsWithAny: number
      coveragePercent: number
    }
    progressByType: Array<{
      type: string
      avgProgress: number
      count: number
    }>
    topStrategiesByAlignment: Array<{
      id: string
      title: string
      type: string
      alignedCount: number
    }>
  }
}

/**
 * Get strategy stats for dashboard
 */
export function useStrategyStats(params: { teamId: string; workspaceId?: string }) {
  return useQuery({
    queryKey: strategyKeys.dashboardStats(params),
    queryFn: async (): Promise<StrategyStatsResponse> => {
      const searchParams = new URLSearchParams({
        team_id: params.teamId,
      })
      if (params.workspaceId) {
        searchParams.set('workspace_id', params.workspaceId)
      }

      const response = await fetch(`/api/strategies/stats?${searchParams}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch strategy stats')
      }
      return response.json()
    },
    enabled: !!params.teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes (dashboard data can be slightly stale)
  })
}

/**
 * Get all strategies aligned to a work item
 */
export function useWorkItemAlignments(workItemId: string) {
  return useQuery({
    queryKey: strategyKeys.workItemAlignments(workItemId),
    queryFn: async () => {
      const response = await fetch(`/api/work-items/${workItemId}/strategies`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch work item alignments')
      }
      return response.json()
    },
    enabled: !!workItemId,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create new strategy
 */
export function useCreateStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateStrategyRequest) => {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create strategy')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate tree queries for this team/workspace
      queryClient.invalidateQueries({
        queryKey: strategyKeys.trees(),
      })
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: strategyKeys.stats(),
      })
    },
  })
}

/**
 * Update strategy
 */
export function useUpdateStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: UpdateStrategyRequest & { id: string; teamId: string; workspaceId?: string }) => {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update strategy')
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate detail
      queryClient.invalidateQueries({
        queryKey: strategyKeys.detail(variables.id),
      })
      // Invalidate tree
      queryClient.invalidateQueries({
        queryKey: strategyKeys.trees(),
      })
      // Invalidate stats (progress changes affect stats)
      queryClient.invalidateQueries({
        queryKey: strategyKeys.stats(),
      })
    },
  })
}

/**
 * Delete strategy
 */
export function useDeleteStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; teamId: string; workspaceId?: string }) => {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete strategy')
      }
      return response.json()
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: strategyKeys.trees(),
      })

      // Snapshot previous tree data for rollback
      const previousTrees = queryClient.getQueriesData({
        queryKey: strategyKeys.trees(),
      })

      // Optimistically remove from tree
      // Note: This is complex for tree structures, so we'll rely on invalidation
      // For a simpler optimistic update, we could filter at the root level

      return { previousTrees }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTrees) {
        context.previousTrees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch after delete
      queryClient.invalidateQueries({
        queryKey: strategyKeys.trees(),
      })
      queryClient.invalidateQueries({
        queryKey: strategyKeys.stats(),
      })
    },
  })
}

/**
 * Align work item to strategy
 */
export function useAlignWorkItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      strategyId: string
      workItemId: string
      alignmentStrength?: AlignmentStrength
      notes?: string
      isPrimary?: boolean
    }) => {
      const response = await fetch(`/api/strategies/${params.strategyId}/align`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_item_id: params.workItemId,
          alignment_strength: params.alignmentStrength || 'medium',
          notes: params.notes,
          is_primary: params.isPrimary || false,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to align work item')
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate strategy detail
      queryClient.invalidateQueries({
        queryKey: strategyKeys.detail(variables.strategyId),
      })
      // Invalidate tree (alignment counts change)
      queryClient.invalidateQueries({
        queryKey: strategyKeys.trees(),
      })
      // Invalidate work item alignments
      queryClient.invalidateQueries({
        queryKey: strategyKeys.workItemAlignments(variables.workItemId),
      })
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: strategyKeys.stats(),
      })
    },
  })
}

/**
 * Remove alignment from work item
 */
export function useRemoveAlignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      strategyId: string
      workItemId: string
      removePrimary?: boolean
    }) => {
      const response = await fetch(`/api/strategies/${params.strategyId}/align`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_item_id: params.workItemId,
          remove_primary: params.removePrimary,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove alignment')
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate strategy detail
      queryClient.invalidateQueries({
        queryKey: strategyKeys.detail(variables.strategyId),
      })
      // Invalidate tree
      queryClient.invalidateQueries({
        queryKey: strategyKeys.trees(),
      })
      // Invalidate work item alignments
      queryClient.invalidateQueries({
        queryKey: strategyKeys.workItemAlignments(variables.workItemId),
      })
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: strategyKeys.stats(),
      })
    },
  })
}

/**
 * Reorder strategy (drag-drop)
 */
export function useReorderStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: string
      parentId: string | null
      sortOrder: number
      teamId: string
      workspaceId?: string
    }) => {
      const response = await fetch(`/api/strategies/${params.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: params.parentId,
          sort_order: params.sortOrder,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reorder strategy')
      }
      return response.json()
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: strategyKeys.trees(),
      })

      // Snapshot for rollback
      const previousTrees = queryClient.getQueriesData({
        queryKey: strategyKeys.trees(),
      })

      // Optimistic update would be complex for tree reordering
      // We'll let the server response update the UI

      return { previousTrees }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTrees) {
        context.previousTrees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch to ensure sync
      queryClient.invalidateQueries({
        queryKey: strategyKeys.trees(),
      })
    },
  })
}

// ============================================================================
// AI SUGGESTIONS HOOK
// ============================================================================

export interface AlignmentSuggestion {
  workItemId: string
  strategyId: string
  confidence: number
  reason: string
  alignmentStrength: AlignmentStrength
  workItem?: { id: string; name: string; type: string }
  strategy?: { id: string; title: string; type: string }
}

export interface AIAlignmentResponse {
  suggestions: AlignmentSuggestion[]
  analysis?: string
  model: { key: string; name: string; provider: string }
  usage?: { inputTokens: number; outputTokens: number; costUsd: number }
}

/**
 * Get AI alignment suggestions
 */
export function useAISuggestions() {
  return useMutation({
    mutationFn: async (params: {
      teamId: string
      workspaceId?: string
      workItemId?: string
      modelKey?: string
    }): Promise<AIAlignmentResponse> => {
      const response = await fetch('/api/ai/strategies/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: params.teamId,
          workspace_id: params.workspaceId,
          work_item_id: params.workItemId,
          model_key: params.modelKey,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get AI suggestions')
      }
      return response.json()
    },
  })
}

/**
 * Batch apply AI suggestions
 */
export function useBatchAlignSuggestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      suggestions: Array<{
        workItemId: string
        strategyId: string
        alignmentStrength: AlignmentStrength
        isPrimary?: boolean
      }>
    }) => {
      // Apply each suggestion sequentially to maintain consistency
      const results = await Promise.allSettled(
        params.suggestions.map(async (suggestion) => {
          const response = await fetch(`/api/strategies/${suggestion.strategyId}/align`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              work_item_id: suggestion.workItemId,
              alignment_strength: suggestion.alignmentStrength,
              is_primary: suggestion.isPrimary || true, // Default to primary for AI suggestions
            }),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to apply alignment')
          }
          return response.json()
        })
      )

      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        throw new Error(`Failed to apply ${failed.length} alignments`)
      }

      return { applied: params.suggestions.length }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: strategyKeys.trees(),
      })
      queryClient.invalidateQueries({
        queryKey: strategyKeys.stats(),
      })
      queryClient.invalidateQueries({
        queryKey: strategyKeys.alignments(),
      })
    },
  })
}
