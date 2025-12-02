/**
 * Workspace Mode API Route
 *
 * Updates the workspace mode setting.
 *
 * Security:
 * - Only admins/owners can change workspace mode
 *
 * Endpoint:
 * - PUT /api/workspaces/[id]/mode - Update workspace mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

const VALID_MODES = ['development', 'launch', 'growth', 'maintenance']

/**
 * PUT /api/workspaces/[id]/mode
 *
 * Update workspace mode.
 *
 * Request body:
 * - mode (required): The new mode (development/launch/growth/maintenance)
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id: workspaceId } = await params
    const body = await req.json()

    const { mode } = body

    // Validate mode
    if (!mode) {
      return NextResponse.json(
        { error: 'mode is required' },
        { status: 400 }
      )
    }

    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `mode must be one of: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace to find team_id
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, team_id, mode')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Validate admin/owner role
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', workspace.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins can change workspace mode' },
        { status: 403 }
      )
    }

    // Update the workspace mode
    const { data: updatedWorkspace, error: updateError } = await supabase
      .from('workspaces')
      .update({ mode })
      .eq('id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating workspace mode:', updateError)
      return NextResponse.json(
        { error: 'Failed to update workspace mode' },
        { status: 500 }
      )
    }

    // Log the mode change (optional: could add to activity feed)
    console.log(
      `Workspace ${workspaceId} mode changed from ${workspace.mode} to ${mode} by user ${user.id}`
    )

    return NextResponse.json({
      data: updatedWorkspace,
      previousMode: workspace.mode,
    })
  } catch (error) {
    console.error('Error in PUT /api/workspaces/[id]/mode:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workspaces/[id]/mode
 *
 * Get current workspace mode with configuration.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id: workspaceId } = await params

    // Validate authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, mode, team_id')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Validate team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', workspace.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    return NextResponse.json({
      data: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        mode: workspace.mode || 'development',
      },
    })
  } catch (error) {
    console.error('Error in GET /api/workspaces/[id]/mode:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
