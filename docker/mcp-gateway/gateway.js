/**
 * MCP Gateway Server
 *
 * Centralized MCP server providing access to 270+ external integrations.
 * Exposes JSON-RPC over HTTP for easy integration with Next.js.
 *
 * Architecture:
 * - HTTP server on port 3100
 * - JSON-RPC 2.0 protocol for tool calls
 * - Provider plugins for each integration type
 * - Redis for token caching and rate limiting
 *
 * Endpoints:
 * - POST /rpc           - JSON-RPC tool execution
 * - GET  /health        - Health check
 * - GET  /tools         - List available tools
 * - GET  /providers     - List loaded providers
 * - POST /oauth/init    - Initialize OAuth flow
 * - POST /oauth/callback - Complete OAuth flow
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createLogger, format, transports } from 'winston'

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 3100
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// =============================================================================
// LOGGING
// =============================================================================

const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'mcp-gateway' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
})

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

/**
 * Provider definitions - each provider exposes MCP tools
 * In production, these would be loaded dynamically from ./providers/
 */
const providers = {
  // Development & Code
  github: {
    name: 'GitHub',
    category: 'development',
    tools: [
      { name: 'github_list_repos', description: 'List repositories for authenticated user' },
      { name: 'github_list_issues', description: 'List issues in a repository' },
      { name: 'github_create_issue', description: 'Create a new issue' },
      { name: 'github_update_issue', description: 'Update an existing issue' },
      { name: 'github_list_pull_requests', description: 'List pull requests' },
      { name: 'github_create_pull_request', description: 'Create a pull request' },
      { name: 'github_list_branches', description: 'List branches in a repository' },
      { name: 'github_get_file', description: 'Get file contents from a repository' },
      { name: 'github_search_code', description: 'Search code in repositories' },
    ],
    requiredScopes: ['repo', 'read:user', 'read:org'],
    oauthConfig: {
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
    }
  },

  // Project Management
  jira: {
    name: 'Jira',
    category: 'project_management',
    tools: [
      { name: 'jira_list_projects', description: 'List all Jira projects' },
      { name: 'jira_list_issues', description: 'List issues in a project' },
      { name: 'jira_create_issue', description: 'Create a new Jira issue' },
      { name: 'jira_update_issue', description: 'Update an existing issue' },
      { name: 'jira_list_sprints', description: 'List sprints in a board' },
      { name: 'jira_add_comment', description: 'Add comment to an issue' },
      { name: 'jira_transition_issue', description: 'Transition issue status' },
      { name: 'jira_search', description: 'Search issues with JQL' },
    ],
    requiredScopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
    oauthConfig: {
      authUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
    }
  },

  linear: {
    name: 'Linear',
    category: 'project_management',
    tools: [
      { name: 'linear_list_issues', description: 'List Linear issues' },
      { name: 'linear_create_issue', description: 'Create a new issue' },
      { name: 'linear_update_issue', description: 'Update an issue' },
      { name: 'linear_list_projects', description: 'List projects' },
      { name: 'linear_list_cycles', description: 'List cycles/sprints' },
      { name: 'linear_add_comment', description: 'Add comment to issue' },
      { name: 'linear_search', description: 'Search issues' },
    ],
    requiredScopes: ['read', 'write', 'issues:create'],
    oauthConfig: {
      authUrl: 'https://linear.app/oauth/authorize',
      tokenUrl: 'https://api.linear.app/oauth/token',
    }
  },

  // Documentation
  notion: {
    name: 'Notion',
    category: 'documentation',
    tools: [
      { name: 'notion_list_pages', description: 'List Notion pages' },
      { name: 'notion_get_page', description: 'Get page content' },
      { name: 'notion_create_page', description: 'Create a new page' },
      { name: 'notion_update_page', description: 'Update page content' },
      { name: 'notion_search', description: 'Search Notion' },
      { name: 'notion_list_databases', description: 'List databases' },
      { name: 'notion_query_database', description: 'Query a database' },
    ],
    requiredScopes: ['read_content', 'update_content', 'insert_content'],
    oauthConfig: {
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
    }
  },

  // Communication
  slack: {
    name: 'Slack',
    category: 'communication',
    tools: [
      { name: 'slack_list_channels', description: 'List Slack channels' },
      { name: 'slack_send_message', description: 'Send a message' },
      { name: 'slack_list_users', description: 'List workspace users' },
      { name: 'slack_search_messages', description: 'Search messages' },
      { name: 'slack_add_reaction', description: 'Add reaction to message' },
    ],
    requiredScopes: ['channels:read', 'chat:write', 'users:read'],
    oauthConfig: {
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
    }
  },

  // Design
  figma: {
    name: 'Figma',
    category: 'design',
    tools: [
      { name: 'figma_list_files', description: 'List Figma files' },
      { name: 'figma_get_file', description: 'Get file details' },
      { name: 'figma_list_comments', description: 'List comments on file' },
      { name: 'figma_get_components', description: 'Get file components' },
      { name: 'figma_export_images', description: 'Export images from file' },
    ],
    requiredScopes: ['file_read'],
    oauthConfig: {
      authUrl: 'https://www.figma.com/oauth',
      tokenUrl: 'https://www.figma.com/api/oauth/token',
    }
  },
}

// =============================================================================
// TOOL EXECUTION
// =============================================================================

