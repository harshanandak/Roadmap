-- Migration: Fix duplicate parent fields on work_items table
-- Issue #1: Both parent_id and parent_work_item_id exist, causing confusion
-- Solution: Consolidate into parent_id only
-- Made idempotent - safe to run if column already removed

DO $$
BEGIN
  -- Step 1: Migrate any data from parent_work_item_id to parent_id (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items' AND column_name = 'parent_work_item_id'
  ) THEN
    UPDATE work_items
    SET parent_id = parent_work_item_id
    WHERE parent_id IS NULL AND parent_work_item_id IS NOT NULL;

    -- Step 2: Drop the FK constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'work_items_parent_work_item_id_fkey'
    ) THEN
      ALTER TABLE work_items DROP CONSTRAINT work_items_parent_work_item_id_fkey;
    END IF;

    -- Step 3: Drop the column
    ALTER TABLE work_items DROP COLUMN parent_work_item_id;
  END IF;
END $$;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN work_items.parent_id IS 'Parent work item ID for hierarchical relationships (epics > features > stories)';
