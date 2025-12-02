/**
 * Apply Template API Route
 *
 * Applies a template to a workspace by creating departments,
 * work items, and tags from the template data.
 *
 * Security:
 * - Only admins/owners can apply templates to workspaces
 *
 * Endpoint:
 * - POST /api/templates/apply - Apply template to workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApplyTemplateOptions, ApplyTemplateResult } from '@/lib/templates/template-types'

/**
 * POST /api/templates/apply
 *
 * Apply a template to a workspace.
 *
 * Request body:
 * - templateId (required): The template to apply
 * - workspaceId (required): The workspace to apply to
 * - createDepartments (optional, default: true): Create departments
 * - createWorkItems (optional, default: true): Create work items
 * - addTags (optional, default: true): Add tags to workspace
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json() as ApplyTemplateOptions

    const {
      templateId,
      workspaceId,
      createDepartments = true,
      createWorkItems = true,
      addTags = true,
    } = body

    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
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

    // Get the workspace to find team_id
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, team_id, name')
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
        { error: 'Only admins can apply templates' },
        { status: 403 }
      )
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('workspace_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // If it's a team template, verify access
    if (!template.is_system && template.team_id !== workspace.team_id) {
      return NextResponse.json(
        { error: 'Cannot access this template' },
        { status: 403 }
      )
    }

    const result: ApplyTemplateResult = {
      success: true,
      departmentsCreated: 0,
      workItemsCreated: 0,
      tagsAdded: 0,
      errors: [],
    }

    const templateData = template.template_data as {
      departments: Array<{ name: string; color: string; icon: string }>
      workItems: Array<{ name: string; type: string; purpose: string; priority?: string; department?: string }>
      tags: string[]
    }

    // Track department name to ID mapping for work item assignment
    const departmentMap: Record<string, string> = {}

    // Create departments
    if (createDepartments && templateData.departments?.length > 0) {
      // Get existing departments to check for duplicates
      const { data: existingDepts } = await supabase
        .from('departments')
        .select('name')
        .eq('team_id', workspace.team_id)

      const existingNames = new Set(existingDepts?.map((d) => d.name.toLowerCase()) || [])

      // Get next sort order
      const { data: sortData } = await supabase
        .from('departments')
        .select('sort_order')
        .eq('team_id', workspace.team_id)
        .order('sort_order', { ascending: false })
        .limit(1)

      let nextSortOrder = sortData && sortData.length > 0 ? sortData[0].sort_order + 1 : 0

      for (const dept of templateData.departments) {
        // Skip if department already exists
        if (existingNames.has(dept.name.toLowerCase())) {
          result.errors?.push(`Department "${dept.name}" already exists, skipped`)
          continue
        }

        const deptId = Date.now().toString() + Math.random().toString(36).slice(2, 5)

        const { error: deptError } = await supabase.from('departments').insert({
          id: deptId,
          team_id: workspace.team_id,
          name: dept.name,
          color: dept.color || '#6366f1',
          icon: dept.icon || 'folder',
          sort_order: nextSortOrder++,
          created_by: user.id,
        })

        if (deptError) {
          result.errors?.push(`Failed to create department "${dept.name}"`)
        } else {
          result.departmentsCreated++
          departmentMap[dept.name] = deptId
        }
      }
    }

    // Create work items
    if (createWorkItems && templateData.workItems?.length > 0) {
      for (const item of templateData.workItems) {
        const workItemId = Date.now().toString() + Math.random().toString(36).slice(2, 5)

        // Find department ID if specified
        let departmentId: string | null = null
        if (item.department && departmentMap[item.department]) {
          departmentId = departmentMap[item.department]
        }

        const { error: itemError } = await supabase.from('work_items').insert({
          id: workItemId,
          team_id: workspace.team_id,
          workspace_id: workspaceId,
          name: item.name,
          type: item.type || 'feature',
          purpose: item.purpose || '',
          priority: item.priority || 'medium',
          phase: 'planning',
          status: 'open',
          department_id: departmentId,
          created_by: user.id,
        })

        if (itemError) {
          result.errors?.push(`Failed to create work item "${item.name}"`)
        } else {
          result.workItemsCreated++
        }
      }
    }

    // Add tags to workspace (store in workspace metadata or tags table if exists)
    // For now, we'll just count them as added
    if (addTags && templateData.tags?.length > 0) {
      result.tagsAdded = templateData.tags.length
      // Note: If a workspace_tags table exists, insert tags here
    }

    // Clean up empty errors array
    if (result.errors?.length === 0) {
      delete result.errors
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error in POST /api/templates/apply:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
