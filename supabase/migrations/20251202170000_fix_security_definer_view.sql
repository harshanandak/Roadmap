-- ============================================================================
-- Migration: Fix Security Definer View
-- Date: 2025-12-02
-- Purpose: Drop cron_job_status view that has SECURITY DEFINER issue
-- ============================================================================

-- The cron_job_status view was created with SECURITY DEFINER (default when
-- accessing protected schemas like cron). This is a security risk because it
-- runs with the view creator's permissions, bypassing RLS.
--
-- Since this view is only for admin monitoring and admins can query cron.job
-- directly, we'll drop it to eliminate the security risk.

DROP VIEW IF EXISTS public.cron_job_status;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
