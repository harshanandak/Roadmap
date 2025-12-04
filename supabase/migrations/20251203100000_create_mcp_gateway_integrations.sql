-- =============================================================================
-- MCP Gateway Integration Tables
-- =============================================================================
-- Supports 270+ external integrations via Docker MCP Gateway
-- Part of Advanced Tool Use Implementation - Phase 2
--
-- Tables:
--   organization_integrations - Team-level OAuth tokens and provider config
--   workspace_integration_access - Workspace-level tool enablement
--   integration_sync_logs - Audit trail for sync operations
-- =============================================================================

-- =============================================================================
-- ORGANIZATION INTEGRATIONS
-- =============================================================================
-- Stores OAuth tokens and configuration for external service connections
-- One team can have multiple integrations (GitHub, Jira, Notion, etc.)

CREATE TABLE IF NOT EXISTS organization_integrations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Provider identification
  provider TEXT NOT NULL,  -- e.g., 'github', 'jira', 'notion', 'slack'
  name TEXT NOT NULL,      -- User-friendly name, e.g., "Main GitHub Org"

  -- Connection status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- OAuth initiated but not completed
    'connected',    -- Successfully authenticated
    'expired',      -- Token expired, needs refresh
    'disconnected', -- User disconnected
    'error'         -- Connection error
  )),

  -- OAuth tokens (encrypted at rest by Supabase)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Provider-specific data
  scopes TEXT[] DEFAULT '{}',           -- OAuth scopes granted
  provider_account_id TEXT,             -- Account ID in external system
  provider_account_name TEXT,           -- Display name from provider
  provider_avatar_url TEXT,             -- Avatar from provider
  metadata JSONB DEFAULT '{}',          -- Additional provider-specific data

  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Ensure unique provider per team
  UNIQUE(team_id, provider, provider_account_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_integrations_team ON organization_integrations(team_id);
CREATE INDEX IF NOT EXISTS idx_org_integrations_provider ON organization_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_org_integrations_status ON organization_integrations(status);

-- =============================================================================
-- WORKSPACE INTEGRATION ACCESS
-- =============================================================================
-- Controls which integrations and tools are enabled per workspace
-- Allows fine-grained control: "GitHub is connected at org level,
-- but only enabled for the Mobile App workspace"

CREATE TABLE IF NOT EXISTS workspace_integration_access (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id TEXT NOT NULL REFERENCES organization_integrations(id) ON DELETE CASCADE,

  -- Tool enablement
  enabled BOOLEAN DEFAULT true,
  enabled_tools TEXT[] DEFAULT '{}',    -- Specific MCP tools enabled, e.g., ['create_issue', 'list_repos']

  -- Configuration
  default_project TEXT,                 -- Default project/repo for this workspace
  settings JSONB DEFAULT '{}',          -- Workspace-specific settings

  -- Audit
  enabled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique integration per workspace
  UNIQUE(workspace_id, integration_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_access_workspace ON workspace_integration_access(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_access_integration ON workspace_integration_access(integration_id);

-- =============================================================================
-- INTEGRATION SYNC LOGS
-- =============================================================================
-- Audit trail for sync operations (imports, exports, webhooks)
-- Useful for debugging and usage billing

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL REFERENCES organization_integrations(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'import',       -- Pulling data from external system
    'export',       -- Pushing data to external system
    'webhook',      -- Webhook event received
    'oauth_refresh' -- Token refresh operation
  )),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'running',
    'completed',
    'failed',
    'partial'  -- Some items succeeded, some failed
  )),

  -- Metrics
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Details
  source_entity TEXT,         -- e.g., 'issues', 'pull_requests', 'pages'
  target_entity TEXT,         -- e.g., 'work_items', 'tasks'
  error_message TEXT,
  details JSONB DEFAULT '{}', -- Additional sync metadata

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Audit
  triggered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace ON integration_sync_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON integration_sync_logs(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_integration_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- Organization Integrations: Team members can view, admins can manage
CREATE POLICY "Team members can view integrations"
  ON organization_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = organization_integrations.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can create integrations"
  ON organization_integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = organization_integrations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Team admins can update integrations"
  ON organization_integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = organization_integrations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Team admins can delete integrations"
  ON organization_integrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = organization_integrations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'owner')
    )
  );

-- Workspace Integration Access: Workspace members can view, managers can manage
CREATE POLICY "Workspace members can view integration access"
  ON workspace_integration_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN team_members tm ON tm.team_id = w.team_id
      WHERE w.id = workspace_integration_access.workspace_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace managers can manage integration access"
  ON workspace_integration_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN team_members tm ON tm.team_id = w.team_id
      WHERE w.id = workspace_integration_access.workspace_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'owner')
    )
  );

-- Integration Sync Logs: Team members can view logs for their integrations
CREATE POLICY "Team members can view sync logs"
  ON integration_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_integrations oi
      JOIN team_members tm ON tm.team_id = oi.team_id
      WHERE oi.id = integration_sync_logs.integration_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert sync logs"
  ON integration_sync_logs FOR INSERT
  WITH CHECK (true);  -- Logs are created by the system during sync operations

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_integrations_updated_at
  BEFORE UPDATE ON organization_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

CREATE TRIGGER update_workspace_integration_access_updated_at
  BEFORE UPDATE ON workspace_integration_access
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

-- =============================================================================
-- HELPER FUNCTION: Get Integration Status Summary
-- =============================================================================

CREATE OR REPLACE FUNCTION get_team_integration_summary(p_team_id TEXT)
RETURNS TABLE (
  total_integrations INTEGER,
  connected_count INTEGER,
  error_count INTEGER,
  providers TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_integrations,
    COUNT(*) FILTER (WHERE status = 'connected')::INTEGER as connected_count,
    COUNT(*) FILTER (WHERE status IN ('error', 'expired'))::INTEGER as error_count,
    ARRAY_AGG(DISTINCT provider) as providers
  FROM organization_integrations
  WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
