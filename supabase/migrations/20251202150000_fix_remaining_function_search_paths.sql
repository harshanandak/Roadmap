-- ============================================================================
-- Migration: Fix Remaining Function Search Path Vulnerabilities
-- Date: 2025-12-02
-- Purpose: Set search_path = '' on ALL database functions for security
-- Description: Functions without immutable search_path are vulnerable to
--              search path injection attacks. This migration fixes all
--              remaining vulnerable functions identified by Supabase advisor.
-- ============================================================================

-- ============================================================================
-- SECURITY CONTEXT
-- ============================================================================
-- Setting search_path = '' prevents malicious users from creating tables/functions
-- in other schemas to intercept function calls and gain elevated privileges.
-- This is a recommended PostgreSQL security best practice.
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Uses DO blocks to handle non-existent functions gracefully (no IF EXISTS for ALTER FUNCTION)

-- SECTION 1: TRIGGER FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.handle_work_item_reference_cleanup() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.validate_work_item_reference() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_feedback_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_work_item_duration() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_customer_insights_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.handle_new_user() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.log_phase_change() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.auto_refresh_workload_cache() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_workspace_templates_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_work_flows_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_flow_counts() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_strategy_calculated_progress() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 2: AUTH/RLS HELPER FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.user_is_team_member(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.user_is_team_admin(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 3: WORK ITEM CALCULATION FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.calculate_work_item_status(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_work_item_progress(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_work_item_phase(TEXT, TEXT, TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 4: RESOURCE MANAGEMENT FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.purge_soft_deleted(TEXT, INTEGER) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.purge_deleted_resources(INTEGER) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_resource_history(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.search_resources(TEXT, TEXT, TEXT[], TEXT, TEXT, INTEGER, INTEGER) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.purge_unlinked_work_item_resources(INTEGER) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.manual_purge_all_deleted(INTEGER) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 5: PHASE MANAGEMENT FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.count_phase_leads(TEXT, TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.refresh_phase_workload_cache(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_phase_lead_info(TEXT, TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 6: TASK FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.get_workspace_task_stats(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_work_item_tasks(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 7: PUBLIC FEEDBACK FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.check_public_feedback_enabled(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_workspace_public_settings(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 8: STRATEGY FUNCTIONS
DO $$ BEGIN ALTER FUNCTION public.calculate_strategy_progress(TEXT) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- SECTION 9: LEGACY FUNCTION (may not exist)
DO $$ BEGIN ALTER FUNCTION public.create_default_root_flow() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- - Fixed 30+ functions with search_path = '' for security
-- - Uses DO blocks with exception handling for safe execution
-- - Addresses all function_search_path_mutable warnings
-- ============================================================================
