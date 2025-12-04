/**
 * Single Integration API
 *
 * GET    /api/integrations/[id] - Get integration details
 * PATCH  /api/integrations/[id] - Update integration
 * DELETE /api/integrations/[id] - Disconnect/delete integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { IntegrationDisplay, IntegrationStatus } from '@/lib/types/integrations'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/integrations/[id]
 *
 * Get details for a specific integration.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Get integration (with team_id check for security)
    const { data: integration, error: queryError } = await supabase
      .from('organization_integrations')
      .select(`
        id,
        provider,
        name,
        status,
        scopes,
        provider_account_id,
        provider_account_name,
        provider_avatar_url,
        last_sync_at,
        last_error,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('team_id', membership.team_id)
      .single()

    if (queryError || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Get recent sync logs
    const { data: syncLogs } = await supabase
      .from('integration_sync_logs')
      .select('id, sync_type, status, items_synced, items_failed, started_at, completed_at, duration_ms')
      .eq('integration_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const display: IntegrationDisplay & { syncLogs?: typeof syncLogs } = {
      id: integration.id,
      provider: integration.provider,
      name: integration.name,
      status: integration.status,
      providerAccountName: integration.provider_account_name,
      providerAvatarUrl: integration.provider_avatar_url,
      scopes: integration.scopes || [],
      lastSyncAt: integration.last_sync_at,
      lastError: integration.last_error,
      createdAt: integration.created_at,
      syncLogs,
    }

    return NextResponse.json(display)
  } catch (error) {
    console.error('[Integration API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/integrations/[id]
 *
 * Update integration settings.
 *
 * Request body:
 * - name: string (optional)
 * - status: 'connected' | 'disconnected' (optional)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { name, status } = body as {
      name?: string
      status?: IntegrationStatus
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      updates.name = name
    }

    if (status !== undefined) {
      if (!['connected', 'disconnected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // Update integration
    const { data: updated, error: updateError } = await supabase
      .from('organization_integrations')
      .update(updates)
      .eq('id', id)
      .eq('team_id', membership.team_id)
      .select('id, provider, name, status, updated_at')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Integration not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Integration updated',
      integration: updated,
    })
  } catch (error) {
    console.error('[Integration API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/integrations/[id]
 *
 * Disconnect and delete an integration.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Delete workspace access records first (foreign key)
    await supabase
      .from('workspace_integration_access')
      .delete()
      .eq('integration_id', id)

    // Delete sync logs
    await supabase
      .from('integration_sync_logs')
      .delete()
      .eq('integration_id', id)

    // Delete integration
    const { error: deleteError } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('id', id)
      .eq('team_id', membership.team_id)

    if (deleteError) {
      console.error('[Integration API] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Integration deleted' })
  } catch (error) {
    console.error('[Integration API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
