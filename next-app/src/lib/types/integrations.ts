/**
 * MCP Gateway Integration Types
 *
 * TypeScript types for the external integration system.
 * Supports 270+ integrations via Docker MCP Gateway.
 *
 * Architecture:
 * - OrganizationIntegration: Team-level OAuth tokens
 * - WorkspaceIntegrationAccess: Workspace-level tool enablement
 * - IntegrationSyncLog: Audit trail for operations
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Supported integration providers
 *
 * These map to MCP server implementations available in the gateway
 */
export type IntegrationProvider =
  // Development & Code
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'azure_devops'
  // Project Management
  | 'jira'
  | 'linear'
  | 'asana'
  | 'monday'
  | 'trello'
  | 'notion'
  | 'clickup'
  | 'height'
  // Communication
  | 'slack'
  | 'discord'
  | 'microsoft_teams'
  // Documentation
  | 'confluence'
  | 'google_docs'
  | 'dropbox_paper'
  // Design
  | 'figma'
  | 'miro'
  // Analytics
  | 'amplitude'
  | 'mixpanel'
  | 'posthog'
  // Customer Support
  | 'zendesk'
  | 'intercom'
  | 'freshdesk'
  // CRM
  | 'salesforce'
  | 'hubspot'
  // Custom
  | 'custom_webhook'
  | string // Allow unknown providers

/**
 * Integration connection status
 */
export type IntegrationStatus =
  | 'pending'      // OAuth initiated but not completed
  | 'connected'    // Successfully authenticated
  | 'expired'      // Token expired, needs refresh
  | 'disconnected' // User disconnected
  | 'error'        // Connection error

/**
 * Sync operation type
 */
export type SyncType =
  | 'import'       // Pulling data from external system
  | 'export'       // Pushing data to external system
  | 'webhook'      // Webhook event received
  | 'oauth_refresh' // Token refresh operation

/**
 * Sync operation status
 */
export type SyncStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partial' // Some items succeeded, some failed

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * Organization-level integration (maps to organization_integrations table)
 */
export interface OrganizationIntegration {
  id: string
  team_id: string

  // Provider identification
  provider: IntegrationProvider
  name: string

  // Connection status
  status: IntegrationStatus

  // OAuth tokens (encrypted, rarely exposed to frontend)
  access_token_encrypted?: string
  refresh_token_encrypted?: string
  token_expires_at?: string

  // Provider-specific data
  scopes: string[]
  provider_account_id?: string
  provider_account_name?: string
  provider_avatar_url?: string
  metadata: Record<string, unknown>

  // Audit fields
  created_by: string
  created_at: string
  updated_at: string
  last_sync_at?: string
  last_error?: string
}

/**
 * Workspace-level integration access (maps to workspace_integration_access table)
 */
export interface WorkspaceIntegrationAccess {
  id: string
  workspace_id: string
  integration_id: string

  // Tool enablement
  enabled: boolean
  enabled_tools: string[]

  // Configuration
  default_project?: string
  settings: Record<string, unknown>

  // Audit
  enabled_by?: string
  created_at: string
  updated_at: string
}

/**
 * Integration sync log entry (maps to integration_sync_logs table)
 */
export interface IntegrationSyncLog {
  id: string
  integration_id: string
  workspace_id?: string

  // Sync details
  sync_type: SyncType
  status: SyncStatus

  // Metrics
  items_synced: number
  items_failed: number

  // Details
  source_entity?: string
  target_entity?: string
  error_message?: string
  details: Record<string, unknown>

  // Timing
  started_at: string
  completed_at?: string
  duration_ms?: number

