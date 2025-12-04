/**
 * GET /api/ai/agent/history
 *
 * Get action history for a workspace with optional filtering.
 *
 * Query parameters:
 * - workspaceId: string (required) - Workspace to get history for
 * - status?: string                - Filter by status (pending, completed, etc.)
 * - toolName?: string              - Filter by tool name
 * - category?: string              - Filter by category (creation, analysis, etc.)
 * - sessionId?: string             - Filter by session
 * - limit?: number                 - Max records (default: 50, max: 100)
 * - offset?: number                - Pagination offset (default: 0)
 *
 * Response:
 * {
 *   actions: AIActionHistory[]
 *   pagination: { total, limit, offset, hasMore }
 * }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HistoryQuerySchema } from '@/lib/ai/schemas/agentic-schemas'

export async function GET(request: Request) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      workspaceId: searchParams.get('workspaceId'),
      status: searchParams.get('status') || undefined,
      toolName: searchParams.get('toolName') || undefined,
      category: searchParams.get('category') || undefined,
      sessionId: searchParams.get('sessionId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    }

    // Validate query parameters
    const parsed = HistoryQuerySchema.safeParse(queryParams)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const {
      workspaceId,
      status,
      toolName,
      category,
      sessionId,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = parsed.data

    // Verify user has access to workspace's team
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('team_id')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', workspace.team_id)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Access denied: Not a member of this team' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('ai_action_history')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (toolName) {
      query = query.eq('tool_name', toolName)
    }
    if (category) {
      query = query.eq('tool_category', category)
    }
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    const { data: actions, count, error: queryError } = await query

    if (queryError) {
      console.error('[Agent History] Query error:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      actions: actions || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('[Agent History] Error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
