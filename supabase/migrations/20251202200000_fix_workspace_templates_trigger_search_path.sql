-- ============================================================================
-- Migration: Fix workspace_templates trigger function search_path
-- Date: 2025-12-02
-- Purpose: Address function_search_path_mutable warning
-- ============================================================================

-- Fix search_path for update_workspace_templates_updated_at function
-- This function was recreated during table creation but missing search_path
ALTER FUNCTION public.update_workspace_templates_updated_at()
SET search_path = '';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
