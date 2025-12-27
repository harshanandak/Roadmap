/**
 * Strategy Stats API Route
 *
 * GET /api/strategies/stats - Get aggregated strategy statistics
 *
 * Returns workspace-level stats for the Alignment Dashboard:
 * - byType: Count of strategies by type
 * - byStatus: Count of strategies by status
 * - alignmentCoverage: Work item alignment metrics
 * - progressByType: Average progress grouped by strategy type
 * - topStrategiesByAlignment: Most aligned strategies
 *
 * Security: Team-based RLS with team membership validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StrategyType } from '@/lib/types/strategy'

interface ProgressByType {
  type: StrategyType
  avgProgress: number
  count: number
}

interface TopStrategy {
  id: string
  title: string
  type: StrategyType
  alignedCount: number
}

interface AlignmentCoverage {
  workItemsTotal: number
  workItemsWithPrimary: number
  workItemsWithAny: number
  coveragePercent: number
}

interface StatsResponse {
  data: {
    byType: Record<string, number>
    byStatus: Record<string, number>
    alignmentCoverage: AlignmentCoverage
    progressByType: ProgressByType[]
    topStrategiesByAlignment: TopStrategy[]
  }
}

/**
 * GET /api/strategies/stats
 *
 * Get aggregated strategy statistics.
 * Query params:
 * - team_id (required)
 * - workspace_id (optional)
 */
export async function GET(req: NextRequest): Promise<NextResponse<StatsResponse | { error: string }>> {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    const teamId = searchParams.get('team_id')
    const workspaceId = searchParams.get('workspace_id')

    if (!teamId) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 }
      )
    }

    // Validate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    // Build base query for strategies
    let strategiesQuery = supabase
      .from('product_strategies')
      .select('id, title, type, status, progress, calculated_progress, progress_mode')
      .eq('team_id', teamId)

    if (workspaceId) {
      strategiesQuery = strategiesQuery.eq('workspace_id', workspaceId)
    }

    const { data: strategies, error: strategiesError } = await strategiesQuery

    if (strategiesError) {
      console.error('Error fetching strategies:', strategiesError)
      return NextResponse.json(
        { error: 'Failed to fetch strategies' },
        { status: 500 }
      )
    }

    // Build base query for work items
    let workItemsQuery = supabase
      .from('work_items')
      .select('id, strategy_id')
      .eq('team_id', teamId)

    if (workspaceId) {
      workItemsQuery = workItemsQuery.eq('workspace_id', workspaceId)
    }

    const { data: workItems, error: workItemsError } = await workItemsQuery

    if (workItemsError) {
      console.error('Error fetching work items:', workItemsError)
      return NextResponse.json(
        { error: 'Failed to fetch work items' },
        { status: 500 }
      )
    }

    // Get secondary alignments from work_item_strategies
    const workItemIds = workItems?.map(w => w.id) || []
    let secondaryAlignments: Array<{ work_item_id: string; strategy_id: string }> = []

    if (workItemIds.length > 0) {
      const { data: alignments } = await supabase
        .from('work_item_strategies')
        .select('work_item_id, strategy_id')
        .in('work_item_id', workItemIds)

      secondaryAlignments = alignments || []
    }

    // Get strategy IDs for counting alignments
    const strategyIds = strategies?.map(s => s.id) || []

    // Get alignment counts per strategy (for top strategies)
    const primaryCountMap = new Map<string, number>()
    const secondaryCountMap = new Map<string, number>()

    workItems?.forEach(item => {
      if (item.strategy_id) {
        primaryCountMap.set(item.strategy_id, (primaryCountMap.get(item.strategy_id) || 0) + 1)
      }
    })

    secondaryAlignments.forEach(alignment => {
      secondaryCountMap.set(
        alignment.strategy_id,
        (secondaryCountMap.get(alignment.strategy_id) || 0) + 1
      )
    })

    // 1. Calculate byType
    const byType: Record<string, number> = {
      pillar: 0,
      objective: 0,
      key_result: 0,
      initiative: 0,
    }

    strategies?.forEach(s => {
      byType[s.type] = (byType[s.type] || 0) + 1
    })

    // 2. Calculate byStatus
    const byStatus: Record<string, number> = {
      draft: 0,
      active: 0,
      on_hold: 0,
      completed: 0,
      cancelled: 0,
    }

    strategies?.forEach(s => {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1
    })

    // 3. Calculate alignmentCoverage
    const workItemsTotal = workItems?.length || 0
    const workItemsWithPrimary = workItems?.filter(w => w.strategy_id !== null).length || 0

    // Work items with any alignment (primary OR secondary)
    const workItemsWithSecondary = new Set(secondaryAlignments.map(a => a.work_item_id))
    const workItemsWithAny = workItems?.filter(
      w => w.strategy_id !== null || workItemsWithSecondary.has(w.id)
    ).length || 0

    const coveragePercent = workItemsTotal > 0
      ? Math.round((workItemsWithAny / workItemsTotal) * 100)
      : 0

    const alignmentCoverage: AlignmentCoverage = {
      workItemsTotal,
      workItemsWithPrimary,
      workItemsWithAny,
      coveragePercent,
    }

    // 4. Calculate progressByType
    const progressByTypeMap = new Map<string, { sum: number; count: number }>()

    strategies?.forEach(s => {
      const effectiveProgress = s.progress_mode === 'auto'
        ? (s.calculated_progress || 0)
        : (s.progress || 0)

      const existing = progressByTypeMap.get(s.type) || { sum: 0, count: 0 }
      progressByTypeMap.set(s.type, {
        sum: existing.sum + effectiveProgress,
        count: existing.count + 1,
      })
    })

    const progressByType: ProgressByType[] = Array.from(progressByTypeMap.entries())
      .map(([type, data]) => ({
        type: type as StrategyType,
        avgProgress: data.count > 0 ? Math.round(data.sum / data.count) : 0,
        count: data.count,
      }))
      .sort((a, b) => {
        const order = ['pillar', 'objective', 'key_result', 'initiative']
        return order.indexOf(a.type) - order.indexOf(b.type)
      })

    // 5. Calculate topStrategiesByAlignment
    const combinedCounts = new Map<string, number>()

    strategyIds.forEach(id => {
      const primary = primaryCountMap.get(id) || 0
      const secondary = secondaryCountMap.get(id) || 0
      combinedCounts.set(id, primary + secondary)
    })

    const topStrategiesByAlignment: TopStrategy[] = strategies
      ?.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type as StrategyType,
        alignedCount: combinedCounts.get(s.id) || 0,
      }))
      .filter(s => s.alignedCount > 0)
      .sort((a, b) => b.alignedCount - a.alignedCount)
      .slice(0, 5) || []

    return NextResponse.json({
      data: {
        byType,
        byStatus,
        alignmentCoverage,
        progressByType,
        topStrategiesByAlignment,
      },
    })
  } catch (error) {
    console.error('Strategy stats GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