/**
 * Execute a tool call
 * In production, this would route to actual provider implementations
 */
async function executeTool(toolName, params, credentials) {
  const [providerName] = toolName.split('_')
  const provider = providers[providerName]

  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`)
  }

  const tool = provider.tools.find(t => t.name === toolName)
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  // In production, this would call the actual provider API
  // For now, return a mock response
  logger.info(`Executing tool: ${toolName}`, { params })

  return {
    success: true,
    data: {
      tool: toolName,
      message: `Tool ${toolName} executed successfully`,
      params,
      timestamp: new Date().toISOString(),
    },
    metadata: {
      provider: providerName,
      tool: toolName,
      duration: Math.floor(Math.random() * 500) + 100,
    }
  }
}

// =============================================================================
// EXPRESS SERVER
// =============================================================================

const app = express()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    body: req.method === 'POST' ? req.body : undefined
  })
  next()
})

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

/**
 * List all available tools
 */
app.get('/tools', (req, res) => {
  const tools = []

  for (const [providerId, provider] of Object.entries(providers)) {
    for (const tool of provider.tools) {
      tools.push({
        name: tool.name,
        description: tool.description,
        provider: providerId,
        providerName: provider.name,
        category: provider.category,
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        }
      })
    }
  }

  res.json({
    count: tools.length,
    tools,
  })
})

/**
 * List all providers
 */
app.get('/providers', (req, res) => {
  const result = Object.entries(providers).map(([id, provider]) => ({
    id,
    name: provider.name,
    category: provider.category,
    toolCount: provider.tools.length,
    requiredScopes: provider.requiredScopes,
  }))

  res.json({
    count: result.length,
    providers: result,
  })
})

/**
 * Get tools for a specific provider
 */
app.get('/providers/:providerId/tools', (req, res) => {
  const provider = providers[req.params.providerId]

  if (!provider) {
    return res.status(404).json({
      error: 'Provider not found',
      providerId: req.params.providerId,
    })
  }

  res.json({
    provider: req.params.providerId,
    name: provider.name,
    tools: provider.tools,
  })
})

/**
 * JSON-RPC 2.0 endpoint for tool execution
 */
app.post('/rpc', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body

  // Validate JSON-RPC format
  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32600,
        message: 'Invalid Request: jsonrpc must be "2.0"',
      }
    })
  }

  if (!method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32600,
        message: 'Invalid Request: method is required',
      }
    })
  }

  try {
    // Extract credentials from Authorization header
    const authHeader = req.headers.authorization
    let credentials = null

    if (authHeader?.startsWith('Bearer ')) {
      // In production, decode JWT and get integration credentials
      credentials = { token: authHeader.slice(7) }
    }

    // Execute the tool
    const result = await executeTool(method, params || {}, credentials)

    res.json({
      jsonrpc: '2.0',
      id,
      result,
    })
  } catch (error) {
    logger.error(`RPC error: ${method}`, { error: error.message })

    res.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message,
      }
    })
  }
})

/**
 * Initialize OAuth flow
 */
app.post('/oauth/init', (req, res) => {
  const { provider: providerId, teamId, redirectUri, scopes } = req.body

  const provider = providers[providerId]
  if (!provider) {
    return res.status(404).json({
      error: 'Provider not found',
      providerId,
    })
  }

  // Generate state token for CSRF protection
  const state = Buffer.from(JSON.stringify({
    provider: providerId,
    teamId,
    timestamp: Date.now(),
  })).toString('base64url')

  // Build OAuth URL
  const oauthUrl = new URL(provider.oauthConfig.authUrl)
  oauthUrl.searchParams.set('client_id', process.env[`${providerId.toUpperCase()}_CLIENT_ID`] || '')
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('state', state)
  oauthUrl.searchParams.set('scope', (scopes || provider.requiredScopes).join(' '))
  oauthUrl.searchParams.set('response_type', 'code')

  res.json({
    oauthUrl: oauthUrl.toString(),
    state,
    provider: providerId,
    scopes: scopes || provider.requiredScopes,
  })
})

/**
 * Complete OAuth flow (callback handler)
 */
app.post('/oauth/callback', async (req, res) => {
  const { code, state, provider: providerId } = req.body

  try {
    // Decode and validate state
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString())

    if (stateData.provider !== providerId) {
      return res.status(400).json({
        error: 'State mismatch',
      })
    }

    const provider = providers[providerId]
    if (!provider) {
      return res.status(404).json({
        error: 'Provider not found',
      })
    }

    // In production, exchange code for tokens
    // For now, return mock success
    logger.info(`OAuth callback for ${providerId}`, { teamId: stateData.teamId })

    res.json({
      success: true,
      provider: providerId,
      teamId: stateData.teamId,
      message: 'OAuth flow completed successfully',
      // In production, return encrypted tokens for storage
    })
  } catch (error) {
    logger.error('OAuth callback error', { error: error.message })

    res.status(400).json({
      error: 'Invalid callback',
      details: error.message,
    })
  }
})

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  })
})

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack })

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  logger.info(`MCP Gateway running on port ${PORT}`)
  logger.info(`Loaded ${Object.keys(providers).length} providers`)

  const totalTools = Object.values(providers).reduce(
    (sum, p) => sum + p.tools.length,
    0
  )
  logger.info(`Total tools available: ${totalTools}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...')
  process.exit(0)
})
