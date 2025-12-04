/**
 * Native OAuth Provider Configuration
 *
 * Handles OAuth flows for external integrations without requiring
 * the MCP Gateway Docker container. Each provider is configured
 * with their OAuth endpoints and default scopes.
 */

import type { IntegrationProvider } from '@/lib/types/integrations'

// =============================================================================
// TYPES
// =============================================================================

export interface OAuthProviderConfig {
  /** Provider identifier */
  id: IntegrationProvider
  /** Display name */
  name: string
  /** OAuth authorization URL */
  authorizationUrl: string
  /** OAuth token exchange URL */
  tokenUrl: string
  /** Default scopes to request */
  defaultScopes: string[]
  /** Environment variable names for credentials */
  envVars: {
    clientId: string
    clientSecret: string
  }
  /** Optional: Additional auth parameters */
  authParams?: Record<string, string>
}

export interface OAuthInitResult {
  /** URL to redirect user to */
  oauthUrl: string
  /** State parameter for CSRF protection */
  state: string
  /** Scopes being requested */
  scopes: string[]
}

export interface OAuthTokenResult {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType: string
  scope?: string
}

export interface OAuthUserInfo {
  id: string
  name?: string
  email?: string
  avatarUrl?: string
}

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  github: {
    id: 'github',
    name: 'GitHub',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['repo', 'read:user', 'read:org'],
    envVars: {
      clientId: 'GITHUB_CLIENT_ID',
      clientSecret: 'GITHUB_CLIENT_SECRET',
    },
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    authorizationUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    defaultScopes: ['read_user', 'read_api', 'read_repository'],
    envVars: {
      clientId: 'GITLAB_CLIENT_ID',
      clientSecret: 'GITLAB_CLIENT_SECRET',
    },
    authParams: {
      response_type: 'code',
    },
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    defaultScopes: ['channels:read', 'chat:write', 'users:read'],
    envVars: {
      clientId: 'SLACK_CLIENT_ID',
      clientSecret: 'SLACK_CLIENT_SECRET',
    },
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    defaultScopes: [], // Notion uses owner=user parameter instead
    envVars: {
      clientId: 'NOTION_CLIENT_ID',
      clientSecret: 'NOTION_CLIENT_SECRET',
    },
    authParams: {
      owner: 'user',
    },
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    authorizationUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    defaultScopes: ['read', 'write', 'issues:create'],
    envVars: {
      clientId: 'LINEAR_CLIENT_ID',
      clientSecret: 'LINEAR_CLIENT_SECRET',
    },
    authParams: {
      response_type: 'code',
    },
  },
  jira: {
    id: 'jira',
    name: 'Jira',
    authorizationUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    defaultScopes: ['read:jira-work', 'write:jira-work', 'read:jira-user', 'offline_access'],
    envVars: {
      clientId: 'JIRA_CLIENT_ID',
      clientSecret: 'JIRA_CLIENT_SECRET',
    },
    authParams: {
      audience: 'api.atlassian.com',
      prompt: 'consent',
    },
  },
  figma: {
    id: 'figma',
    name: 'Figma',
    authorizationUrl: 'https://www.figma.com/oauth',
    tokenUrl: 'https://www.figma.com/api/oauth/token',
    defaultScopes: ['file_read'],
    envVars: {
      clientId: 'FIGMA_CLIENT_ID',
      clientSecret: 'FIGMA_CLIENT_SECRET',
    },
    authParams: {
      response_type: 'code',
    },
  },
}

// =============================================================================
// OAUTH HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a provider has native OAuth support
 */
export function isNativeOAuthSupported(provider: string): boolean {
  return provider in OAUTH_PROVIDERS
}

/**
 * Get OAuth provider configuration
 */
export function getOAuthProvider(provider: string): OAuthProviderConfig | null {
  return OAUTH_PROVIDERS[provider] || null
}

/**
 * Check if OAuth credentials are configured for a provider
 */
export function isOAuthConfigured(provider: string): boolean {
  const config = OAUTH_PROVIDERS[provider]
  if (!config) return false

  const clientId = process.env[config.envVars.clientId]
  const clientSecret = process.env[config.envVars.clientSecret]

  return !!(clientId && clientSecret)
}

