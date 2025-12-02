-- ============================================================================
-- Migration: Fix workspace_templates RLS + Add Missing FK Indexes
-- Date: 2025-12-02
-- Purpose: Address Supabase performance advisors
-- Issues Fixed:
--   1. auth_rls_initplan on workspace_templates (4 policies)
--   2. unindexed_foreign_keys (30 missing indexes)
-- ============================================================================

-- ============================================================================
-- PART 1: FIX workspace_templates RLS policies (auth_rls_initplan)
-- Replace auth.uid() with (select auth.uid()) for single evaluation per query
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_templates_delete" ON public.workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_insert" ON public.workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_read_team" ON public.workspace_templates;
DROP POLICY IF EXISTS "workspace_templates_update" ON public.workspace_templates;

-- Recreate with optimized (select auth.uid()) pattern
CREATE POLICY "workspace_templates_read_team"
ON public.workspace_templates FOR SELECT
USING (
  team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = workspace_templates.team_id
    AND team_members.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "workspace_templates_insert"
ON public.workspace_templates FOR INSERT
WITH CHECK (
  is_system = false
  AND team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = workspace_templates.team_id
    AND team_members.user_id = (SELECT auth.uid())
    AND team_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "workspace_templates_update"
ON public.workspace_templates FOR UPDATE
USING (
  is_system = false
  AND team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = workspace_templates.team_id
    AND team_members.user_id = (SELECT auth.uid())
    AND team_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "workspace_templates_delete"
ON public.workspace_templates FOR DELETE
USING (
  is_system = false
  AND team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = workspace_templates.team_id
    AND team_members.user_id = (SELECT auth.uid())
    AND team_members.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- PART 2: ADD MISSING FOREIGN KEY INDEXES
-- Indexes on FK columns improve JOIN performance and CASCADE DELETE speed
-- ============================================================================

-- ai_usage
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_id ON public.ai_usage(workspace_id);

-- custom_dashboards
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_created_by ON public.custom_dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_workspace_id ON public.custom_dashboards(workspace_id);

-- customer_insights
CREATE INDEX IF NOT EXISTS idx_customer_insights_created_by ON public.customer_insights(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_insights_workspace_id ON public.customer_insights(workspace_id);

-- departments
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON public.departments(created_by);

-- feedback
CREATE INDEX IF NOT EXISTS idx_feedback_decision_by ON public.feedback(decision_by);
CREATE INDEX IF NOT EXISTS idx_feedback_implemented_in_id ON public.feedback(implemented_in_id);

-- insight_votes
CREATE INDEX IF NOT EXISTS idx_insight_votes_voter_id ON public.insight_votes(voter_id);

-- invitations
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations(invited_by);

-- linked_items
CREATE INDEX IF NOT EXISTS idx_linked_items_created_by ON public.linked_items(created_by);

-- mind_map_edges
CREATE INDEX IF NOT EXISTS idx_mind_map_edges_source_node_id ON public.mind_map_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_edges_target_node_id ON public.mind_map_edges(target_node_id);

-- mind_map_nodes
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_converted_to_work_item_id ON public.mind_map_nodes(converted_to_work_item_id);

-- product_strategies
CREATE INDEX IF NOT EXISTS idx_product_strategies_owner_id ON public.product_strategies(owner_id);

-- product_tasks
CREATE INDEX IF NOT EXISTS idx_product_tasks_created_by ON public.product_tasks(created_by);

-- resource_audit_log
CREATE INDEX IF NOT EXISTS idx_resource_audit_log_team_id ON public.resource_audit_log(team_id);
CREATE INDEX IF NOT EXISTS idx_resource_audit_log_workspace_id ON public.resource_audit_log(workspace_id);

-- resources
CREATE INDEX IF NOT EXISTS idx_resources_created_by ON public.resources(created_by);
CREATE INDEX IF NOT EXISTS idx_resources_deleted_by ON public.resources(deleted_by);
CREATE INDEX IF NOT EXISTS idx_resources_last_modified_by ON public.resources(last_modified_by);
CREATE INDEX IF NOT EXISTS idx_resources_workspace_id ON public.resources(workspace_id);

-- review_links
CREATE INDEX IF NOT EXISTS idx_review_links_created_by ON public.review_links(created_by);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id ON public.subscriptions(team_id);

-- success_metrics
CREATE INDEX IF NOT EXISTS idx_success_metrics_feature_id ON public.success_metrics(feature_id);
CREATE INDEX IF NOT EXISTS idx_success_metrics_workspace_id ON public.success_metrics(workspace_id);

-- user_phase_assignments
CREATE INDEX IF NOT EXISTS idx_user_phase_assignments_assigned_by ON public.user_phase_assignments(assigned_by);

-- work_item_insights
CREATE INDEX IF NOT EXISTS idx_work_item_insights_linked_by ON public.work_item_insights(linked_by);

-- work_item_resources
CREATE INDEX IF NOT EXISTS idx_work_item_resources_added_by ON public.work_item_resources(added_by);
CREATE INDEX IF NOT EXISTS idx_work_item_resources_unlinked_by ON public.work_item_resources(unlinked_by);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- 1. Fixed 4 workspace_templates RLS policies with (select auth.uid()) pattern
-- 2. Added 30 indexes for unindexed foreign key columns
--
-- Note: Unused indexes were NOT removed as they may be needed when features
-- are used in production. Index removal should be done after production
-- usage analysis confirms they are truly unused.
-- ============================================================================
