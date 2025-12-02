/**
 * Template By ID API Routes
 *
 * Operations on a specific template.
 *
 * Security:
 * - All authenticated users can view system templates
 * - Team members can view their team's templates
 * - Only admins/owners can update/delete team templates
 * - System templates cannot be modified
 *
 * Endpoints:
 * - GET    /api/templates/[id] - Get a single template
 * - PUT    /api/templates/[id] - Update a template
 * - DELETE /api/templates/[id] - Delete a template
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateTemplateInput } from '@/lib/templates/template-types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]
 *
 * Get a single template by ID.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Validate authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the template
    const { data: template, error } = await supabase
      .from('workspace_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // If it's a team template, verify membership
    if (!template.is_system && template.team_id) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', template.team_id)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
      }
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('Error in GET /api/templates/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/templates/[id]
 *
 * Update a template.
 * Only admins/owners can update team templates.
 * System templates cannot be updated.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await req.json() as UpdateTemplateInput

    // Validate authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the template first
    const { data: template, error: fetchError } = await supabase
      .from('workspace_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // System templates cannot be updated
    if (template.is_system) {
      return NextResponse.json(
        { error: 'System templates cannot be modified' },
        { status: 403 }
      )
    }

    // Validate admin/owner role for team templates
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', template.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins can update templates' },
        { status: 403 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined)
      updates.description = body.description?.trim() || null
    if (body.icon !== undefined) updates.icon = body.icon
    if (body.template_data !== undefined) {
      // Merge with existing template_data
      updates.template_data = {
        ...template.template_data,
        ...body.template_data,
      }
    }

    // Update the template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('workspace_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating template:', updateError)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updatedTemplate })
  } catch (error) {
    console.error('Error in PUT /api/templates/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/[id]
 *
 * Delete a template.
 * Only admins/owners can delete team templates.
 * System templates cannot be deleted.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Validate authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the template first
    const { data: template, error: fetchError } = await supabase
      .from('workspace_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // System templates cannot be deleted
    if (template.is_system) {
      return NextResponse.json(
        { error: 'System templates cannot be deleted' },
        { status: 403 }
      )
    }

    // Validate admin/owner role for team templates
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', template.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins can delete templates' },
        { status: 403 }
      )
    }

    // Delete the template
    const { error: deleteError } = await supabase
      .from('workspace_templates')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/templates/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