/**
 * Get the missing environment variables for a provider
 */
export function getMissingEnvVars(provider: string): string[] {
  const config = OAUTH_PROVIDERS[provider]
  if (!config) return []

  const missing: string[] = []
  if (!process.env[config.envVars.clientId]) {
    missing.push(config.envVars.clientId)
  }
  if (!process.env[config.envVars.clientSecret]) {
    missing.push(config.envVars.clientSecret)
  }
  return missing
}

/**
 * Generate a secure random state for CSRF protection
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Initialize OAuth flow for a provider
 */
export function initOAuth(
  provider: string,
  redirectUri: string,
  state: string,
  scopes?: string[]
): OAuthInitResult | null {
  const config = OAUTH_PROVIDERS[provider]
  if (!config) return null

  const clientId = process.env[config.envVars.clientId]
  if (!clientId) return null

  const finalScopes = scopes?.length ? scopes : config.defaultScopes

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    ...(finalScopes.length > 0 && { scope: finalScopes.join(' ') }),
    ...config.authParams,
  })

  return {
    oauthUrl: `${config.authorizationUrl}?${params.toString()}`,
    state,
    scopes: finalScopes,
  }
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  provider: string,
  code: string,
  redirectUri: string
): Promise<OAuthTokenResult | null> {
  const config = OAUTH_PROVIDERS[provider]
  if (!config) return null

  const clientId = process.env[config.envVars.clientId]
  const clientSecret = process.env[config.envVars.clientSecret]
  if (!clientId || !clientSecret) return null

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        // Some providers require Basic auth (e.g., Notion)
        ...(provider === 'notion' && {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        }),
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[OAuth] Token exchange failed for ${provider}:`, error)
      return null
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
    }
  } catch (error) {
    console.error(`[OAuth] Token exchange error for ${provider}:`, error)
    return null
  }
}

/**
 * Fetch user info from the provider
 */
export async function fetchUserInfo(
  provider: string,
  accessToken: string
): Promise<OAuthUserInfo | null> {
  try {
    switch (provider) {
      case 'github': {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        })
        if (!response.ok) return null
        const data = await response.json()
        return {
          id: String(data.id),
          name: data.login,
          email: data.email,
          avatarUrl: data.avatar_url,
        }
      }

      case 'gitlab': {
        const response = await fetch('https://gitlab.com/api/v4/user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!response.ok) return null
        const data = await response.json()
        return {
          id: String(data.id),
          name: data.username,
          email: data.email,
          avatarUrl: data.avatar_url,
        }
      }

      case 'slack': {
        const response = await fetch('https://slack.com/api/auth.test', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!response.ok) return null
        const data = await response.json()
        return {
          id: data.user_id,
          name: data.user,
        }
      }

      case 'notion': {
        // Notion doesn't have a direct user endpoint in OAuth flow
        // The bot info is returned in the token response
        return null
      }

      case 'linear': {
        const response = await fetch('https://api.linear.app/graphql', {
          method: 'POST',
          headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '{ viewer { id name email } }',
          }),
        })
        if (!response.ok) return null
        const data = await response.json()
        return {
          id: data.data?.viewer?.id,
          name: data.data?.viewer?.name,
          email: data.data?.viewer?.email,
        }
      }

      case 'jira': {
        const response = await fetch('https://api.atlassian.com/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!response.ok) return null
        const data = await response.json()
        return {
          id: data.account_id,
          name: data.name,
          email: data.email,
          avatarUrl: data.picture,
        }
      }

      case 'figma': {
        const response = await fetch('https://api.figma.com/v1/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!response.ok) return null
        const data = await response.json()
        return {
          id: data.id,
          name: data.handle,
          email: data.email,
          avatarUrl: data.img_url,
        }
      }

      default:
        return null
    }
  } catch (error) {
    console.error(`[OAuth] Error fetching user info for ${provider}:`, error)
    return null
  }
}

/**
 * Get all supported providers with their configuration status
 */
export function getAllProviders(): Array<{
  id: string
  name: string
  configured: boolean
  missingEnvVars: string[]
}> {
  return Object.entries(OAUTH_PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    configured: isOAuthConfigured(id),
    missingEnvVars: getMissingEnvVars(id),
  }))
}
