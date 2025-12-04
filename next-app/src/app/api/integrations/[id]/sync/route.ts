/**
 * Integration Sync API
 *
 * POST /api/integrations/[id]/sync
 *
 * Trigger a sync operation for an integration.
 * This will import/export data between the platform and the external service.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mcpGateway } from '@/lib/ai/mcp'
import type { SyncType } from '@/lib/types/integrations'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/integrations/[id]/sync
 *
 * Request body:
 * - syncType: 'import' | 'export' (required)
 * - workspaceId: string (optional, for workspace-scoped sync)
 * - sourceEntity: string (optional, e.g., 'issues', 'pull_requests')
 * - targetEntity: string (optional, e.g., 'work_items', 'tasks')
 * - filters: object (optional, provider-specific filters)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: integrationId } = await context.params
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

    // Get integration (verify team ownership)
    const { data: integration, error: integrationError } = await supabase
      .from('organization_integrations')
      .select('id, provider, status')
      .eq('id', integrationId)
      .eq('team_id', membership.team_id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Integration is not connected. Please reconnect.' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      syncType,
      workspaceId,
      sourceEntity,
      targetEntity,
      filters,
    } = body as {
      syncType: SyncType
      workspaceId?: string
      sourceEntity?: string
      targetEntity?: string
      filters?: Record<string, unknown>
    }

    if (!syncType || !['import', 'export'].includes(syncType)) {
      return NextResponse.json({ error: 'Invalid syncType' }, { status: 400 })
    }

    // If workspace-scoped, verify access
    if (workspaceId) {
      const { data: access, error: accessError } = await supabase
        .from('workspace_integration_access')
        .select('enabled')
        .eq('workspace_id', workspaceId)
        .eq('integration_id', integrationId)
        .single()

      if (accessError || !access?.enabled) {
        return NextResponse.json(
          { error: 'Integration not enabled for this workspace' },
          { status: 403 }
        )
      }
    }

    // Create sync log entry
    const syncLogId = Date.now().toString()
    const startedAt = new Date().toISOString()

    await supabase.from('integration_sync_logs').insert({
      id: syncLogId,
      integration_id: integrationId,
      workspace_id: workspaceId,
      sync_type: syncType,
      status: 'running',
      items_synced: 0,
      items_failed: 0,
      source_entity: sourceEntity,
      target_entity: targetEntity,
      details: { filters },
      started_at: startedAt,
      triggered_by: user.id,
    })

    try {
      // Determine which tool to call based on sync type and provider
      const toolName = buildToolName(integration.provider, syncType, sourceEntity)

      // Check if gateway is available
      const isAvailable = await mcpGateway.isAvailable()

      if (!isAvailable) {
        // Update sync log with error
        await supabase
          .from('integration_sync_logs')
          .update({
            status: 'failed',
            error_message: 'MCP Gateway unavailable',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - new Date(startedAt).getTime(),
          })
          .eq('id', syncLogId)

        return NextResponse.json(
          { error: 'MCP Gateway unavailable. Please try again later.' },
          { status: 503 }
        )
      }

      // Call the MCP tool
      const result = await mcpGateway.callTool(toolName, {
        ...filters,
        workspaceId,
        sourceEntity,
        targetEntity,
      })

      // Update sync log with result
      const completedAt = new Date().toISOString()
      const itemsSynced = result.success ? (result.data as { count?: number })?.count || 1 : 0

      await supabase
        .from('integration_sync_logs')
        .update({
          status: result.success ? 'completed' : 'failed',
          items_synced: itemsSynced,
          items_failed: result.success ? 0 : 1,
          error_message: result.error,
          completed_at: completedAt,
          duration_ms: result.metadata?.duration || Date.now() - new Date(startedAt).getTime(),
          details: {
            filters,
            result: result.data,
          },
        })
        .eq('id', syncLogId)

      // Update integration last sync time
      await supabase
        .from('organization_integrations')
        .update({
          last_sync_at: completedAt,
          last_error: result.error || null,
        })
        .eq('id', integrationId)

      return NextResponse.json({
        syncLogId,
        status: result.success ? 'completed' : 'failed',
        itemsSynced,
        error: result.error,
        duration: result.metadata?.duration,
      })
    } catch (syncError) {
      // Update sync log with error
      await supabase
        .from('integration_sync_logs')
        .update({
          status: 'failed',
          error_message: syncError instanceof Error ? syncError.message : 'Sync failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq('id', syncLogId)

      throw syncError
    }
  } catch (error) {
    console.error('[Sync API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Build MCP tool name based on provider and operation
 */
function buildToolName(
  provider: string,
  syncType: string,
  sourceEntity?: string
): string {
  const entity = sourceEntity || 'items'

  if (syncType === 'import') {
    // e.g., github_list_issues, jira_list_issues
    return `${provider}_list_${entity}`
  } else {
    // e.g., github_create_issue, jira_create_issue
    return `${provider}_create_${entity.replace(/s$/, '')}`
  }
}
