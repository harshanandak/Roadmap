/**
 * MCP Gateway Module
 *
 * Provides access to 270+ external integrations via the Docker MCP Gateway.
 *
 * Usage:
 * ```typescript
 * import { mcpGateway } from '@/lib/ai/mcp'
 *
 * // Check if gateway is available
 * const available = await mcpGateway.isAvailable()
 *
 * // List all tools
 * const { tools } = await mcpGateway.listTools()
 *
 * // Call a tool
 * const result = await mcpGateway.callTool('github_list_repos', { page: 1 })
 * ```
 */

export {
  MCPGatewayClient,
  mcpGateway,
  getProviderFromTool,
  isProviderTool,
  groupToolsByProvider,
  filterToolsByCategory,
} from './gateway-client'

export type {
  MCPGatewayConfig,
  ProviderInfo,
  ToolInfo,
  HealthResponse,
  OAuthInitResponse,
} from './gateway-client'
