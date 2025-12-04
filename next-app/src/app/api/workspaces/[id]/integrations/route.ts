/**
 * Workspace Integration Access API
 *
 * GET  /api/workspaces/[id]/integrations - List enabled integrations for workspace
 * POST /api/workspaces/[id]/integrations - Enable integration for workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WorkspaceIntegrationDisplay, IntegrationProvider, IntegrationStatus } from '@/lib/types/integrations'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/workspaces/[id]/integrations
 *
 * List all integrations enabled for this workspace.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: workspaceId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace and verify team membership
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, team_id')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Verify user is team member
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', workspace.team_id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get workspace integration access with integration details
    const { data: accessRecords, error: accessError } = await supabase
      .from('workspace_integration_access')
      .select(`
        id,
        enabled,
        enabled_tools,
        default_project,
        settings,
        created_at,
        integration:organization_integrations (
          id,
          provider,
          name,
          status,
          scopes,
          provider_account_name,
          provider_avatar_url,
          last_sync_at,
          last_error
        )
      `)
      .eq('workspace_id', workspaceId)

    if (accessError) {
      console.error('[Workspace Integrations API] Error:', accessError)
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
    }

    // Transform to display format
    const integrations: WorkspaceIntegrationDisplay[] = (accessRecords || [])
      .filter((record) => record.integration) // Filter out orphaned records
      .map((record) => {
        // Supabase returns joined data as array, take first element
        const intData = Array.isArray(record.integration)
          ? record.integration[0]
          : record.integration

        const int = intData as {
          id: string
          provider: string
          name: string
          status: string
          scopes: string[]
          provider_account_name: string | null
          provider_avatar_url: string | null
          last_sync_at: string | null
          last_error: string | null
        }

        return {
          id: int.id,
          provider: int.provider as IntegrationProvider,
          name: int.name,
          status: int.status as IntegrationStatus,
          providerAccountName: int.provider_account_name || undefined,
          providerAvatarUrl: int.provider_avatar_url || undefined,
          scopes: int.scopes || [],
          lastSyncAt: int.last_sync_at || undefined,
          lastError: int.last_error || undefined,
          createdAt: record.created_at,
          workspaceAccessId: record.id,
          enabled: record.enabled,
          enabledTools: record.enabled_tools || [],
          defaultProject: record.default_project || undefined,
        }
      })

    return NextResponse.json({
      integrations,
      count: integrations.length,
    })
  } catch (error) {
    console.error('[Workspace Integrations API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces/[id]/integrations
 *
 * Enable an integration for this workspace.
 *
 * Request body:
 * - integrationId: string (required)
 * - enabledTools: string[] (optional)
 * - defaultProject: string (optional)
 * - settings: object (optional)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: workspaceId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace and verify team membership
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, team_id')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Verify user is team member
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', workspace.team_id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { integrationId, enabledTools, defaultProject, settings } = body as {
      integrationId: string
      enabledTools?: string[]
      defaultProject?: string
      settings?: Record<string, unknown>
    }

    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId is required' }, { status: 400 })
    }

    // Verify integration belongs to the same team
    const { data: integration, error: integrationError } = await supabase
      .from('organization_integrations')
      .select('id, status')
      .eq('id', integrationId)
      .eq('team_id', workspace.team_id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Integration is not connected. Please connect it first.' },
        { status: 400 }
      )
    }

    // Check if already enabled
    const { data: existing } = await supabase
      .from('workspace_integration_access')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('integration_id', integrationId)
      .single()

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('workspace_integration_access')
        .update({
          enabled: true,
          enabled_tools: enabledTools || [],
          default_project: defaultProject,
          settings: settings || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update access' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Integration access updated',
        accessId: existing.id,
      })
    }

    // Create new access record
    const accessId = Date.now().toString()

    const { error: insertError } = await supabase
      .from('workspace_integration_access')
      .insert({
        id: accessId,
        workspace_id: workspaceId,
        integration_id: integrationId,
        enabled: true,
        enabled_tools: enabledTools || [],
        default_project: defaultProject,
        settings: settings || {},
        enabled_by: user.id,
      })

    if (insertError) {
      console.error('[Workspace Integrations API] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to enable integration' }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: 'Integration enabled for workspace',
        accessId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Workspace Integrations API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
