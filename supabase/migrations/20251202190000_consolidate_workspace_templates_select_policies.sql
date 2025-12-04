-- ============================================================================
-- Migration: Consolidate workspace_templates SELECT policies
-- Date: 2025-12-02
-- Purpose: Fix multiple_permissive_policies warning by merging 2 SELECT policies
-- ============================================================================

-- Drop the two overlapping SELECT policies and the consolidated one (for idempotency)
DROP POLICY IF EXISTS "workspace_templates_read_system" ON public.workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_read_team" ON public.workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_select" ON public.workspace_templates;

-- Create consolidated SELECT policy with OR conditions
CREATE POLICY "workspace_templates_select"
ON public.workspace_templates FOR SELECT
USING (
  -- System templates are publicly readable
  is_system = true
  OR
  -- Team-specific templates readable by team members
  (
    team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = workspace_templates.team_id
      AND team_members.user_id = (SELECT auth.uid())
    )
  )
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
