/**
 * OAuth Callback Handler
 *
 * Handles OAuth callbacks from providers (GitHub, Jira, Slack, etc.)
 * Exchanges the authorization code for access tokens and updates the integration.
 *
 * GET /api/integrations/oauth/callback/[provider]?code=xxx&state=yyy
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  fetchUserInfo,
  isNativeOAuthSupported,
} from '@/lib/integrations/oauth-providers'

interface RouteParams {
  params: Promise<{
    provider: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Base redirect URL for success/error
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const settingsUrl = `${appUrl}/team/settings`

  // Handle OAuth errors from provider
  if (error) {
    console.error(`[OAuth Callback] Provider error for ${provider}:`, error, errorDescription)
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('[OAuth Callback] Missing code or state parameter')
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent('Missing authorization code or state')}`
    )
  }

  // Check if provider is supported
  if (!isNativeOAuthSupported(provider)) {
    console.error(`[OAuth Callback] Unsupported provider: ${provider}`)
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(`Unsupported provider: ${provider}`)}`
    )
  }

  try {
    const supabase = await createClient()

    // Find the integration by state
    const { data: integrations, error: queryError } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('provider', provider)
      .eq('status', 'pending')

    if (queryError) {
      console.error('[OAuth Callback] Query error:', queryError)
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent('Failed to find integration')}`
      )
    }

    // Find the integration with matching state
    const integration = integrations?.find(
      (int) => int.metadata?.oauth_state === state
    )

    if (!integration) {
      console.error('[OAuth Callback] No matching integration found for state')
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent('Invalid or expired OAuth state')}`
      )
    }

    // Build redirect URI (must match the one used in authorization)
    const redirectUri = `${appUrl}/api/integrations/oauth/callback/${provider}`

    // Exchange code for tokens
    const tokenResult = await exchangeCodeForToken(provider, code, redirectUri)

    if (!tokenResult) {
      console.error('[OAuth Callback] Token exchange failed')

      // Update integration status to error
      await supabase
        .from('organization_integrations')
        .update({
          status: 'error',
          last_error: 'Failed to exchange authorization code for access token',
        })
        .eq('id', integration.id)

      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent('Failed to exchange code for token')}`
      )
    }

    // Fetch user info from provider
    const userInfo = await fetchUserInfo(provider, tokenResult.accessToken)

    // Calculate token expiration
    const tokenExpiresAt = tokenResult.expiresIn
      ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
      : null

    // Update integration with tokens and user info
    const { error: updateError } = await supabase
      .from('organization_integrations')
      .update({
        status: 'connected',
        access_token_encrypted: tokenResult.accessToken, // TODO: Encrypt in production
        refresh_token_encrypted: tokenResult.refreshToken || null,
        token_expires_at: tokenExpiresAt,
        provider_account_id: userInfo?.id || null,
        provider_account_name: userInfo?.name || null,
        provider_avatar_url: userInfo?.avatarUrl || null,
        scopes: tokenResult.scope?.split(' ') || integration.scopes,
        last_error: null,
        metadata: {
          ...integration.metadata,
          oauth_state: null, // Clear state after use
          connected_at: new Date().toISOString(),
        },
      })
      .eq('id', integration.id)

    if (updateError) {
      console.error('[OAuth Callback] Update error:', updateError)
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent('Failed to save integration')}`
      )
    }

    console.log(`[OAuth Callback] Successfully connected ${provider} for integration ${integration.id}`)

    // Redirect to settings with success message
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1)
    return NextResponse.redirect(
      `${settingsUrl}?success=${encodeURIComponent(`${providerName} connected successfully!`)}`
    )
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error)
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent('An unexpected error occurred')}`
    )
  }
}
