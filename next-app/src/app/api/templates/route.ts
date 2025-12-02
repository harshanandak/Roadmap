/**
 * Templates API Routes
 *
 * CRUD operations for workspace templates.
 *
 * Security:
 * - All authenticated users can view system templates
 * - Team members can view their team's templates
 * - Only admins/owners can create team templates
 *
 * Endpoints:
 * - GET  /api/templates?team_id=X - List templates (system + team)
 * - POST /api/templates - Create a new team template (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateTemplateInput } from '@/lib/templates/template-types'

/**
 * GET /api/templates
 *
 * List templates (system + team).
 * Query params:
 * - team_id (optional): Include team-specific templates
 * - mode (optional): Filter by workspace mode
 * - system_only (optional): Only return system templates
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('team_id')
    const mode = searchParams.get('mode')
    const systemOnly = searchParams.get('system_only') === 'true'

    // Validate authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query for system templates
    let query = supabase
      .from('workspace_templates')
      .select('*')
      .order('name', { ascending: true })

    if (systemOnly) {
      // Only system templates
      query = query.eq('is_system', true)
    } else if (teamId) {
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

      // System templates OR team templates
      query = query.or(`is_system.eq.true,team_id.eq.${teamId}`)
    } else {
      // Only system templates if no team_id provided
      query = query.eq('is_system', true)
    }

    // Filter by mode if provided
    if (mode) {
      query = query.eq('mode', mode)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('Error in GET /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 *
 * Create a new team template.
 * Only admins/owners can create templates.
 *
 * Request body:
 * - team_id (required): The team to create the template for
 * - name (required): Template name
 * - description (optional): Template description
 * - icon (optional): Lucide icon name (default: layout-template)
 * - mode (required): Workspace mode (development/launch/growth/maintenance)
 * - template_data (required): Template data (departments, workItems, tags)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const { team_id, name, description, icon, mode, template_data } = body as CreateTemplateInput & { team_id: string }

    // Validate required fields
    if (!team_id) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 }
      )
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    if (!mode) {
      return NextResponse.json(
        { error: 'mode is required' },
        { status: 400 }
      )
    }

    const validModes = ['development', 'launch', 'growth', 'maintenance']
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: `mode must be one of: ${validModes.join(', ')}` },
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

    // Validate admin/owner role
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins can create templates' },
        { status: 403 }
      )
    }

    // Create the template with timestamp-based ID
    const { data: template, error } = await supabase
      .from('workspace_templates')
      .insert({
        id: Date.now().toString(),
        team_id,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || 'layout-template',
        mode,
        is_system: false,
        template_data: template_data || { departments: [], workItems: [], tags: [] },
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
