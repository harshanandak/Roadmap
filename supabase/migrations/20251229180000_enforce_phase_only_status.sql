-- =============================================================================
-- Migration: Enforce phase-only status for work_items (architecture constraint)
-- Created: 2025-12-29
--
-- RATIONALE (from CLAUDE.md "Phase vs Status Clarification"):
-- Work items use 'phase' as their status (phase IS the status).
-- The 'status' column is for timeline_items (task execution tracking).
-- Having both phase and status on work_items violates the established architecture.
--
-- Entity | Phase/Status Field | Purpose
-- Work Item | phase (IS the status) | Lifecycle: research → planning → execution → review → complete
-- Timeline Item | status (separate) | Task execution: not_started, in_progress, blocked, completed, on_hold, cancelled
--
-- REFERENCES:
-- - docs/ARCHITECTURE_CONSOLIDATION.md (canonical source of truth)
-- - CLAUDE.md "Phase vs Status Clarification" section
-- - CLAUDE.md Architecture Guardrails: "Phase vs Status" decision
-- =============================================================================

-- =============================================================================
-- STEP 1: Log status column state before dropping (informational only)
-- =============================================================================
-- NOTE: The status column (if present) is a LEGACY field from the original
-- features table. It has a completely different value domain than phase:
--   - status: not_started, planning, in_progress, blocked, review, completed, on_hold, cancelled
--   - phase: research, planning, execution, review, complete (or type-specific)
-- These are NOT interchangeable - status was never used as an alternative to phase.
-- This migration removes the legacy column to enforce the architecture.
DO $$
DECLARE
  status_count INTEGER;
  has_status_column BOOLEAN;
BEGIN
  -- Check if status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items'
      AND column_name = 'status'
      AND table_schema = 'public'
  ) INTO has_status_column;

  IF has_status_column THEN
    -- Count records with non-NULL status (informational only)
    SELECT COUNT(*) INTO status_count
    FROM work_items
    WHERE status IS NOT NULL;

    IF status_count > 0 THEN
      RAISE NOTICE 'Found % work items with legacy status values', status_count;
      RAISE NOTICE 'These values are from the legacy features table and are not used';
      RAISE NOTICE 'Phase is the canonical lifecycle field - no data migration needed';
    ELSE
      RAISE NOTICE 'No work items have legacy status values set';
    END IF;
  ELSE
    RAISE NOTICE 'status column does not exist on work_items - architecture already enforced';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Drop the status column from work_items (if it exists)
-- =============================================================================
-- This enforces the architecture constraint that phase IS the status
ALTER TABLE work_items DROP COLUMN IF EXISTS status;

-- =============================================================================
-- STEP 3: Drop any related constraints and indexes (cleanup)
-- =============================================================================
-- Drop the check constraint that was added with the status column
ALTER TABLE work_items DROP CONSTRAINT IF EXISTS features_status_check;
ALTER TABLE work_items DROP CONSTRAINT IF EXISTS work_items_status_check;

-- Drop the index that was created for the status column
DROP INDEX IF EXISTS idx_features_status;
DROP INDEX IF EXISTS idx_work_items_status;

-- =============================================================================
-- STEP 4: Update phase column comment for clarity
-- =============================================================================
COMMENT ON COLUMN work_items.phase IS
  'Current lifecycle phase of the work item. This IS the status field - no separate status column exists per architecture. Type-specific phases: feature (design/build/refine/launch), bug (triage/investigating/fixing/verified), concept (ideation/research/validated/rejected), enhancement (uses feature phases).';
