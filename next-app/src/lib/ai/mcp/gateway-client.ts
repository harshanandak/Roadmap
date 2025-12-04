/**
 * MCP Gateway Client
 *
 * TypeScript client for communicating with the Docker MCP Gateway.
 * Provides type-safe access to 270+ external integrations.
 *
 * Architecture:
 * - Uses JSON-RPC 2.0 over HTTP
 * - Handles authentication via Bearer tokens
 * - Provides both individual tool calls and batch operations
 *
 * Usage:
 * ```typescript
 * const client = new MCPGatewayClient()
 * const result = await client.callTool('github_list_repos', { page: 1 })
 * ```
 */

import type {
  IntegrationProvider,
  MCPToolDefinition,
  MCPToolResult,
} from '@/lib/types/integrations'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the MCP Gateway client
 */
export interface MCPGatewayConfig {
  /** Gateway URL (default: http://localhost:3100) */
  baseUrl: string
  /** Request timeout in ms (default: 30000) */
  timeout: number
  /** Retry failed requests (default: 3) */
  retries: number
}

/**
 * JSON-RPC 2.0 request
 */
interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

/**
 * JSON-RPC 2.0 response
 */
interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string | number
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * Provider info from the gateway
 */
export interface ProviderInfo {
  id: string
  name: string
  category: string
  toolCount: number
  requiredScopes: string[]
}

/**
 * Tool info from the gateway
 */
export interface ToolInfo {
  name: string
  description: string
  provider: string
  providerName: string
  category: string
  inputSchema: MCPToolDefinition['inputSchema']
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  timestamp: string
}

/**
 * OAuth initialization response
 */
export interface OAuthInitResponse {
  oauthUrl: string
  state: string
  provider: string
  scopes: string[]
}

// =============================================================================
// CLIENT IMPLEMENTATION
// =============================================================================

/**
 * MCP Gateway Client
 *
 * Provides type-safe access to the MCP Gateway for executing
 * external integration tools.
 */
export class MCPGatewayClient {
  private config: MCPGatewayConfig
  private requestId = 0

  constructor(config?: Partial<MCPGatewayConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.MCP_GATEWAY_URL || 'http://localhost:3100',
      timeout: config?.timeout || 30000,
      retries: config?.retries || 3,
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Generate unique request ID
   */
  private nextId(): number {
    return ++this.requestId
  }

  /**
   * Make HTTP request with retries
   */
  private async fetch<T>(
    path: string,
    options: RequestInit = {},
    retriesLeft = this.config.retries
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      // Retry on network errors
      if (retriesLeft > 0 && error instanceof Error) {
        const isRetryable =
          error.name === 'AbortError' ||
          error.message.includes('network') ||
          error.message.includes('ECONNREFUSED')

        if (isRetryable) {
          await new Promise((r) => setTimeout(r, 1000 * (this.config.retries - retriesLeft + 1)))
          return this.fetch(path, options, retriesLeft - 1)
        }
      }

      throw error
    }
  }

  /**
   * Make JSON-RPC call
   */
  private async rpc<T>(
    method: string,
    params?: Record<string, unknown>,
    token?: string
  ): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method,
      params,
    }

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await this.fetch<JsonRpcResponse<T>>('/rpc', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (response.error) {
      throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`)
    }

    return response.result as T
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Check gateway health
   */
  async health(): Promise<HealthResponse> {
    return this.fetch('/health')
  }

  /**
   * Check if gateway is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.health()
      return health.status === 'healthy'
    } catch {
      return false
    }
  }

  /**
   * List all available providers
   */
  async listProviders(): Promise<{ count: number; providers: ProviderInfo[] }> {
    return this.fetch('/providers')
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<{ count: number; tools: ToolInfo[] }> {
    return this.fetch('/tools')
  }

  /**
   * List tools for a specific provider
   */
  async listProviderTools(
    providerId: IntegrationProvider
  ): Promise<{ provider: string; name: string; tools: { name: string; description: string }[] }> {
    return this.fetch(`/providers/${providerId}/tools`)
  }

  /**
   * Call an MCP tool
   *
   * @param toolName - The tool to call (e.g., 'github_list_repos')
   * @param params - Tool parameters
   * @param token - Optional auth token for the integration
   */
  async callTool(
    toolName: string,
    params: Record<string, unknown> = {},
    token?: string
  ): Promise<MCPToolResult> {
    return this.rpc<MCPToolResult>(toolName, params, token)
  }

  /**
   * Call multiple tools in sequence
   */
  async callTools(
    calls: Array<{ tool: string; params?: Record<string, unknown> }>,
    token?: string
  ): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = []

    for (const call of calls) {
      try {
        const result = await this.callTool(call.tool, call.params || {}, token)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Initialize OAuth flow for a provider
   *
   * @param provider - The provider to connect (e.g., 'github')
   * @param teamId - The team ID to associate the integration with
   * @param redirectUri - Where to redirect after OAuth completes
   * @param scopes - Optional custom scopes
   */
  async initOAuth(
    provider: IntegrationProvider,
    teamId: string,
    redirectUri: string,
    scopes?: string[]
  ): Promise<OAuthInitResponse> {
    return this.fetch('/oauth/init', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        teamId,
        redirectUri,
        scopes,
      }),
    })
  }

  /**
   * Complete OAuth flow with callback data
   *
   * @param code - Authorization code from OAuth provider
   * @param state - State token for CSRF validation
   * @param provider - The provider being connected
   */
  async completeOAuth(
    code: string,
    state: string,
    provider: IntegrationProvider
  ): Promise<{ success: boolean; provider: string; teamId: string }> {
    return this.fetch('/oauth/callback', {
      method: 'POST',
      body: JSON.stringify({
        code,
        state,
        provider,
      }),
    })
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default MCP Gateway client instance
 *
 * Usage:
 * ```typescript
 * import { mcpGateway } from '@/lib/ai/mcp/gateway-client'
 *
 * const repos = await mcpGateway.callTool('github_list_repos', { page: 1 })
 * ```
 */
export const mcpGateway = new MCPGatewayClient()

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get provider name from tool name
 *
 * @example getProviderFromTool('github_list_repos') // 'github'
 */
export function getProviderFromTool(toolName: string): string {
  const [provider] = toolName.split('_')
  return provider
}

/**
 * Check if a tool belongs to a provider
 *
 * @example isProviderTool('github_list_repos', 'github') // true
 */
export function isProviderTool(toolName: string, provider: IntegrationProvider): boolean {
  return toolName.startsWith(`${provider}_`)
}

/**
 * Group tools by provider
 */
export function groupToolsByProvider(tools: ToolInfo[]): Record<string, ToolInfo[]> {
  return tools.reduce(
    (acc, tool) => {
      if (!acc[tool.provider]) {
        acc[tool.provider] = []
      }
      acc[tool.provider].push(tool)
      return acc
    },
    {} as Record<string, ToolInfo[]>
  )
}

/**
 * Filter tools by category
 */
export function filterToolsByCategory(
  tools: ToolInfo[],
  category: string
): ToolInfo[] {
  return tools.filter((tool) => tool.category === category)
}
