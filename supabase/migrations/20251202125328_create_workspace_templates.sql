-- ============================================================================
-- Create workspace_templates table
-- Supports both system templates and user-created custom templates
-- ============================================================================

-- Create workspace_templates table
CREATE TABLE IF NOT EXISTS workspace_templates (
  id TEXT PRIMARY KEY,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,  -- NULL for system templates
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'layout-template',
  mode TEXT NOT NULL CHECK (mode IN ('development', 'launch', 'growth', 'maintenance')),
  is_system BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on team_id for faster queries
CREATE INDEX IF NOT EXISTS idx_workspace_templates_team_id ON workspace_templates(team_id);

-- Create index on mode for filtering
CREATE INDEX IF NOT EXISTS idx_workspace_templates_mode ON workspace_templates(mode);

-- Create index on is_system for filtering
CREATE INDEX IF NOT EXISTS idx_workspace_templates_is_system ON workspace_templates(is_system);

-- Enable RLS
ALTER TABLE workspace_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "workspace_templates_read_system" ON workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_read_team" ON workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_insert" ON workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_update" ON workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_delete" ON workspace_templates;

-- Policy: Everyone can read system templates
CREATE POLICY "workspace_templates_read_system"
  ON workspace_templates
  FOR SELECT
  USING (is_system = true);

-- Policy: Team members can read their team's templates
CREATE POLICY "workspace_templates_read_team"
  ON workspace_templates
  FOR SELECT
  USING (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workspace_templates.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Policy: Only admins/owners can create team templates
CREATE POLICY "workspace_templates_insert"
  ON workspace_templates
  FOR INSERT
  WITH CHECK (
    is_system = false AND
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workspace_templates.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- Policy: Only admins/owners can update their team's templates
CREATE POLICY "workspace_templates_update"
  ON workspace_templates
  FOR UPDATE
  USING (
    is_system = false AND
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workspace_templates.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- Policy: Only admins/owners can delete their team's templates
CREATE POLICY "workspace_templates_delete"
  ON workspace_templates
  FOR DELETE
  USING (
    is_system = false AND
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workspace_templates.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Insert System Templates (8 templates: 2 per mode)
-- ============================================================================

INSERT INTO workspace_templates (id, team_id, name, description, icon, mode, is_system, template_data)
VALUES
  -- DEVELOPMENT MODE TEMPLATES
  (
    'system_dev_mvp_starter',
    NULL,
    'MVP Starter',
    'Quick setup for building a minimum viable product with essential departments and starter work items',
    'rocket',
    'development',
    true,
    '{
      "departments": [
        {"name": "Engineering", "color": "#6366f1", "icon": "code-2"},
        {"name": "Product", "color": "#10b981", "icon": "briefcase"}
      ],
      "workItems": [
        {"name": "Define MVP scope", "type": "concept", "purpose": "Identify core features for initial release"},
        {"name": "User authentication", "type": "feature", "purpose": "Enable users to sign up and log in"},
        {"name": "Core feature #1", "type": "feature", "purpose": "Primary value proposition"}
      ],
      "tags": ["mvp", "launch-blocker", "v1.0"]
    }'::jsonb
  ),
  (
    'system_dev_saas_product',
    NULL,
    'SaaS Product',
    'Complete setup for a SaaS application with billing, auth, and analytics departments',
    'cloud',
    'development',
    true,
    '{
      "departments": [
        {"name": "Engineering", "color": "#6366f1", "icon": "code-2"},
        {"name": "Product", "color": "#10b981", "icon": "briefcase"},
        {"name": "Design", "color": "#8b5cf6", "icon": "palette"},
        {"name": "Marketing", "color": "#f59e0b", "icon": "megaphone"}
      ],
      "workItems": [
        {"name": "User authentication & SSO", "type": "feature", "purpose": "Secure access with social login options"},
        {"name": "Subscription billing", "type": "feature", "purpose": "Recurring payment processing"},
        {"name": "Team management", "type": "feature", "purpose": "Multi-user collaboration"},
        {"name": "Analytics dashboard", "type": "feature", "purpose": "Usage insights for customers"},
        {"name": "Onboarding flow", "type": "feature", "purpose": "Guide new users to value"}
      ],
      "tags": ["saas", "subscription", "multi-tenant", "analytics"]
    }'::jsonb
  ),

  -- LAUNCH MODE TEMPLATES
  (
    'system_launch_checklist',
    NULL,
    'Pre-Launch Checklist',
    'Essential items to verify before going live',
    'check-circle',
    'launch',
    true,
    '{
      "departments": [
        {"name": "Engineering", "color": "#6366f1", "icon": "code-2"},
        {"name": "QA", "color": "#ef4444", "icon": "shield"}
      ],
      "workItems": [
        {"name": "Security audit", "type": "feature", "purpose": "Verify no critical vulnerabilities"},
        {"name": "Performance testing", "type": "feature", "purpose": "Ensure app handles expected load"},
        {"name": "Error monitoring setup", "type": "feature", "purpose": "Track issues in production"},
        {"name": "Backup & recovery test", "type": "feature", "purpose": "Verify data can be restored"},
        {"name": "Documentation review", "type": "feature", "purpose": "Ensure docs are up to date"}
      ],
      "tags": ["pre-launch", "checklist", "qa"]
    }'::jsonb
  ),
  (
    'system_launch_marketing',
    NULL,
    'Product Launch Campaign',
    'Marketing-focused launch preparation',
    'megaphone',
    'launch',
    true,
    '{
      "departments": [
        {"name": "Marketing", "color": "#f59e0b", "icon": "megaphone"},
        {"name": "Content", "color": "#ec4899", "icon": "file-text"},
        {"name": "Product", "color": "#10b981", "icon": "briefcase"}
      ],
      "workItems": [
        {"name": "Landing page launch", "type": "feature", "purpose": "Convert visitors to signups"},
        {"name": "Email announcement", "type": "feature", "purpose": "Notify waitlist and subscribers"},
        {"name": "Social media campaign", "type": "feature", "purpose": "Build buzz on launch day"},
        {"name": "Press kit preparation", "type": "feature", "purpose": "Materials for media coverage"},
        {"name": "Launch day support plan", "type": "feature", "purpose": "Handle surge in support requests"}
      ],
      "tags": ["launch", "marketing", "campaign"]
    }'::jsonb
  ),

  -- GROWTH MODE TEMPLATES
  (
    'system_growth_feedback',
    NULL,
    'User Feedback Loop',
    'Systematic approach to collecting and acting on user feedback',
    'message-square',
    'growth',
    true,
    '{
      "departments": [
        {"name": "Product", "color": "#10b981", "icon": "briefcase"},
        {"name": "Customer Success", "color": "#3b82f6", "icon": "headphones"},
        {"name": "Engineering", "color": "#6366f1", "icon": "code-2"}
      ],
      "workItems": [
        {"name": "Feedback collection system", "type": "feature", "purpose": "Gather user input systematically"},
        {"name": "NPS survey implementation", "type": "enhancement", "purpose": "Track customer satisfaction"},
        {"name": "Feature request tracker", "type": "feature", "purpose": "Prioritize user-requested features"},
        {"name": "User interview process", "type": "enhancement", "purpose": "Deep dive into user needs"}
      ],
      "tags": ["feedback", "nps", "user-research"]
    }'::jsonb
  ),
  (
    'system_growth_analytics',
    NULL,
    'Growth Analytics Setup',
    'Track and optimize key growth metrics',
    'bar-chart-3',
    'growth',
    true,
    '{
      "departments": [
        {"name": "Growth", "color": "#10b981", "icon": "trending-up"},
        {"name": "Engineering", "color": "#6366f1", "icon": "code-2"},
        {"name": "Marketing", "color": "#f59e0b", "icon": "megaphone"}
      ],
      "workItems": [
        {"name": "Analytics dashboard", "type": "feature", "purpose": "Visualize key metrics"},
        {"name": "Funnel tracking", "type": "enhancement", "purpose": "Identify conversion bottlenecks"},
        {"name": "A/B testing framework", "type": "feature", "purpose": "Data-driven feature decisions"},
        {"name": "Cohort analysis", "type": "enhancement", "purpose": "Understand retention by cohort"},
        {"name": "Referral program", "type": "feature", "purpose": "Leverage word-of-mouth growth"}
      ],
      "tags": ["analytics", "growth", "metrics", "ab-testing"]
    }'::jsonb
  ),

  -- MAINTENANCE MODE TEMPLATES
  (
    'system_maint_tech_debt',
    NULL,
    'Tech Debt Sprint',
    'Focused effort to reduce technical debt',
    'wrench',
    'maintenance',
    true,
    '{
      "departments": [
        {"name": "Engineering", "color": "#6366f1", "icon": "code-2"}
      ],
      "workItems": [
        {"name": "Dependency updates", "type": "enhancement", "purpose": "Update outdated packages"},
        {"name": "Code refactoring", "type": "enhancement", "purpose": "Improve code quality and maintainability"},
        {"name": "Test coverage improvement", "type": "enhancement", "purpose": "Add missing tests"},
        {"name": "Documentation update", "type": "enhancement", "purpose": "Keep docs current with codebase"},
        {"name": "Performance optimization", "type": "enhancement", "purpose": "Improve app speed and efficiency"}
      ],
      "tags": ["tech-debt", "refactoring", "maintenance"]
    }'::jsonb
  ),
  (
    'system_maint_stability',
    NULL,
    'Stability Focus',
    'Improve system reliability and monitoring',
    'activity',
    'maintenance',
    true,
    '{
      "departments": [
        {"name": "Engineering", "color": "#6366f1", "icon": "code-2"},
        {"name": "DevOps", "color": "#64748b", "icon": "server"}
      ],
      "workItems": [
        {"name": "Error monitoring review", "type": "enhancement", "purpose": "Address recurring errors"},
        {"name": "Alerting improvements", "type": "enhancement", "purpose": "Better incident detection"},
        {"name": "Backup verification", "type": "enhancement", "purpose": "Ensure data safety"},
        {"name": "Load testing", "type": "enhancement", "purpose": "Verify system handles peak load"},
        {"name": "Security patches", "type": "bug", "purpose": "Apply latest security updates"}
      ],
      "tags": ["stability", "monitoring", "devops", "security"]
    }'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_workspace_templates_updated_at ON workspace_templates;
CREATE TRIGGER update_workspace_templates_updated_at
  BEFORE UPDATE ON workspace_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_templates_updated_at();
