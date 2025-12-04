/**
 * Strategy Reorder API Route
 *
 * POST /api/strategies/[id]/reorder - Reorder a strategy within the tree
 *
 * Handles drag-drop reordering with:
 * - Hierarchy validation (can't drop Pillar under Initiative)
 * - Circular reference prevention
 * - Team membership verification
 * - Atomic sibling reordering via database function
 *
 * Security: Team-based RLS with team membership validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StrategyType } from '@/lib/types/strategy'

// Strategy type hierarchy order (lower = higher in tree)
const STRATEGY_TYPE_ORDER: Record<StrategyType, number> = {
  pillar: 0,
  objective: 1,
  key_result: 2,
  initiative: 3,
}

/**
 * Validate that child type can be nested under parent type
 * Child type must have higher order number than parent type
 */
function canDropUnder(
  childType: StrategyType,
  parentType: StrategyType | null
): boolean {
  // Root level - only pillars allowed at root
  if (parentType === null) {
    return childType === 'pillar'
  }

  // Child must be lower in hierarchy (higher order number)
  return STRATEGY_TYPE_ORDER[childType] > STRATEGY_TYPE_ORDER[parentType]
}

/**
 * POST /api/strategies/[id]/reorder
 *
 * Reorder a strategy within the tree.
 * Body:
 * - parent_id: string | null - New parent ID (null for root level)
 * - sort_order: number - New position within siblings
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: strategyId } = await params
    const body = await req.json()
    const { parent_id: newParentId, sort_order: newSortOrder } = body

    if (typeof newSortOrder !== 'number' || newSortOrder < 0) {
      return NextResponse.json(
        { error: 'sort_order must be a non-negative number' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Validate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the strategy being moved
    const { data: strategy, error: strategyError } = await supabase
      .from('product_strategies')
      .select('id, team_id, type, parent_id')
      .eq('id', strategyId)
      .single()

    if (strategyError || !strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Validate team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', strategy.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a team member' },
        { status: 403 }
      )
    }

    // Get new parent if specified
    let newParentType: StrategyType | null = null
    if (newParentId !== null && newParentId !== undefined) {
      const { data: newParent, error: parentError } = await supabase
        .from('product_strategies')
        .select('id, team_id, type')
        .eq('id', newParentId)
        .single()

      if (parentError || !newParent) {
        return NextResponse.json(
          { error: 'New parent strategy not found' },
          { status: 404 }
        )
      }

      // Ensure same team
      if (newParent.team_id !== strategy.team_id) {
        return NextResponse.json(
          { error: 'Cannot move strategy to different team' },
          { status: 400 }
        )
      }

      // Prevent circular reference (can't move under self or own descendants)
      if (newParentId === strategyId) {
        return NextResponse.json(
          { error: 'Cannot move strategy under itself' },
          { status: 400 }
        )
      }

      // Check if newParent is a descendant of strategy being moved
      const isDescendant = await checkIsDescendant(supabase, newParentId, strategyId)
      if (isDescendant) {
        return NextResponse.json(
          { error: 'Cannot move strategy under its own descendant' },
          { status: 400 }
        )
      }

      newParentType = newParent.type as StrategyType
    }

    // Validate hierarchy rules
    if (!canDropUnder(strategy.type as StrategyType, newParentType)) {
      const parentLabel = newParentType ? newParentType.replace('_', ' ') : 'root level'
      return NextResponse.json(
        {
          error: `Cannot place ${strategy.type.replace('_', ' ')} under ${parentLabel}. ` +
                 `Hierarchy must be: Pillar → Objective → Key Result → Initiative`
        },
        { status: 400 }
      )
    }

    // Use the database function for atomic reordering
    const { error: reorderError } = await supabase.rpc('reorder_strategy_siblings', {
      strategy_id_param: strategyId,
      new_parent_id_param: newParentId,
      new_sort_order_param: newSortOrder,
    })

    if (reorderError) {
      console.error('Error reordering strategy:', reorderError)
      return NextResponse.json(
        { error: 'Failed to reorder strategy' },
        { status: 500 }
      )
    }

    // Fetch updated strategy
    const { data: updatedStrategy } = await supabase
      .from('product_strategies')
      .select('*, owner:users!product_strategies_owner_id_fkey(id, name, email, avatar_url)')
      .eq('id', strategyId)
      .single()

    return NextResponse.json({
      data: updatedStrategy,
      message: 'Strategy reordered successfully',
    })
  } catch (error) {
    console.error('Strategy reorder POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Check if potentialDescendantId is a descendant of ancestorId
 */
async function checkIsDescendant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  potentialDescendantId: string,
  ancestorId: string
): Promise<boolean> {
  // Walk up the tree from potentialDescendant
  let currentId: string | null = potentialDescendantId
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)

    const result = await supabase
      .from('product_strategies')
      .select('parent_id')
      .eq('id', currentId)
      .single()

    const parentStrategy = result.data as { parent_id: string | null } | null

    if (!parentStrategy || !parentStrategy.parent_id) {
      return false
    }

    if (parentStrategy.parent_id === ancestorId) {
      return true
    }

    currentId = parentStrategy.parent_id
  }

  return false
}
