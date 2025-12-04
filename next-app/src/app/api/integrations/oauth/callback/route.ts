/**
 * OAuth Callback API
 *
 * GET /api/integrations/oauth/callback
 *
 * Handles OAuth callback from external providers.
 * Exchanges code for tokens and updates integration status.
 *
 * Query params (from OAuth provider):
 * - code: Authorization code
 * - state: CSRF protection state
 * - error: Error code (if OAuth failed)
 * - error_description: Error message (if OAuth failed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mcpGateway } from '@/lib/ai/mcp'
import type { IntegrationProvider } from '@/lib/types/integrations'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)

    // Check for OAuth error
    const oauthError = searchParams.get('error')
    if (oauthError) {
      const errorDescription = searchParams.get('error_description') || 'OAuth authorization failed'
      console.error('[OAuth Callback] OAuth error:', oauthError, errorDescription)

      // Redirect to settings with error
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?error=${encodeURIComponent(errorDescription)}`
      )
    }

    // Get OAuth params
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?error=${encodeURIComponent('Missing OAuth parameters')}`
      )
    }

    // Decode state to get provider and team info
    let stateData: { provider: IntegrationProvider; teamId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?error=${encodeURIComponent('Invalid OAuth state')}`
      )
    }

    const { provider, teamId } = stateData

    // Create Supabase client
    const supabase = await createClient()

    // Find the pending integration by state
    const { data: integration, error: findError } = await supabase
      .from('organization_integrations')
      .select('id, metadata')
      .eq('team_id', teamId)
      .eq('provider', provider)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (findError || !integration) {
      console.error('[OAuth Callback] Integration not found:', findError)
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?error=${encodeURIComponent('Integration not found')}`
      )
    }

    // Validate state matches
    const storedState = (integration.metadata as Record<string, unknown>)?.oauth_state
    if (storedState !== state) {
      console.error('[OAuth Callback] State mismatch')
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?error=${encodeURIComponent('OAuth state mismatch')}`
      )
    }

    try {
      // Complete OAuth via MCP Gateway
      const result = await mcpGateway.completeOAuth(code, state, provider)

      if (result.success) {
        // Update integration status to connected
        const { error: updateError } = await supabase
          .from('organization_integrations')
          .update({
            status: 'connected',
            last_sync_at: new Date().toISOString(),
            last_error: null,
            metadata: {
              ...(integration.metadata as Record<string, unknown>),
              oauth_completed_at: new Date().toISOString(),
            },
          })
          .eq('id', integration.id)

        if (updateError) {
          console.error('[OAuth Callback] Update error:', updateError)
        }

        // Log successful connection
        await supabase.from('integration_sync_logs').insert({
          id: Date.now().toString(),
          integration_id: integration.id,
          sync_type: 'oauth_refresh',
          status: 'completed',
          items_synced: 1,
          items_failed: 0,
          details: { action: 'oauth_complete', provider },
        })

        // Redirect to integrations page with success
        return NextResponse.redirect(
          `${appUrl}/settings/integrations?success=${encodeURIComponent(`${provider} connected successfully`)}`
        )
      } else {
        throw new Error('OAuth completion failed')
      }
    } catch (gatewayError) {
      console.error('[OAuth Callback] Gateway error:', gatewayError)

      // Update integration with error
      await supabase
        .from('organization_integrations')
        .update({
          status: 'error',
          last_error: gatewayError instanceof Error ? gatewayError.message : 'OAuth completion failed',
        })
        .eq('id', integration.id)

      return NextResponse.redirect(
        `${appUrl}/settings/integrations?error=${encodeURIComponent('Failed to complete OAuth flow')}`
      )
    }
  } catch (error) {
    console.error('[OAuth Callback] Error:', error)
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?error=${encodeURIComponent('Internal server error')}`
    )
  }
}
