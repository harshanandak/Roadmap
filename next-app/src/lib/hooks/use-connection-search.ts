/**
 * useConnectionSearch Hook
 *
 * Searches across multiple entity types for the connection menu.
 * Supports: Work Items, Members, Departments, Strategies, Insights, Resources
 */

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  ConnectionEntityType,
  AnyConnectionEntity,
  WorkItemEntity,
  MemberEntity,
  DepartmentEntity,
  StrategyEntity,
  InsightEntity,
  ResourceEntity,
  ConnectionSearchOptions,
} from '@/components/connection-menu/connection-menu-types'

// ============================================================================
// TYPES
// ============================================================================

interface UseConnectionSearchReturn {
  search: (options: ConnectionSearchOptions) => Promise<void>
  results: AnyConnectionEntity[]
  resultsByType: Record<ConnectionEntityType, AnyConnectionEntity[]>
  loading: boolean
  error: string | null
  clearResults: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useConnectionSearch(): UseConnectionSearchReturn {
  const [results, setResults] = useState<AnyConnectionEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  const search = useCallback(
    async (options: ConnectionSearchOptions) => {
      const {
        query,
        teamId,
        workspaceId,
        types = ['work-item', 'member', 'department', 'strategy', 'insight', 'resource'],
        limit = 5,
      } = options

      setLoading(true)
      setError(null)

      try {
        const searchQuery = query.toLowerCase().trim()
        const allResults: AnyConnectionEntity[] = []

        // Parallel search across all enabled types
        const promises: Promise<void>[] = []

        // Search Work Items
        if (types.includes('work-item')) {
          promises.push(
            (async () => {
              let q = supabase
                .from('work_items')
                .select('id, name, purpose, type, status, phase, priority')
                .eq('team_id', teamId)
                .limit(limit)

              if (workspaceId) {
                q = q.eq('workspace_id', workspaceId)
              }

              if (searchQuery) {
                q = q.or(`name.ilike.%${searchQuery}%,purpose.ilike.%${searchQuery}%`)
              }

              const { data, error: err } = await q

              if (!err && data) {
                const entities: WorkItemEntity[] = data.map((item) => ({
                  id: item.id,
                  type: 'work-item',
                  name: item.name,
                  description: item.purpose || undefined,
                  metadata: {
                    itemType: item.type,
                    status: item.status,
                    phase: item.phase,
                    priority: item.priority || undefined,
                  },
                }))
                allResults.push(...entities)
              }
            })()
          )
        }

        // Search Members
        if (types.includes('member')) {
          promises.push(
            (async () => {
              const { data, error: err } = await supabase
                .from('team_members')
                .select(
                  `
                  user_id,
                  role,
                  users!inner(
                    id,
                    full_name,
                    email,
                    avatar_url
                  )
                `
                )
                .eq('team_id', teamId)
                .limit(limit)

              if (!err && data) {
                // Helper to extract user from joined relation (handles array or object)
                const getUser = (users: unknown) => {
                  if (Array.isArray(users)) return users[0] as { id?: string; full_name?: string; email?: string; avatar_url?: string } | undefined
                  return users as { id?: string; full_name?: string; email?: string; avatar_url?: string } | null
                }

                const entities: MemberEntity[] = data
                  .filter((member) => {
                    if (!searchQuery) return true
                    const user = getUser(member.users)
                    const name = user?.full_name?.toLowerCase() || ''
                    const email = user?.email?.toLowerCase() || ''
                    return name.includes(searchQuery) || email.includes(searchQuery)
                  })
                  .map((member) => {
                    const user = getUser(member.users)
                    return {
                      id: member.user_id,
                      type: 'member' as const,
                      name: user?.full_name || user?.email || 'Unknown',
                      metadata: {
                        email: user?.email || '',
                        role: member.role as 'owner' | 'admin' | 'member' | 'viewer',
                        avatarUrl: user?.avatar_url || undefined,
                      },
                    }
                  })
                allResults.push(...entities)
              }
            })()
          )
        }

        // Search Departments
        if (types.includes('department')) {
          promises.push(
            (async () => {
              let q = supabase
                .from('departments')
                .select('id, name, description, color, icon')
                .eq('team_id', teamId)
                .limit(limit)

              if (searchQuery) {
                q = q.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
              }

              const { data, error: err } = await q

              if (!err && data) {
                const entities: DepartmentEntity[] = data.map((dept) => ({
                  id: dept.id,
                  type: 'department',
                  name: dept.name,
                  description: dept.description || undefined,
                  color: dept.color,
                  icon: dept.icon,
                  metadata: {
                    workItemCount: 0, // Would need separate query
                  },
                }))
                allResults.push(...entities)
              }
            })()
          )
        }

        // Search Strategies
        if (types.includes('strategy')) {
          promises.push(
            (async () => {
              let q = supabase
                .from('product_strategies')
                .select('id, name, description, type, status, progress, parent_id')
                .eq('team_id', teamId)
                .limit(limit)

              if (workspaceId) {
                q = q.eq('workspace_id', workspaceId)
              }

              if (searchQuery) {
                q = q.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
              }

              const { data, error: err } = await q

              if (!err && data) {
                const entities: StrategyEntity[] = data.map((strat) => ({
                  id: strat.id,
                  type: 'strategy',
                  name: strat.name,
                  description: strat.description || undefined,
                  metadata: {
                    strategyType: strat.type,
                    progress: strat.progress || undefined,
                    status: strat.status || undefined,
                    parentId: strat.parent_id || undefined,
                  },
                }))
                allResults.push(...entities)
              }
            })()
          )
        }

        // Search Insights
        if (types.includes('insight')) {
          promises.push(
            (async () => {
              let q = supabase
                .from('customer_insights')
                .select('id, title, description, type, source, sentiment, votes')
                .eq('team_id', teamId)
                .limit(limit)

              if (workspaceId) {
                q = q.eq('workspace_id', workspaceId)
              }

              if (searchQuery) {
                q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
              }

              const { data, error: err } = await q

              if (!err && data) {
                const entities: InsightEntity[] = data.map((insight) => ({
                  id: insight.id,
                  type: 'insight',
                  name: insight.title,
                  description: insight.description || undefined,
                  metadata: {
                    insightType: insight.type,
                    source: insight.source || undefined,
                    sentiment: insight.sentiment || undefined,
                    votes: insight.votes || undefined,
                  },
                }))
                allResults.push(...entities)
              }
            })()
          )
        }

        // Search Resources
        if (types.includes('resource')) {
          promises.push(
            (async () => {
              let q = supabase
                .from('resources')
                .select('id, name, description, type, url, version')
                .eq('team_id', teamId)
                .limit(limit)

              if (searchQuery) {
                q = q.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
              }

              const { data, error: err } = await q

              if (!err && data) {
                const entities: ResourceEntity[] = data.map((resource) => ({
                  id: resource.id,
                  type: 'resource',
                  name: resource.name,
                  description: resource.description || undefined,
                  metadata: {
                    resourceType: resource.type,
                    url: resource.url || undefined,
                    version: resource.version || undefined,
                  },
                }))
                allResults.push(...entities)
              }
            })()
          )
        }

        await Promise.all(promises)
        setResults(allResults)
      } catch (err) {
        console.error('Connection search error:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  // Group results by type
  const resultsByType = useMemo(() => {
    const grouped: Record<ConnectionEntityType, AnyConnectionEntity[]> = {
      'work-item': [],
      member: [],
      department: [],
      strategy: [],
      insight: [],
      resource: [],
    }

    for (const result of results) {
      grouped[result.type].push(result)
    }

    return grouped
  }, [results])

  return {
    search,
    results,
    resultsByType,
    loading,
    error,
    clearResults,
  }
}

export default useConnectionSearch