  // Audit
  triggered_by?: string
  created_at: string
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Integration displayed in UI (safe to expose, no tokens)
 */
export interface IntegrationDisplay {
  id: string
  provider: IntegrationProvider
  name: string
  status: IntegrationStatus
  providerAccountName?: string
  providerAvatarUrl?: string
  scopes: string[]
  lastSyncAt?: string
  lastError?: string
  createdAt: string
}

/**
 * Workspace integration with full details
 */
export interface WorkspaceIntegrationDisplay extends IntegrationDisplay {
  workspaceAccessId: string
  enabled: boolean
  enabledTools: string[]
  defaultProject?: string
}

/**
 * Request to create a new integration (initiates OAuth)
 */
export interface CreateIntegrationRequest {
  provider: IntegrationProvider
  name: string
  scopes?: string[]
  redirectUrl?: string
}

/**
 * Response from creating an integration
 */
export interface CreateIntegrationResponse {
  integration: IntegrationDisplay
  oauthUrl: string // Redirect user here to complete OAuth
}

/**
 * Request to complete OAuth callback
 */
export interface OAuthCallbackRequest {
  code: string
  state: string
  provider: IntegrationProvider
}

/**
 * Request to enable integration for a workspace
 */
export interface EnableWorkspaceIntegrationRequest {
  integrationId: string
  enabledTools?: string[]
  defaultProject?: string
  settings?: Record<string, unknown>
}

/**
 * Request to sync data from an integration
 */
export interface TriggerSyncRequest {
  integrationId: string
  workspaceId?: string
  syncType: 'import' | 'export'
  sourceEntity?: string // e.g., 'issues', 'pull_requests'
  targetEntity?: string // e.g., 'work_items', 'tasks'
  filters?: Record<string, unknown>
}

// =============================================================================
// PROVIDER METADATA
// =============================================================================

/**
 * Metadata about an integration provider
 */
export interface IntegrationProviderMeta {
  id: IntegrationProvider
  name: string
  description: string
  icon: string
  color: string
  category: 'development' | 'project_management' | 'communication' | 'documentation' | 'design' | 'analytics' | 'support' | 'crm'
  oauthScopes: string[]
  availableTools: string[]
  docUrl: string
  setupGuideUrl?: string
}

/**
 * Static metadata for all supported providers
 */
export const INTEGRATION_PROVIDERS: Record<string, IntegrationProviderMeta> = {
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'Code hosting, issues, pull requests, and actions',
    icon: 'github',
    color: '#24292e',
    category: 'development',
    oauthScopes: ['repo', 'read:user', 'read:org'],
    availableTools: [
      'list_repos',
      'list_issues',
      'create_issue',
      'update_issue',
      'list_pull_requests',
      'create_pull_request',
      'list_branches',
      'get_file_contents',
      'search_code',
    ],
    docUrl: 'https://docs.github.com/en/rest',
  },
  jira: {
    id: 'jira',
    name: 'Jira',
    description: 'Project tracking, sprints, and agile workflows',
    icon: 'jira',
    color: '#0052CC',
    category: 'project_management',
    oauthScopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
    availableTools: [
      'list_projects',
      'list_issues',
      'create_issue',
      'update_issue',
      'list_sprints',
      'add_comment',
      'transition_issue',
      'search_issues',
    ],
    docUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/',
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    description: 'Modern issue tracking for software teams',
    icon: 'linear',
    color: '#5E6AD2',
    category: 'project_management',
    oauthScopes: ['read', 'write', 'issues:create'],
    availableTools: [
      'list_issues',
      'create_issue',
      'update_issue',
      'list_projects',
      'list_cycles',
      'add_comment',
      'search_issues',
    ],
    docUrl: 'https://developers.linear.app/docs',
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    description: 'Wikis, docs, and knowledge base',
    icon: 'notion',
    color: '#000000',
    category: 'documentation',
    oauthScopes: ['read_content', 'update_content', 'insert_content'],
    availableTools: [
      'list_pages',
      'get_page',
      'create_page',
      'update_page',
      'search',
      'list_databases',
      'query_database',
    ],
    docUrl: 'https://developers.notion.com/',
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Team messaging and notifications',
    icon: 'slack',
    color: '#4A154B',
    category: 'communication',
    oauthScopes: ['channels:read', 'chat:write', 'users:read'],
    availableTools: [
      'list_channels',
      'send_message',
      'list_users',
      'search_messages',
      'add_reaction',
    ],
    docUrl: 'https://api.slack.com/methods',
  },
  figma: {
    id: 'figma',
    name: 'Figma',
    description: 'Design files, components, and comments',
    icon: 'figma',
    color: '#F24E1E',
    category: 'design',
    oauthScopes: ['file_read'],
    availableTools: [
      'list_files',
      'get_file',
      'list_comments',
      'get_components',
      'export_images',
    ],
    docUrl: 'https://www.figma.com/developers/api',
  },
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Integration summary for dashboard
 */
export interface TeamIntegrationSummary {
  totalIntegrations: number
  connectedCount: number
  errorCount: number
  providers: IntegrationProvider[]
}

/**
 * MCP tool definition from the gateway
 */
export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
      required?: boolean
    }>
    required?: string[]
  }
}

/**
 * Result of calling an MCP tool
 */
export interface MCPToolResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: {
    provider: IntegrationProvider
    tool: string
    duration: number
    rateLimitRemaining?: number
  }
}
