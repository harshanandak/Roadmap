-- ============================================================================
-- Migration: Fix RLS Policy Performance Issues
-- Date: 2025-12-02
-- Purpose: Address Supabase advisor warnings on departments and insight_votes
-- Issues Fixed:
--   1. auth_rls_initplan on departments (4 policies)
--   2. multiple_permissive_policies on insight_votes (duplicate INSERT)
-- ============================================================================

-- ============================================================================
-- PART 1: FIX departments RLS policies (auth_rls_initplan)
-- Replace auth.uid() with (select auth.uid()) for single evaluation
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Team members can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can create departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

-- Recreate with optimized (select auth.uid()) pattern
CREATE POLICY "Team members can view departments"
ON public.departments FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Admins can create departments"
ON public.departments FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- PART 2: FIX insight_votes RLS policies (multiple_permissive_policies)
-- Consolidate overlapping INSERT policies into a single policy
-- ============================================================================

-- Drop both overlapping INSERT policies
DROP POLICY IF EXISTS "Team members can create votes" ON public.insight_votes;
DROP POLICY IF EXISTS "External voters can vote via review links" ON public.insight_votes;
DROP POLICY IF EXISTS "Public can vote on public insights" ON public.insight_votes;
DROP POLICY IF EXISTS "Users can create votes (team or external)" ON public.insight_votes;

-- Create consolidated INSERT policy
CREATE POLICY "Users can create votes (team or external)"
ON public.insight_votes FOR INSERT
WITH CHECK (
  -- Team members can vote on insights in their team
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = (SELECT auth.uid())
  )
  OR
  -- External voters can vote via active review links
  EXISTS (
    SELECT 1 FROM public.review_links rl
    JOIN public.customer_insights ci ON ci.workspace_id = rl.workspace_id
    WHERE ci.id = insight_votes.insight_id
    AND rl.is_active = TRUE
    AND (rl.expires_at IS NULL OR rl.expires_at > NOW())
  )
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- 1. Fixed 4 departments RLS policies with (select auth.uid()) pattern
-- 2. Consolidated 2-3 insight_votes INSERT policies into single policy
-- ============================================================================
