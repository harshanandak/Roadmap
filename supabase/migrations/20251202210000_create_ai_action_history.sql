-- ============================================================================
-- Migration: Create AI Action History Table
-- Description: Stores AI agent actions with approval workflow and rollback support
-- Date: 2025-12-02
-- ============================================================================

-- Create the ai_action_history table
CREATE TABLE IF NOT EXISTS public.ai_action_history (
  -- Primary key (timestamp-based, not UUID)
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Multi-tenant isolation (REQUIRED)
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Session grouping for multi-step workflows
  session_id TEXT NOT NULL,

  -- Action details
  tool_name TEXT NOT NULL,
  tool_category TEXT NOT NULL CHECK (tool_category IN ('creation', 'analysis', 'optimization', 'strategy')),
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'analyze', 'suggest')),

  -- Input/Output (JSONB for flexibility)
  input_params JSONB NOT NULL DEFAULT '{}',
  output_result JSONB,
  affected_items JSONB DEFAULT '[]',

  -- Rollback support
  rollback_data JSONB,
  is_reversible BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMPTZ,

  -- Status tracking with state machine
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting user approval
    'approved',     -- User approved, ready to execute
    'executing',    -- Currently running
    'completed',    -- Successfully completed
    'failed',       -- Execution failed
    'rolled_back',  -- Successfully rolled back
    'cancelled'     -- User cancelled before execution
  )),
  error_message TEXT,

  -- Performance tracking
  execution_started_at TIMESTAMPTZ,
  execution_completed_at TIMESTAMPTZ,
  execution_duration_ms INTEGER,

  -- Token/cost tracking for AI operations
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  model_used TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id)
);

-- Add comments for documentation
COMMENT ON TABLE public.ai_action_history IS 'Stores AI agent actions with approval workflow and rollback support';
COMMENT ON COLUMN public.ai_action_history.session_id IS 'Groups related actions together for batch operations';
COMMENT ON COLUMN public.ai_action_history.tool_category IS 'One of: creation, analysis, optimization, strategy';
COMMENT ON COLUMN public.ai_action_history.action_type IS 'One of: create, update, delete, analyze, suggest';
COMMENT ON COLUMN public.ai_action_history.rollback_data IS 'Stores previous state for reversible actions';
COMMENT ON COLUMN public.ai_action_history.status IS 'State machine: pending → approved → executing → completed/failed/rolled_back';

-- ============================================================================
-- Indexes (with partial indexes for hot paths)
-- ============================================================================

-- Team and workspace filtering (most common)
CREATE INDEX IF NOT EXISTS idx_ai_action_history_team
  ON public.ai_action_history(team_id);

CREATE INDEX IF NOT EXISTS idx_ai_action_history_workspace
  ON public.ai_action_history(workspace_id, created_at DESC);

-- User-specific queries
CREATE INDEX IF NOT EXISTS idx_ai_action_history_user
  ON public.ai_action_history(user_id);

-- Session-based queries (for batch operations)
CREATE INDEX IF NOT EXISTS idx_ai_action_history_session
  ON public.ai_action_history(session_id, created_at DESC);

-- HOT PATH: Pending approvals (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_ai_action_history_pending
  ON public.ai_action_history(workspace_id, status, created_at DESC)
  WHERE status = 'pending';

-- HOT PATH: Currently executing (partial index)
CREATE INDEX IF NOT EXISTS idx_ai_action_history_executing
  ON public.ai_action_history(status, execution_started_at)
  WHERE status = 'executing';

-- Tool-specific queries
CREATE INDEX IF NOT EXISTS idx_ai_action_history_tool
  ON public.ai_action_history(tool_name, workspace_id);

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_ai_action_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ai_action_history_updated_at ON public.ai_action_history;
CREATE TRIGGER trigger_ai_action_history_updated_at
  BEFORE UPDATE ON public.ai_action_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_action_history_updated_at();

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

ALTER TABLE public.ai_action_history ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their team's AI actions
DROP POLICY IF EXISTS "Users can view their team AI actions" ON public.ai_action_history;
CREATE POLICY "Users can view their team AI actions"
  ON public.ai_action_history FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- INSERT: Users can create AI actions in their team
DROP POLICY IF EXISTS "Users can create AI actions in their team" ON public.ai_action_history;
CREATE POLICY "Users can create AI actions in their team"
  ON public.ai_action_history FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- UPDATE: Users can update their own pending actions OR approve team actions
DROP POLICY IF EXISTS "Users can update AI actions" ON public.ai_action_history;
CREATE POLICY "Users can update AI actions"
  ON public.ai_action_history FOR UPDATE
  USING (
    -- Own actions
    user_id = (SELECT auth.uid())
    OR
    -- Team member can approve (for batch approvals)
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.ai_action_history TO authenticated;
