import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/insights/stats
 * Get aggregated statistics for customer insights
 *
 * Query Parameters:
 * - team_id (required): Filter by team
 * - workspace_id (optional): Filter by workspace
 *
 * Returns:
 * - total: Total count of insights
 * - bySentiment: Counts by sentiment (positive, negative, neutral, mixed)
 * - byStatus: Counts by status (new, reviewed, actionable, addressed, archived)
 */
export async function GET(req: NextRequest) {
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

    // Verify user has access to this team
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build base query
    let query = supabase
      .from('customer_insights')
      .select('sentiment, status', { count: 'exact' })
      .eq('team_id', teamId)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data: insights, error, count } = await query

    if (error) {
      console.error('Error fetching insights stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }

    // Calculate aggregates
    const bySentiment = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    }

    const byStatus = {
      new: 0,
      reviewed: 0,
      actionable: 0,
      addressed: 0,
      archived: 0,
    }

    insights?.forEach((insight) => {
      // Count by sentiment
      if (insight.sentiment in bySentiment) {
        bySentiment[insight.sentiment as keyof typeof bySentiment]++
      }

      // Count by status
      if (insight.status in byStatus) {
        byStatus[insight.status as keyof typeof byStatus]++
      }
    })

    return NextResponse.json({
      data: {
        total: count || 0,
        bySentiment,
        byStatus,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/insights/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
